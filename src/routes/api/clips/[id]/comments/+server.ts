import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	comments,
	commentHearts,
	clips,
	notificationPreferences,
	notifications
} from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { sendNotification } from '$lib/server/push';
import { v4 as uuid } from 'uuid';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const clipId = params.id;

	const allComments = await db.query.comments.findMany({
		where: eq(comments.clipId, clipId)
	});

	if (allComments.length === 0) {
		return json({ comments: [] });
	}

	// Look up users (username + avatarPath)
	const userIds = [...new Set(allComments.map((c) => c.userId))];
	const userRows = await db.query.users.findMany({
		where: (u, { inArray }) => inArray(u.id, userIds)
	});
	const usersMap = new Map(
		userRows.map((u) => [u.id, { username: u.username, avatarPath: u.avatarPath }])
	);

	// Fetch all hearts for these comments
	const commentIds = allComments.map((c) => c.id);
	const allHearts = await db.query.commentHearts.findMany({
		where: inArray(commentHearts.commentId, commentIds)
	});

	const heartCounts = new Map<string, number>();
	const userHearted = new Set<string>();
	for (const h of allHearts) {
		heartCounts.set(h.commentId, (heartCounts.get(h.commentId) || 0) + 1);
		if (h.userId === locals.user.id) userHearted.add(h.commentId);
	}

	// Separate top-level vs replies
	const topLevel = allComments.filter((c) => !c.parentId);
	const repliesByParent = new Map<string, typeof allComments>();
	for (const c of allComments.filter((c) => c.parentId)) {
		const arr = repliesByParent.get(c.parentId!) || [];
		arr.push(c);
		repliesByParent.set(c.parentId!, arr);
	}

	// Format a comment for the response
	function formatComment(c: (typeof allComments)[0]) {
		const user = usersMap.get(c.userId);
		return {
			id: c.id,
			text: c.text,
			userId: c.userId,
			username: user?.username || 'Unknown',
			avatarPath: user?.avatarPath || null,
			parentId: c.parentId || null,
			heartCount: heartCounts.get(c.id) || 0,
			hearted: userHearted.has(c.id),
			createdAt: c.createdAt.toISOString()
		};
	}

	// Sort top-level: hearts desc, then newest first
	topLevel.sort((a, b) => {
		const heartDiff = (heartCounts.get(b.id) || 0) - (heartCounts.get(a.id) || 0);
		if (heartDiff !== 0) return heartDiff;
		return b.createdAt.getTime() - a.createdAt.getTime();
	});

	// Build response with nested replies (sorted chronologically)
	const result = topLevel.map((c) => {
		const replies = (repliesByParent.get(c.id) || [])
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
			.map(formatComment);
		return {
			...formatComment(c),
			replyCount: replies.length,
			replies
		};
	});

	return json({ comments: result });
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const { text, parentId } = await request.json();
	const clipId = params.id;

	if (!text || typeof text !== 'string' || text.trim().length === 0) {
		return json({ error: 'Comment text required' }, { status: 400 });
	}

	if (text.length > 500) {
		return json({ error: 'Comment too long (max 500 characters)' }, { status: 400 });
	}

	// Validate parentId if provided
	if (parentId) {
		const parent = await db.query.comments.findFirst({
			where: and(eq(comments.id, parentId), eq(comments.clipId, clipId))
		});
		if (!parent) {
			return json({ error: 'Parent comment not found' }, { status: 404 });
		}
		if (parent.parentId) {
			return json({ error: 'Cannot reply to a reply' }, { status: 400 });
		}
	}

	const commentId = uuid();
	const now = new Date();

	await db.insert(comments).values({
		id: commentId,
		clipId,
		userId: locals.user.id,
		parentId: parentId || null,
		text: text.trim(),
		createdAt: now
	});

	// Notification logic
	if (parentId) {
		// Reply: notify the parent comment author
		const parentComment = await db.query.comments.findFirst({
			where: eq(comments.id, parentId)
		});
		if (parentComment && parentComment.userId !== locals.user.id) {
			const prefs = await db.query.notificationPreferences.findFirst({
				where: eq(notificationPreferences.userId, parentComment.userId)
			});
			if (!prefs || prefs.comments) {
				sendNotification(parentComment.userId, {
					title: 'New reply',
					body: `${locals.user.username} replied: ${text.trim().slice(0, 80)}`,
					url: '/',
					tag: `reply-${clipId}`
				}).catch((err) => console.error('Push notification failed:', err));
			}

			await db.insert(notifications).values({
				id: uuid(),
				userId: parentComment.userId,
				type: 'reply',
				clipId,
				actorId: locals.user.id,
				commentPreview: text.trim().slice(0, 80),
				createdAt: now
			});
		}
	} else {
		// Top-level: notify clip owner
		const clip = await db.query.clips.findFirst({ where: eq(clips.id, clipId) });
		if (clip && clip.addedBy !== locals.user.id) {
			const ownerPrefs = await db.query.notificationPreferences.findFirst({
				where: eq(notificationPreferences.userId, clip.addedBy)
			});
			if (!ownerPrefs || ownerPrefs.comments) {
				sendNotification(clip.addedBy, {
					title: 'New comment',
					body: `${locals.user.username}: ${text.trim().slice(0, 80)}`,
					url: '/',
					tag: `comment-${clipId}`
				}).catch((err) => console.error('Push notification failed:', err));
			}

			await db.insert(notifications).values({
				id: uuid(),
				userId: clip.addedBy,
				type: 'comment',
				clipId,
				actorId: locals.user.id,
				commentPreview: text.trim().slice(0, 80),
				createdAt: now
			});
		}
	}

	return json(
		{
			comment: {
				id: commentId,
				text: text.trim(),
				userId: locals.user.id,
				username: locals.user.username,
				avatarPath: locals.user.avatarPath || null,
				parentId: parentId || null,
				heartCount: 0,
				hearted: false,
				createdAt: now.toISOString()
			}
		},
		{ status: 201 }
	);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const { commentId } = await request.json();

	if (!commentId) {
		return json({ error: 'Comment ID required' }, { status: 400 });
	}

	// Only allow deleting own comments
	const comment = await db.query.comments.findFirst({
		where: and(eq(comments.id, commentId), eq(comments.userId, locals.user.id))
	});

	if (!comment) {
		return json({ error: 'Comment not found or not yours' }, { status: 404 });
	}

	// Find child replies (if this is a top-level comment)
	const childReplies = await db.query.comments.findMany({
		where: eq(comments.parentId, commentId)
	});

	// Delete hearts on all affected comments
	const idsToDelete = [commentId, ...childReplies.map((r) => r.id)];
	if (idsToDelete.length > 0) {
		await db.delete(commentHearts).where(inArray(commentHearts.commentId, idsToDelete));
	}

	// Delete replies first, then parent
	if (childReplies.length > 0) {
		await db.delete(comments).where(eq(comments.parentId, commentId));
	}
	await db.delete(comments).where(eq(comments.id, commentId));

	return json({ deleted: true, deletedIds: idsToDelete });
};
