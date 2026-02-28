/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `scrolly-${version}`;
const OFFLINE_URL = '/offline';

// Assets to cache on install (app shell)
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			await cache.addAll(ASSETS);
			// Precache offline fallback page
			await cache.add(OFFLINE_URL);
		})
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
			)
			.then(() => sw.clients.claim())
	);
});

// Listen for skip-waiting message from client (safe update flow)
sw.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		sw.skipWaiting();
	}
});

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip API calls and video serving — always go to network
	if (url.pathname.startsWith('/api/')) return;

	// For app shell assets, serve from cache first
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
		return;
	}

	// For everything else, network first with cache fallback
	event.respondWith(
		fetch(event.request)
			.then((response) => {
				if (response.ok) {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
				}
				return response;
			})
			.catch(() =>
				caches.match(event.request).then((cached) => {
					if (cached) return cached;
					// For navigation requests, show offline page; for others return 503
					if (event.request.mode === 'navigate') {
						return caches.match(OFFLINE_URL).then(
							(offlinePage) =>
								offlinePage || new Response('Offline', { status: 503 })
						);
					}
					return new Response('Offline', { status: 503 });
				})
			)
	);
});

sw.addEventListener('push', (event) => {
	if (!event.data) return;

	const data = event.data.json();
	const { title, body, icon, url, tag, image } = data;

	event.waitUntil(
		Promise.all([
			sw.registration.showNotification(title || 'scrolly', {
				body: body || '',
				icon: icon || '/icons/icon-192.png',
				badge: '/icons/badge-72.png',
				tag: tag || undefined,
				image: image || undefined,
				data: { url: url || '/' }
			}),
			// Set app badge indicator on push
			(sw.navigator as any).setAppBadge?.()?.catch?.(() => {})
		])
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();

	// Clear app badge when user taps a notification
	(sw.navigator as any).clearAppBadge?.()?.catch?.(() => {});

	const url = event.notification.data?.url || '/';

	event.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if (client.url.includes(sw.location.origin) && 'focus' in client) {
					client.focus();
					client.navigate(url);
					return;
				}
			}
			return sw.clients.openWindow(url);
		})
	);
});

// Handle push subscription rotation (browser may change the subscription)
sw.addEventListener('pushsubscriptionchange', ((event: any) => {
	event.waitUntil(
		(async () => {
			try {
				const newSubscription = await sw.registration.pushManager.subscribe(
					event.oldSubscription?.options || { userVisibleOnly: true }
				);
				const subJson = newSubscription.toJSON();
				await fetch('/api/push/subscribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						endpoint: subJson.endpoint,
						keys: {
							p256dh: subJson.keys!.p256dh,
							auth: subJson.keys!.auth
						},
						oldEndpoint: event.oldSubscription?.endpoint
					})
				});
			} catch (err) {
				console.error('Failed to re-subscribe after pushsubscriptionchange:', err);
			}
		})()
	);
}) as EventListener);
