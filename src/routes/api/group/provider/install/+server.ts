import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getProviderInstance } from '$lib/server/providers/registry';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}
	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can install providers' }, { status: 403 });
	}

	const { providerId } = await request.json();
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
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}
	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can uninstall providers' }, { status: 403 });
	}

	const { providerId } = await request.json();
	const provider = getProviderInstance(providerId);
	if (!provider) {
		return json({ error: 'Unknown provider' }, { status: 400 });
	}

	await provider.uninstall();

	// If this was the active provider, deactivate it
	if (locals.group.downloadProvider === providerId) {
		await db.update(groups).set({ downloadProvider: null }).where(eq(groups.id, locals.group.id));
	}

	return json({ installed: false });
};
