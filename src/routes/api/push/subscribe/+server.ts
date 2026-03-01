import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { withAuth, parseBody, isResponse } from '$lib/server/api-utils';

export const POST: RequestHandler = withAuth(async ({ request }, { user }) => {
	const body = await parseBody<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>(
		request
	);
	if (isResponse(body)) return body;

	const { endpoint, keys } = body;

	if (!endpoint || !keys?.p256dh || !keys?.auth) {
		return json({ error: 'Invalid subscription data' }, { status: 400 });
	}

	// Check for duplicate endpoint (same device re-subscribing)
	const existing = await db.query.pushSubscriptions.findFirst({
		where: and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint))
	});

	if (existing) {
		await db
			.update(pushSubscriptions)
			.set({ keysP256dh: keys.p256dh, keysAuth: keys.auth })
			.where(eq(pushSubscriptions.id, existing.id));
		return json({ id: existing.id });
	}

	const id = uuid();
	await db.insert(pushSubscriptions).values({
		id,
		userId: user.id,
		endpoint,
		keysP256dh: keys.p256dh,
		keysAuth: keys.auth,
		createdAt: new Date()
	});

	return json({ id }, { status: 201 });
});

export const DELETE: RequestHandler = withAuth(async ({ request }, { user }) => {
	const body = await parseBody<{ endpoint?: string }>(request);
	if (isResponse(body)) return body;

	const { endpoint } = body;

	if (!endpoint) {
		return json({ error: 'Endpoint required' }, { status: 400 });
	}

	await db
		.delete(pushSubscriptions)
		.where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));

	return json({ deleted: true });
});
