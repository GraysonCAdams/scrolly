import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { withHost, parseBody, isResponse } from '$lib/server/api-utils';

export const PATCH: RequestHandler = withHost(async ({ request }, { group }) => {
	const body = await parseBody<{ name?: string }>(request);
	if (isResponse(body)) return body;

	const { name } = body;

	if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
		return json({ error: 'Name must be 1-50 characters' }, { status: 400 });
	}

	const trimmed = name.trim();
	await db.update(groups).set({ name: trimmed }).where(eq(groups.id, group.id));

	return json({ name: trimmed });
});
