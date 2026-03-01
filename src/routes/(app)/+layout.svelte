<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { addVideoModalOpen } from '$lib/stores/addVideoModal';
	import { activitySheetOpen } from '$lib/stores/activitySheet';
	import { homeTapSignal } from '$lib/stores/homeTap';
	import { unreadCount, startPolling, stopPolling } from '$lib/stores/notifications';
	import { globalMuted } from '$lib/stores/mute';
	import { initAudioContext } from '$lib/audio/normalizer';
	import { feedUiHidden } from '$lib/stores/uiHidden';
	import ActivitySheet from '$lib/components/ActivitySheet.svelte';
	const { children }: { children: Snippet } = $props();

	const isFeed = $derived(page.url.pathname === '/');
	const isSettings = $derived(page.url.pathname === '/settings');

	const pageTitle = $derived.by(() => {
		if (isSettings) return 'Settings';
		return '';
	});

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
			stopPolling();
			themeObserver.disconnect();
			darkMq.removeEventListener('change', syncThemeColor);
		};
	});

	function syncThemeColor() {
		const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
		const bgPrimary = getComputedStyle(document.documentElement)
			.getPropertyValue('--bg-primary')
			.trim();
		metas.forEach((m) => m.setAttribute('content', bgPrimary));
	}

	// Re-sync when navigating between feed and other pages
	$effect(() => {
		// eslint-disable-next-line sonarjs/void-use -- reading isFeed to trigger effect re-run
		void isFeed;
		syncThemeColor();
	});
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- static routes, resolve() unnecessary -->
<div class="app-shell">
	{#if isFeed}
		<!-- Feed: notification bell floats top-right -->
		<button
			class="feed-notif-btn"
			class:ui-hidden={$feedUiHidden}
			onclick={() => activitySheetOpen.set(true)}
		>
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
		</button>
	{:else}
		<!-- Non-feed pages: top bar with title -->
		<nav class="top-bar">
			<span class="top-title">{pageTitle}</span>
			{#if !isSettings}
				<button class="top-bar-action" onclick={() => activitySheetOpen.set(true)}>
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
				</button>
			{/if}
		</nav>
	{/if}
	<main class:immersive={isFeed}>
		{@render children()}
	</main>
	<nav class="bottom-tabs" class:overlay-mode={isFeed} class:ui-hidden={isFeed && $feedUiHidden}>
		{#if isFeed}
			<button class="tab active" onclick={() => homeTapSignal.update((n) => n + 1)}>
				<span class="icon-wrap">
					<svg
						class="icon-filled"
						class:hidden={!isFeed}
						viewBox="0 0 24 24"
						fill="currentColor"
						stroke="none"
					>
						<path
							d="M12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 1.42 1.42L4 12.41V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.59l.29.3a1 1 0 0 0 1.42-1.42l-9-9zM10 20v-6h4v6h-4z"
						/>
					</svg>
					<svg
						class="icon-outlined"
						class:hidden={isFeed}
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
				</span>
				<span>Home</span>
			</button>
		{:else}
			<a href="/" class="tab">
				<span class="icon-wrap">
					<svg
						class="icon-filled"
						class:hidden={!isFeed}
						viewBox="0 0 24 24"
						fill="currentColor"
						stroke="none"
					>
						<path
							d="M12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 1.42 1.42L4 12.41V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.59l.29.3a1 1 0 0 0 1.42-1.42l-9-9zM10 20v-6h4v6h-4z"
						/>
					</svg>
					<svg
						class="icon-outlined"
						class:hidden={isFeed}
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
				</span>
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
			<span class="icon-wrap">
				<svg
					class="icon-filled"
					class:hidden={!isSettings}
					viewBox="0 0 24 24"
					fill="currentColor"
					stroke="none"
				>
					<path
						d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
					/>
				</svg>
				<svg
					class="icon-outlined"
					class:hidden={isSettings}
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
			</span>
			<span>Settings</span>
		</a>
	</nav>
</div>

{#if $activitySheetOpen}
	<ActivitySheet ondismiss={() => activitySheetOpen.set(false)} />
{/if}

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
		color: var(--reel-text);
		background: none;
		border: none;
		cursor: pointer;
		filter: drop-shadow(0 1px 3px var(--reel-text-shadow));
		transition: opacity 0.3s ease;
	}

	.feed-notif-btn.ui-hidden {
		opacity: 0;
		pointer-events: none;
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
		color: var(--constant-white);
		font-size: 0.625rem;
		font-weight: 700;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		animation: badge-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes badge-pop {
		from {
			transform: scale(0);
		}
		to {
			transform: scale(1);
		}
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
		background: none;
		border: none;
		cursor: pointer;
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
		background: color-mix(in srgb, var(--bg-elevated) 30%, transparent);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
		padding: var(--space-sm) 0;
		padding-bottom: max(var(--space-sm), env(safe-area-inset-bottom));
		z-index: 10;
		transition: opacity 0.3s ease;
	}

	.bottom-tabs.ui-hidden {
		opacity: 0;
		pointer-events: none;
	}

	.bottom-tabs.overlay-mode {
		background: linear-gradient(transparent, var(--reel-gradient-heavy));
		border-top: none;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
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
		color: var(--reel-text);
	}

	.tab svg {
		width: 24px;
		height: 24px;
	}

	.icon-wrap {
		position: relative;
		width: 24px;
		height: 24px;
	}

	.icon-wrap svg {
		position: absolute;
		inset: 0;
		transition: opacity 150ms ease;
	}

	.icon-wrap svg.hidden {
		opacity: 0;
	}

	.add-tab:active .add-icon {
		transform: scale(0.93);
	}

	.add-icon {
		transition: transform 100ms ease;
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
