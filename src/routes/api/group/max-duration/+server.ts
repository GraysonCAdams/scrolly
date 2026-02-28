import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const VALID_DURATIONS = [null, 60, 120, 180, 300, 600, 900, 1800];

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can change the max duration' }, { status: 403 });
	}

	const { maxDurationSeconds } = await request.json();

	if (!VALID_DURATIONS.includes(maxDurationSeconds)) {
		return json({ error: 'Invalid duration value' }, { status: 400 });
	}

	await db
		.update(groups)
		.set({ maxDurationSeconds: maxDurationSeconds ?? 300 })
		.where(eq(groups.id, locals.group.id));

	return json({ maxDurationSeconds });
};
