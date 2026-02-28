import { writable } from 'svelte/store';

export const unreadCount = writable<number>(0);
export const unwatchedCount = writable<number>(0);

let pollInterval: ReturnType<typeof setInterval> | null = null;

export async function fetchUnreadCount(): Promise<void> {
	try {
		const res = await fetch('/api/notifications/unread-count');
		if (res.ok) {
			const data = await res.json();
			unreadCount.set(data.count);
		}
	} catch {
		// silently fail
	}
}

export async function fetchUnwatchedCount(): Promise<void> {
	try {
		const res = await fetch('/api/clips/unwatched-count');
		if (res.ok) {
			const data = await res.json();
			unwatchedCount.set(data.count);
			updateAppBadge(data.count);
		}
	} catch {
		// silently fail
	}
}

function updateAppBadge(count: number): void {
	if (!('setAppBadge' in navigator)) return;
	if (count > 0) {
		(navigator as any).setAppBadge(count).catch(() => {});
	} else {
		(navigator as any).clearAppBadge().catch(() => {});
	}
}

export function startPolling(intervalMs = 30000): void {
	fetchUnreadCount();
	fetchUnwatchedCount();
	if (pollInterval) clearInterval(pollInterval);
	pollInterval = setInterval(() => {
		fetchUnreadCount();
		fetchUnwatchedCount();
	}, intervalMs);
}

export function stopPolling(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}
