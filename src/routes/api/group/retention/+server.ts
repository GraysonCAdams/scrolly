import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { withHost, parseBody, isResponse, badRequest } from '$lib/server/api-utils';
import { VALID_RETENTION_DAYS } from '$lib/server/constants';

export const PATCH: RequestHandler = withHost(async ({ request }, { group }) => {
	const body = await parseBody<{ retentionDays?: number | null }>(request);
	if (isResponse(body)) return body;

	const { retentionDays } = body;

	if (!(VALID_RETENTION_DAYS as readonly (number | null)[]).includes(retentionDays ?? null)) {
		return badRequest('Invalid retention value');
	}

	await db
		.update(groups)
		.set({ retentionDays: retentionDays ?? null })
		.where(eq(groups.id, group.id));

	return json({ retentionDays });
});
