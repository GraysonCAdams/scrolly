import { resolve } from 'path';
import { db } from '../db';
import { clips, groups } from '../db/schema';
import { eq } from 'drizzle-orm';
import { readdir, stat, unlink } from 'fs/promises';
import { deduplicatedDownload } from '../download-lock';
import { getActiveProvider } from '../providers/registry';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'videos');

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

async function totalFileSize(paths: (string | null)[]): Promise<number> {
	let total = 0;
	for (const path of paths) {
		if (path) {
			try {
				// eslint-disable-next-line security/detect-non-literal-fs-filename
				const s = await stat(path);
				total += s.size;
			} catch {
				// File may not exist
			}
		}
	}
	return total;
}

async function handleDownloadError(
	clipId: string,
	err: unknown,
	maxDuration: number | null
): Promise<void> {
	const errMsg = err instanceof Error ? err.message : String(err);
	const isDurationReject =
		errMsg.includes('match_filter') || errMsg.includes('File is larger than max-filesize');

	if (isDurationReject && maxDuration) {
		const mins = Math.round(maxDuration / 60);
		console.warn(`Clip ${clipId} rejected by duration/size filter`);
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

async function downloadVideoInner(clipId: string, url: string): Promise<void> {
	const maxDuration = await getMaxDuration(clipId);

	// Resolve the active provider for this clip's group
	const clip = await db.query.clips.findFirst({ where: eq(clips.id, clipId) });
	if (!clip) return;
	const provider = await getActiveProvider(clip.groupId);
	if (!provider) {
		await db
			.update(clips)
			.set({ status: 'failed', title: 'No download provider configured' })
			.where(eq(clips.id, clipId));
		return;
	}

	try {
		const result = await provider.downloadVideo(url, {
			outputDir: DATA_DIR,
			clipId,
			maxDurationSeconds: maxDuration
		});

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

		// Keep existing title (caption from SMS) if present, otherwise use provider-extracted title
		const existing = await db.query.clips.findFirst({
			where: eq(clips.id, clipId)
		});
		const title = existing?.title || result.title || null;
		const fileSizeBytes = await totalFileSize([result.videoPath, result.thumbnailPath]);

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
		await handleDownloadError(clipId, err, maxDuration);
	}
}

export async function downloadVideo(clipId: string, url: string): Promise<void> {
	return deduplicatedDownload(clipId, url, downloadVideoInner);
}
