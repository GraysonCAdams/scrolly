<script lang="ts">
	import ReelItem from '$lib/components/ReelItem.svelte';
	import AddVideoModal from '$lib/components/AddVideoModal.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import SkeletonReel from '$lib/components/SkeletonReel.svelte';
	import { addVideoModalOpen } from '$lib/stores/addVideoModal';
	import { addToast, clipReadySignal, viewClipSignal } from '$lib/stores/toasts';
	import { homeTapSignal } from '$lib/stores/homeTap';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { FeedClip } from '$lib/types';
	import type { FeedFilter } from '$lib/feed';
	import {
		fetchClips,
		fetchMoreClips,
		markClipWatched,
		toggleClipFavorite,
		retryClipDownload,
		sendClipReaction,
		fetchSingleClip,
		submitClipUrl,
		extractDroppedUrl,
		extractShareTargetUrl
	} from '$lib/feed';

	let clips = $state<FeedClip[]>([]);
	let filter = $state<FeedFilter>('unwatched');
	let loading = $state(true);
	let activeIndex = $state(0);
	let scrollContainer: HTMLDivElement | null = $state(null);

	let hasMore = $state(true);
	let loadingMore = $state(false);
	let currentOffset = $state(0);
	const PAGE_SIZE = 20;
	const LOAD_MORE_THRESHOLD = 5;

	let isDesktopFeed = $state(false);
	const renderWindow = $derived(isDesktopFeed ? 3 : 2);

	let pullDistance = $state(0);
	let isRefreshing = $state(false);
	let touchStartY = 0;
	let isPullingActive = false;
	const PULL_THRESHOLD = 80;

	let isDragging = $state(false);
	let dragCounter = 0;

	const currentUserId = $derived($page.data.user?.id ?? '');
	const autoScroll = $derived($page.data.user?.autoScroll ?? false);

	async function loadInitialClips() {
		loading = true;
		currentOffset = 0;
		hasMore = true;
		const data = await fetchClips(filter, PAGE_SIZE);
		if (data) {
			clips = data.clips;
			hasMore = data.hasMore;
			currentOffset = data.clips.length;
		}
		loading = false;
	}

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;
		const data = await fetchMoreClips(filter, currentOffset, PAGE_SIZE);
		if (data) {
			clips = [...clips, ...data.clips];
			hasMore = data.hasMore;
			currentOffset += data.clips.length;
		}
		loadingMore = false;
	}

	async function markWatched(clipId: string) {
		await markClipWatched(clipId);
		clips = clips.map((c) =>
			c.id === clipId
				? { ...c, watched: true, viewCount: c.watched ? c.viewCount : c.viewCount + 1 }
				: c
		);
	}

	async function toggleFavorite(clipId: string) {
		const data = await toggleClipFavorite(clipId);
		if (data) clips = clips.map((c) => (c.id === clipId ? { ...c, favorited: data.favorited } : c));
	}

	async function retryDownload(clipId: string) {
		const ok = await retryClipDownload(clipId);
		if (ok) clips = clips.map((c) => (c.id === clipId ? { ...c, status: 'downloading' } : c));
	}

	async function handleReaction(clipId: string, emoji: string) {
		const data = await sendClipReaction(clipId, emoji);
		if (data) clips = clips.map((c) => (c.id === clipId ? { ...c, reactions: data.reactions } : c));
	}

	function scrollToIndex(index: number) {
		if (!scrollContainer || index < 0 || index >= clips.length) return;
		const slot = scrollContainer.querySelectorAll('.reel-slot')[index] as HTMLElement | undefined;
		if (slot) slot.scrollIntoView({ behavior: 'smooth' });
	}

	function setFilter(f: FeedFilter) {
		if (f === filter) return;
		filter = f;
		activeIndex = 0;
		currentOffset = 0;
		hasMore = true;
		if (scrollContainer) scrollContainer.scrollTop = 0;
		loadInitialClips();
	}

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
				if (pullDistance > 10) e.preventDefault();
			} else {
				pullDistance = 0;
			}
		}

		function handleTouchEnd() {
			if (pullDistance >= PULL_THRESHOLD && !isRefreshing) refresh();
			else pullDistance = 0;
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
		const data = await fetchClips(filter, PAGE_SIZE);
		if (data) {
			clips = data.clips;
			hasMore = data.hasMore;
			currentOffset = data.clips.length;
			activeIndex = 0;
			if (scrollContainer) scrollContainer.scrollTop = 0;
		}
		isRefreshing = false;
		pullDistance = 0;
	}

	$effect(() => {
		if (!scrollContainer) return;
		// eslint-disable-next-line sonarjs/void-use -- triggers $effect re-run when clips change
		void clips.length;
		const slots = scrollContainer.querySelectorAll('.reel-slot');
		if (slots.length === 0) return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
						const idx = Number((entry.target as HTMLElement).dataset.index);
						if (!isNaN(idx)) activeIndex = idx;
					}
				}
			},
			{ root: scrollContainer, threshold: 0.5 }
		);
		slots.forEach((slot) => observer.observe(slot));
		return () => observer.disconnect();
	});

	$effect(() => {
		if (
			clips.length > 0 &&
			hasMore &&
			!loadingMore &&
			activeIndex >= clips.length - LOAD_MORE_THRESHOLD
		)
			loadMore();
	});

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

	$effect(() => {
		const readyClipId = $clipReadySignal;
		if (!readyClipId) return;
		(async () => {
			if (clips.some((c) => c.id === readyClipId)) {
				const data = await fetchSingleClip(readyClipId);
				if (data) {
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
	});

	$effect(() => {
		const targetClipId = $viewClipSignal;
		if (!targetClipId) return;
		viewClipSignal.set(null);
		(async () => {
			filter = 'all';
			currentOffset = 0;
			hasMore = true;
			const data = await fetchClips('all', PAGE_SIZE);
			if (data) {
				clips = data.clips;
				hasMore = data.hasMore;
				currentOffset = data.clips.length;
			}
			loading = false;
			await new Promise((r) => requestAnimationFrame(r));
			const idx = clips.findIndex((c) => c.id === targetClipId);
			if (idx >= 0) {
				activeIndex = idx;
				scrollToIndex(idx);
			}
		})();
	});

	$effect(() => {
		const tap = $homeTapSignal;
		if (tap > 0) {
			if (filter !== 'unwatched') setFilter('unwatched');
			else {
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
		if (activeIndex >= clips.length && clips.length > 0) activeIndex = clips.length - 1;
		else if (idx < activeIndex) activeIndex = Math.max(0, activeIndex - 1);
	}

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
		const url = extractDroppedUrl(e.dataTransfer);
		if (!url) {
			addToast({ type: 'error', message: 'No link found', autoDismiss: 3000 });
			return;
		}
		try {
			const result = await submitClipUrl(url);
			if ('error' in result) {
				addToast({ type: 'error', message: result.error, autoDismiss: 4000 });
				return;
			}
			addToast({
				type: 'processing',
				message: `Adding ${result.clip.contentType === 'music' ? 'song' : 'video'} to feed...`,
				clipId: result.clip.id,
				contentType: result.clip.contentType,
				autoDismiss: 0
			});
			loadInitialClips();
		} catch {
			addToast({ type: 'error', message: 'Something went wrong', autoDismiss: 4000 });
		}
	}

	onMount(() => {
		isDesktopFeed = matchMedia('(pointer: fine)').matches;
		const shareUrl = extractShareTargetUrl();
		if (shareUrl) {
			(async () => {
				try {
					const result = await submitClipUrl(shareUrl);
					if ('error' in result) {
						addToast({ type: 'error', message: result.error, autoDismiss: 4000 });
						return;
					}
					addToast({
						type: 'processing',
						message: `Adding ${result.clip.contentType === 'music' ? 'song' : 'video'} to feed...`,
						clipId: result.clip.id,
						contentType: result.clip.contentType,
						autoDismiss: 0
					});
				} catch {
					addToast({ type: 'error', message: 'Something went wrong', autoDismiss: 4000 });
				}
			})();
		}
		loadInitialClips();
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

	<FilterBar {filter} onfilter={setFilter} />

	{#if loading}
		<SkeletonReel />
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
							onended={() => scrollToIndex(i + 1)}
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
					<div class="reel-placeholder"><span class="spinner"></span></div>
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if $addVideoModalOpen}
	<AddVideoModal ondismiss={() => addVideoModalOpen.set(false)} />
{/if}

<style>
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
