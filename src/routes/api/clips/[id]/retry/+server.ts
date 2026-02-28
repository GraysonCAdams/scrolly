import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { downloadVideo } from '$lib/server/video/download';
import { downloadMusic } from '$lib/server/music/download';
import { getActiveProvider } from '$lib/server/providers/registry';
import { requireAuth, requireClipInGroup, isResponse } from '$lib/server/api-utils';
import { createLogger } from '$lib/server/logger';

const log = createLogger('retry');

export const POST: RequestHandler = async ({ params, locals }) => {
	const authError = requireAuth(locals);
	if (authError) return authError;

	// Check provider is still available
	const provider = await getActiveProvider(locals.user!.groupId);
	if (!provider) {
		return json(
			{ error: 'No download provider configured. Ask your group host to set one up in Settings.' },
			{ status: 400 }
		);
	}

	const clipOrError = await requireClipInGroup(params.id, locals.user!.groupId);
	if (isResponse(clipOrError)) return clipOrError;

	const clip = clipOrError;
	if (clip.status !== 'failed')
		return json({ error: 'Clip is not in a failed state' }, { status: 400 });

	await db.update(clips).set({ status: 'downloading' }).where(eq(clips.id, params.id));

	if (clip.contentType === 'music') {
		downloadMusic(clip.id, clip.originalUrl).catch((err) => {
			log.error({ err, clipId: clip.id }, 'music retry download failed');
		});
	} else {
		downloadVideo(clip.id, clip.originalUrl).catch((err) => {
			log.error({ err, clipId: clip.id }, 'retry download failed');
		});
	}

	return json({ status: 'downloading' });
};
