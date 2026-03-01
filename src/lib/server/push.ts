import webpush from 'web-push';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { pushSubscriptions, notificationPreferences, users } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { createLogger } from '$lib/server/logger';

const log = createLogger('push');

type NotificationPayload = {
	title: string;
	body: string;
	icon?: string;
	url?: string;
	tag?: string;
};

let initialized = false;

function ensureInitialized() {
	if (initialized) return;
	if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
		throw new Error('VAPID environment variables are required');
	}
	webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
	initialized = true;
}

export async function sendNotification(
	userId: string,
	payload: NotificationPayload
): Promise<void> {
	ensureInitialized();

	const subs = await db.query.pushSubscriptions.findMany({
		where: eq(pushSubscriptions.userId, userId)
	});

	if (subs.length === 0) return;

	const payloadStr = JSON.stringify(payload);

	await Promise.allSettled(
		subs.map(async (sub) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth }
					},
					payloadStr
				);
			} catch (err: unknown) {
				const pushErr = err as { statusCode?: number };
				if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
					await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
				} else {
					log.error({ err, subscriptionId: sub.id }, 'push failed for subscription');
				}
			}
		})
	);
}

export async function sendGroupNotification(
	groupId: string,
	payload: NotificationPayload,
	preferenceKey: 'newAdds' | 'reactions' | 'comments' | 'dailyReminder',
	excludeUserId?: string
): Promise<void> {
	const groupUsers = await db.query.users.findMany({
		where: eq(users.groupId, groupId),
		columns: { id: true, removedAt: true }
	});

	const targets = groupUsers.filter((u) => u.id !== excludeUserId && !u.removedAt);
	if (targets.length === 0) return;

	const targetIds = targets.map((u) => u.id);

	// Batch-fetch all notification preferences for target users in one query
	const allPrefs = await db.query.notificationPreferences.findMany({
		where: inArray(notificationPreferences.userId, targetIds)
	});
	const prefsMap = new Map(allPrefs.map((p) => [p.userId, p]));

	await Promise.allSettled(
		targets.map(async (user) => {
			const prefs = prefsMap.get(user.id);
			if (prefs && !prefs[preferenceKey]) return;
			await sendNotification(user.id, payload);
		})
	);
}
