import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { watched } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { withClipAuth, mapUsersByIds } from '$lib/server/api-utils';

export const GET: RequestHandler = withClipAuth(async ({ params }, _auth) => {
	const watchedRows = await db.query.watched.findMany({
		where: eq(watched.clipId, params.id)
	});

	// Look up user details only for users who watched this clip
	const usersMap = await mapUsersByIds(watchedRows.map((w) => w.userId));

	const views = watchedRows
		.map((w) => ({
			userId: w.userId,
			username: usersMap.get(w.userId)?.username || 'Unknown',
			avatarPath: usersMap.get(w.userId)?.avatarPath || null,
			watchPercent: w.watchPercent ?? 0,
			status: (w.watchPercent ?? 0) >= 50 ? ('viewed' as const) : ('skipped' as const),
			watchedAt: w.watchedAt.toISOString()
		}))
		.sort((a, b) => {
			if (a.status !== b.status) return a.status === 'viewed' ? -1 : 1;
			return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime();
		});

	return json({ views });
});
