<script lang="ts">
	import favicon from '$lib/assets/favicon.svg?url';
	import ToastStack from '$lib/components/ToastStack.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	const { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<ToastStack />
<ConfirmDialog />

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	/* Dark theme (default) */
	:global(:root) {
		--bg-primary: #000000;
		--bg-elevated: #111111;
		--bg-surface: #1a1a1a;
		--bg-subtle: #222222;

		--text-primary: #ffffff;
		--text-secondary: #999999;
		--text-muted: #666666;

		--border: #333333;

		--accent-primary: #ff6b35;
		--accent-primary-dark: #d4551f;
		--accent-magenta: #ff2d78;
		--accent-blue: #4a9eff;

		--success: #38a169;
		--error: #e53e3e;
		--warning: #fbbf24;

		--bg-sky: #7ec8e3;
		--bg-sky-light: #b8dfee;

		--picker-bg: rgba(30, 30, 30, 0.9);
		--overlay-btn: rgba(255, 255, 255, 0.15);
		--overlay-btn-active: rgba(255, 255, 255, 0.25);
		--overlay-text: rgba(255, 255, 255, 0.6);
		--overlay-track: rgba(255, 255, 255, 0.2);

		--radius-sm: 8px;
		--radius-md: 12px;
		--radius-lg: 16px;
		--radius-xl: 20px;
		--radius-full: 9999px;

		--space-xs: 0.25rem;
		--space-sm: 0.5rem;
		--space-md: 0.75rem;
		--space-lg: 1rem;
		--space-xl: 1.5rem;
		--space-2xl: 2rem;
		--space-3xl: 3rem;

		--font-display: 'Sora', system-ui, sans-serif;
		--font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
	}

	/* System preference: light (when no manual override to dark) */
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme='dark'])) {
			--bg-primary: #ffffff;
			--bg-elevated: #f5f5f5;
			--bg-surface: #eeeeee;
			--bg-subtle: #e0e0e0;
			--text-primary: #000000;
			--text-secondary: #555555;
			--text-muted: #999999;
			--border: #dddddd;
			--picker-bg: rgba(255, 255, 255, 0.9);
			--overlay-btn: rgba(0, 0, 0, 0.1);
			--overlay-btn-active: rgba(0, 0, 0, 0.15);
			--overlay-text: rgba(0, 0, 0, 0.5);
			--overlay-track: rgba(0, 0, 0, 0.15);
		}
	}

	/* Manual override: light */
	:global(:root[data-theme='light']) {
		--bg-primary: #ffffff;
		--bg-elevated: #f5f5f5;
		--bg-surface: #eeeeee;
		--bg-subtle: #e0e0e0;
		--text-primary: #000000;
		--text-secondary: #555555;
		--text-muted: #999999;
		--border: #dddddd;
		--picker-bg: rgba(255, 255, 255, 0.9);
		--overlay-btn: rgba(0, 0, 0, 0.1);
		--overlay-btn-active: rgba(0, 0, 0, 0.15);
		--overlay-text: rgba(0, 0, 0, 0.5);
		--overlay-track: rgba(0, 0, 0, 0.15);
	}

	/* Manual override: dark */
	:global(:root[data-theme='dark']) {
		--bg-primary: #000000;
		--bg-elevated: #111111;
		--bg-surface: #1a1a1a;
		--bg-subtle: #222222;
		--text-primary: #ffffff;
		--text-secondary: #999999;
		--text-muted: #666666;
		--border: #333333;
		--picker-bg: rgba(30, 30, 30, 0.9);
		--overlay-btn: rgba(255, 255, 255, 0.15);
		--overlay-btn-active: rgba(255, 255, 255, 0.25);
		--overlay-text: rgba(255, 255, 255, 0.6);
		--overlay-track: rgba(255, 255, 255, 0.2);
	}

	:global(body) {
		margin: 0;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: var(--font-body);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
</style>
