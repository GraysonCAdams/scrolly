import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can rename the group' }, { status: 403 });
	}

	const { name } = await request.json();

	if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
		return json({ error: 'Name must be 1-50 characters' }, { status: 400 });
	}

	const trimmed = name.trim();
	await db.update(groups).set({ name: trimmed }).where(eq(groups.id, locals.group.id));

	return json({ name: trimmed });
};
