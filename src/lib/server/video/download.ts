import { spawn } from 'child_process';
import { resolve } from 'path';
import { db } from '../db';
import { clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { readdir, stat } from 'fs/promises';
import { deduplicatedDownload } from '../download-lock';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'videos');

interface DownloadResult {
	videoPath: string;
	thumbnailPath: string | null;
	title: string | null;
	duration: number | null;
}

function runYtDlp(clipId: string, url: string): Promise<DownloadResult> {
	return new Promise((resolve, reject) => {
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
			'node',
			'-o',
			outputTemplate,
			url
		];

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
				resolve(result);
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
			const { readFile } = await import('fs/promises');
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
	try {
		const result = await runYtDlp(clipId, url);

		// Update clip with downloaded file info
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
		console.error(`Download failed for clip ${clipId}:`, err);
		await db.update(clips).set({ status: 'failed' }).where(eq(clips.id, clipId));
	}
}

export async function downloadVideo(clipId: string, url: string): Promise<void> {
	return deduplicatedDownload(clipId, url, downloadVideoInner);
}
