import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	clips,
	watched,
	favorites,
	reactions,
	comments,
	commentHearts,
	commentViews,
	notifications
} from '$lib/server/db/schema';
import { eq, and, ne, count, inArray } from 'drizzle-orm';
import { withClipAuth, parseBody, isResponse } from '$lib/server/api-utils';
import { cleanupClipFiles } from '$lib/server/download-utils';

export const GET: RequestHandler = withClipAuth(async ({ params }, { user, clip }) => {
	// Check if anyone other than the uploader has watched this clip
	let canEditCaption = false;
	if (clip.addedBy === user.id) {
		const [watchResult] = await db
			.select({ count: count() })
			.from(watched)
			.where(and(eq(watched.clipId, params.id), ne(watched.userId, clip.addedBy)));
		canEditCaption = watchResult.count === 0;
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
});

export const PATCH: RequestHandler = withClipAuth(async ({ params, request }, { user, clip }) => {
	if (clip.addedBy !== user.id)
		return json({ error: 'Only the uploader can edit' }, { status: 403 });

	// Check edit lock: anyone else watched?
	const [watchResult] = await db
		.select({ count: count() })
		.from(watched)
		.where(and(eq(watched.clipId, params.id), ne(watched.userId, clip.addedBy)));

	if (watchResult.count > 0) {
		return json({ error: 'Caption can no longer be edited' }, { status: 403 });
	}

	const body = await parseBody<{ title?: string }>(request);
	if (isResponse(body)) return body;

	const title = typeof body.title === 'string' ? body.title.trim() : null;

	await db
		.update(clips)
		.set({ title: title || null })
		.where(eq(clips.id, params.id));

	return json({ title: title || null });
});

export const DELETE: RequestHandler = withClipAuth(async ({ params }, { user, clip }) => {
	if (clip.addedBy !== user.id)
		return json({ error: 'Only the uploader can delete' }, { status: 403 });

	// Only allow deletion if no one else has watched
	const [watchResult] = await db
		.select({ count: count() })
		.from(watched)
		.where(and(eq(watched.clipId, params.id), ne(watched.userId, clip.addedBy)));

	if (watchResult.count > 0) {
		return json({ error: 'Clip can no longer be deleted' }, { status: 403 });
	}

	// Fetch comment IDs before the transaction so we can cascade to comment_hearts
	const clipComments = await db.query.comments.findMany({
		where: eq(comments.clipId, params.id)
	});

	db.transaction((tx) => {
		tx.delete(notifications).where(eq(notifications.clipId, params.id)).run();
		tx.delete(watched).where(eq(watched.clipId, params.id)).run();
		tx.delete(favorites).where(eq(favorites.clipId, params.id)).run();
		tx.delete(reactions).where(eq(reactions.clipId, params.id)).run();
		tx.delete(commentViews).where(eq(commentViews.clipId, params.id)).run();

		// Delete comment hearts before comments (FK constraint)
		const commentIds = clipComments.map((c) => c.id);
		if (commentIds.length > 0) {
			tx.delete(commentHearts).where(inArray(commentHearts.commentId, commentIds)).run();
		}
		tx.delete(comments).where(eq(comments.clipId, params.id)).run();
		tx.delete(clips).where(eq(clips.id, params.id)).run();
	});

	// Clean up video/thumbnail/audio files from disk (best-effort, after DB transaction)
	await cleanupClipFiles(params.id);

	return json({ success: true });
});
