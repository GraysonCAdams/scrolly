import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { PLATFORM_KEYS } from '$lib/url-validation';
import { withHost, parseBody, isResponse } from '$lib/server/api-utils';

const VALID_MODES = ['all', 'allow', 'block'];

export const PATCH: RequestHandler = withHost(async ({ request }, { group }) => {
	const body = await parseBody<{ mode?: string; platforms?: string[] }>(request);
	if (isResponse(body)) return body;

	const { mode, platforms } = body;

	if (!mode || !VALID_MODES.includes(mode)) {
		return json({ error: 'Invalid mode. Must be all, allow, or block' }, { status: 400 });
	}

	if (mode !== 'all') {
		if (!Array.isArray(platforms) || platforms.length === 0) {
			return json({ error: 'At least one platform must be selected' }, { status: 400 });
		}
		const invalidKeys = platforms.filter((p: string) => !PLATFORM_KEYS.includes(p));
		if (invalidKeys.length > 0) {
			return json({ error: `Invalid platforms: ${invalidKeys.join(', ')}` }, { status: 400 });
		}
	}

	const platformFilterList = mode === 'all' ? null : JSON.stringify(platforms);

	await db
		.update(groups)
		.set({ platformFilterMode: mode, platformFilterList })
		.where(eq(groups.id, group.id));

	return json({
		platformFilterMode: mode,
		platformFilterList: mode === 'all' ? null : platforms
	});
});
