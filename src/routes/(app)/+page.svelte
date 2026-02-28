<script lang="ts">
	import ReelItem from '$lib/components/ReelItem.svelte';
	import AddVideoModal from '$lib/components/AddVideoModal.svelte';
	import { addVideoModalOpen } from '$lib/stores/addVideoModal';
	import { addToast, clipReadySignal, viewClipSignal } from '$lib/stores/toasts';
	import { homeTapSignal } from '$lib/stores/homeTap';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	type Clip = {
		id: string;
		originalUrl: string;
		videoPath: string | null;
		audioPath: string | null;
		thumbnailPath: string | null;
		title: string | null;
		artist: string | null;
		albumArt: string | null;
		spotifyUrl: string | null;
		appleMusicUrl: string | null;
		youtubeMusicUrl: string | null;
		addedBy: string;
		addedByUsername: string;
		platform: string;
		status: string;
		contentType: string;
		durationSeconds: number | null;
		watched: boolean;
		favorited: boolean;
		commentCount: number;
		unreadCommentCount: number;
		viewCount: number;
		reactions: Record<string, { count: number; reacted: boolean }>;
		seenByOthers: boolean;
		createdAt: string;
	};

	let clips = $state<Clip[]>([]);
	let filter = $state<'all' | 'unwatched' | 'watched' | 'favorites'>('unwatched');
	let loading = $state(true);
	let activeIndex = $state(0);
	let scrollContainer: HTMLDivElement | null = $state(null);

	// Pagination state
	let hasMore = $state(true);
	let loadingMore = $state(false);
	let currentOffset = $state(0);
	const PAGE_SIZE = 20;
	const LOAD_MORE_THRESHOLD = 5;

	// Virtualization
	let isDesktopFeed = $state(false);
	const renderWindow = $derived(isDesktopFeed ? 3 : 2);

	// Pull-to-refresh state
	let pullDistance = $state(0);
	let isRefreshing = $state(false);
	let touchStartY = 0;
	let isPullingActive = false;
	const PULL_THRESHOLD = 80;

	// Drag-and-drop state
	let isDragging = $state(false);
	let dragCounter = 0;

	const currentUserId = $derived($page.data.user?.id ?? '');
	const autoScroll = $derived($page.data.user?.autoScroll ?? false);

	function buildClipParams(offset: number): URLSearchParams {
		const params = new URLSearchParams();
		if (filter !== 'all') params.set('filter', filter);
		params.set('limit', String(PAGE_SIZE));
		params.set('offset', String(offset));
		return params;
	}

	async function loadClips() {
		loading = true;
		currentOffset = 0;
		hasMore = true;
		const res = await fetch(`/api/clips?${buildClipParams(0)}`);
		if (res.ok) {
			const data = await res.json();
			clips = data.clips;
			hasMore = data.hasMore;
			currentOffset = data.clips.length;
		}
		loading = false;
	}

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;
		const res = await fetch(`/api/clips?${buildClipParams(currentOffset)}`);
		if (res.ok) {
			const data = await res.json();
			clips = [...clips, ...data.clips];
			hasMore = data.hasMore;
			currentOffset += data.clips.length;
		}
		loadingMore = false;
	}

	async function markWatched(clipId: string) {
		await fetch(`/api/clips/${clipId}/watched`, { method: 'POST' });
		clips = clips.map((c) =>
			c.id === clipId
				? { ...c, watched: true, viewCount: c.watched ? c.viewCount : c.viewCount + 1 }
				: c
		);
	}

	async function toggleFavorite(clipId: string) {
		const res = await fetch(`/api/clips/${clipId}/favorite`, { method: 'POST' });
		if (res.ok) {
			const data = await res.json();
			clips = clips.map((c) => (c.id === clipId ? { ...c, favorited: data.favorited } : c));
		}
	}

	async function retryDownload(clipId: string) {
		const res = await fetch(`/api/clips/${clipId}/retry`, { method: 'POST' });
		if (res.ok) {
			clips = clips.map((c) => (c.id === clipId ? { ...c, status: 'downloading' } : c));
		}
	}

	async function handleReaction(clipId: string, emoji: string) {
		const res = await fetch(`/api/clips/${clipId}/reactions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ emoji })
		});
		if (res.ok) {
			const data = await res.json();
			clips = clips.map((c) => (c.id === clipId ? { ...c, reactions: data.reactions } : c));
		}
	}

	function scrollToIndex(index: number) {
		if (!scrollContainer) return;
		if (index < 0 || index >= clips.length) return;
		const slots = scrollContainer.querySelectorAll('.reel-slot');
		const slot = slots[index] as HTMLElement | undefined;
		if (slot) {
			slot.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function scrollToNext(index: number) {
		scrollToIndex(index + 1);
	}

	function setFilter(f: typeof filter) {
		if (f === filter) return;
		filter = f;
		activeIndex = 0;
		currentOffset = 0;
		hasMore = true;
		if (scrollContainer) {
			scrollContainer.scrollTop = 0;
		}
		loadClips();
	}

	// Pull-to-refresh touch handling
	$effect(() => {
		if (!scrollContainer) return;
		const sc = scrollContainer;

		function handleTouchStart(e: TouchEvent) {
			if (sc.scrollTop <= 0 && !isRefreshing) {
				touchStartY = e.touches[0].clientY;
				isPullingActive = true;
			}
		}

		function handleTouchMove(e: TouchEvent) {
			if (!isPullingActive || isRefreshing) return;
			if (sc.scrollTop > 0) {
				isPullingActive = false;
				pullDistance = 0;
				return;
			}
			const delta = e.touches[0].clientY - touchStartY;
			if (delta > 0) {
				pullDistance = Math.min(delta * 0.4, 120);
				if (pullDistance > 10) {
					e.preventDefault();
				}
			} else {
				pullDistance = 0;
			}
		}

		function handleTouchEnd() {
			if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
				refresh();
			} else {
				pullDistance = 0;
			}
			isPullingActive = false;
		}

		sc.addEventListener('touchstart', handleTouchStart, { passive: true });
		sc.addEventListener('touchmove', handleTouchMove, { passive: false });
		sc.addEventListener('touchend', handleTouchEnd, { passive: true });

		return () => {
			sc.removeEventListener('touchstart', handleTouchStart);
			sc.removeEventListener('touchmove', handleTouchMove);
			sc.removeEventListener('touchend', handleTouchEnd);
		};
	});

	async function refresh() {
		isRefreshing = true;
		currentOffset = 0;
		hasMore = true;
		const res = await fetch(`/api/clips?${buildClipParams(0)}`);
		if (res.ok) {
			const data = await res.json();
			clips = data.clips;
			hasMore = data.hasMore;
			currentOffset = data.clips.length;
			activeIndex = 0;
			if (scrollContainer) scrollContainer.scrollTop = 0;
		}
		isRefreshing = false;
		pullDistance = 0;
	}

	// IntersectionObserver for active reel tracking
	$effect(() => {
		if (!scrollContainer) return;
		const _len = clips.length; // Re-run when clips change (pagination)
		const slots = scrollContainer.querySelectorAll('.reel-slot');
		if (slots.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
						const idx = Number((entry.target as HTMLElement).dataset.index);
						if (!isNaN(idx)) {
							activeIndex = idx;
						}
					}
				}
			},
			{
				root: scrollContainer,
				threshold: 0.5
			}
		);

		slots.forEach((slot) => observer.observe(slot));
		return () => observer.disconnect();
	});

	// Load more clips when approaching the end
	$effect(() => {
		if (
			clips.length > 0 &&
			hasMore &&
			!loadingMore &&
			activeIndex >= clips.length - LOAD_MORE_THRESHOLD
		) {
			loadMore();
		}
	});

	// Keyboard: Up/Down arrows to skip between reels
	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				scrollToIndex(activeIndex + 1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				scrollToIndex(activeIndex - 1);
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	// Update individual clip when it finishes downloading (without full reload)
	$effect(() => {
		const readyClipId = $clipReadySignal;
		if (readyClipId) {
			(async () => {
				const exists = clips.some((c) => c.id === readyClipId);
				if (exists) {
					const res = await fetch(`/api/clips/${readyClipId}`);
					if (res.ok) {
						const data = await res.json();
						clips = clips.map((c) =>
							c.id === readyClipId
								? {
										...c,
										status: data.status,
										videoPath: data.videoPath ?? c.videoPath,
										audioPath: data.audioPath ?? c.audioPath,
										thumbnailPath: data.thumbnailPath ?? c.thumbnailPath,
										title: data.title ?? c.title,
										artist: data.artist ?? c.artist,
										albumArt: data.albumArt ?? c.albumArt
									}
								: c
						);
					}
				}
			})();
			clipReadySignal.set(null);
		}
	});

	// Navigate to a specific clip in the All tab (triggered from toast "View" link)
	$effect(() => {
		const targetClipId = $viewClipSignal;
		if (targetClipId) {
			viewClipSignal.set(null);
			(async () => {
				// Switch to All tab and reload
				filter = 'all';
				currentOffset = 0;
				hasMore = true;
				const res = await fetch(`/api/clips?${buildClipParams(0)}`);
				if (res.ok) {
					const data = await res.json();
					clips = data.clips;
					hasMore = data.hasMore;
					currentOffset = data.clips.length;
				}
				loading = false;
				// Scroll to the clip after DOM updates
				await new Promise((r) => requestAnimationFrame(r));
				const idx = clips.findIndex((c) => c.id === targetClipId);
				if (idx >= 0) {
					activeIndex = idx;
					scrollToIndex(idx);
				}
			})();
		}
	});

	// Home tab tap: reset to "New" filter and scroll to top
	$effect(() => {
		const tap = $homeTapSignal;
		if (tap > 0) {
			if (filter !== 'unwatched') {
				setFilter('unwatched');
			} else {
				activeIndex = 0;
				if (scrollContainer) scrollContainer.scrollTop = 0;
			}
		}
	});

	function handleCaptionEdit(clipId: string, newCaption: string) {
		clips = clips.map((c) => (c.id === clipId ? { ...c, title: newCaption } : c));
	}

	function handleDelete(clipId: string) {
		const idx = clips.findIndex((c) => c.id === clipId);
		clips = clips.filter((c) => c.id !== clipId);
		currentOffset = Math.max(0, currentOffset - 1);
		if (activeIndex >= clips.length && clips.length > 0) {
			activeIndex = clips.length - 1;
		} else if (idx < activeIndex) {
			activeIndex = Math.max(0, activeIndex - 1);
		}
	}

	// Drag-and-drop URL handling
	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		dragCounter++;
		isDragging = true;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragCounter--;
		if (dragCounter <= 0) {
			dragCounter = 0;
			isDragging = false;
		}
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragCounter = 0;
		isDragging = false;

		const data =
			e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || '';
		const url = data
			.split('\n')
			.find((line) => line.trim().startsWith('http'))
			?.trim();
		if (!url) {
			addToast({ type: 'error', message: 'No link found', autoDismiss: 3000 });
			return;
		}

		try {
			const res = await fetch('/api/clips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});
			const result = await res.json();
			if (!res.ok) {
				addToast({ type: 'error', message: result.error || 'Failed to add', autoDismiss: 4000 });
				return;
			}
			addToast({
				type: 'processing',
				message: `Adding ${result.clip.contentType === 'music' ? 'song' : 'video'} to feed...`,
				clipId: result.clip.id,
				contentType: result.clip.contentType,
				autoDismiss: 0
			});
			loadClips();
		} catch {
			addToast({ type: 'error', message: 'Something went wrong', autoDismiss: 4000 });
		}
	}

	function handleShareTarget() {
		const params = new URLSearchParams(window.location.search);
		const sharedUrl = params.get('shared_url');
		const sharedText = params.get('shared_text');

		// Clean share params from URL without reload
		if (sharedUrl || sharedText) {
			const clean = new URL(window.location.href);
			clean.searchParams.delete('shared_url');
			clean.searchParams.delete('shared_text');
			clean.searchParams.delete('shared_title');
			history.replaceState(null, '', clean.pathname);
		}

		// Prefer explicit URL param; fall back to extracting a URL from text
		const url =
			sharedUrl?.trim() ||
			sharedText
				?.split(/\s+/)
				.find((t) => t.startsWith('http'))
				?.trim();
		if (!url) return;

		(async () => {
			try {
				const res = await fetch('/api/clips', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url })
				});
				const result = await res.json();
				if (!res.ok) {
					addToast({ type: 'error', message: result.error || 'Failed to add', autoDismiss: 4000 });
					return;
				}
				addToast({
					type: 'processing',
					message: `Adding ${result.clip.contentType === 'music' ? 'song' : 'video'} to feed...`,
					clipId: result.clip.id,
					contentType: result.clip.contentType,
					autoDismiss: 0
				});
				loadClips();
			} catch {
				addToast({ type: 'error', message: 'Something went wrong', autoDismiss: 4000 });
			}
		})();
	}

	onMount(() => {
		isDesktopFeed = matchMedia('(pointer: fine)').matches;
		handleShareTarget();
		loadClips();
	});
</script>

<svelte:head>
	<title>scrolly</title>
</svelte:head>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="drop-target"
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	{#if isDragging}
		<div class="drop-overlay">
			<div class="drop-zone">
				<svg
					class="drop-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
					<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
				</svg>
				<p class="drop-text">Drop link to add</p>
			</div>
		</div>
	{/if}

	<!-- Floating filter tabs -->
	<div class="filter-bar">
		<div class="filter-tabs">
			<button class:active={filter === 'unwatched'} onclick={() => setFilter('unwatched')}>
				<span class="tab-label">New</span>
			</button>
			<button class:active={filter === 'all'} onclick={() => setFilter('all')}>
				<span class="tab-label">All</span>
			</button>
			<button class:active={filter === 'watched'} onclick={() => setFilter('watched')}>
				<span class="tab-label">Watched</span>
			</button>
			<button class:active={filter === 'favorites'} onclick={() => setFilter('favorites')}>
				<span class="tab-label">Faves</span>
			</button>
		</div>
	</div>

	{#if loading}
		<div class="reel-empty">
			<span class="spinner"></span>
		</div>
	{:else if clips.length === 0}
		<div class="reel-empty">
			<svg
				class="empty-icon"
				viewBox="0 0 48 48"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<rect x="6" y="10" width="36" height="28" rx="4" />
				<polygon points="20,18 20,34 33,26" fill="currentColor" stroke="none" opacity="0.25" />
				<polygon points="20,18 20,34 33,26" />
				<line x1="14" y1="4" x2="14" y2="10" />
				<line x1="34" y1="4" x2="34" y2="10" />
			</svg>
			<p class="empty-title">All caught up</p>
			<p class="empty-sub">Drop a clip to kick things off</p>
			<button class="empty-cta" onclick={() => addVideoModalOpen.set(true)}> Add something </button>
		</div>
	{:else}
		{#if pullDistance > 0 || isRefreshing}
			<div
				class="pull-indicator"
				style="transform: translateY({pullDistance - 48}px); opacity: {isRefreshing
					? 1
					: Math.min(pullDistance / PULL_THRESHOLD, 1)}"
			>
				{#if isRefreshing}
					<span class="pull-spinner"></span>
				{:else}
					<svg
						class="pull-arrow"
						class:ready={pullDistance >= PULL_THRESHOLD}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="7 13 12 18 17 13" />
						<line x1="12" y1="18" x2="12" y2="6" />
					</svg>
				{/if}
			</div>
		{/if}
		<div class="reel-scroll" bind:this={scrollContainer}>
			{#each clips as clip, i (clip.id)}
				<div class="reel-slot" data-index={i}>
					{#if Math.abs(i - activeIndex) <= renderWindow}
						<ReelItem
							{clip}
							{currentUserId}
							active={i === activeIndex}
							index={i}
							{autoScroll}
							canEditCaption={clip.addedBy === currentUserId}
							seenByOthers={clip.seenByOthers}
							onwatched={markWatched}
							onfavorited={toggleFavorite}
							onreaction={handleReaction}
							onretry={retryDownload}
							onended={() => scrollToNext(i)}
							oncaptionedit={handleCaptionEdit}
							ondelete={handleDelete}
						/>
					{:else}
						<div class="reel-placeholder">
							{#if clip.thumbnailPath}
								<img
									src="/api/thumbnails/{clip.thumbnailPath.split('/').pop()}"
									alt=""
									class="placeholder-thumb"
									loading="lazy"
								/>
							{:else if clip.albumArt}
								<img
									src={clip.albumArt}
									alt=""
									class="placeholder-thumb placeholder-thumb-cover"
									loading="lazy"
								/>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
			{#if loadingMore}
				<div class="reel-slot loading-more-slot">
					<div class="reel-placeholder">
						<span class="spinner"></span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if $addVideoModalOpen}
	<AddVideoModal ondismiss={() => addVideoModalOpen.set(false)} />
{/if}

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

	.pull-indicator {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 25;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 48px;
		pointer-events: none;
		transition: opacity 0.15s ease;
	}

	.pull-arrow {
		width: 24px;
		height: 24px;
		color: rgba(255, 255, 255, 0.7);
		transform: rotate(180deg);
		transition:
			transform 0.2s ease,
			color 0.2s ease;
	}

	.pull-arrow.ready {
		transform: rotate(0deg);
		color: var(--accent-primary);
	}

	.pull-spinner {
		display: inline-block;
		width: 22px;
		height: 22px;
		border: 2.5px solid rgba(255, 255, 255, 0.2);
		border-top-color: var(--accent-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.reel-scroll {
		height: 100dvh;
		overflow-y: scroll;
		scroll-snap-type: y mandatory;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior-y: none;
	}

	.reel-slot {
		height: 100dvh;
		width: 100%;
		scroll-snap-align: start;
		position: relative;
		overflow: hidden;
	}

	.reel-placeholder {
		height: 100%;
		width: 100%;
		background: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-thumb {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.placeholder-thumb-cover {
		object-fit: cover;
	}

	.loading-more-slot {
		height: auto;
		min-height: 80px;
		scroll-snap-align: none;
	}

	.reel-empty {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		background: var(--bg-primary);
	}

	.empty-icon {
		width: 56px;
		height: 56px;
		color: var(--text-muted);
		opacity: 0.5;
		margin-bottom: var(--space-xs);
	}

	.empty-title {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.empty-sub {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0 0 var(--space-md);
	}

	.empty-cta {
		padding: 10px 24px;
		background: var(--accent-primary);
		color: #000;
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.empty-cta:active {
		transform: scale(0.97);
	}

	.spinner {
		display: inline-block;
		width: 32px;
		height: 32px;
		border: 2.5px solid rgba(255, 255, 255, 0.2);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Drag-and-drop */
	.drop-target {
		height: 100dvh;
		position: relative;
	}

	.drop-overlay {
		position: fixed;
		inset: 0;
		z-index: 90;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fade-in 0.15s ease;
	}

	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-3xl);
		border: 2px dashed var(--accent-primary);
		border-radius: var(--radius-xl);
	}

	.drop-icon {
		width: 48px;
		height: 48px;
		color: var(--accent-primary);
	}

	.drop-text {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
