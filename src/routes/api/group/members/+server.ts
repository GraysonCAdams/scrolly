import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const members = await db.query.users.findMany({
		where: and(eq(users.groupId, locals.group.id), isNull(users.removedAt))
	});

	return json(
		members.map((m) => ({
			id: m.id,
			username: m.username,
			avatarPath: m.avatarPath,
			createdAt: m.createdAt,
			isHost: m.id === locals.group!.createdBy
		}))
	);
};
