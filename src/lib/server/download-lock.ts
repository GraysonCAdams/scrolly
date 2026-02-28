import { db } from './db';
import { clips } from './db/schema';
import { eq, and } from 'drizzle-orm';

interface DownloadResult {
	status: 'ready' | 'failed';
	videoPath: string | null;
	thumbnailPath: string | null;
	audioPath: string | null;
	title: string | null;
	artist: string | null;
	albumArt: string | null;
	spotifyUrl: string | null;
	appleMusicUrl: string | null;
	youtubeMusicUrl: string | null;
	durationSeconds: number | null;
}

const activeDownloads = new Map<string, Promise<DownloadResult>>();

const TRACKING_PARAMS = [
	'si',
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_content',
	'utm_term',
	'igshid',
	'igsh',
	'fbclid',
	'ref',
	'ref_src',
	'ref_url',
	's',
	'context',
	'share_id',
	't'
];

export function normalizeUrl(url: string): string {
	try {
		const parsed = new URL(url);
		for (const param of TRACKING_PARAMS) {
			parsed.searchParams.delete(param);
		}
		const search = parsed.searchParams.toString();
		return parsed.origin + parsed.pathname + (search ? '?' + search : '');
	} catch {
		return url;
	}
}

function clipToResult(clip: typeof clips.$inferSelect): DownloadResult {
	return {
		status: clip.status as 'ready' | 'failed',
		videoPath: clip.videoPath,
		thumbnailPath: clip.thumbnailPath,
		audioPath: clip.audioPath,
		title: clip.title,
		artist: clip.artist,
		albumArt: clip.albumArt,
		spotifyUrl: clip.spotifyUrl,
		appleMusicUrl: clip.appleMusicUrl,
		youtubeMusicUrl: clip.youtubeMusicUrl,
		durationSeconds: clip.durationSeconds
	};
}

async function copyResultToClip(clipId: string, result: DownloadResult): Promise<void> {
	const existing = await db.query.clips.findFirst({
		where: eq(clips.id, clipId)
	});
	const title = existing?.title || result.title || null;

	await db
		.update(clips)
		.set({
			status: 'ready',
			videoPath: result.videoPath,
			thumbnailPath: result.thumbnailPath,
			audioPath: result.audioPath,
			title,
			artist: result.artist,
			albumArt: result.albumArt,
			spotifyUrl: result.spotifyUrl,
			appleMusicUrl: result.appleMusicUrl,
			youtubeMusicUrl: result.youtubeMusicUrl,
			durationSeconds: result.durationSeconds
		})
		.where(eq(clips.id, clipId));
}

export async function deduplicatedDownload(
	clipId: string,
	url: string,
	doDownload: (clipId: string, url: string) => Promise<void>
): Promise<void> {
	const normalized = normalizeUrl(url);

	// Phase 1: Check DB for an already-completed clip with this URL
	const readyClip = await db.query.clips.findFirst({
		where: and(eq(clips.originalUrl, normalized), eq(clips.status, 'ready'))
	});

	if (readyClip) {
		console.log(`Reusing existing download for ${url} (clip ${readyClip.id})`);
		try {
			await copyResultToClip(clipId, clipToResult(readyClip));
			return;
		} catch (err) {
			console.error(`Failed to reuse clip ${readyClip.id} for ${clipId}:`, err);
			// Fall through to try downloading fresh
		}
	}

	// Phase 2: Check if this URL is already being downloaded
	const inflight = activeDownloads.get(normalized);
	if (inflight) {
		console.log(`Waiting on active download for ${url}`);
		const result = await inflight;
		if (result.status === 'ready') {
			try {
				await copyResultToClip(clipId, result);
				return;
			} catch (err) {
				console.error(`Failed to copy inflight result for ${clipId}:`, err);
				// Fall through to try our own download
			}
		}
		// Leader failed — fall through and try our own download
	}

	// Phase 3: We are the leader — do the actual download
	let resolvePromise!: (result: DownloadResult) => void;
	const promise = new Promise<DownloadResult>((resolve) => {
		resolvePromise = resolve;
	});
	activeDownloads.set(normalized, promise);

	try {
		await doDownload(clipId, url);

		const completed = await db.query.clips.findFirst({
			where: eq(clips.id, clipId)
		});

		const result: DownloadResult =
			completed?.status === 'ready'
				? clipToResult(completed)
				: {
						status: 'failed',
						videoPath: null,
						thumbnailPath: null,
						audioPath: null,
						title: null,
						artist: null,
						albumArt: null,
						spotifyUrl: null,
						appleMusicUrl: null,
						youtubeMusicUrl: null,
						durationSeconds: null
					};

		resolvePromise(result);
	} catch {
		resolvePromise({
			status: 'failed',
			videoPath: null,
			thumbnailPath: null,
			audioPath: null,
			title: null,
			artist: null,
			albumArt: null,
			spotifyUrl: null,
			appleMusicUrl: null,
			youtubeMusicUrl: null,
			durationSeconds: null
		});
	} finally {
		activeDownloads.delete(normalized);
	}
}
