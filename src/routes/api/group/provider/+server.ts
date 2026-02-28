import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { listProvidersWithStatus, getProviderInstance } from '$lib/server/providers/registry';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}
	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can manage providers' }, { status: 403 });
	}

	const providers = await listProvidersWithStatus(locals.group.id);
	return json({ providers });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}
	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can manage providers' }, { status: 403 });
	}

	const { providerId } = await request.json();

	if (providerId === null) {
		await db.update(groups).set({ downloadProvider: null }).where(eq(groups.id, locals.group.id));
		return json({ downloadProvider: null });
	}

	const provider = getProviderInstance(providerId);
	if (!provider) {
		return json({ error: 'Unknown provider' }, { status: 400 });
	}

	const installed = await provider.isInstalled();
	if (!installed) {
		return json({ error: 'Provider is not installed. Install it first.' }, { status: 400 });
	}

	await db
		.update(groups)
		.set({ downloadProvider: providerId })
		.where(eq(groups.id, locals.group.id));
	return json({ downloadProvider: providerId });
};
