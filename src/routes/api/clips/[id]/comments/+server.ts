import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { comments, commentHearts, clips } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import {
	withClipAuth,
	parseBody,
	isResponse,
	mapUsersByIds,
	notifyClipOwner
} from '$lib/server/api-utils';

export const GET: RequestHandler = withClipAuth(async ({ params }, { user }) => {
	const clipId = params.id;

	const allComments = await db.query.comments.findMany({
		where: eq(comments.clipId, clipId)
	});

	if (allComments.length === 0) {
		return json({ comments: [] });
	}

	// Look up users (username + avatarPath)
	const usersMap = await mapUsersByIds(allComments.map((c) => c.userId));

	// Fetch all hearts for these comments
	const commentIds = allComments.map((c) => c.id);
	const allHearts = await db.query.commentHearts.findMany({
		where: inArray(commentHearts.commentId, commentIds)
	});

	const heartCounts = new Map<string, number>();
	const userHearted = new Set<string>();
	for (const h of allHearts) {
		heartCounts.set(h.commentId, (heartCounts.get(h.commentId) || 0) + 1);
		if (h.userId === user.id) userHearted.add(h.commentId);
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
		const u = usersMap.get(c.userId);
		return {
			id: c.id,
			text: c.text,
			gifUrl: c.gifUrl || null,
			userId: c.userId,
			username: u?.username || 'Unknown',
			avatarPath: u?.avatarPath || null,
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
	const formatted = topLevel.map((c) => {
		const replies = (repliesByParent.get(c.id) || [])
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
			.map(formatComment);
		return {
			...formatComment(c),
			replyCount: replies.length,
			replies
		};
	});

	return json({ comments: formatted });
});

/** Determine the notification recipient and dispatch. */
async function dispatchCommentNotification(
	clipId: string,
	parentId: string | null,
	actor: { id: string; username: string },
	preview: string
) {
	if (parentId) {
		const parentComment = await db.query.comments.findFirst({
			where: eq(comments.id, parentId)
		});
		if (parentComment && parentComment.userId !== actor.id) {
			await notifyClipOwner({
				recipientId: parentComment.userId,
				actorId: actor.id,
				actorUsername: actor.username,
				clipId,
				type: 'reply',
				preferenceKey: 'comments',
				pushTitle: 'New reply',
				pushBody: `${actor.username} replied: ${preview}`,
				pushTag: `reply-${clipId}`,
				commentPreview: preview
			});
		}
	} else {
		const clip = await db.query.clips.findFirst({ where: eq(clips.id, clipId) });
		if (clip && clip.addedBy !== actor.id) {
			await notifyClipOwner({
				recipientId: clip.addedBy,
				actorId: actor.id,
				actorUsername: actor.username,
				clipId,
				type: 'comment',
				preferenceKey: 'comments',
				pushTitle: 'New comment',
				pushBody: `${actor.username}: ${preview}`,
				pushTag: `comment-${clipId}`,
				commentPreview: preview
			});
		}
	}
}

function isValidGiphyUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.hostname.endsWith('giphy.com');
	} catch {
		return false;
	}
}

/** Validate and normalize comment input. Returns error string or parsed data. */
function validateCommentInput(body: {
	text?: unknown;
	gifUrl?: unknown;
}): { error: string } | { trimmed: string; hasText: boolean; validGifUrl: string | null } {
	const trimmed = (typeof body.text === 'string' ? body.text : '').trim();
	const hasText = trimmed.length > 0;
	const hasGif = typeof body.gifUrl === 'string' && body.gifUrl.length > 0;

	if (!hasText && !hasGif) return { error: 'Comment text or GIF required' };
	if (hasText && trimmed.length > 500) return { error: 'Comment too long (max 500 characters)' };
	if (hasGif && !isValidGiphyUrl(body.gifUrl as string)) return { error: 'Invalid GIF URL' };

	return { trimmed, hasText, validGifUrl: hasGif ? (body.gifUrl as string) : null };
}

export const POST: RequestHandler = withClipAuth(async ({ params, request }, { user }) => {
	const body = await parseBody<{ text?: string; gifUrl?: string; parentId?: string }>(request);
	if (isResponse(body)) return body;

	const clipId = params.id;

	const validation = validateCommentInput(body);
	if ('error' in validation) return json({ error: validation.error }, { status: 400 });
	const { trimmed, hasText, validGifUrl } = validation;

	if (body.parentId) {
		const parent = await db.query.comments.findFirst({
			where: and(eq(comments.id, body.parentId), eq(comments.clipId, clipId))
		});
		if (!parent) return json({ error: 'Parent comment not found' }, { status: 404 });
		if (parent.parentId) return json({ error: 'Cannot reply to a reply' }, { status: 400 });
	}

	const commentId = uuid();
	const now = new Date();

	await db.insert(comments).values({
		id: commentId,
		clipId,
		userId: user.id,
		parentId: body.parentId || null,
		text: trimmed,
		gifUrl: validGifUrl,
		createdAt: now
	});

	const preview = hasText ? trimmed.slice(0, 80) : '[GIF]';
	await dispatchCommentNotification(clipId, body.parentId || null, user, preview);

	return json(
		{
			comment: {
				id: commentId,
				text: trimmed,
				gifUrl: validGifUrl,
				userId: user.id,
				username: user.username,
				avatarPath: user.avatarPath || null,
				parentId: body.parentId || null,
				heartCount: 0,
				hearted: false,
				createdAt: now.toISOString()
			}
		},
		{ status: 201 }
	);
});

export const DELETE: RequestHandler = withClipAuth(async ({ request }, { user }) => {
	const body = await parseBody<{ commentId?: string }>(request);
	if (isResponse(body)) return body;

	const { commentId } = body;

	if (!commentId) {
		return json({ error: 'Comment ID required' }, { status: 400 });
	}

	// Only allow deleting own comments
	const comment = await db.query.comments.findFirst({
		where: and(eq(comments.id, commentId), eq(comments.userId, user.id))
	});

	if (!comment) {
		return json({ error: 'Comment not found or not yours' }, { status: 404 });
	}

	// Find child replies (if this is a top-level comment)
	const childReplies = await db.query.comments.findMany({
		where: eq(comments.parentId, commentId)
	});

	// Delete hearts, replies, and parent in a single transaction to avoid race conditions
	const idsToDelete = [commentId, ...childReplies.map((r) => r.id)];
	db.transaction((tx) => {
		if (idsToDelete.length > 0) {
			tx.delete(commentHearts).where(inArray(commentHearts.commentId, idsToDelete)).run();
		}
		if (childReplies.length > 0) {
			tx.delete(comments).where(eq(comments.parentId, commentId)).run();
		}
		tx.delete(comments).where(eq(comments.id, commentId)).run();
	});

	return json({ deleted: true, deletedIds: idsToDelete });
});
