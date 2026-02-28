import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { reactions, clips, notificationPreferences, notifications } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendNotification } from '$lib/server/push';
import { v4 as uuid } from 'uuid';

const ALLOWED_EMOJI = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const clipId = params.id;
	const userId = locals.user.id;

	const allReactions = await db.query.reactions.findMany({
		where: eq(reactions.clipId, clipId)
	});

	// Group by emoji
	const grouped: Record<string, { count: number; reacted: boolean }> = {};
	for (const r of allReactions) {
		if (!grouped[r.emoji]) {
			grouped[r.emoji] = { count: 0, reacted: false };
		}
		grouped[r.emoji].count++;
		if (r.userId === userId) {
			grouped[r.emoji].reacted = true;
		}
	}

	return json({ reactions: grouped });
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const { emoji } = await request.json();
	const clipId = params.id;
	const userId = locals.user.id;

	if (!ALLOWED_EMOJI.includes(emoji)) {
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
		const clip = await db.query.clips.findFirst({ where: eq(clips.id, clipId) });
		if (clip && clip.addedBy !== userId) {
			const ownerPrefs = await db.query.notificationPreferences.findFirst({
				where: eq(notificationPreferences.userId, clip.addedBy)
			});
			if (!ownerPrefs || ownerPrefs.reactions) {
				sendNotification(clip.addedBy, {
					title: 'New reaction',
					body: `${locals.user.username} reacted ${emoji} to your clip`,
					url: '/',
					tag: `reaction-${clipId}`
				}).catch((err) => console.error('Push notification failed:', err));
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

	const grouped: Record<string, { count: number; reacted: boolean }> = {};
	for (const r of allReactions) {
		if (!grouped[r.emoji]) {
			grouped[r.emoji] = { count: 0, reacted: false };
		}
		grouped[r.emoji].count++;
		if (r.userId === userId) {
			grouped[r.emoji].reacted = true;
		}
	}

	return json({ reactions: grouped, toggled: !existing });
};
