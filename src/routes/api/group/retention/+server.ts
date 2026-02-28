import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const VALID_RETENTION = [null, 7, 14, 30, 60, 90];

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can change retention policy' }, { status: 403 });
	}

	const { retentionDays } = await request.json();

	if (!VALID_RETENTION.includes(retentionDays)) {
		return json({ error: 'Invalid retention value' }, { status: 400 });
	}

	await db.update(groups).set({ retentionDays }).where(eq(groups.id, locals.group.id));

	return json({ retentionDays });
};
