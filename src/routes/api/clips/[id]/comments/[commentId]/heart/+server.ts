import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { comments, commentHearts } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { withClipAuth, notFound } from '$lib/server/api-utils';

export const POST: RequestHandler = withClipAuth(async ({ params }, { user }) => {
	const { id: clipId, commentId } = params;
	const userId = user.id;

	// Verify comment exists and belongs to this clip
	const comment = await db.query.comments.findFirst({
		where: and(eq(comments.id, commentId), eq(comments.clipId, clipId))
	});
	if (!comment) return notFound('Comment not found');

	// Toggle: if exists, delete; if not, insert
	const existing = await db.query.commentHearts.findFirst({
		where: and(eq(commentHearts.commentId, commentId), eq(commentHearts.userId, userId))
	});

	if (existing) {
		await db.delete(commentHearts).where(eq(commentHearts.id, existing.id));
	} else {
		await db.insert(commentHearts).values({
			id: uuid(),
			commentId,
			userId,
			createdAt: new Date()
		});
	}

	// Return updated heart count + status
	const allHearts = await db.query.commentHearts.findMany({
		where: eq(commentHearts.commentId, commentId)
	});

	return json({
		heartCount: allHearts.length,
		hearted: !existing
	});
});
