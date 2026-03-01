import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups, users, clips, watched } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { normalizePhones } from '$lib/server/phone';
import {
	isSupportedUrl,
	detectPlatform,
	getContentType,
	isPlatformAllowed,
	platformLabel
} from '$lib/url-validation';
import { downloadVideo } from '$lib/server/video/download';
import { downloadMusic } from '$lib/server/music/download';
import { normalizeUrl } from '$lib/server/download-lock';
import { getActiveProvider } from '$lib/server/providers/registry';
import { parseBody, isResponse } from '$lib/server/api-utils';
import { createLogger } from '$lib/server/logger';

const log = createLogger('share');

type AuthUser = { id: string; groupId: string | null; phone: string };
type AuthResult = { user: AuthUser; group: typeof groups.$inferSelect } | { error: Response };

/** Authenticate via token + phone numbers (backwards-compat path). */
async function authenticateWithToken(
	tokenParam: string | null,
	phones: string[] | undefined
): Promise<AuthResult> {
	if (!tokenParam) {
		return { error: json({ error: 'Not logged in' }, { status: 401 }) };
	}

	const group = await db.query.groups.findFirst({
		where: eq(groups.shortcutToken, tokenParam)
	});
	if (!group) {
		return { error: json({ error: 'Invalid token' }, { status: 401 }) };
	}

	if (!phones || !Array.isArray(phones) || phones.length === 0) {
		return { error: json({ error: 'Phone numbers required for token auth' }, { status: 400 }) };
	}

	const normalizedPhones = normalizePhones(phones as string[]);
	if (normalizedPhones.length === 0) {
		return { error: json({ error: 'No valid phone numbers provided' }, { status: 400 }) };
	}

	const groupMembers = await db.query.users.findMany({
		where: and(eq(users.groupId, group.id), isNull(users.removedAt))
	});

	const matchedUser = groupMembers.find((u) => normalizedPhones.includes(u.phone));
	if (!matchedUser) {
		return { error: json({ error: 'No matching user found in this group' }, { status: 403 }) };
	}

	return { user: matchedUser, group };
}

export const POST: RequestHandler = async ({ request, url, locals }) => {
	// 1. Parse body upfront (before auth, since token path needs phones from body)
	const body = await parseBody<{ url?: string; phones?: string[] }>(request);
	if (isResponse(body)) return body;

	const { url: videoUrl, phones } = body;

	if (!videoUrl || typeof videoUrl !== 'string') {
		return json({ error: 'URL required' }, { status: 400 });
	}

	// 2. Authenticate — cookie first, then token+phone fallback
	let authResult: AuthResult;
	if (locals.user && locals.group) {
		authResult = { user: locals.user, group: locals.group };
	} else {
		authResult = await authenticateWithToken(url.searchParams.get('token'), phones);
	}

	if ('error' in authResult) return authResult.error;
	const { user: matchedUser, group } = authResult;

	// 3. Check download provider
	const provider = await getActiveProvider(group.id);
	if (!provider) {
		return json(
			{ error: 'No download provider configured. Ask your group host to set one up in Settings.' },
			{ status: 400 }
		);
	}

	// 4. Validate URL
	if (!isSupportedUrl(videoUrl)) {
		return json(
			{
				error:
					'Unsupported URL. Try a link from TikTok, YouTube, Instagram, X, Reddit, Spotify, or other supported platforms.'
			},
			{ status: 400 }
		);
	}

	// 5. Platform filter
	const platform = detectPlatform(videoUrl)!;
	const filterList = group.platformFilterList ? JSON.parse(group.platformFilterList) : null;
	if (!isPlatformAllowed(platform, group.platformFilterMode, filterList)) {
		return json(
			{ error: `${platformLabel(videoUrl) || platform} links are not allowed in this group` },
			{ status: 400 }
		);
	}

	// 6. Content type and normalize URL
	const contentType = getContentType(platform);
	const normalizedVideoUrl = normalizeUrl(videoUrl);

	// 7. Duplicate check
	const existing = await db.query.clips.findFirst({
		where: and(eq(clips.groupId, group.id), eq(clips.originalUrl, normalizedVideoUrl))
	});
	if (existing) {
		return json({ error: 'This link has already been added to the feed.' }, { status: 409 });
	}

	// 8. Create clip
	const clipId = uuid();
	await db.insert(clips).values({
		id: clipId,
		groupId: group.id,
		addedBy: matchedUser.id,
		originalUrl: normalizedVideoUrl,
		title: null,
		platform,
		contentType,
		status: 'downloading',
		createdAt: new Date()
	});

	// 9. Auto-mark as watched by uploader
	await db.insert(watched).values({
		clipId,
		userId: matchedUser.id,
		watchPercent: 100,
		watchedAt: new Date()
	});

	// 10. Async download
	const markFailedOnError = async (err: unknown) => {
		log.error({ err, clipId }, 'download failed');
		await db
			.update(clips)
			.set({ status: 'failed' })
			.where(and(eq(clips.id, clipId), eq(clips.status, 'downloading')));
	};

	if (contentType === 'music') {
		downloadMusic(clipId, videoUrl).catch(markFailedOnError);
	} else {
		downloadVideo(clipId, videoUrl).catch(markFailedOnError);
	}

	// Push notification is sent after download succeeds (see video/download.ts, music/download.ts)

	return json({ ok: true, clipId, status: 'downloading' }, { status: 201 });
};
