import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips, watched, favorites, commentViews } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { isSupportedUrl, detectPlatform, getContentType } from '$lib/url-validation';
import { downloadVideo } from '$lib/server/video/download';
import { downloadMusic } from '$lib/server/music/download';
import { sendGroupNotification } from '$lib/server/push';
import { normalizeUrl } from '$lib/server/download-lock';
import { v4 as uuid } from 'uuid';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const filter = url.searchParams.get('filter'); // 'unwatched' | 'watched' | 'favorites'
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const groupId = locals.user.groupId;
	const userId = locals.user.id;

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

	// Get all reactions for clips in this group
	const clipIds = allClips.map((c) => c.id);
	const allReactions = clipIds.length > 0 ? await db.query.reactions.findMany() : [];
	const clipReactions = allReactions.filter((r) => clipIds.includes(r.clipId));

	// Group reactions by clip
	const reactionsByClip = new Map<string, Record<string, { count: number; reacted: boolean }>>();
	for (const r of clipReactions) {
		if (!reactionsByClip.has(r.clipId)) {
			reactionsByClip.set(r.clipId, {});
		}
		const group = reactionsByClip.get(r.clipId)!;
		if (!group[r.emoji]) {
			group[r.emoji] = { count: 0, reacted: false };
		}
		group[r.emoji].count++;
		if (r.userId === userId) {
			group[r.emoji].reacted = true;
		}
	}

	// Get comment counts
	const allComments = clipIds.length > 0 ? await db.query.comments.findMany() : [];
	const commentCounts = new Map<string, number>();
	for (const c of allComments) {
		if (clipIds.includes(c.clipId)) {
			commentCounts.set(c.clipId, (commentCounts.get(c.clipId) || 0) + 1);
		}
	}

	// Get unread comment counts (comments since user last viewed)
	const userCommentViews = await db.query.commentViews.findMany({
		where: eq(commentViews.userId, userId)
	});
	const viewedAtMap = new Map<string, Date>();
	for (const cv of userCommentViews) {
		viewedAtMap.set(cv.clipId, cv.viewedAt);
	}
	const unreadCommentCounts = new Map<string, number>();
	for (const c of allComments) {
		if (!clipIds.includes(c.clipId)) continue;
		const viewedAt = viewedAtMap.get(c.clipId);
		if (!viewedAt || c.createdAt > viewedAt) {
			unreadCommentCounts.set(c.clipId, (unreadCommentCounts.get(c.clipId) || 0) + 1);
		}
	}

	// Get view counts (all watched rows, not just current user)
	const allWatchedRows = await db.query.watched.findMany();
	const viewCounts = new Map<string, number>();
	for (const w of allWatchedRows) {
		if (clipIds.includes(w.clipId)) {
			viewCounts.set(w.clipId, (viewCounts.get(w.clipId) || 0) + 1);
		}
	}

	// Compute which clips have been watched by someone other than the uploader
	const seenByOthersSet = new Set<string>();
	for (const w of allWatchedRows) {
		const clip = allClips.find((c) => c.id === w.clipId);
		if (clip && w.userId !== clip.addedBy) {
			seenByOthersSet.add(w.clipId);
		}
	}

	// Apply filter
	if (filter === 'unwatched') {
		allClips = allClips.filter((c) => !watchedIds.has(c.id));
	} else if (filter === 'watched') {
		allClips = allClips.filter((c) => watchedIds.has(c.id));
	} else if (filter === 'favorites') {
		allClips = allClips.filter((c) => favIds.has(c.id));
	}

	// Look up usernames for added_by
	const userIds = [...new Set(allClips.map((c) => c.addedBy))];
	const usersMap = new Map<string, string>();
	if (userIds.length > 0) {
		const userRows = await db.query.users.findMany();
		for (const u of userRows) {
			usersMap.set(u.id, u.username);
		}
	}

	const total = allClips.length;
	const paginatedClips = allClips.slice(offset, offset + limit);

	const result = paginatedClips.map((c) => ({
		...c,
		addedByUsername: usersMap.get(c.addedBy) || 'Unknown',
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
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const body = await request.json();
	const { url: videoUrl, title } = body;

	if (!videoUrl) return json({ error: 'URL required' }, { status: 400 });

	if (!isSupportedUrl(videoUrl)) {
		return json(
			{
				error:
					'Unsupported URL. Send a TikTok, Instagram, Facebook, YouTube Shorts, Spotify, or Apple Music link.'
			},
			{ status: 400 }
		);
	}

	const platform = detectPlatform(videoUrl)!;
	const contentType = getContentType(platform);
	const normalizedUrl = normalizeUrl(videoUrl);

	// Check if this URL already exists in the group's feed
	const existing = await db.query.clips.findFirst({
		where: and(eq(clips.groupId, locals.user.groupId), eq(clips.originalUrl, normalizedUrl))
	});
	if (existing) {
		return json({ error: 'This link has already been added to the feed.' }, { status: 409 });
	}

	const clipId = uuid();
	await db.insert(clips).values({
		id: clipId,
		groupId: locals.user.groupId,
		addedBy: locals.user.id,
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
		userId: locals.user.id,
		watchPercent: 100,
		watchedAt: new Date()
	});

	// Route to appropriate download pipeline
	const markFailedOnError = async (err: unknown) => {
		console.error(`Download failed for clip ${clipId}:`, err);
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
		locals.user.groupId,
		{
			title: 'New clip added',
			body: `${locals.user.username} shared a new ${contentType === 'music' ? 'song' : 'video'}`,
			url: '/',
			tag: 'new-clip'
		},
		'newAdds',
		locals.user.id
	).catch((err) => console.error('Push notification failed:', err));

	return json({ clip: { id: clipId, status: 'downloading', contentType } }, { status: 201 });
};
