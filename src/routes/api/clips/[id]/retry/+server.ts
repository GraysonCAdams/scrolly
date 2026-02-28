import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { downloadVideo } from '$lib/server/video/download';
import { downloadMusic } from '$lib/server/music/download';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const clip = await db.query.clips.findFirst({
		where: eq(clips.id, params.id)
	});

	if (!clip) return json({ error: 'Clip not found' }, { status: 404 });
	if (clip.groupId !== locals.user.groupId)
		return json({ error: 'Not authorized' }, { status: 403 });
	if (clip.status !== 'failed')
		return json({ error: 'Clip is not in a failed state' }, { status: 400 });

	await db.update(clips).set({ status: 'downloading' }).where(eq(clips.id, params.id));

	if (clip.contentType === 'music') {
		downloadMusic(clip.id, clip.originalUrl).catch((err) => {
			console.error(`Music retry download failed for clip ${clip.id}:`, err);
		});
	} else {
		downloadVideo(clip.id, clip.originalUrl).catch((err) => {
			console.error(`Retry download failed for clip ${clip.id}:`, err);
		});
	}

	return json({ status: 'downloading' });
};
