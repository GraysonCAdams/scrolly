import { ACCENT_COLORS, type AccentColorKey } from '$lib/colors';

export type NotificationPrefs = {
	newAdds: boolean;
	reactions: boolean;
	comments: boolean;
	dailyReminder: boolean;
};

// --- Theme ---

export function applyTheme(value: 'system' | 'light' | 'dark'): void {
	if (value === 'system') {
		document.documentElement.removeAttribute('data-theme');
	} else {
		document.documentElement.dataset.theme = value;
	}
	document.cookie = `scrolly_theme=${value};path=/;max-age=31536000;SameSite=Lax`;
}

export async function saveThemePreference(value: 'system' | 'light' | 'dark'): Promise<void> {
	await fetch('/api/profile/preferences', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ themePreference: value })
	});
}

// --- Playback ---

export async function saveAutoScroll(value: boolean): Promise<void> {
	await fetch('/api/profile/preferences', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ autoScroll: value })
	});
}

export async function saveMutedByDefault(value: boolean): Promise<void> {
	await fetch('/api/profile/preferences', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ mutedByDefault: value })
	});
}

// --- Accent color ---

export function applyAccentColor(key: AccentColorKey): void {
	const color = ACCENT_COLORS[key];
	document.documentElement.style.setProperty('--accent-primary', color.hex);
	document.documentElement.style.setProperty('--accent-primary-dark', color.dark);
	document.cookie = `scrolly_accent=${encodeURIComponent(JSON.stringify({ hex: color.hex, dark: color.dark }))};path=/;max-age=31536000;SameSite=Lax`;
}

export async function saveAccentColor(key: AccentColorKey): Promise<void> {
	await fetch('/api/group/accent', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ accentColor: key })
	});
}

// --- Notification preferences ---

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
	const res = await fetch('/api/notifications/preferences');
	if (res.ok) return res.json();
	return { newAdds: true, reactions: true, comments: true, dailyReminder: false };
}

export async function updateNotificationPref(key: string, value: boolean): Promise<void> {
	await fetch('/api/notifications/preferences', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ [key]: value })
	});
}
