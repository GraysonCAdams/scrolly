import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	clips,
	watched,
	favorites,
	reactions,
	comments,
	notifications
} from '$lib/server/db/schema';
import { eq, and, ne, count } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const clip = await db.query.clips.findFirst({
		where: eq(clips.id, params.id)
	});

	if (!clip) return json({ error: 'Clip not found' }, { status: 404 });
	if (clip.groupId !== locals.user.groupId)
		return json({ error: 'Not authorized' }, { status: 403 });

	// Check if anyone other than the uploader has watched this clip
	let canEditCaption = false;
	if (clip.addedBy === locals.user.id) {
		const [result] = await db
			.select({ count: count() })
			.from(watched)
			.where(and(eq(watched.clipId, params.id), ne(watched.userId, clip.addedBy)));
		canEditCaption = result.count === 0;
	}

	return json({
		id: clip.id,
		status: clip.status,
		videoPath: clip.videoPath,
		audioPath: clip.audioPath,
		thumbnailPath: clip.thumbnailPath,
		title: clip.title,
		artist: clip.artist,
		albumArt: clip.albumArt,
		contentType: clip.contentType,
		platform: clip.platform,
		canEditCaption
	});
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const clip = await db.query.clips.findFirst({
		where: eq(clips.id, params.id)
	});

	if (!clip) return json({ error: 'Clip not found' }, { status: 404 });
	if (clip.groupId !== locals.user.groupId)
		return json({ error: 'Not authorized' }, { status: 403 });
	if (clip.addedBy !== locals.user.id)
		return json({ error: 'Only the uploader can edit' }, { status: 403 });

	// Check edit lock: anyone else watched?
	const [result] = await db
		.select({ count: count() })
		.from(watched)
		.where(and(eq(watched.clipId, params.id), ne(watched.userId, clip.addedBy)));

	if (result.count > 0) {
		return json({ error: 'Caption can no longer be edited' }, { status: 403 });
	}

	const body = await request.json();
	const title = typeof body.title === 'string' ? body.title.trim() : null;

	await db
		.update(clips)
		.set({ title: title || null })
		.where(eq(clips.id, params.id));

	return json({ title: title || null });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const clip = await db.query.clips.findFirst({
		where: eq(clips.id, params.id)
	});

	if (!clip) return json({ error: 'Clip not found' }, { status: 404 });
	if (clip.groupId !== locals.user.groupId)
		return json({ error: 'Not authorized' }, { status: 403 });
	if (clip.addedBy !== locals.user.id)
		return json({ error: 'Only the uploader can delete' }, { status: 403 });

	// Only allow deletion if no one else has watched
	const [result] = await db
		.select({ count: count() })
		.from(watched)
		.where(and(eq(watched.clipId, params.id), ne(watched.userId, clip.addedBy)));

	if (result.count > 0) {
		return json({ error: 'Clip can no longer be deleted' }, { status: 403 });
	}

	// Delete related data, then the clip itself
	await db.delete(notifications).where(eq(notifications.clipId, params.id));
	await db.delete(watched).where(eq(watched.clipId, params.id));
	await db.delete(favorites).where(eq(favorites.clipId, params.id));
	await db.delete(reactions).where(eq(reactions.clipId, params.id));
	await db.delete(comments).where(eq(comments.clipId, params.id));
	await db.delete(clips).where(eq(clips.id, params.id));

	return json({ success: true });
};
