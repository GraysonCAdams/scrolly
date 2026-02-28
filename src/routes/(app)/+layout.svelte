<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { addVideoModalOpen } from '$lib/stores/addVideoModal';
	import { homeTapSignal } from '$lib/stores/homeTap';
	import { unreadCount, startPolling } from '$lib/stores/notifications';
	import { globalMuted } from '$lib/stores/mute';
	import { initAudioContext } from '$lib/audio/normalizer';
	const { children }: { children: Snippet } = $props();

	const isFeed = $derived(page.url.pathname === '/');
	const isActivity = $derived(page.url.pathname === '/activity');
	const isSettings = $derived(page.url.pathname === '/settings');

	const pageTitle = $derived(isActivity ? 'Activity' : isSettings ? 'Settings' : '');

	onMount(() => {
		startPolling();
		// Initialize mute state from user preference
		const user = page.data?.user;
		if (user) {
			globalMuted.set(user.mutedByDefault ?? true);
		}

		// Initialize AudioContext on first user interaction (for volume normalization)
		function handleFirstInteraction() {
			initAudioContext();
			document.removeEventListener('click', handleFirstInteraction, true);
			document.removeEventListener('touchstart', handleFirstInteraction, true);
		}
		document.addEventListener('click', handleFirstInteraction, true);
		document.addEventListener('touchstart', handleFirstInteraction, true);

		// Sync theme-color meta tags with current theme for PWA chrome blending
		const themeObserver = new MutationObserver(() => syncThemeColor());
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});
		const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
		darkMq.addEventListener('change', syncThemeColor);

		return () => {
			themeObserver.disconnect();
			darkMq.removeEventListener('change', syncThemeColor);
		};
	});

	function syncThemeColor() {
		const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
		if (isFeed) {
			// Immersive feed: always black to blend with video content
			metas.forEach((m) => m.setAttribute('content', '#000000'));
		} else {
			// Match app background based on effective theme
			const manual = document.documentElement.dataset.theme;
			const isDark =
				manual === 'dark' ||
				(!manual && window.matchMedia('(prefers-color-scheme: dark)').matches);
			metas.forEach((m) => m.setAttribute('content', isDark ? '#000000' : '#FFFFFF'));
		}
	}

	// Re-sync when navigating between feed and other pages
	$effect(() => {
		void isFeed;
		syncThemeColor();
	});
</script>

<div class="app-shell">
	{#if isFeed}
		<!-- Feed: notification bell floats top-right -->
		<a href="/activity" class="feed-notif-btn">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
				<path d="M13.73 21a2 2 0 0 1-3.46 0" />
			</svg>
			{#if $unreadCount > 0}
				<span class="notif-badge">{$unreadCount > 99 ? '99+' : $unreadCount}</span>
			{/if}
		</a>
	{:else}
		<!-- Non-feed pages: top bar with title and bell -->
		<nav class="top-bar">
			<span class="top-title">{pageTitle}</span>
			{#if !isActivity}
				<a href="/activity" class="top-bar-action">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
						<path d="M13.73 21a2 2 0 0 1-3.46 0" />
					</svg>
					{#if $unreadCount > 0}
						<span class="notif-badge">{$unreadCount > 99 ? '99+' : $unreadCount}</span>
					{/if}
				</a>
			{/if}
		</nav>
	{/if}
	<main class:immersive={isFeed}>
		{@render children()}
	</main>
	<nav class="bottom-tabs" class:overlay-mode={isFeed}>
		{#if isFeed}
			<button class="tab active" onclick={() => homeTapSignal.update((n) => n + 1)}>
				<!-- Filled home icon (active) -->
				<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
					<path
						d="M12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 1.42 1.42L4 12.41V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.59l.29.3a1 1 0 0 0 1.42-1.42l-9-9zM10 20v-6h4v6h-4z"
					/>
				</svg>
				<span>Home</span>
			</button>
		{:else}
			<a href="/" class="tab">
				<!-- Outlined home icon (inactive) -->
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
					<path d="M9 21V12h6v9" />
				</svg>
				<span>Home</span>
			</a>
		{/if}
		<button
			class="tab add-tab"
			onclick={() => {
				if (isFeed) addVideoModalOpen.set(true);
				else window.location.href = '/';
			}}
		>
			<div class="add-icon">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
			</div>
			<span>Add</span>
		</button>
		<a href="/settings" class="tab" class:active={isSettings}>
			{#if isSettings}
				<!-- Filled gear icon (active) -->
				<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
					<path
						d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
					/>
				</svg>
			{:else}
				<!-- Outlined gear icon (inactive) -->
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="3" />
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
					/>
				</svg>
			{/if}
			<span>Settings</span>
		</a>
	</nav>
</div>

<style>
	.app-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	/* Feed: floating notification bell (top-right) */
	.feed-notif-btn {
		position: fixed;
		top: max(var(--space-md), env(safe-area-inset-top));
		right: var(--space-lg);
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		color: #fff;
		text-decoration: none;
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
	}

	.feed-notif-btn svg {
		width: 24px;
		height: 24px;
	}

	.notif-badge {
		position: absolute;
		top: 2px;
		right: 2px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		background: var(--accent-magenta);
		color: #fff;
		font-size: 0.625rem;
		font-weight: 700;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	/* Non-feed: top bar with title */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: calc(var(--space-md) + env(safe-area-inset-top)) var(--space-lg) var(--space-md);
		background: var(--bg-primary);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.top-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.0625rem;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.top-bar-action {
		position: absolute;
		right: var(--space-lg);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		color: var(--text-secondary);
		text-decoration: none;
	}

	.top-bar-action svg {
		width: 22px;
		height: 22px;
	}

	main {
		flex: 1;
		padding: var(--space-lg) var(--space-sm);
		padding-bottom: calc(80px + env(safe-area-inset-bottom));
	}

	main.immersive {
		padding: 0;
		overflow: hidden;
	}

	/* Bottom tab bar — 3 tabs: Home, Add, Settings */
	.bottom-tabs {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		background: var(--bg-elevated);
		border-top: 1px solid var(--border);
		padding: var(--space-sm) 0;
		padding-bottom: max(var(--space-sm), env(safe-area-inset-bottom));
		z-index: 10;
	}

	.bottom-tabs.overlay-mode {
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
		border-top: none;
		z-index: 50;
	}

	.tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		text-decoration: none;
		color: var(--text-muted);
		font-size: 0.625rem;
		font-family: var(--font-body);
		padding: var(--space-xs) 0;
		transition: color 0.2s ease;
		background: none;
		border: none;
		cursor: pointer;
	}

	.overlay-mode .tab {
		color: rgba(255, 255, 255, 0.5);
	}

	.tab.active {
		color: var(--text-primary);
	}

	.overlay-mode .tab.active {
		color: #fff;
	}

	.tab svg {
		width: 24px;
		height: 24px;
	}

	.add-icon {
		width: 36px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-primary);
		border-radius: 6px;
		color: var(--bg-primary);
	}

	.add-icon svg {
		width: 18px;
		height: 18px;
	}
</style>
