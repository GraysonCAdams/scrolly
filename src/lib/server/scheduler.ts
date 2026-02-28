import { db } from '$lib/server/db';
import { users, clips, watched, notificationPreferences } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sendNotification } from '$lib/server/push';

let lastReminderDate: string | null = null;

const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const REMINDER_HOUR = 9; // 9 AM server time

export function startScheduler(): void {
	checkAndSendReminders();
	setInterval(checkAndSendReminders, CHECK_INTERVAL);
	console.log('[scheduler] Daily reminder scheduler started');
}

async function checkAndSendReminders(): Promise<void> {
	const now = new Date();
	const today = now.toISOString().split('T')[0];

	// Only send once per day, and only after the reminder hour
	if (lastReminderDate === today || now.getHours() < REMINDER_HOUR) return;

	lastReminderDate = today;

	try {
		await sendDailyReminders();
	} catch (err) {
		console.error('[scheduler] Daily reminder failed:', err);
		lastReminderDate = null; // Allow retry next hour
	}
}

async function sendDailyReminders(): Promise<void> {
	const prefs = await db.query.notificationPreferences.findMany({
		where: eq(notificationPreferences.dailyReminder, true)
	});

	if (prefs.length === 0) return;

	let sent = 0;

	for (const pref of prefs) {
		try {
			const user = await db.query.users.findFirst({
				where: eq(users.id, pref.userId)
			});
			if (!user || user.removedAt) continue;

			// Count unwatched ready clips
			const allClips = await db.query.clips.findMany({
				where: eq(clips.groupId, user.groupId)
			});
			const watchedRows = await db.query.watched.findMany({
				where: eq(watched.userId, user.id)
			});
			const watchedIds = new Set(watchedRows.map((w) => w.clipId));
			const unwatchedCount = allClips.filter(
				(c) => !watchedIds.has(c.id) && c.status === 'ready'
			).length;

			if (unwatchedCount === 0) continue;

			await sendNotification(user.id, {
				title: `${unwatchedCount} unwatched ${unwatchedCount === 1 ? 'clip' : 'clips'}`,
				body: 'Check out what your group has been sharing!',
				url: '/',
				tag: 'daily-reminder'
			});
			sent++;
		} catch (err) {
			console.error(`[scheduler] Reminder failed for user ${pref.userId}:`, err);
		}
	}

	if (sent > 0) {
		console.log(`[scheduler] Sent daily reminders to ${sent} user(s)`);
	}
}
