import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(notifications)
		.where(and(eq(notifications.userId, locals.user.id), isNull(notifications.readAt)));

	return json({ count: result[0]?.count ?? 0 });
};
