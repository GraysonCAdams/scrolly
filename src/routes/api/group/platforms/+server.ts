import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { PLATFORM_KEYS } from '$lib/url-validation';

const VALID_MODES = ['all', 'allow', 'block'];

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can change platform settings' }, { status: 403 });
	}

	const { mode, platforms } = await request.json();

	if (!VALID_MODES.includes(mode)) {
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
		.where(eq(groups.id, locals.group.id));

	return json({
		platformFilterMode: mode,
		platformFilterList: mode === 'all' ? null : platforms
	});
};
