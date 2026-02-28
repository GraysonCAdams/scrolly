import { resolve } from 'path';
import { readdir, stat, unlink } from 'fs/promises';
import { db } from '../db';
import { clips, groups } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deduplicatedDownload } from '../download-lock';
import { getActiveProvider } from '../providers/registry';
import type { AudioDownloadResult } from '../providers/types';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'videos');

interface OdesliResponse {
	entityUniqueId: string;
	entitiesByUniqueId: Record<
		string,
		{
			title?: string;
			artistName?: string;
			thumbnailUrl?: string;
		}
	>;
	linksByPlatform: Record<
		string,
		{
			url: string;
			entityUniqueId: string;
		}
	>;
}

interface MusicMetadata {
	title: string | null;
	artist: string | null;
	albumArt: string | null;
	spotifyUrl: string | null;
	appleMusicUrl: string | null;
	youtubeMusicUrl: string | null;
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

async function resolveOdesli(url: string): Promise<MusicMetadata> {
	const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}`;
	const res = await fetch(apiUrl);

	if (!res.ok) {
		console.error(`Odesli API returned ${res.status} for ${url}`);
		return {
			title: null,
			artist: null,
			albumArt: null,
			spotifyUrl: null,
			appleMusicUrl: null,
			youtubeMusicUrl: null
		};
	}

	const data: OdesliResponse = await res.json();
	const entity = data.entitiesByUniqueId[data.entityUniqueId];

	return {
		title: entity?.title || null,
		artist: entity?.artistName || null,
		albumArt: entity?.thumbnailUrl || null,
		spotifyUrl: data.linksByPlatform?.spotify?.url || null,
		appleMusicUrl: data.linksByPlatform?.appleMusic?.url || null,
		youtubeMusicUrl: data.linksByPlatform?.youtubeMusic?.url || null
	};
}

async function finalizeMusicClip(
	clipId: string,
	result: AudioDownloadResult,
	metadata: MusicMetadata,
	maxDuration: number | null
): Promise<void> {
	// Post-download duration safety net
	if (maxDuration && result.duration && result.duration > maxDuration) {
		const mins = Math.round(maxDuration / 60);
		console.warn(`Music clip ${clipId} duration ${result.duration}s exceeds limit ${maxDuration}s`);
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

	// Keep existing title (caption from SMS) if present
	const existing = await db.query.clips.findFirst({ where: eq(clips.id, clipId) });
	const title = existing?.title || metadata.title || null;

	// Calculate file size
	let fileSizeBytes = 0;
	try {
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		const s = await stat(result.audioPath);
		fileSizeBytes = s.size;
	} catch {
		// File may not exist
	}

	await db
		.update(clips)
		.set({
			status: 'ready',
			audioPath: result.audioPath,
			title,
			durationSeconds: result.duration,
			fileSizeBytes: fileSizeBytes || null
		})
		.where(eq(clips.id, clipId));
}

async function downloadMusicInner(clipId: string, url: string): Promise<void> {
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
		// Step 1: Resolve metadata from Odesli
		const metadata = await resolveOdesli(url);

		// Step 2: Update clip immediately with metadata (UI can show song info while downloading)
		await db
			.update(clips)
			.set({
				title: metadata.title,
				artist: metadata.artist,
				albumArt: metadata.albumArt,
				spotifyUrl: metadata.spotifyUrl,
				appleMusicUrl: metadata.appleMusicUrl,
				youtubeMusicUrl: metadata.youtubeMusicUrl
			})
			.where(eq(clips.id, clipId));

		// Step 3: Search YouTube and download audio via provider
		let result: AudioDownloadResult | null = null;
		const downloadOptions = {
			outputDir: DATA_DIR,
			clipId,
			maxDurationSeconds: maxDuration
		};

		if (metadata.title && metadata.artist) {
			try {
				result = await provider.downloadAudio(
					`ytsearch1:${metadata.title} ${metadata.artist}`,
					downloadOptions
				);
			} catch (err) {
				console.error(`YouTube search failed for "${metadata.title} ${metadata.artist}":`, err);
			}
		}

		// Step 4: Fallback — try the YouTube Music URL directly
		if (!result && metadata.youtubeMusicUrl) {
			try {
				result = await provider.downloadAudio(metadata.youtubeMusicUrl, downloadOptions);
			} catch (err) {
				console.error(`YouTube Music URL download failed:`, err);
			}
		}

		if (result) {
			await finalizeMusicClip(clipId, result, metadata, maxDuration);
		} else {
			// Failed to download audio, but metadata + platform links are still visible
			await cleanupClipFiles(clipId);
			await db.update(clips).set({ status: 'failed' }).where(eq(clips.id, clipId));
		}
	} catch (err) {
		console.error(`Music download failed for clip ${clipId}:`, err);
		await cleanupClipFiles(clipId);
		await db.update(clips).set({ status: 'failed' }).where(eq(clips.id, clipId));
	}
}

export async function downloadMusic(clipId: string, url: string): Promise<void> {
	return deduplicatedDownload(clipId, url, downloadMusicInner);
}
