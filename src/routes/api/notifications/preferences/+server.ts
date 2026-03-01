import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notificationPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth, parseBody, isResponse } from '$lib/server/api-utils';

export const GET: RequestHandler = withAuth(async (_event, { user }) => {
	const prefs = await db.query.notificationPreferences.findFirst({
		where: eq(notificationPreferences.userId, user.id)
	});

	if (!prefs) {
		return json({
			newAdds: true,
			reactions: true,
			comments: true,
			mentions: true,
			dailyReminder: false
		});
	}

	return json({
		newAdds: prefs.newAdds,
		reactions: prefs.reactions,
		comments: prefs.comments,
		mentions: prefs.mentions,
		dailyReminder: prefs.dailyReminder
	});
});

export const PATCH: RequestHandler = withAuth(async ({ request }, { user }) => {
	const body = await parseBody<Record<string, unknown>>(request);
	if (isResponse(body)) return body;

	const allowed = ['newAdds', 'reactions', 'comments', 'mentions', 'dailyReminder'] as const;
	const updates: Record<string, boolean> = {};

	for (const key of allowed) {
		if (typeof body[key] === 'boolean') {
			updates[key] = body[key] as boolean;
		}
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No valid fields to update' }, { status: 400 });
	}

	await db
		.update(notificationPreferences)
		.set(updates)
		.where(eq(notificationPreferences.userId, user.id));

	const updated = await db.query.notificationPreferences.findFirst({
		where: eq(notificationPreferences.userId, user.id)
	});

	return json({
		newAdds: updated!.newAdds,
		reactions: updated!.reactions,
		comments: updated!.comments,
		mentions: updated!.mentions,
		dailyReminder: updated!.dailyReminder
	});
});
