import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { reactions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import {
	withClipAuth,
	groupReactions,
	parseBody,
	isResponse,
	badRequest,
	notifyClipOwner
} from '$lib/server/api-utils';
import { ALLOWED_EMOJIS } from '$lib/server/constants';

export const GET: RequestHandler = withClipAuth(async ({ params }, { user }) => {
	const clipId = params.id;
	const userId = user.id;

	const allReactions = await db.query.reactions.findMany({
		where: eq(reactions.clipId, clipId)
	});

	return json({ reactions: groupReactions(allReactions, userId) });
});

export const POST: RequestHandler = withClipAuth(async ({ params, request }, { user, clip }) => {
	const body = await parseBody<{ emoji?: string }>(request);
	if (isResponse(body)) return body;

	const { emoji } = body;
	const clipId = params.id;
	const userId = user.id;

	if (!emoji || !(ALLOWED_EMOJIS as readonly string[]).includes(emoji)) {
		return badRequest('Invalid emoji');
	}

	// Toggle: if exists, delete; if not, insert
	const existing = await db.query.reactions.findFirst({
		where: and(
			eq(reactions.clipId, clipId),
			eq(reactions.userId, userId),
			eq(reactions.emoji, emoji)
		)
	});

	if (existing) {
		await db.delete(reactions).where(eq(reactions.id, existing.id));
	} else {
		await db.insert(reactions).values({
			id: uuid(),
			clipId,
			userId,
			emoji,
			createdAt: new Date()
		});

		// Notify clip owner about the new reaction
		await notifyClipOwner({
			recipientId: clip.addedBy,
			actorId: userId,
			actorUsername: user.username,
			clipId,
			type: 'reaction',
			preferenceKey: 'reactions',
			pushTitle: `${user.username} reacted ${emoji}`,
			pushBody: 'on your clip',
			pushTag: `reaction-${clipId}`,
			emoji
		});
	}

	// Return updated reactions for this clip
	const allReactions = await db.query.reactions.findMany({
		where: eq(reactions.clipId, clipId)
	});

	return json({ reactions: groupReactions(allReactions, userId), toggled: !existing });
});
