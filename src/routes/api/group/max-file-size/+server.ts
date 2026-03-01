import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { withHost, parseBody, isResponse, badRequest } from '$lib/server/api-utils';
import { VALID_MAX_FILE_SIZES } from '$lib/server/constants';

export const PATCH: RequestHandler = withHost(async ({ request }, { group }) => {
	const body = await parseBody<{ maxFileSizeMb?: number | null }>(request);
	if (isResponse(body)) return body;

	const { maxFileSizeMb } = body;

	if (!(VALID_MAX_FILE_SIZES as readonly (number | null)[]).includes(maxFileSizeMb ?? null)) {
		return badRequest('Invalid file size value');
	}

	await db
		.update(groups)
		.set({ maxFileSizeMb: maxFileSizeMb ?? null })
		.where(eq(groups.id, group.id));

	return json({ maxFileSizeMb });
});
