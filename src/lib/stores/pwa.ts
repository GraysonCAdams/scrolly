import { writable, derived } from 'svelte/store';

// --- Standalone mode detection ---

export const isStandalone = writable(false);

export function detectStandaloneMode(): boolean {
	if (typeof window === 'undefined') return false;
	// iOS Safari
	if ((navigator as any).standalone === true) return true;
	// Chrome / Edge / Firefox
	if (window.matchMedia('(display-mode: standalone)').matches) return true;
	return false;
}

// --- Install prompt ---

let deferredPrompt: any = null;

export const canInstall = writable(false);
export const installDismissed = writable(false);

/** Whether to show the install banner (can install + not dismissed + not already standalone) */
export const showInstallBanner = derived(
	[canInstall, installDismissed, isStandalone],
	([$canInstall, $installDismissed, $isStandalone]) =>
		$canInstall && !$installDismissed && !$isStandalone
);

export function initInstallPrompt(): void {
	window.addEventListener('beforeinstallprompt', (e: Event) => {
		e.preventDefault();
		deferredPrompt = e;
		canInstall.set(true);
	});

	window.addEventListener('appinstalled', () => {
		canInstall.set(false);
		deferredPrompt = null;
		isStandalone.set(true);
	});
}

export async function triggerInstall(): Promise<boolean> {
	if (!deferredPrompt) return false;
	deferredPrompt.prompt();
	const { outcome } = await deferredPrompt.userChoice;
	deferredPrompt = null;
	canInstall.set(false);
	return outcome === 'accepted';
}

export function dismissInstall(): void {
	installDismissed.set(true);
}

// --- Service worker update ---

export const swUpdateAvailable = writable(false);

let waitingWorker: ServiceWorker | null = null;

export function initSwUpdateListener(): void {
	if (!('serviceWorker' in navigator)) return;

	navigator.serviceWorker.ready.then((registration) => {
		registration.addEventListener('updatefound', () => {
			const newWorker = registration.installing;
			if (!newWorker) return;

			newWorker.addEventListener('statechange', () => {
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					// New SW installed but waiting — an update is available
					waitingWorker = newWorker;
					swUpdateAvailable.set(true);
				}
			});
		});
	});

	// Listen for the new SW taking over (after skipWaiting)
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		window.location.reload();
	});
}

export function applySwUpdate(): void {
	if (!waitingWorker) return;
	waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}
