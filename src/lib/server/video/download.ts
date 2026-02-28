import { spawn } from 'child_process';
import { resolve } from 'path';
import { db } from '../db';
import { clips, groups } from '../db/schema';
import { eq } from 'drizzle-orm';
import { readdir, stat, unlink, readFile } from 'fs/promises';
import { deduplicatedDownload } from '../download-lock';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'videos');

/** Estimated average bytes-per-second for social media video (generous ~1.5 MB/s ≈ 12 Mbps) */
const VIDEO_BYTES_PER_SEC = 1.5 * 1024 * 1024;

interface DownloadResult {
	videoPath: string;
	thumbnailPath: string | null;
	title: string | null;
	duration: number | null;
}

async function getMaxDuration(clipId: string): Promise<number | null> {
	const clip = await db.query.clips.findFirst({ where: eq(clips.id, clipId) });
	if (!clip) return null;
	const group = await db.query.groups.findFirst({ where: eq(groups.id, clip.groupId) });
	return group?.maxDurationSeconds ?? null;
}

async function cleanupClipFiles(clipId: string): Promise<void> {
	try {
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		const files = await readdir(DATA_DIR);
		for (const f of files.filter((f) => f.startsWith(clipId))) {
			try {
				// eslint-disable-next-line security/detect-non-literal-fs-filename
				await unlink(`${DATA_DIR}/${f}`);
			} catch {
				// Best-effort cleanup
			}
		}
	} catch {
		// DATA_DIR may not exist yet
	}
}

function runYtDlp(
	clipId: string,
	url: string,
	maxDuration: number | null
): Promise<DownloadResult> {
	return new Promise((resolvePromise, reject) => {
		const outputTemplate = `${DATA_DIR}/${clipId}.%(ext)s`;

		const args = [
			'--no-playlist',
			'-f',
			'best[height<=1080]/best',
			'--write-thumbnail',
			'--convert-thumbnails',
			'jpg',
			'--write-info-json',
			'--js-runtimes',
			'node'
		];

		if (maxDuration) {
			// Pre-download: reject if duration metadata exceeds limit
			args.push('--match-filter', `duration <= ${maxDuration}`);
			// Mid-download: abort if file size exceeds estimated max for this duration
			const maxBytes = Math.round(maxDuration * VIDEO_BYTES_PER_SEC);
			args.push('--max-filesize', String(maxBytes));
		}

		args.push('-o', outputTemplate, url);

		const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stderr = '';

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', async (code) => {
			if (code !== 0) {
				reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
				return;
			}

			try {
				const result = await findDownloadedFiles(clipId);
				resolvePromise(result);
			} catch (err) {
				reject(err);
			}
		});

		proc.on('error', (err) => {
			reject(new Error(`Failed to spawn yt-dlp: ${err.message}. Is yt-dlp installed?`));
		});
	});
}

async function findDownloadedFiles(clipId: string): Promise<DownloadResult> {
	// eslint-disable-next-line security/detect-non-literal-fs-filename
	const files = await readdir(DATA_DIR);
	const clipFiles = files.filter((f) => f.startsWith(clipId));

	const videoFile = clipFiles.find(
		(f) => !f.endsWith('.jpg') && !f.endsWith('.json') && !f.endsWith('.part')
	);
	const thumbFile = clipFiles.find((f) => f.endsWith('.jpg'));
	const infoFile = clipFiles.find((f) => f.endsWith('.info.json'));

	if (!videoFile) {
		throw new Error(`No video file found for clip ${clipId}`);
	}

	let title: string | null = null;
	let duration: number | null = null;

	if (infoFile) {
		try {
			// eslint-disable-next-line security/detect-non-literal-fs-filename
			const info = JSON.parse(await readFile(`${DATA_DIR}/${infoFile}`, 'utf-8'));
			title = info.title || info.fulltitle || null;
			duration = typeof info.duration === 'number' ? Math.round(info.duration) : null;
		} catch {
			// Info file parsing is best-effort
		}
	}

	return {
		videoPath: `${DATA_DIR}/${videoFile}`,
		thumbnailPath: thumbFile ? `${DATA_DIR}/${thumbFile}` : null,
		title,
		duration
	};
}

async function downloadVideoInner(clipId: string, url: string): Promise<void> {
	const maxDuration = await getMaxDuration(clipId);

	try {
		const result = await runYtDlp(clipId, url, maxDuration);

		// Post-download duration safety net (metadata may not have been available pre-download)
		if (maxDuration && result.duration && result.duration > maxDuration) {
			const mins = Math.round(maxDuration / 60);
			console.warn(`Clip ${clipId} duration ${result.duration}s exceeds limit ${maxDuration}s`);
			await cleanupClipFiles(clipId);
			await db
				.update(clips)
				.set({
					status: 'failed',
					title: `Exceeds ${mins} min limit`,
					durationSeconds: result.duration
				})
				.where(eq(clips.id, clipId));
			return;
		}

		// Keep existing title (caption from SMS) if present, otherwise use yt-dlp title
		const existing = await db.query.clips.findFirst({
			where: eq(clips.id, clipId)
		});
		const title = existing?.title || result.title || null;

		// Calculate total file size
		let fileSizeBytes = 0;
		for (const path of [result.videoPath, result.thumbnailPath]) {
			if (path) {
				try {
					// eslint-disable-next-line security/detect-non-literal-fs-filename
					const s = await stat(path);
					fileSizeBytes += s.size;
				} catch {
					// File may not exist
				}
			}
		}

		await db
			.update(clips)
			.set({
				status: 'ready',
				videoPath: result.videoPath,
				thumbnailPath: result.thumbnailPath,
				title,
				durationSeconds: result.duration,
				fileSizeBytes: fileSizeBytes || null
			})
			.where(eq(clips.id, clipId));
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		const isDurationReject =
			errMsg.includes('match_filter') || errMsg.includes('File is larger than max-filesize');

		if (isDurationReject && maxDuration) {
			const mins = Math.round(maxDuration / 60);
			console.warn(`Clip ${clipId} rejected by yt-dlp duration/size filter`);
			await cleanupClipFiles(clipId);
			await db
				.update(clips)
				.set({ status: 'failed', title: `Exceeds ${mins} min limit` })
				.where(eq(clips.id, clipId));
			return;
		}

		console.error(`Download failed for clip ${clipId}:`, err);
		await cleanupClipFiles(clipId);
		await db.update(clips).set({ status: 'failed' }).where(eq(clips.id, clipId));
	}
}

export async function downloadVideo(clipId: string, url: string): Promise<void> {
	return deduplicatedDownload(clipId, url, downloadVideoInner);
}
