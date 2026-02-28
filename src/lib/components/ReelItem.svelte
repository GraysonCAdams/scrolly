<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { isPointerFine } from '$lib/gestures';
	import { fetchUnreadCount } from '$lib/stores/notifications';
	import { globalMuted } from '$lib/stores/mute';
	import {
		globalPlaybackSpeed,
		cycleSpeed,
		stepSpeedUp,
		stepSpeedDown
	} from '$lib/stores/playbackSpeed';
	import { connectNormalizer } from '$lib/audio/normalizer';
	import {
		setupDesktopGestures,
		setupMobileGestures,
		setupReelKeyboard
	} from '$lib/reelInteractions';
	import { trackVideoTime, sendWatchPercent, flashIndicator } from '$lib/reelPlayback';
	import ReelVideo from './ReelVideo.svelte';
	import ReelMusic from './ReelMusic.svelte';
	import ActionSidebar from './ActionSidebar.svelte';
	import ReelOverlay from './ReelOverlay.svelte';
	import ReactionPicker from './ReactionPicker.svelte';
	import EmojiShower from './EmojiShower.svelte';
	import CommentsSheet from './CommentsSheet.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import ViewBadge from './ViewBadge.svelte';
	import ViewersSheet from './ViewersSheet.svelte';
	import ReelIndicators from './ReelIndicators.svelte';
	import type { FeedClip } from '$lib/types';

	const {
		clip,
		currentUserId,
		active,
		index,
		autoScroll,
		canEditCaption = false,
		seenByOthers = false,
		onwatched,
		onfavorited,
		onreaction,
		onretry,
		onended,
		oncaptionedit,
		ondelete
	}: {
		clip: FeedClip;
		currentUserId: string;
		active: boolean;
		index: number;
		autoScroll: boolean;
		canEditCaption?: boolean;
		seenByOthers?: boolean;
		onwatched: (id: string) => void;
		onfavorited: (id: string) => void;
		onreaction: (clipId: string, emoji: string) => Promise<void>;
		onretry: (id: string) => void;
		onended: () => void;
		oncaptionedit?: (clipId: string, newCaption: string) => void;
		ondelete?: (clipId: string) => void;
	} = $props();

	let itemEl: HTMLDivElement | null = $state(null);
	let hasMarkedWatched = $state(false);
	let muted = $state(get(globalMuted));
	let showMuteIndicator = $state(false);
	let muteIndicatorTimer: ReturnType<typeof setTimeout> | null = null;
	let speed = $state(get(globalPlaybackSpeed));
	let showSpeedIndicator = $state(false);
	let speedIndicatorTimer: ReturnType<typeof setTimeout> | null = null;

	const unsubMute = globalMuted.subscribe((v) => {
		muted = v;
	});
	const unsubSpeed = globalPlaybackSpeed.subscribe((v) => {
		speed = v;
	});

	let isDesktop = $state(false);
	let videoEl: HTMLVideoElement | null = $state(null);
	let paused = $state(false);
	let showPlayIndicator = $state(false);
	let playIndicatorTimer: ReturnType<typeof setTimeout> | null = null;
	let currentTime = $state(0);
	let duration = $state(0);

	let showPicker = $state(false);
	let pickerDragMode = $state(false);
	let pickerX = $state(0);
	let pickerY = $state(0);
	let showerEmoji = $state('');
	let showerX = $state(0);
	let showerY = $state(0);
	let showShower = $state(false);
	let showComments = $state(false);
	let commentsAutoFocus = $state(false);
	let unreadOverride = $state<number | null>(null);
	const localUnreadCount = $derived(
		unreadOverride !== null ? unreadOverride : clip.unreadCommentCount
	);
	let showViewers = $state(false);
	let maxPercent = $state(0);
	let wasActive = $state(false);

	onMount(() => {
		isDesktop = isPointerFine();
	});
	onDestroy(() => {
		unsubMute();
		unsubSpeed();
		sendWatchPercent(clip.id, maxPercent);
	});

	// Mark watched after 3s visible
	$effect(() => {
		if (!active || clip.watched || hasMarkedWatched) return;
		const timer = setTimeout(() => {
			hasMarkedWatched = true;
			onwatched(clip.id);
		}, 3000);
		return () => clearTimeout(timer);
	});

	// Mark reaction notifications as read after 3s visible
	let hasMarkedReactionsRead = $state(false);
	$effect(() => {
		if (!active || hasMarkedReactionsRead) return;
		const timer = setTimeout(() => {
			hasMarkedReactionsRead = true;
			fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clipId: clip.id, type: 'reaction' })
			})
				.then(() => fetchUnreadCount())
				.catch(() => {});
		}, 3000);
		return () => clearTimeout(timer);
	});

	// Send watch percentage when scrolling away
	$effect(() => {
		if (active) {
			wasActive = true;
		} else if (wasActive) {
			wasActive = false;
			sendWatchPercent(clip.id, maxPercent);
			maxPercent = 0;
		}
	});

	// Time tracking from video element
	$effect(() => {
		if (!videoEl) return;
		return trackVideoTime(
			videoEl,
			(t, d, p) => {
				currentTime = t;
				duration = d;
				paused = p;
			},
			(d) => {
				duration = d;
			},
			(pct) => {
				if (pct > maxPercent) maxPercent = pct;
			}
		);
	});

	function togglePlayPause() {
		if (!videoEl) return;
		if (videoEl.paused) videoEl.play().catch(() => {});
		else videoEl.pause();
		playIndicatorTimer = flashIndicator((v) => (showPlayIndicator = v), playIndicatorTimer);
	}

	function toggleMute() {
		globalMuted.set(!muted);
		if (videoEl) connectNormalizer(videoEl);
		muteIndicatorTimer = flashIndicator((v) => (showMuteIndicator = v), muteIndicatorTimer);
	}

	function showSpeedChange() {
		speedIndicatorTimer = flashIndicator((v) => (showSpeedIndicator = v), speedIndicatorTimer);
	}

	function handleCycleSpeed() {
		cycleSpeed();
		showSpeedChange();
	}
	function seek(seconds: number) {
		if (videoEl)
			videoEl.currentTime = Math.max(0, Math.min(videoEl.currentTime + seconds, duration));
	}
	function seekTo(time: number) {
		if (videoEl) videoEl.currentTime = Math.max(0, Math.min(time, duration));
	}

	function fireHeartReaction(cx: number, cy: number) {
		showerEmoji = '❤️';
		showerX = cx;
		showerY = cy;
		showShower = true;
		if (!clip.reactions['❤️']?.reacted) onreaction(clip.id, '❤️');
	}

	function openPicker(cx: number, cy: number, drag: boolean) {
		pickerX = cx;
		pickerY = cy;
		pickerDragMode = drag;
		showPicker = true;
	}

	// Gesture handler
	$effect(() => {
		if (!itemEl) return;
		const callbacks = {
			togglePlayPause,
			fireHeartReaction,
			openPicker,
			isMusic: clip.contentType === 'music'
		};
		return isDesktop
			? setupDesktopGestures(itemEl, callbacks)
			: setupMobileGestures(itemEl, callbacks);
	});

	// Keyboard shortcuts
	$effect(() => {
		if (!active) return;
		return setupReelKeyboard(
			{
				toggleMute,
				togglePlayPause,
				stepSpeedUp,
				stepSpeedDown,
				showSpeedChange,
				seek,
				isMusic: clip.contentType === 'music'
			},
			() => showComments || showPicker
		);
	});

	function handlePickEmoji(emoji: string) {
		showPicker = false;
		showerEmoji = emoji;
		showerX = pickerX;
		showerY = pickerY;
		showShower = true;
		if (!clip.reactions[emoji]?.reacted) onreaction(clip.id, emoji);
	}

	function triggerReactionPickerHold(bx: number, by: number) {
		pickerX = bx;
		pickerY = by;
		pickerDragMode = true;
		showPicker = true;
	}

	function handleSidebarReactionTap() {
		if (itemEl) {
			const rect = itemEl.getBoundingClientRect();
			fireHeartReaction(rect.right - 30, rect.top + rect.height * 0.45);
		}
	}
</script>

<div class="reel-item" data-index={index} bind:this={itemEl}>
	<div class="bottom-gradient"></div>
	{#if clip.viewCount > 0}
		<div class="view-badge-wrapper">
			<ViewBadge viewCount={clip.viewCount} ontap={() => (showViewers = true)} />
		</div>
	{/if}

	{#if clip.contentType === 'music'}
		<ReelMusic {clip} {active} {muted} {autoScroll} playbackRate={speed} {onretry} {onended} />
	{:else}
		<ReelVideo
			{clip}
			{active}
			{muted}
			{autoScroll}
			playbackRate={speed}
			{onretry}
			{onended}
			bind:videoEl
		/>
	{/if}

	<button
		type="button"
		class="speed-pill"
		class:visible={active}
		class:highlight={speed !== 1}
		onclick={(e) => {
			e.stopPropagation();
			handleCycleSpeed();
		}}
		aria-label="Change playback speed"
	>
		{speed}x
	</button>

	<ReelIndicators
		{showSpeedIndicator}
		{speed}
		{showMuteIndicator}
		{muted}
		{showPlayIndicator}
		{paused}
		isMusic={clip.contentType === 'music'}
	/>

	{#if clip.contentType !== 'music' && duration > 0}
		<ProgressBar {currentTime} {duration} {isDesktop} onseek={seekTo} />
	{/if}

	<ReelOverlay
		username={clip.addedByUsername}
		avatarPath={clip.addedByAvatar}
		platform={clip.platform}
		caption={clip.title}
		reactions={clip.reactions}
		onreaction={(emoji) => onreaction(clip.id, emoji)}
		{canEditCaption}
		{seenByOthers}
		clipId={clip.id}
		{oncaptionedit}
		{ondelete}
	/>

	<ActionSidebar
		favorited={clip.favorited}
		commentCount={clip.commentCount}
		unreadCommentCount={localUnreadCount}
		originalUrl={clip.originalUrl}
		{muted}
		onfavorite={() => onfavorited(clip.id)}
		oncomment={() => {
			commentsAutoFocus = false;
			showComments = true;
		}}
		onreaction={handleSidebarReactionTap}
		onreactionhold={triggerReactionPickerHold}
		onmute={toggleMute}
	/>

	{#if clip.contentType === 'music' && clip.albumArt}
		<div class="music-disc" class:spinning={active && !paused}>
			<img src={clip.albumArt} alt="" class="music-disc-img" />
		</div>
	{/if}

	{#if active}
		<button
			type="button"
			class="comment-prompt"
			onclick={(e) => {
				e.stopPropagation();
				commentsAutoFocus = true;
				showComments = true;
			}}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
			>
			<span>Add a comment...</span>
		</button>
	{/if}
</div>

{#if showPicker}
	<ReactionPicker
		x={pickerX}
		y={pickerY}
		dragMode={pickerDragMode}
		onpick={handlePickEmoji}
		ondismiss={() => (showPicker = false)}
	/>
{/if}
{#if showShower}
	<EmojiShower
		emoji={showerEmoji}
		x={showerX}
		y={showerY}
		oncomplete={() => (showShower = false)}
	/>
{/if}
{#if showComments}
	<CommentsSheet
		clipId={clip.id}
		{currentUserId}
		autoFocus={commentsAutoFocus}
		ondismiss={() => {
			showComments = false;
			unreadOverride = 0;
		}}
	/>
{/if}
{#if showViewers}
	<ViewersSheet clipId={clip.id} ondismiss={() => (showViewers = false)} />
{/if}

<style>
	.reel-item {
		height: 100%;
		width: 100%;
		position: relative;
		overflow: hidden;
		background: var(--bg-primary);
	}
	.bottom-gradient {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
		z-index: 3;
		pointer-events: none;
	}
	.view-badge-wrapper {
		position: absolute;
		top: max(60px, calc(env(safe-area-inset-top) + 52px));
		left: var(--space-lg);
		z-index: 6;
	}
	.speed-pill {
		position: absolute;
		top: max(60px, calc(env(safe-area-inset-top) + 52px));
		right: var(--space-lg);
		z-index: 6;
		padding: 4px 10px;
		border: none;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: rgba(255, 255, 255, 0.6);
		font-family: var(--font-display);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.2s ease,
			background 0.2s ease,
			color 0.2s ease;
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.speed-pill.visible {
		opacity: 1;
		pointer-events: auto;
	}
	.speed-pill.highlight {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
	}
	.speed-pill:active {
		transform: scale(0.93);
	}
	.comment-prompt {
		position: absolute;
		bottom: max(var(--space-lg), env(safe-area-inset-bottom));
		left: var(--space-lg);
		right: var(--space-lg);
		z-index: 5;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		cursor: pointer;
		font: inherit;
		text-align: left;
		transition: background 0.2s ease;
		animation: comment-prompt-in 0.3s ease;
	}
	.comment-prompt:active {
		background: rgba(255, 255, 255, 0.2);
	}
	.comment-prompt svg {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		color: rgba(255, 255, 255, 0.5);
	}
	.comment-prompt span {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}
	@keyframes comment-prompt-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.music-disc {
		position: absolute;
		right: var(--space-lg);
		bottom: calc(56px + env(safe-area-inset-bottom));
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		overflow: hidden;
		z-index: 5;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		border: 2px solid rgba(255, 255, 255, 0.2);
	}
	.music-disc.spinning {
		animation: spin-disc 4s linear infinite;
	}
	.music-disc-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	@keyframes spin-disc {
		to {
			transform: rotate(360deg);
		}
	}
</style>
