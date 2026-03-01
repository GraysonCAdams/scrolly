import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { listProvidersWithStatus, getProviderInstance } from '$lib/server/providers/registry';
import { withHost, parseBody, isResponse } from '$lib/server/api-utils';

export const GET: RequestHandler = withHost(async (_event, { group }) => {
	const providers = await listProvidersWithStatus(group.id);
	return json({ providers });
});

export const PATCH: RequestHandler = withHost(async ({ request }, { group }) => {
	const body = await parseBody<{ providerId?: string | null }>(request);
	if (isResponse(body)) return body;

	const { providerId } = body;

	if (providerId === null) {
		await db.update(groups).set({ downloadProvider: null }).where(eq(groups.id, group.id));
		return json({ downloadProvider: null });
	}

	if (!providerId) {
		return json({ error: 'Provider ID required' }, { status: 400 });
	}

	const provider = getProviderInstance(providerId);
	if (!provider) {
		return json({ error: 'Unknown provider' }, { status: 400 });
	}

	const installed = await provider.isInstalled();
	if (!installed) {
		return json({ error: 'Provider is not installed. Install it first.' }, { status: 400 });
	}

	await db.update(groups).set({ downloadProvider: providerId }).where(eq(groups.id, group.id));
	return json({ downloadProvider: providerId });
});
