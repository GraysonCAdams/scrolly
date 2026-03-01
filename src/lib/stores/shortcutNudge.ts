import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import { showInstallBanner } from './pwa';

const STORAGE_KEY = 'scrolly_shortcut_nudge_dismissed';

function getInitial(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE_KEY) === 'true';
}

function isIosDevice(): boolean {
	if (!browser) return false;
	return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export const shortcutNudgeDismissed = writable(getInitial());

/** Show the shortcut nudge only on iOS, when install banner is not visible and nudge hasn't been dismissed */
export const showShortcutNudge = derived(
	[shortcutNudgeDismissed, showInstallBanner],
	([$dismissed, $showInstall]) => isIosDevice() && !$dismissed && !$showInstall
);

export function dismissShortcutNudge(): void {
	shortcutNudgeDismissed.set(true);
	if (browser) {
		localStorage.setItem(STORAGE_KEY, 'true');
	}
}
