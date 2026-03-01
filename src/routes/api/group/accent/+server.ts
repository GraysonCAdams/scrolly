import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ACCENT_COLORS } from '$lib/colors';
import { withHost, parseBody, isResponse } from '$lib/server/api-utils';

export const PATCH: RequestHandler = withHost(async ({ request }, { group }) => {
	const body = await parseBody<{ accentColor?: string }>(request);
	if (isResponse(body)) return body;

	const { accentColor } = body;

	if (!accentColor || !(accentColor in ACCENT_COLORS)) {
		return json({ error: 'Invalid accent color' }, { status: 400 });
	}

	await db.update(groups).set({ accentColor }).where(eq(groups.id, group.id));

	return json({ accentColor });
});
