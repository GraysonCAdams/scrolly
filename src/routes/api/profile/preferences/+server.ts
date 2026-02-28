import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if ('themePreference' in body) {
		if (!['system', 'light', 'dark'].includes(body.themePreference)) {
			return json({ error: 'Invalid theme preference' }, { status: 400 });
		}
		updates.themePreference = body.themePreference;
	}

	if ('autoScroll' in body) {
		if (typeof body.autoScroll !== 'boolean') {
			return json({ error: 'Invalid autoScroll value' }, { status: 400 });
		}
		updates.autoScroll = body.autoScroll;
	}

	if ('mutedByDefault' in body) {
		if (typeof body.mutedByDefault !== 'boolean') {
			return json({ error: 'Invalid mutedByDefault value' }, { status: 400 });
		}
		updates.mutedByDefault = body.mutedByDefault;
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No valid preferences provided' }, { status: 400 });
	}

	await db.update(users).set(updates).where(eq(users.id, locals.user.id));

	return json(updates);
};
