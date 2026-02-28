import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const VALID_SIZES: (number | null)[] = [25, 50, 100, 200, 500, null];

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can change the max file size' }, { status: 403 });
	}

	const { maxFileSizeMb } = await request.json();

	if (!VALID_SIZES.includes(maxFileSizeMb)) {
		return json({ error: 'Invalid file size value' }, { status: 400 });
	}

	await db.update(groups).set({ maxFileSizeMb }).where(eq(groups.id, locals.group.id));

	return json({ maxFileSizeMb });
};
