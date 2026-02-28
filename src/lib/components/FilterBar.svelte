<script lang="ts">
	import type { FeedFilter } from '$lib/feed';

	const {
		filter,
		onfilter
	}: {
		filter: FeedFilter;
		onfilter: (f: FeedFilter) => void;
	} = $props();

	const filters: FeedFilter[] = ['unwatched', 'all', 'watched', 'favorites'];
	const labels = ['New', 'All', 'Watched', 'Faves'];
	const activeIndex = $derived(filters.indexOf(filter));
</script>

<div class="filter-bar">
	<div class="filter-tabs">
		<div class="indicator" style="transform: translateX({activeIndex * 100}%)"></div>
		{#each filters as f, i (f)}
			<button class:active={filter === f} onclick={() => onfilter(f)}>
				<span class="tab-label">{labels[i]}</span>
			</button>
		{/each}
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
		position: relative;
	}

	.indicator {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 25%;
		display: flex;
		justify-content: center;
		transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
		pointer-events: none;
	}

	.indicator::after {
		content: '';
		width: 20px;
		height: 3px;
		background: var(--text-primary);
		border-radius: var(--radius-full);
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
</style>
