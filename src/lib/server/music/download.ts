import { spawn } from 'child_process';
import { resolve } from 'path';
import { readdir, stat } from 'fs/promises';
import { db } from '../db';
import { clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deduplicatedDownload } from '../download-lock';

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

function spawnYtDlp(
	clipId: string,
	searchQuery: string
): Promise<{ audioPath: string; duration: number | null }> {
	return new Promise((resolvePromise, reject) => {
		const outputTemplate = `${DATA_DIR}/${clipId}.%(ext)s`;

		const args = [
			'--no-playlist',
			'--js-runtimes',
			'node',
			'--remote-components',
			'ejs:github',
			'--extractor-args',
			'youtube:player_client=android_vr,web_safari',
			'-x',
			'--audio-format',
			'mp3',
			'--audio-quality',
			'0',
			'--write-info-json',
			'-o',
			outputTemplate,
			searchQuery
		];

		// Strip Node/Vite env vars that interfere with yt-dlp's
		// internal `node --permission` subprocess for JS challenge solving
		const cleanEnv = { ...process.env };
		const stripPrefixes = ['NODE_OPTIONS', 'NODE_DEV', 'NODE_CHANNEL_FD', 'VITE_'];
		for (const key of Object.keys(cleanEnv)) {
			if (stripPrefixes.some((p) => key.startsWith(p))) {
				delete cleanEnv[key];
			}
		}

		const proc = spawn('yt-dlp', args, {
			stdio: ['ignore', 'pipe', 'pipe'],
			env: cleanEnv
		});
		let stderr = '';
		let stdout = '';

		proc.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});
		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', async (code) => {
			if (code !== 0) {
				console.error(`yt-dlp stdout:\n${stdout}`);
				reject(new Error(`yt-dlp audio exited with code ${code}: ${stderr}`));
				return;
			}

			try {
				const files = await readdir(DATA_DIR);
				const clipFiles = files.filter((f) => f.startsWith(clipId));
				const audioFile = clipFiles.find((f) => f.endsWith('.mp3'));
				const infoFile = clipFiles.find((f) => f.endsWith('.info.json'));

				if (!audioFile) {
					reject(new Error(`No audio file found for clip ${clipId}`));
					return;
				}

				let duration: number | null = null;
				if (infoFile) {
					try {
						const { readFile } = await import('fs/promises');
						const info = JSON.parse(await readFile(`${DATA_DIR}/${infoFile}`, 'utf-8'));
						duration = typeof info.duration === 'number' ? Math.round(info.duration) : null;
					} catch {
						// Best-effort
					}
				}

				resolvePromise({
					audioPath: `${DATA_DIR}/${audioFile}`,
					duration
				});
			} catch (err) {
				reject(err);
			}
		});

		proc.on('error', (err) => {
			reject(new Error(`Failed to spawn yt-dlp: ${err.message}. Is yt-dlp installed?`));
		});
	});
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function downloadAudioFromYt(
	clipId: string,
	searchQuery: string
): Promise<{ audioPath: string; duration: number | null }> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await spawnYtDlp(clipId, searchQuery);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			if (attempt < MAX_RETRIES) {
				const delay = RETRY_DELAY_MS * attempt;
				console.warn(`yt-dlp attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${delay}ms...`);
				await new Promise((r) => setTimeout(r, delay));
			}
		}
	}

	throw lastError ?? new Error('yt-dlp download failed');
}

async function downloadMusicInner(clipId: string, url: string): Promise<void> {
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

		// Step 3: Search YouTube and download audio
		let result: { audioPath: string; duration: number | null } | null = null;

		if (metadata.title && metadata.artist) {
			try {
				result = await downloadAudioFromYt(
					clipId,
					`ytsearch1:${metadata.title} ${metadata.artist}`
				);
			} catch (err) {
				console.error(`YouTube search failed for "${metadata.title} ${metadata.artist}":`, err);
			}
		}

		// Step 4: Fallback — try the YouTube Music URL directly
		if (!result && metadata.youtubeMusicUrl) {
			try {
				result = await downloadAudioFromYt(clipId, metadata.youtubeMusicUrl);
			} catch (err) {
				console.error(`YouTube Music URL download failed:`, err);
			}
		}

		if (result) {
			// Keep existing title (caption from SMS) if present
			const existing = await db.query.clips.findFirst({
				where: eq(clips.id, clipId)
			});
			const title = existing?.title || metadata.title || null;

			// Calculate file size
			let fileSizeBytes = 0;
			try {
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
		} else {
			// Failed to download audio, but metadata + platform links are still visible
			await db.update(clips).set({ status: 'failed' }).where(eq(clips.id, clipId));
		}
	} catch (err) {
		console.error(`Music download failed for clip ${clipId}:`, err);
		await db.update(clips).set({ status: 'failed' }).where(eq(clips.id, clipId));
	}
}

export async function downloadMusic(clipId: string, url: string): Promise<void> {
	return deduplicatedDownload(clipId, url, downloadMusicInner);
}
