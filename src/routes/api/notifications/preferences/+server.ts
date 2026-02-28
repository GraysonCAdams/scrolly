import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notificationPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const prefs = await db.query.notificationPreferences.findFirst({
		where: eq(notificationPreferences.userId, locals.user.id)
	});

	if (!prefs) {
		return json({ newAdds: true, reactions: true, comments: true, dailyReminder: false });
	}

	return json({
		newAdds: prefs.newAdds,
		reactions: prefs.reactions,
		comments: prefs.comments,
		dailyReminder: prefs.dailyReminder
	});
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const body = await request.json();
	const allowed = ['newAdds', 'reactions', 'comments', 'dailyReminder'] as const;
	const updates: Record<string, boolean> = {};

	for (const key of allowed) {
		if (typeof body[key] === 'boolean') {
			updates[key] = body[key];
		}
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No valid fields to update' }, { status: 400 });
	}

	await db
		.update(notificationPreferences)
		.set(updates)
		.where(eq(notificationPreferences.userId, locals.user.id));

	const updated = await db.query.notificationPreferences.findFirst({
		where: eq(notificationPreferences.userId, locals.user.id)
	});

	return json({
		newAdds: updated!.newAdds,
		reactions: updated!.reactions,
		comments: updated!.comments,
		dailyReminder: updated!.dailyReminder
	});
};
