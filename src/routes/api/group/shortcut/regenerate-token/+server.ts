import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { requireHost } from '$lib/server/api-utils';

export const POST: RequestHandler = async ({ locals }) => {
	const hostError = requireHost(locals);
	if (hostError) return hostError;

	const newToken = uuid();

	await db.update(groups).set({ shortcutToken: newToken }).where(eq(groups.id, locals.group!.id));

	return json({ shortcutToken: newToken });
};
