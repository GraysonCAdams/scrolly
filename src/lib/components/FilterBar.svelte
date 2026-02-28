<script lang="ts">
	import type { FeedFilter } from '$lib/feed';

	const {
		filter,
		onfilter
	}: {
		filter: FeedFilter;
		onfilter: (f: FeedFilter) => void;
	} = $props();
</script>

<div class="filter-bar">
	<div class="filter-tabs">
		<button class:active={filter === 'unwatched'} onclick={() => onfilter('unwatched')}>
			<span class="tab-label">New</span>
		</button>
		<button class:active={filter === 'all'} onclick={() => onfilter('all')}>
			<span class="tab-label">All</span>
		</button>
		<button class:active={filter === 'watched'} onclick={() => onfilter('watched')}>
			<span class="tab-label">Watched</span>
		</button>
		<button class:active={filter === 'favorites'} onclick={() => onfilter('favorites')}>
			<span class="tab-label">Faves</span>
		</button>
	</div>
</div>

<style>
	.filter-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		justify-content: center;
		padding: max(var(--space-md), env(safe-area-inset-top)) var(--space-lg) var(--space-sm);
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.6) 0%,
			rgba(0, 0, 0, 0.3) 70%,
			transparent 100%
		);
		pointer-events: none;
	}

	.filter-tabs {
		display: flex;
		gap: 0;
		pointer-events: auto;
	}

	.filter-tabs button {
		position: relative;
		flex-shrink: 0;
		padding: 8px 16px;
		background: none;
		color: rgba(255, 255, 255, 0.5);
		border: none;
		border-radius: 0;
		font-family: var(--font-display);
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.filter-tabs button.active {
		color: #fff;
	}

	.tab-label {
		position: relative;
		display: inline-block;
	}

	.filter-tabs button.active .tab-label::after {
		content: '';
		position: absolute;
		bottom: -6px;
		left: 50%;
		transform: translateX(-50%);
		width: 20px;
		height: 3px;
		background: var(--text-primary);
		border-radius: var(--radius-full);
	}
</style>
