import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can regenerate the invite code' }, { status: 403 });
	}

	const newCode = crypto.randomBytes(4).toString('hex');

	await db.update(groups).set({ inviteCode: newCode }).where(eq(groups.id, locals.group.id));

	return json({ inviteCode: newCode });
};
