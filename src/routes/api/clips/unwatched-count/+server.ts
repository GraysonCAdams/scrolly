import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips, watched } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const allClips = await db.query.clips.findMany({
		where: eq(clips.groupId, locals.user.groupId)
	});
	const watchedRows = await db.query.watched.findMany({
		where: eq(watched.userId, locals.user.id)
	});
	const watchedIds = new Set(watchedRows.map((w) => w.clipId));
	const count = allClips.filter((c) => !watchedIds.has(c.id) && c.status === 'ready').length;

	return json({ count });
};
