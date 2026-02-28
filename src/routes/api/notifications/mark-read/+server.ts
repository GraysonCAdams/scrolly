import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const body = await request.json();
	const now = new Date();

	if (body.all) {
		await db
			.update(notifications)
			.set({ readAt: now })
			.where(and(eq(notifications.userId, locals.user.id), isNull(notifications.readAt)));
	} else if (body.clipId && body.type) {
		await db
			.update(notifications)
			.set({ readAt: now })
			.where(
				and(
					eq(notifications.userId, locals.user.id),
					eq(notifications.clipId, body.clipId),
					eq(notifications.type, body.type),
					isNull(notifications.readAt)
				)
			);
	}

	return json({ ok: true });
};
