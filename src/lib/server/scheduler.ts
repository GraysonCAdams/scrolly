import { db } from '$lib/server/db';
import {
	users,
	clips,
	watched,
	notificationPreferences,
	notifications
} from '$lib/server/db/schema';
import { eq, and, sql, isNull, gte } from 'drizzle-orm';
import { sendNotification } from '$lib/server/push';
import { runBackup } from '$lib/server/backup';
import { createLogger } from '$lib/server/logger';

const log = createLogger('scheduler');

let lastBackupDate: string | null = null;

const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const REMINDER_HOUR = 9; // 9 AM server time
const BACKUP_HOUR = 2; // 2 AM server time

export function startScheduler(): void {
	checkAndSendReminders();
	checkAndRunBackup();
	setInterval(checkAndSendReminders, CHECK_INTERVAL);
	setInterval(checkAndRunBackup, CHECK_INTERVAL);
	log.info('scheduler started');
}

async function checkAndSendReminders(): Promise<void> {
	const now = new Date();

	// Only send after the reminder hour
	if (now.getHours() < REMINDER_HOUR) return;

	try {
		await sendDailyReminders();
	} catch (err) {
		log.error({ err }, 'daily reminder failed');
	}
}

async function checkAndRunBackup(): Promise<void> {
	const now = new Date();
	const today = now.toISOString().split('T')[0];

	if (lastBackupDate === today || now.getHours() < BACKUP_HOUR) return;

	lastBackupDate = today;

	try {
		await runBackup();
	} catch (err) {
		log.error({ err }, 'scheduled backup failed');
		lastBackupDate = null; // Retry next hour
	}
}

async function sendDailyReminders(): Promise<void> {
	// Batch-fetch users who have daily reminders enabled and are not removed,
	// joining users with their notification preferences in a single query
	const eligibleUsers = await db
		.select({
			id: users.id,
			groupId: users.groupId
		})
		.from(users)
		.innerJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
		.where(and(isNull(users.removedAt), eq(notificationPreferences.dailyReminder, true)));

	if (eligibleUsers.length === 0) return;

	// Check which users already received a daily_reminder notification today
	// to avoid duplicates after server restarts
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);

	const alreadySent = await db
		.select({ userId: notifications.userId })
		.from(notifications)
		.where(and(eq(notifications.type, 'daily_reminder'), gte(notifications.createdAt, todayStart)));
	const alreadySentSet = new Set(alreadySent.map((n) => n.userId));

	const usersToNotify = eligibleUsers.filter((u) => !alreadySentSet.has(u.id));
	if (usersToNotify.length === 0) return;

	let sent = 0;

	for (const user of usersToNotify) {
		try {
			// Count unwatched ready clips using a single SQL query
			const [result] = await db
				.select({ count: sql<number>`count(*)` })
				.from(clips)
				.where(
					and(
						eq(clips.groupId, user.groupId),
						eq(clips.status, 'ready'),
						sql`${clips.id} NOT IN (SELECT ${watched.clipId} FROM ${watched} WHERE ${watched.userId} = ${user.id})`
					)
				);

			const unwatchedCount = result.count;
			if (unwatchedCount === 0) continue;

			await sendNotification(user.id, {
				title: `${unwatchedCount} unwatched ${unwatchedCount === 1 ? 'clip' : 'clips'}`,
				body: 'Check out what your group has been sharing!',
				url: '/',
				tag: 'daily-reminder'
			});
			sent++;
		} catch (err) {
			log.error({ err, userId: user.id }, 'reminder failed for user');
		}
	}

	if (sent > 0) {
		log.info({ sent }, `sent daily reminders to ${sent} user(s)`);
	}
}
