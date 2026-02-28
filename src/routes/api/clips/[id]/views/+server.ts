import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { watched } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const watchedRows = await db.query.watched.findMany({
		where: eq(watched.clipId, params.id)
	});

	// Look up user details
	const userIds = [...new Set(watchedRows.map((w) => w.userId))];
	const usersMap = new Map<string, { username: string; avatarPath: string | null }>();
	if (userIds.length > 0) {
		const userRows = await db.query.users.findMany();
		for (const u of userRows) {
			usersMap.set(u.id, { username: u.username, avatarPath: u.avatarPath });
		}
	}

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
};
