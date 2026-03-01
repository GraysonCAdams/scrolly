import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	users,
	notificationPreferences,
	pushSubscriptions,
	verificationCodes
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { withHost } from '$lib/server/api-utils';

export const DELETE: RequestHandler = withHost(async ({ params }, { user, group }) => {
	if (params.userId === user.id) {
		return json({ error: 'Cannot remove yourself' }, { status: 400 });
	}

	const target = await db.query.users.findFirst({
		where: eq(users.id, params.userId)
	});

	if (!target || target.groupId !== group.id || target.removedAt) {
		return json({ error: 'User not found in this group' }, { status: 404 });
	}

	// Soft-delete: mark as removed, clear sensitive data
	await db
		.update(users)
		.set({
			removedAt: new Date(),
			phone: `removed-${target.id}`,
			username: ''
		})
		.where(eq(users.id, params.userId));

	// Hard-delete associated non-content data
	await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, params.userId));
	await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, params.userId));
	await db.delete(verificationCodes).where(eq(verificationCodes.userId, params.userId));

	return json({ removed: true });
});
