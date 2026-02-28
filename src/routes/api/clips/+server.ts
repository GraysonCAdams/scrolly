import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	clips,
	watched,
	favorites,
	commentViews,
	reactions,
	comments,
	users
} from '$lib/server/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import {
	isSupportedUrl,
	detectPlatform,
	getContentType,
	isPlatformAllowed,
	platformLabel
} from '$lib/url-validation';
import { downloadVideo } from '$lib/server/video/download';
import { downloadMusic } from '$lib/server/music/download';
import { sendGroupNotification } from '$lib/server/push';
import { normalizeUrl } from '$lib/server/download-lock';
import { getActiveProvider } from '$lib/server/providers/registry';
import { v4 as uuid } from 'uuid';
import { requireAuth, groupReactionsByClip, parseBody, isResponse } from '$lib/server/api-utils';
import { createLogger } from '$lib/server/logger';

const log = createLogger('clips');

function countByClipId(items: { clipId: string }[], clipIds: Set<string>): Map<string, number> {
	const counts = new Map<string, number>();
	for (const item of items) {
		if (clipIds.has(item.clipId)) {
			counts.set(item.clipId, (counts.get(item.clipId) || 0) + 1);
		}
	}
	return counts;
}

function countUnreadComments(
	allComments: { clipId: string; createdAt: Date }[],
	clipIds: Set<string>,
	viewedAtMap: Map<string, Date>
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const c of allComments) {
		if (!clipIds.has(c.clipId)) continue;
		const viewedAt = viewedAtMap.get(c.clipId);
		if (!viewedAt || c.createdAt > viewedAt) {
			counts.set(c.clipId, (counts.get(c.clipId) || 0) + 1);
		}
	}
	return counts;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const authError = requireAuth(locals);
	if (authError) return authError;

	const filter = url.searchParams.get('filter'); // 'unwatched' | 'watched' | 'favorites'
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const groupId = locals.user!.groupId;
	const userId = locals.user!.id;

	// Get all clips for the group
	let allClips = await db.query.clips.findMany({
		where: eq(clips.groupId, groupId),
		orderBy: [desc(clips.createdAt)]
	});

	// Get watched and favorited clip IDs for this user
	const watchedRows = await db.query.watched.findMany({
		where: eq(watched.userId, userId)
	});
	const watchedIds = new Set(watchedRows.map((w) => w.clipId));

	const favRows = await db.query.favorites.findMany({
		where: eq(favorites.userId, userId)
	});
	const favIds = new Set(favRows.map((f) => f.clipId));

	// Apply filter before pagination so we only fetch related data for visible clips
	if (filter === 'unwatched') {
		allClips = allClips.filter((c) => !watchedIds.has(c.id));
	} else if (filter === 'watched') {
		allClips = allClips.filter((c) => watchedIds.has(c.id));
	} else if (filter === 'favorites') {
		allClips = allClips.filter((c) => favIds.has(c.id));
	}

	const total = allClips.length;
	const paginatedClips = allClips.slice(offset, offset + limit);
	const clipIds = paginatedClips.map((c) => c.id);

	// Only fetch related data for the paginated clips
	const clipReactions =
		clipIds.length > 0
			? await db.query.reactions.findMany({
					where: inArray(reactions.clipId, clipIds)
				})
			: [];
	const reactionsByClip = groupReactionsByClip(clipReactions, userId);

	// Get comment counts for paginated clips only
	const clipComments =
		clipIds.length > 0
			? await db.query.comments.findMany({
					where: inArray(comments.clipId, clipIds)
				})
			: [];
	const clipIdSet = new Set(clipIds);
	const commentCounts = countByClipId(clipComments, clipIdSet);

	// Get unread comment counts (comments since user last viewed)
	const userCommentViews = await db.query.commentViews.findMany({
		where: eq(commentViews.userId, userId)
	});
	const viewedAtMap = new Map<string, Date>();
	for (const cv of userCommentViews) {
		viewedAtMap.set(cv.clipId, cv.viewedAt);
	}
	const unreadCommentCounts = countUnreadComments(clipComments, clipIdSet, viewedAtMap);

	// Get view counts for paginated clips only
	const clipWatchedRows =
		clipIds.length > 0
			? await db.query.watched.findMany({
					where: inArray(watched.clipId, clipIds)
				})
			: [];
	const viewCounts = countByClipId(clipWatchedRows, clipIdSet);

	// Compute which clips have been watched by someone other than the uploader
	const uploaderMap = new Map(paginatedClips.map((c) => [c.id, c.addedBy]));
	const seenByOthersSet = new Set<string>();
	for (const w of clipWatchedRows) {
		if (uploaderMap.has(w.clipId) && w.userId !== uploaderMap.get(w.clipId)) {
			seenByOthersSet.add(w.clipId);
		}
	}

	// Look up usernames + avatars only for users who added these clips
	const addedByIds = [...new Set(paginatedClips.map((c) => c.addedBy))];
	const usersMap = new Map<string, { username: string; avatarPath: string | null }>();
	if (addedByIds.length > 0) {
		const userRows = await db.query.users.findMany({
			where: inArray(users.id, addedByIds)
		});
		for (const u of userRows) {
			usersMap.set(u.id, { username: u.username, avatarPath: u.avatarPath });
		}
	}

	const result = paginatedClips.map((c) => ({
		...c,
		addedByUsername: usersMap.get(c.addedBy)?.username || 'Unknown',
		addedByAvatar: usersMap.get(c.addedBy)?.avatarPath || null,
		watched: watchedIds.has(c.id),
		favorited: favIds.has(c.id),
		reactions: reactionsByClip.get(c.id) || {},
		commentCount: commentCounts.get(c.id) || 0,
		unreadCommentCount: unreadCommentCounts.get(c.id) || 0,
		viewCount: viewCounts.get(c.id) || 0,
		seenByOthers: seenByOthersSet.has(c.id)
	}));

	return json({ clips: result, hasMore: offset + limit < total });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const authError = requireAuth(locals);
	if (authError) return authError;

	// Check that a download provider is configured
	const provider = await getActiveProvider(locals.user!.groupId);
	if (!provider) {
		return json(
			{ error: 'No download provider configured. Ask your group host to set one up in Settings.' },
			{ status: 400 }
		);
	}

	const body = await parseBody<{ url?: string; title?: string }>(request);
	if (isResponse(body)) return body;

	const { url: videoUrl, title } = body;

	if (!videoUrl) return json({ error: 'URL required' }, { status: 400 });

	if (!isSupportedUrl(videoUrl)) {
		return json(
			{
				error:
					'Unsupported URL. Try a link from TikTok, YouTube, Instagram, X, Reddit, Spotify, or other supported platforms.'
			},
			{ status: 400 }
		);
	}

	const platform = detectPlatform(videoUrl)!;

	// Enforce group platform filter
	const filterList = locals.group!.platformFilterList
		? JSON.parse(locals.group!.platformFilterList)
		: null;
	if (!isPlatformAllowed(platform, locals.group!.platformFilterMode ?? 'all', filterList)) {
		return json(
			{ error: `${platformLabel(videoUrl) || platform} links are not allowed in this group` },
			{ status: 400 }
		);
	}

	const contentType = getContentType(platform);
	const normalizedUrl = normalizeUrl(videoUrl);

	// Check if this URL already exists in the group's feed
	const existing = await db.query.clips.findFirst({
		where: and(eq(clips.groupId, locals.user!.groupId), eq(clips.originalUrl, normalizedUrl))
	});
	if (existing) {
		return json({ error: 'This link has already been added to the feed.' }, { status: 409 });
	}

	const clipId = uuid();
	await db.insert(clips).values({
		id: clipId,
		groupId: locals.user!.groupId,
		addedBy: locals.user!.id,
		originalUrl: normalizedUrl,
		title: title || null,
		platform,
		contentType,
		status: 'downloading',
		createdAt: new Date()
	});

	// Auto-mark as watched by the uploader so it never appears in their "New" tab
	await db.insert(watched).values({
		clipId,
		userId: locals.user!.id,
		watchPercent: 100,
		watchedAt: new Date()
	});

	// Route to appropriate download pipeline
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

	// Notify group members
	sendGroupNotification(
		locals.user!.groupId,
		{
			title: 'New clip added',
			body: `${locals.user!.username} shared a new ${contentType === 'music' ? 'song' : 'video'}`,
			url: '/',
			tag: 'new-clip'
		},
		'newAdds',
		locals.user!.id
	).catch((err) => log.error({ err }, 'push notification failed'));

	return json({ clip: { id: clipId, status: 'downloading', contentType } }, { status: 201 });
};
