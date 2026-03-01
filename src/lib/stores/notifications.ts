import { writable } from 'svelte/store';

export const unreadCount = writable<number>(0);

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

export function startPolling(intervalMs = 30000): void {
	fetchUnreadCount();
	if (pollInterval) clearInterval(pollInterval);
	pollInterval = setInterval(fetchUnreadCount, intervalMs);
}

export function stopPolling(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}
