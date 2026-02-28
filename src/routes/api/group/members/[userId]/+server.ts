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

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (locals.group.createdBy !== locals.user.id) {
		return json({ error: 'Only the host can remove members' }, { status: 403 });
	}

	if (params.userId === locals.user.id) {
		return json({ error: 'Cannot remove yourself' }, { status: 400 });
	}

	const target = await db.query.users.findFirst({
		where: eq(users.id, params.userId)
	});

	if (!target || target.groupId !== locals.group.id || target.removedAt) {
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
};
