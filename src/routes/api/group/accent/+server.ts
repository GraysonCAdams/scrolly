import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ACCENT_COLORS } from '$lib/colors';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the group host can change the accent color' }, { status: 403 });
	}

	const body = await request.json();
	const { accentColor } = body;

	if (!accentColor || !(accentColor in ACCENT_COLORS)) {
		return json({ error: 'Invalid accent color' }, { status: 400 });
	}

	await db.update(groups).set({ accentColor }).where(eq(groups.id, locals.group.id));

	return json({ accentColor });
};
