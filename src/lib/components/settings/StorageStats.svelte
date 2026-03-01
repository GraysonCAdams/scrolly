<script lang="ts">
	import { onMount } from 'svelte';

	let loading = $state(true);
	let stats = $state<{
		clipCount: number;
		memberCount: number;
		storageMb: number;
		maxStorageMb: number | null;
	} | null>(null);

	onMount(async () => {
		const res = await fetch('/api/group/stats');
		if (res.ok) {
			stats = await res.json();
		}
		loading = false;
	});

	function formatStorage(mb: number): string {
		if (mb >= 1024) {
			return `${(mb / 1024).toFixed(1)} GB`;
		}
		return `${mb} MB`;
	}

	const usagePercent = $derived(
		stats?.maxStorageMb ? Math.min((stats.storageMb / stats.maxStorageMb) * 100, 100) : null
	);
</script>

{#if loading}
	<p class="hint">Loading...</p>
{:else if stats}
	<div class="stats-grid">
		<div class="stat-row">
			<span class="stat-label">Members</span>
			<span class="stat-value">{stats.memberCount}</span>
		</div>
		<div class="stat-row">
			<span class="stat-label">Clips</span>
			<span class="stat-value">{stats.clipCount}</span>
		</div>
		<div class="stat-row">
			<span class="stat-label">Storage used</span>
			<span class="stat-value">
				{formatStorage(stats.storageMb)}
				{#if stats.maxStorageMb}
					<span class="stat-max">/ {formatStorage(stats.maxStorageMb)}</span>
				{/if}
			</span>
		</div>
		{#if usagePercent !== null}
			<div class="usage-bar-container">
				<div class="usage-bar" style="width: {usagePercent}%"></div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.hint {
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.stats-grid {
		display: flex;
		flex-direction: column;
	}

	.stat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--bg-surface);
	}

	.stat-row:last-of-type {
		border-bottom: none;
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.stat-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.stat-max {
		color: var(--text-muted);
		font-weight: 400;
	}

	.usage-bar-container {
		height: 4px;
		background: var(--bg-surface);
		border-radius: 2px;
		overflow: hidden;
		margin-top: var(--space-sm);
	}

	.usage-bar {
		height: 100%;
		background: var(--accent-primary);
		border-radius: 2px;
		transition: width 0.3s ease;
	}
</style>
