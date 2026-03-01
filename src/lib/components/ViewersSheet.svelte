<script lang="ts">
	import { relativeTime } from '$lib/utils';

	interface Viewer {
		userId: string;
		username: string;
		avatarPath: string | null;
		watchPercent: number;
		status: 'viewed' | 'skipped';
		watchedAt: string;
	}

	const {
		clipId,
		ondismiss
	}: {
		clipId: string;
		ondismiss: () => void;
	} = $props();

	let viewers = $state<Viewer[]>([]);
	let loading = $state(true);
	let visible = $state(false);

	// Animate in
	$effect(() => {
		requestAnimationFrame(() => {
			visible = true;
		});
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Load viewers
	$effect(() => {
		loadViewers();
	});

	async function loadViewers() {
		loading = true;
		const res = await fetch(`/api/clips/${clipId}/views`);
		if (res.ok) {
			const data = await res.json();
			viewers = data.views;
		}
		loading = false;
	}

	function dismiss() {
		visible = false;
		setTimeout(ondismiss, 300);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" class:visible onclick={dismiss} role="presentation"></div>

<div class="sheet" class:visible>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="handle-bar" onclick={dismiss} role="button" tabindex="-1">
		<div class="handle"></div>
	</div>

	<div class="header">
		<span class="title">Views{viewers.length > 0 ? ` (${viewers.length})` : ''}</span>
	</div>

	<div class="viewers-list">
		{#if loading}
			<p class="empty">Loading...</p>
		{:else if viewers.length === 0}
			<p class="empty">No views yet</p>
		{:else}
			{#each viewers as viewer (viewer.userId)}
				<div class="viewer-row">
					<div class="viewer-avatar">
						<span class="avatar-initial">{viewer.username.charAt(0).toUpperCase()}</span>
					</div>
					<div class="viewer-info">
						<span class="viewer-name">{viewer.username}</span>
						<span class="viewer-time">{relativeTime(viewer.watchedAt)}</span>
					</div>
					<span
						class="status-badge"
						class:viewed={viewer.status === 'viewed'}
						class:skipped={viewer.status === 'skipped'}
					>
						{viewer.status === 'viewed' ? 'Viewed' : 'Skipped'}
					</span>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 99;
		opacity: 0;
		transition: opacity 300ms ease;
	}

	.overlay.visible {
		opacity: 1;
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 50vh;
		background: var(--bg-surface);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		transform: translateY(100%);
		transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	.sheet.visible {
		transform: translateY(0);
	}

	.handle-bar {
		display: flex;
		justify-content: center;
		padding: var(--space-md);
		cursor: pointer;
	}

	.handle {
		width: 36px;
		height: 4px;
		background: var(--bg-subtle);
		border-radius: 2px;
	}

	.header {
		padding: 0 var(--space-lg) var(--space-md);
		border-bottom: 1px solid var(--bg-subtle);
	}

	.title {
		font-family: var(--font-display);
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.viewers-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md) var(--space-lg);
		-webkit-overflow-scrolling: touch;
	}

	.empty {
		text-align: center;
		color: var(--text-muted);
		padding: var(--space-2xl);
		margin: 0;
	}

	.viewer-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
	}

	.viewer-avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		background: var(--accent-magenta);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.avatar-initial {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 0.875rem;
	}

	.viewer-info {
		flex: 1;
		min-width: 0;
	}

	.viewer-name {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.viewer-time {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.status-badge {
		padding: 3px 10px;
		border-radius: var(--radius-full);
		font-size: 0.6875rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.status-badge.viewed {
		background: rgba(56, 161, 105, 0.15);
		color: var(--success);
	}

	.status-badge.skipped {
		background: rgba(251, 191, 36, 0.15);
		color: var(--warning);
	}
</style>
