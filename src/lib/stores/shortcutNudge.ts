import { writable, derived } from 'svelte/store';
import { showInstallBanner } from './pwa';

const STORAGE_KEY = 'scrolly_shortcut_nudge_dismissed';

function getInitial(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(STORAGE_KEY) === 'true';
}

export const shortcutNudgeDismissed = writable(getInitial());

/** Show the shortcut nudge only when install banner is not visible and nudge hasn't been dismissed */
export const showShortcutNudge = derived(
	[shortcutNudgeDismissed, showInstallBanner],
	([$dismissed, $showInstall]) => !$dismissed && !$showInstall
);

export function dismissShortcutNudge(): void {
	shortcutNudgeDismissed.set(true);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, 'true');
	}
}
