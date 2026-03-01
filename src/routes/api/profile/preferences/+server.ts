import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth, parseBody, isResponse } from '$lib/server/api-utils';

export const POST: RequestHandler = withAuth(async ({ request }, { user }) => {
	const body = await parseBody<Record<string, unknown>>(request);
	if (isResponse(body)) return body;

	const updates: Record<string, unknown> = {};

	if ('themePreference' in body) {
		if (!['system', 'light', 'dark'].includes(body.themePreference as string)) {
			return json({ error: 'Invalid theme preference' }, { status: 400 });
		}
		updates.themePreference = body.themePreference;
	}

	if ('autoScroll' in body) {
		if (typeof body.autoScroll !== 'boolean') {
			return json({ error: 'Invalid autoScroll value' }, { status: 400 });
		}
		updates.autoScroll = body.autoScroll;
	}

	if ('mutedByDefault' in body) {
		if (typeof body.mutedByDefault !== 'boolean') {
			return json({ error: 'Invalid mutedByDefault value' }, { status: 400 });
		}
		updates.mutedByDefault = body.mutedByDefault;
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No valid preferences provided' }, { status: 400 });
	}

	await db.update(users).set(updates).where(eq(users.id, user.id));

	return json(updates);
});
