import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { withHost } from '$lib/server/api-utils';

export const POST: RequestHandler = withHost(async (_event, { group }) => {
	const newCode = crypto.randomBytes(4).toString('hex');

	await db.update(groups).set({ inviteCode: newCode }).where(eq(groups.id, group.id));

	return json({ inviteCode: newCode });
});
