/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `scrolly-${version}`;

// Assets to cache on install (app shell)
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
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
				caches
					.match(event.request)
					.then((cached) => cached || new Response('Offline', { status: 503 }))
			)
	);
});

sw.addEventListener('push', (event) => {
	if (!event.data) return;

	const data = event.data.json();
	const { title, body, icon, url, tag } = data;

	event.waitUntil(
		sw.registration.showNotification(title || 'scrolly', {
			body: body || '',
			icon: icon || '/icons/icon-192.png',
			badge: '/icons/icon-192.png',
			tag: tag || undefined,
			data: { url: url || '/' }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();

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
