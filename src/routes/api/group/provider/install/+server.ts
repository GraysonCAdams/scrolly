import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getProviderInstance } from '$lib/server/providers/registry';
import { withHost, parseBody, isResponse } from '$lib/server/api-utils';

export const POST: RequestHandler = withHost(async ({ request }) => {
	const body = await parseBody<{ providerId?: string }>(request);
	if (isResponse(body)) return body;

	const { providerId } = body;
	if (!providerId) {
		return json({ error: 'Provider ID required' }, { status: 400 });
	}

	const provider = getProviderInstance(providerId);
	if (!provider) {
		return json({ error: 'Unknown provider' }, { status: 400 });
	}

	try {
		await provider.install();
		const version = await provider.getVersion();
		return json({ installed: true, version }, { status: 201 });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Installation failed';
		return json({ error: message }, { status: 500 });
	}
});

export const DELETE: RequestHandler = withHost(async ({ request }, { group }) => {
	const body = await parseBody<{ providerId?: string }>(request);
	if (isResponse(body)) return body;

	const { providerId } = body;
	if (!providerId) {
		return json({ error: 'Provider ID required' }, { status: 400 });
	}

	const provider = getProviderInstance(providerId);
	if (!provider) {
		return json({ error: 'Unknown provider' }, { status: 400 });
	}

	await provider.uninstall();

	// If this was the active provider, deactivate it
	if (group.downloadProvider === providerId) {
		await db.update(groups).set({ downloadProvider: null }).where(eq(groups.id, group.id));
	}

	return json({ installed: false });
});
