<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { onTapHold, isPointerFine, type TapHoldEvent } from '$lib/gestures';
	import { fetchUnreadCount } from '$lib/stores/notifications';
	import { globalMuted } from '$lib/stores/mute';
	import { globalPlaybackSpeed, cycleSpeed, stepSpeedUp, stepSpeedDown } from '$lib/stores/playbackSpeed';
	import { connectNormalizer } from '$lib/audio/normalizer';
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

	interface Clip {
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
		createdAt: string;
	}

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
		clip: Clip;
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

	// Playback speed
	let speed = $state(get(globalPlaybackSpeed));
	let showSpeedIndicator = $state(false);
	let speedIndicatorTimer: ReturnType<typeof setTimeout> | null = null;

	// Sync with global mute store (other reels toggling mute updates us)
	const unsubMute = globalMuted.subscribe((v) => {
		muted = v;
	});

	// Sync with global speed store
	const unsubSpeed = globalPlaybackSpeed.subscribe((v) => {
		speed = v;
	});

	// Desktop detection
	let isDesktop = $state(false);

	// Video element reference (bound from ReelVideo)
	let videoEl: HTMLVideoElement | null = $state(null);

	// Playback state
	let paused = $state(false);
	let showPlayIndicator = $state(false);
	let playIndicatorTimer: ReturnType<typeof setTimeout> | null = null;

	// Time tracking
	let currentTime = $state(0);
	let duration = $state(0);

	// Gesture state
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
	let localUnreadCount = $state(clip.unreadCommentCount);
	let showViewers = $state(false);

	// Watch percentage tracking
	let maxPercent = $state(0);
	let wasActive = $state(false);

	onMount(() => {
		isDesktop = isPointerFine();
	});

	// Flush watch percentage on unmount (virtualization may remove this component)
	onDestroy(() => {
		unsubMute();
		unsubSpeed();
		if (maxPercent > 0) {
			const pct = Math.round(maxPercent);
			const body = JSON.stringify({ watchPercent: pct });
			if (navigator.sendBeacon) {
				navigator.sendBeacon(
					`/api/clips/${clip.id}/watched`,
					new Blob([body], { type: 'application/json' })
				);
			} else {
				fetch(`/api/clips/${clip.id}/watched`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body,
					keepalive: true
				}).catch(() => {});
			}
		}
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
			if (maxPercent > 0) {
				const pct = Math.round(maxPercent);
				fetch(`/api/clips/${clip.id}/watched`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ watchPercent: pct })
				}).catch(() => {});
			}
			maxPercent = 0;
		}
	});

	// Time tracking from video element
	$effect(() => {
		if (!videoEl) return;

		function onTimeUpdate() {
			if (!videoEl) return;
			currentTime = videoEl.currentTime;
			duration = videoEl.duration || 0;
			paused = videoEl.paused;
			if (duration > 0) {
				const pct = (videoEl.currentTime / duration) * 100;
				if (pct > maxPercent) maxPercent = pct;
			}
		}

		function onLoadedMetadata() {
			if (!videoEl) return;
			duration = videoEl.duration || 0;
		}

		function onPlayPause() {
			if (!videoEl) return;
			paused = videoEl.paused;
		}

		videoEl.addEventListener('timeupdate', onTimeUpdate);
		videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
		videoEl.addEventListener('play', onPlayPause);
		videoEl.addEventListener('pause', onPlayPause);

		if (videoEl.duration) {
			duration = videoEl.duration;
			currentTime = videoEl.currentTime;
		}

		return () => {
			videoEl?.removeEventListener('timeupdate', onTimeUpdate);
			videoEl?.removeEventListener('loadedmetadata', onLoadedMetadata);
			videoEl?.removeEventListener('play', onPlayPause);
			videoEl?.removeEventListener('pause', onPlayPause);
		};
	});

	function togglePlayPause() {
		if (!videoEl) return;
		if (videoEl.paused) {
			videoEl.play().catch(() => {});
		} else {
			videoEl.pause();
		}
		showPlayIndicator = true;
		if (playIndicatorTimer) clearTimeout(playIndicatorTimer);
		playIndicatorTimer = setTimeout(() => {
			showPlayIndicator = false;
		}, 800);
	}

	function toggleMute() {
		globalMuted.set(!muted);
		// Connect normalizer on unmute (user gesture guarantees AudioContext can resume)
		if (videoEl) connectNormalizer(videoEl);
		showMuteIndicator = true;
		if (muteIndicatorTimer) clearTimeout(muteIndicatorTimer);
		muteIndicatorTimer = setTimeout(() => {
			showMuteIndicator = false;
		}, 800);
	}

	function showSpeedChange() {
		showSpeedIndicator = true;
		if (speedIndicatorTimer) clearTimeout(speedIndicatorTimer);
		speedIndicatorTimer = setTimeout(() => {
			showSpeedIndicator = false;
		}, 800);
	}

	function handleCycleSpeed() {
		cycleSpeed();
		showSpeedChange();
	}

	function seek(seconds: number) {
		if (!videoEl) return;
		videoEl.currentTime = Math.max(0, Math.min(videoEl.currentTime + seconds, duration));
	}

	function seekTo(time: number) {
		if (!videoEl) return;
		videoEl.currentTime = Math.max(0, Math.min(time, duration));
	}

	// Shared reaction helpers
	function fireHeartReaction(cx: number, cy: number) {
		showerEmoji = '❤️';
		showerX = cx;
		showerY = cy;
		showShower = true;
		// Only add — don't toggle off. Undo is via the reaction pills in the overlay.
		if (!clip.reactions['❤️']?.reacted) {
			onreaction(clip.id, '❤️');
		}
	}

	function openPicker(cx: number, cy: number, drag: boolean) {
		pickerX = cx;
		pickerY = cy;
		pickerDragMode = drag;
		showPicker = true;
	}

	function shouldIgnoreTarget(e: { clientX: number; clientY: number }) {
		const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
		if (!target) return false;
		return !!(
			target.closest('.action-sidebar') ||
			target.closest('.reel-overlay') ||
			target.closest('.progress-bar') ||
			target.closest('.speed-pill') ||
			target.closest('.comment-prompt')
		);
	}

	// Gesture handler — unified for desktop and mobile
	$effect(() => {
		if (!itemEl) return;

		if (isDesktop) {
			// Desktop: click = play/pause, dblclick = ❤️, long-press = picker
			let mouseDownTimer: ReturnType<typeof setTimeout> | null = null;
			let mouseHoldFired = false;
			let mouseDownX = 0;
			let mouseDownY = 0;

			function handleMouseDown(e: MouseEvent) {
				if (shouldIgnoreTarget(e)) return;
				mouseHoldFired = false;
				mouseDownX = e.clientX;
				mouseDownY = e.clientY;
				mouseDownTimer = setTimeout(() => {
					mouseHoldFired = true;
					openPicker(e.clientX, e.clientY, true);
				}, 350);
			}

			function handleMouseMove(e: MouseEvent) {
				if (!mouseDownTimer) return;
				if (Math.abs(e.clientX - mouseDownX) > 10 || Math.abs(e.clientY - mouseDownY) > 10) {
					clearTimeout(mouseDownTimer);
					mouseDownTimer = null;
				}
			}

			function handleMouseUp() {
				if (mouseDownTimer) {
					clearTimeout(mouseDownTimer);
					mouseDownTimer = null;
				}
			}

			function handleClick(e: MouseEvent) {
				if (mouseHoldFired) {
					mouseHoldFired = false;
					return;
				}
				if (shouldIgnoreTarget(e)) return;
				if (clip.contentType !== 'music') {
					togglePlayPause();
				}
			}

			function handleDblClick(e: MouseEvent) {
				if (shouldIgnoreTarget(e)) return;
				fireHeartReaction(e.clientX, e.clientY);
			}

			itemEl.addEventListener('mousedown', handleMouseDown);
			itemEl.addEventListener('mousemove', handleMouseMove);
			itemEl.addEventListener('mouseup', handleMouseUp);
			itemEl.addEventListener('click', handleClick);
			itemEl.addEventListener('dblclick', handleDblClick);

			return () => {
				itemEl?.removeEventListener('mousedown', handleMouseDown);
				itemEl?.removeEventListener('mousemove', handleMouseMove);
				itemEl?.removeEventListener('mouseup', handleMouseUp);
				itemEl?.removeEventListener('click', handleClick);
				itemEl?.removeEventListener('dblclick', handleDblClick);
				if (mouseDownTimer) clearTimeout(mouseDownTimer);
			};
		} else {
			// Mobile: single tap = play/pause, double-tap = ❤️, hold = picker
			return onTapHold(itemEl, {
				onSingleTap(e: TapHoldEvent) {
					if (shouldIgnoreTarget(e)) return;
					if (clip.contentType !== 'music') {
						togglePlayPause();
					}
				},
				onDoubleTap(e: TapHoldEvent) {
					if (shouldIgnoreTarget(e)) return;
					fireHeartReaction(e.clientX, e.clientY);
				},
				onHoldStart(e: TapHoldEvent) {
					if (shouldIgnoreTarget(e)) return;
					openPicker(e.clientX, e.clientY, true);
				}
			});
		}
	});

	// Keyboard shortcuts (only when this reel is active)
	$effect(() => {
		if (!active) return;

		function handleKeydown(e: KeyboardEvent) {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			if (showComments || showPicker) return;

			switch (e.key) {
				case 'm':
				case 'M':
					toggleMute();
					break;
				case '[':
					stepSpeedDown();
					showSpeedChange();
					break;
				case ']':
					stepSpeedUp();
					showSpeedChange();
					break;
			}

			// Video-only shortcuts
			if (clip.contentType !== 'music') {
				switch (e.key) {
					case ' ':
						e.preventDefault();
						togglePlayPause();
						break;
					case 'ArrowLeft':
						e.preventDefault();
						seek(-5);
						break;
					case 'ArrowRight':
						e.preventDefault();
						seek(5);
						break;
				}
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	function handlePickEmoji(emoji: string) {
		showPicker = false;
		showerEmoji = emoji;
		showerX = pickerX;
		showerY = pickerY;
		showShower = true;
		// Only add — don't toggle off. Undo is via the reaction pills in the overlay.
		if (!clip.reactions[emoji]?.reacted) {
			onreaction(clip.id, emoji);
		}
	}

	function _triggerReactionPicker() {
		// Position near the reaction button (right side, middle area)
		if (itemEl) {
			const rect = itemEl.getBoundingClientRect();
			pickerX = rect.right - 60;
			pickerY = rect.top + rect.height * 0.45;
		}
		pickerDragMode = false;
		showPicker = true;
	}

	function triggerReactionPickerHold(bx: number, by: number) {
		pickerX = bx;
		pickerY = by;
		pickerDragMode = true;
		showPicker = true;
	}

	function handleSidebarReactionTap() {
		// Quick tap on sidebar reaction btn = ❤️
		if (itemEl) {
			const rect = itemEl.getBoundingClientRect();
			fireHeartReaction(rect.right - 30, rect.top + rect.height * 0.45);
		}
	}
</script>

<div class="reel-item" data-index={index} bind:this={itemEl}>
	<!-- Dark gradient at bottom for text readability -->
	<div class="bottom-gradient"></div>

	<!-- View count badge -->
	{#if clip.viewCount > 0}
		<div class="view-badge-wrapper">
			<ViewBadge viewCount={clip.viewCount} ontap={() => (showViewers = true)} />
		</div>
	{/if}

	{#if clip.contentType === 'music'}
		<ReelMusic {clip} {active} {muted} {autoScroll} playbackRate={speed} {onretry} {onended} />
	{:else}
		<ReelVideo {clip} {active} {muted} {autoScroll} playbackRate={speed} {onretry} {onended} bind:videoEl />
	{/if}

	<!-- Speed pill (visible when speed != 1x, tappable to cycle) -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="speed-pill"
		class:visible={active}
		class:highlight={speed !== 1}
		onclick={(e) => { e.stopPropagation(); handleCycleSpeed(); }}
	>
		{speed}x
	</div>

	<!-- Speed indicator -->
	{#if showSpeedIndicator}
		<div class="speed-indicator">{speed}x</div>
	{/if}

	<!-- Mute indicator -->
	{#if showMuteIndicator}
		<div class="mute-indicator">
			{#if muted}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
					<line x1="23" y1="9" x2="17" y2="15" />
					<line x1="17" y1="9" x2="23" y2="15" />
				</svg>
			{:else}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
					<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
				</svg>
			{/if}
		</div>
	{/if}

	<!-- Play/pause indicator (desktop click feedback) -->
	{#if showPlayIndicator && clip.contentType !== 'music'}
		<div class="play-indicator" class:persist={paused}>
			{#if paused}
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z"
					/>
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z"
					/>
				</svg>
			{/if}
		</div>
	{/if}

	<!-- Paused state persistent indicator -->
	{#if paused && !showPlayIndicator && clip.contentType !== 'music'}
		<div class="play-indicator persist">
			<svg viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z"
				/>
			</svg>
		</div>
	{/if}

	<!-- Progress bar (video reels only) -->
	{#if clip.contentType !== 'music' && duration > 0}
		<ProgressBar {currentTime} {duration} {isDesktop} onseek={seekTo} />
	{/if}

	<ReelOverlay
		username={clip.addedByUsername}
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
		oncomment={() => { commentsAutoFocus = false; showComments = true; }}
		onreaction={handleSidebarReactionTap}
		onreactionhold={triggerReactionPickerHold}
		onmute={toggleMute}
	/>

	<!-- Comment prompt bar (active reel only) -->
	{#if active}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="comment-prompt"
			onclick={(e) => { e.stopPropagation(); commentsAutoFocus = true; showComments = true; }}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
			<span>Add a comment...</span>
		</div>
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
		ondismiss={() => { showComments = false; localUnreadCount = 0; }}
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

	.mute-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		animation: mute-fade 0.8s ease forwards;
		pointer-events: none;
	}

	.mute-indicator svg {
		width: 24px;
		height: 24px;
	}

	@keyframes mute-fade {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.1);
		}
	}

	.play-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		animation: mute-fade 0.8s ease forwards;
		pointer-events: none;
	}

	.play-indicator.persist {
		animation: none;
		opacity: 0.8;
	}

	.play-indicator svg {
		width: 24px;
		height: 24px;
	}

	.speed-pill {
		position: absolute;
		top: max(60px, calc(env(safe-area-inset-top) + 52px));
		right: var(--space-lg);
		z-index: 6;
		padding: 4px 10px;
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
		transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
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

	.speed-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
		min-width: 56px;
		height: 56px;
		border-radius: var(--radius-full);
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 700;
		padding: 0 16px;
		animation: mute-fade 0.8s ease forwards;
		pointer-events: none;
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
</style>
