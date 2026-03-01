<script lang="ts">
	let { settingsHref }: { settingsHref: string } = $props();
</script>

<div class="done-state">
	<div class="done-icon">
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	</div>
	<h1 class="done-title">You're all set!</h1>
	<p class="done-desc">
		Now when you tap <strong>Share</strong> in any app and choose your shortcut, the clip will be added
		to scrolly in the background.
	</p>
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- settingsHref is pre-resolved by caller -->
	<a href={settingsHref} class="done-btn">Back to Settings</a>
</div>

<style>
	.done-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-3xl) 0;
	}
	.done-icon {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-full);
		background: var(--accent-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--space-xl);
	}
	.done-icon svg {
		width: 32px;
		height: 32px;
		color: var(--bg-primary);
	}
	.done-title {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0 0 var(--space-sm);
	}
	.done-desc {
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0 0 var(--space-xl);
		max-width: 320px;
	}
	.done-btn {
		display: inline-flex;
		padding: var(--space-sm) var(--space-xl);
		background: var(--bg-surface);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
		transition: transform 0.1s ease;
	}
	.done-btn:active {
		transform: scale(0.97);
	}
</style>
