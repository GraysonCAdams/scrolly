<script lang="ts">
	import { onMount } from 'svelte';
	import PlatformIcon from '$lib/components/PlatformIcon.svelte';
	import { confirm } from '$lib/stores/confirm';
	import { toast } from '$lib/stores/toasts';

	type Clip = {
		id: string;
		title: string | null;
		platform: string;
		contentType: string;
		addedBy: string;
		addedByUsername: string;
		createdAt: string;
		sizeMb: number;
		thumbnailPath: string | null;
		status: string;
	};

	type MonthGroup = {
		key: string;
		label: string;
		clips: Clip[];
		totalSizeMb: number;
	};

	const PAGE_SIZE = 30;

	let loading = $state(true);
	let loadingMore = $state(false);
	let clips = $state<Clip[]>([]);
	let totalSizeMb = $state(0);
	let totalClips = $state(0);
	let hasMore = $state(false);
	let sortBy = $state<'largest' | 'newest'>('largest');
	let selected = $state(new Set<string>());
	let _deleting = $state(false);
	let sentinel = $state<HTMLDivElement | null>(null);
	let prevSort = $state(sortBy);

	const monthGroups = $derived(() => {
		const groups = new Map<string, MonthGroup>();
		for (const clip of clips) {
			const date = new Date(clip.createdAt);
			const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
			if (!groups.has(key)) {
				groups.set(key, { key, label, clips: [], totalSizeMb: 0 });
			}
			const group = groups.get(key)!;
			group.clips.push(clip);
			group.totalSizeMb = Math.round((group.totalSizeMb + clip.sizeMb) * 100) / 100;
		}
		// Sort groups by date descending
		return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
	});

	function buildParams(offset: number) {
		return `sort=${sortBy}&limit=${PAGE_SIZE}&offset=${offset}`;
	}

	async function loadInitial() {
		loading = true;
		clips = [];
		selected = new Set();
		const res = await fetch(`/api/group/clips?${buildParams(0)}`);
		if (res.ok) {
			const data = await res.json();
			clips = data.clips;
			totalSizeMb = data.totalSizeMb;
			totalClips = data.totalClips;
			hasMore = data.hasMore;
		}
		loading = false;
	}

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;
		const res = await fetch(`/api/group/clips?${buildParams(clips.length)}`);
		if (res.ok) {
			const data = await res.json();
			clips = [...clips, ...data.clips];
			hasMore = data.hasMore;
		}
		loadingMore = false;
	}

	onMount(() => {
		loadInitial();
	});

	// Re-fetch when sort changes (skip initial run)
	$effect(() => {
		if (sortBy !== prevSort) {
			prevSort = sortBy;
			loadInitial();
		}
	});

	// IntersectionObserver for infinite scroll
	$effect(() => {
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) loadMore();
			},
			{ rootMargin: '200px' }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	function formatSize(mb: number): string {
		if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
		if (mb >= 1) return `${mb.toFixed(1)} MB`;
		return `${Math.round(mb * 1024)} KB`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	function toggleSelect(id: string) {
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selected = next;
	}

	function selectAllInMonth(group: MonthGroup) {
		const next = new Set(selected);
		const allSelected = group.clips.every((c) => next.has(c.id));
		if (allSelected) {
			for (const c of group.clips) next.delete(c.id);
		} else {
			for (const c of group.clips) next.add(c.id);
		}
		selected = next;
	}

	async function handleDelete(ids: string[], message: string) {
		if (ids.length === 0) return;

		const confirmed = await confirm({
			title: 'Delete Clips',
			message,
			confirmLabel: 'Delete',
			destructive: true
		});
		if (!confirmed) return;

		_deleting = true;
		try {
			const res = await fetch('/api/group/clips', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clipIds: ids })
			});

			if (res.ok) {
				const deletedSet = new Set(ids);
				const deletedSize = clips
					.filter((c) => deletedSet.has(c.id))
					.reduce((sum, c) => sum + c.sizeMb, 0);
				clips = clips.filter((c) => !deletedSet.has(c.id));
				totalSizeMb = Math.round((totalSizeMb - deletedSize) * 10) / 10;
				totalClips = Math.max(0, totalClips - ids.length);
				selected = new Set([...selected].filter((id) => !deletedSet.has(id)));
				toast.success(`Deleted ${ids.length} clip${ids.length === 1 ? '' : 's'}`);
			} else {
				toast.error('Failed to delete clips');
			}
		} catch {
			toast.error('Failed to delete clips');
		}
		_deleting = false;
	}

	function deleteSingle(clip: Clip) {
		handleDelete(
			[clip.id],
			`Delete "${clip.title || 'Untitled clip'}"? This will permanently remove the clip and free up ${formatSize(clip.sizeMb)}.`
		);
	}

	function deleteMonth(group: MonthGroup) {
		handleDelete(
			group.clips.map((c) => c.id),
			`Delete all ${group.clips.length} clips from ${group.label}? This will free up ${formatSize(group.totalSizeMb)}.`
		);
	}

	function deleteSelected() {
		const ids = [...selected];
		const total = clips.filter((c) => selected.has(c.id)).reduce((sum, c) => sum + c.sizeMb, 0);
		handleDelete(
			ids,
			`Delete ${selected.size} selected clip${selected.size === 1 ? '' : 's'}? This will free up ${formatSize(total)}.`
		);
	}
</script>

{#if loading}
	<div class="loading-state">
		<p>Loading clips...</p>
	</div>
{:else if clips.length === 0}
	<div class="empty-state">
		<p>No clips stored yet</p>
	</div>
{:else}
	<!-- Storage summary -->
	<div class="storage-summary">
		<div class="storage-header">
			<span class="storage-total">{formatSize(totalSizeMb)}</span>
			<span class="storage-label">{totalClips} clip{totalClips === 1 ? '' : 's'}</span>
		</div>
		<div class="storage-bar">
			<div class="storage-bar-fill" style="width: 100%"></div>
		</div>
	</div>

	<!-- Sort controls -->
	<div class="sort-controls">
		<button
			class="sort-btn"
			class:active={sortBy === 'largest'}
			onclick={() => (sortBy = 'largest')}>Largest</button
		>
		<button class="sort-btn" class:active={sortBy === 'newest'} onclick={() => (sortBy = 'newest')}
			>Newest</button
		>
	</div>

	<!-- Clips by month -->
	<div class="clips-list">
		{#each monthGroups() as group}
			<div class="month-group">
				<div class="month-header">
					<button class="month-select-btn" onclick={() => selectAllInMonth(group)}>
						<div class="checkbox" class:checked={group.clips.every((c) => selected.has(c.id))}>
							{#if group.clips.every((c) => selected.has(c.id))}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							{/if}
						</div>
					</button>
					<div class="month-info">
						<span class="month-label">{group.label}</span>
						<span class="month-meta"
							>{group.clips.length} clip{group.clips.length === 1 ? '' : 's'} &middot; {formatSize(
								group.totalSizeMb
							)}</span
						>
					</div>
					<button
						class="month-delete-btn"
						onclick={() => deleteMonth(group)}
						aria-label="Delete all clips from {group.label}"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="3 6 5 6 21 6" />
							<path
								d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
							/>
						</svg>
					</button>
				</div>

				{#each group.clips as clip}
					<div class="clip-row" class:selected={selected.has(clip.id)}>
						<button class="clip-select-btn" onclick={() => toggleSelect(clip.id)}>
							<div class="checkbox" class:checked={selected.has(clip.id)}>
								{#if selected.has(clip.id)}
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="3"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
								{/if}
							</div>
						</button>

						<div class="clip-thumb">
							{#if clip.thumbnailPath}
								<img src="/api/thumbnails/{clip.thumbnailPath.split('/').pop()}" alt="" />
							{:else}
								<div class="clip-thumb-placeholder">
									<PlatformIcon platform={clip.platform} size={16} />
								</div>
							{/if}
						</div>

						<div class="clip-info">
							<div class="clip-title-row">
								<span class="clip-title">{clip.title || 'Untitled'}</span>
								<PlatformIcon platform={clip.platform} size={12} />
							</div>
							<span class="clip-meta">
								{clip.addedByUsername} &middot; {formatDate(clip.createdAt)}
							</span>
						</div>

						<div class="clip-actions">
							<span class="clip-size">{formatSize(clip.sizeMb)}</span>
							<button
								class="clip-delete-btn"
								onclick={() => deleteSingle(clip)}
								aria-label="Delete clip"
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M18 6L6 18M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/each}

		<!-- Infinite scroll sentinel -->
		{#if hasMore}
			<div class="load-more-sentinel" bind:this={sentinel}>
				{#if loadingMore}
					<p class="loading-hint">Loading more...</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Floating action bar when items selected -->
	{#if selected.size > 0}
		<div class="selection-bar">
			<span class="selection-count">{selected.size} selected</span>
			<button class="selection-delete-btn" onclick={deleteSelected}> Delete </button>
		</div>
	{/if}
{/if}

<style>
	.loading-state,
	.empty-state {
		padding: var(--space-xl) 0;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	/* Storage summary */
	.storage-summary {
		padding: var(--space-lg);
		background: var(--bg-surface);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);
	}

	.storage-header {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.storage-total {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.storage-label {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.storage-bar {
		height: 6px;
		background: var(--bg-primary);
		border-radius: 3px;
		overflow: hidden;
	}

	.storage-bar-fill {
		height: 100%;
		background: var(--accent-primary);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	/* Sort controls */
	.sort-controls {
		display: flex;
		gap: 2px;
		background: var(--bg-surface);
		border-radius: var(--radius-full);
		padding: 3px;
		margin-bottom: var(--space-lg);
	}

	.sort-btn {
		flex: 1;
		padding: var(--space-xs) var(--space-md);
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.sort-btn.active {
		background: var(--text-primary);
		color: var(--bg-primary);
	}

	/* Month groups */
	.clips-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.month-group {
		background: var(--bg-elevated);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.month-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-md);
		border-bottom: 1px solid var(--bg-surface);
	}

	.month-select-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		flex-shrink: 0;
	}

	.month-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.month-label {
		font-family: var(--font-display);
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.month-meta {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.month-delete-btn {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition:
			color 0.2s ease,
			background 0.2s ease;
		padding: 0;
	}

	.month-delete-btn:hover {
		color: var(--error);
		background: color-mix(in srgb, var(--error) 10%, transparent);
	}

	.month-delete-btn svg {
		width: 16px;
		height: 16px;
	}

	/* Checkbox */
	.checkbox {
		width: 20px;
		height: 20px;
		border-radius: 6px;
		border: 2px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.checkbox.checked {
		background: var(--accent-primary);
		border-color: var(--accent-primary);
	}

	.checkbox svg {
		width: 12px;
		height: 12px;
		color: #000;
	}

	/* Clip rows */
	.clip-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--bg-surface);
		transition: background 0.15s ease;
	}

	.clip-row:last-child {
		border-bottom: none;
	}

	.clip-row.selected {
		background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
	}

	.clip-select-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		flex-shrink: 0;
	}

	.clip-thumb {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		flex-shrink: 0;
		background: var(--bg-surface);
	}

	.clip-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.clip-thumb-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
	}

	.clip-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.clip-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.clip-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.clip-meta {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.clip-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	.clip-size {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.clip-delete-btn {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition:
			color 0.2s ease,
			background 0.2s ease;
		padding: 0;
	}

	.clip-delete-btn:hover {
		color: var(--error);
		background: color-mix(in srgb, var(--error) 10%, transparent);
	}

	.clip-delete-btn svg {
		width: 14px;
		height: 14px;
	}

	/* Load more */
	.load-more-sentinel {
		padding: var(--space-lg) 0;
		text-align: center;
	}

	.loading-hint {
		color: var(--text-muted);
		font-size: 0.8125rem;
		margin: 0;
	}

	/* Selection bar */
	.selection-bar {
		position: fixed;
		bottom: calc(72px + env(safe-area-inset-bottom, 0px));
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-sm) var(--space-sm) var(--space-lg);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		z-index: 50;
		animation: slide-up 0.2s ease;
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.selection-count {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.selection-delete-btn {
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-full);
		border: none;
		background: var(--error);
		color: #fff;
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.1s ease;
		white-space: nowrap;
	}

	.selection-delete-btn:active {
		transform: scale(0.97);
	}
</style>
