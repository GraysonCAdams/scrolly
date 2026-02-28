import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { reactions, notificationPreferences, notifications } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendNotification } from '$lib/server/push';
import { v4 as uuid } from 'uuid';
import {
	requireAuth,
	requireClipInGroup,
	groupReactions,
	parseBody,
	isResponse
} from '$lib/server/api-utils';
import { createLogger } from '$lib/server/logger';

const log = createLogger('reactions');

const ALLOWED_EMOJI = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

export const GET: RequestHandler = async ({ locals, params }) => {
	const authError = requireAuth(locals);
	if (authError) return authError;

	const clipOrError = await requireClipInGroup(params.id, locals.user!.groupId);
	if (isResponse(clipOrError)) return clipOrError;

	const clipId = params.id;
	const userId = locals.user!.id;

	const allReactions = await db.query.reactions.findMany({
		where: eq(reactions.clipId, clipId)
	});

	return json({ reactions: groupReactions(allReactions, userId) });
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const authError = requireAuth(locals);
	if (authError) return authError;

	const clipOrError = await requireClipInGroup(params.id, locals.user!.groupId);
	if (isResponse(clipOrError)) return clipOrError;

	const clip = clipOrError;

	const body = await parseBody<{ emoji?: string }>(request);
	if (isResponse(body)) return body;

	const { emoji } = body;
	const clipId = params.id;
	const userId = locals.user!.id;

	if (!emoji || !ALLOWED_EMOJI.includes(emoji)) {
		return json({ error: 'Invalid emoji' }, { status: 400 });
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
		if (clip.addedBy !== userId) {
			const ownerPrefs = await db.query.notificationPreferences.findFirst({
				where: eq(notificationPreferences.userId, clip.addedBy)
			});
			if (!ownerPrefs || ownerPrefs.reactions) {
				sendNotification(clip.addedBy, {
					title: 'New reaction',
					body: `${locals.user!.username} reacted ${emoji} to your clip`,
					url: '/',
					tag: `reaction-${clipId}`
				}).catch((err) => log.error({ err }, 'push notification failed'));
			}

			// Create in-app notification
			await db.insert(notifications).values({
				id: uuid(),
				userId: clip.addedBy,
				type: 'reaction',
				clipId,
				actorId: userId,
				emoji,
				createdAt: new Date()
			});
		}
	}

	// Return updated reactions for this clip
	const allReactions = await db.query.reactions.findMany({
		where: eq(reactions.clipId, clipId)
	});

	return json({ reactions: groupReactions(allReactions, userId), toggled: !existing });
};
