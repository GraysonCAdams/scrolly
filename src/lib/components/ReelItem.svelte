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
	import { feedUiHidden } from '$lib/stores/uiHidden';
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
	import PlatformIcon from './PlatformIcon.svelte';
	import type { FeedClip } from '$lib/types';

	const {
		clip,
		currentUserId,
		active,
		index,
		autoScroll,
		gifEnabled = false,
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
		gifEnabled?: boolean;
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
	let audioEl: HTMLAudioElement | null = $state(null);
	let paused = $state(false);
	let showPlayIndicator = $state(false);
	let playIndicatorTimer: ReturnType<typeof setTimeout> | null = null;
	let currentTime = $state(0);
	let duration = $state(0);
	let uiHidden = $state(false);
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
	const reactedEmoji = $derived(
		Object.entries(clip.reactions).find(([, v]) => v.reacted)?.[0] ?? null
	);
	let showViewers = $state(false);
	let showMusicLinks = $state(false);
	let maxPercent = $state(0);
	let wasActive = $state(false);
	const SCRUBBER_IDLE_TIMEOUT = 3000;
	let scrubberTimerId: ReturnType<typeof setTimeout> | null = null;
	let scrubberHidden = $state(false);
	const hasMusicLinks = $derived(
		clip.contentType === 'music' && (clip.spotifyUrl || clip.appleMusicUrl || clip.youtubeMusicUrl)
	);

	onMount(() => {
		isDesktop = isPointerFine();
	});
	onDestroy(() => {
		unsubMute();
		unsubSpeed();
		if (scrubberTimerId) clearTimeout(scrubberTimerId);
		sendWatchPercent(clip.id, maxPercent);
	});

	$effect(() => {
		if (active) feedUiHidden.set(uiHidden);
	});
	$effect(() => {
		if (!active || clip.watched || hasMarkedWatched) return;
		const timer = setTimeout(() => {
			hasMarkedWatched = true;
			onwatched(clip.id);
		}, 3000);
		return () => clearTimeout(timer);
	});
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
	$effect(() => {
		if (active) {
			wasActive = true;
		} else if (wasActive) {
			wasActive = false;
			sendWatchPercent(clip.id, maxPercent);
			maxPercent = 0;
		}
	});

	$effect(() => {
		const el = videoEl ?? audioEl;
		if (!el) return;
		return trackVideoTime(
			el,
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

	function startScrubberTimer() {
		if (scrubberTimerId) clearTimeout(scrubberTimerId);
		scrubberTimerId = setTimeout(() => {
			scrubberHidden = true;
		}, SCRUBBER_IDLE_TIMEOUT);
	}
	function resetScrubberTimer() {
		scrubberHidden = false;
		if (scrubberTimerId) clearTimeout(scrubberTimerId);
		scrubberTimerId = null;
		if (active && !paused) startScrubberTimer();
	}

	$effect(() => {
		if (!active || paused) {
			if (scrubberTimerId) clearTimeout(scrubberTimerId);
			scrubberTimerId = null;
			scrubberHidden = false;
			return;
		}
		startScrubberTimer();
		return () => {
			if (scrubberTimerId) clearTimeout(scrubberTimerId);
			scrubberTimerId = null;
		};
	});

	$effect(() => {
		if (!itemEl || !active) return;
		const handleActivity = () => resetScrubberTimer();
		itemEl.addEventListener('pointermove', handleActivity);
		itemEl.addEventListener('pointerdown', handleActivity);
		document.addEventListener('keydown', handleActivity);
		return () => {
			itemEl!.removeEventListener('pointermove', handleActivity);
			itemEl!.removeEventListener('pointerdown', handleActivity);
			document.removeEventListener('keydown', handleActivity);
		};
	});

	function togglePlayPause() {
		const el = videoEl ?? audioEl;
		if (!el) return;
		if (el.paused) el.play().catch(() => {});
		else el.pause();
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
	function seekMedia(time: number, relative = false) {
		const el = videoEl ?? audioEl;
		if (el)
			el.currentTime = Math.max(0, Math.min(relative ? el.currentTime + time : time, duration));
	}
	function fireHeartReaction(cx: number, cy: number) {
		showerEmoji = '❤️';
		showerX = cx;
		showerY = cy;
		showShower = true;
		if (!clip.reactions['❤️']?.reacted) onreaction(clip.id, '❤️');
		if (!clip.favorited) onfavorited(clip.id);
	}
	function toggleUiVisibility() {
		uiHidden = !uiHidden;
	}

	$effect(() => {
		if (!itemEl) return;
		const callbacks = { togglePlayPause, fireHeartReaction, toggleUiVisibility };
		const suppress = () => showPicker;
		return isDesktop
			? setupDesktopGestures(itemEl, callbacks, suppress)
			: setupMobileGestures(itemEl, callbacks, suppress);
	});

	$effect(() => {
		if (!active) return;
		return setupReelKeyboard(
			{
				toggleMute,
				togglePlayPause,
				stepSpeedUp,
				stepSpeedDown,
				showSpeedChange,
				seek: (s: number) => seekMedia(s, true)
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
		if (!clip.favorited) onfavorited(clip.id);
	}
	function triggerReactionPickerHold(bx: number, by: number) {
		pickerX = bx;
		pickerY = by;
		pickerDragMode = true;
		showPicker = true;
	}
</script>

<div class="reel-item" data-index={index} bind:this={itemEl}>
	<div class="bottom-gradient" class:ui-hidden={uiHidden}></div>
	<div class="top-left-row" class:ui-hidden={uiHidden}>
		{#if clip.viewCount > 0}
			<ViewBadge viewCount={clip.viewCount} ontap={() => (showViewers = true)} />
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
	</div>

	{#if clip.contentType === 'music'}
		<ReelMusic
			{clip}
			{active}
			{muted}
			{autoScroll}
			playbackRate={speed}
			{onretry}
			{onended}
			bind:audioEl
		/>
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

	<ReelIndicators
		{showSpeedIndicator}
		{speed}
		{showMuteIndicator}
		{muted}
		{showPlayIndicator}
		{paused}
	/>

	{#if duration > 0}
		<ProgressBar
			{currentTime}
			{duration}
			{isDesktop}
			onseek={seekMedia}
			uiHidden={uiHidden || scrubberHidden}
		/>
	{/if}

	<!-- Centered content frame for overlay + sidebar -->
	<div class="reel-content-frame">
		<ReelOverlay
			username={clip.addedByUsername}
			avatarPath={clip.addedByAvatar}
			platform={clip.platform}
			caption={clip.title}
			{canEditCaption}
			{seenByOthers}
			clipId={clip.id}
			{active}
			{oncaptionedit}
			{ondelete}
			{uiHidden}
			hasDiscOverlap={clip.contentType === 'music' && !!clip.albumArt}
			oncomment={() => {
				commentsAutoFocus = true;
				showComments = true;
			}}
		/>

		<ActionSidebar
			favorited={clip.favorited}
			{reactedEmoji}
			commentCount={clip.commentCount}
			unreadCommentCount={localUnreadCount}
			originalUrl={clip.originalUrl}
			{muted}
			{uiHidden}
			onsave={() => onfavorited(clip.id)}
			oncomment={() => {
				commentsAutoFocus = false;
				showComments = true;
			}}
			onreactionhold={triggerReactionPickerHold}
			onmute={toggleMute}
		/>

		{#if clip.contentType === 'music' && clip.albumArt}
			<div class="music-disc-area" class:ui-hidden={uiHidden}>
				{#if showMusicLinks && hasMusicLinks}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="music-links-popout"
						onclick={(e) => e.stopPropagation()}
						onkeydown={(e) => e.stopPropagation()}
					>
						{#if clip.spotifyUrl}
							<a
								href={clip.spotifyUrl}
								target="_blank"
								rel="external noopener"
								class="music-link-pill"
								aria-label="Spotify"
							>
								<PlatformIcon platform="spotify" size={16} />
							</a>
						{/if}
						{#if clip.appleMusicUrl}
							<a
								href={clip.appleMusicUrl}
								target="_blank"
								rel="external noopener"
								class="music-link-pill"
								aria-label="Apple Music"
							>
								<PlatformIcon platform="apple_music" size={16} />
							</a>
						{/if}
						{#if clip.youtubeMusicUrl}
							<a
								href={clip.youtubeMusicUrl}
								target="_blank"
								rel="external noopener"
								class="music-link-pill"
								aria-label="YouTube Music"
							>
								<PlatformIcon platform="youtube" size={16} />
							</a>
						{/if}
					</div>
				{/if}
				<button
					type="button"
					class="music-disc"
					class:spinning={active && !paused && !showMusicLinks}
					onclick={(e) => {
						e.stopPropagation();
						if (hasMusicLinks) showMusicLinks = !showMusicLinks;
					}}
					aria-label={showMusicLinks ? 'Close music links' : 'Open music links'}
				>
					<img src={clip.albumArt} alt="" class="music-disc-img" />
				</button>
			</div>
		{/if}
	</div>
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
		{gifEnabled}
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
	.reel-content-frame {
		position: absolute;
		inset: 0;
		max-width: 480px;
		margin: 0 auto;
		z-index: 5;
		pointer-events: none;
	}
	.reel-content-frame > :global(*) {
		pointer-events: auto;
	}
	.bottom-gradient {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(transparent, var(--reel-gradient-medium));
		z-index: 3;
		pointer-events: none;
		transition: opacity 0.3s ease;
	}
	.bottom-gradient.ui-hidden {
		opacity: 0;
	}
	.top-left-row {
		position: absolute;
		top: max(var(--space-md), env(safe-area-inset-top));
		left: var(--space-lg);
		z-index: 6;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		min-height: 40px;
		transition: opacity 0.3s ease;
	}
	.top-left-row.ui-hidden {
		opacity: 0;
		pointer-events: none;
	}
	.speed-pill {
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
		color: var(--reel-text);
	}
	.speed-pill:active {
		transform: scale(0.93);
	}
	.music-disc-area {
		position: absolute;
		right: var(--space-lg);
		bottom: calc(90px + env(safe-area-inset-bottom));
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		z-index: 5;
		transition: opacity 0.3s ease;
	}
	.music-disc-area.ui-hidden {
		opacity: 0;
		pointer-events: none;
	}
	.music-disc {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		overflow: hidden;
		box-shadow: 0 2px 8px var(--reel-icon-shadow);
		border: 2px solid rgba(255, 255, 255, 0.2);
		padding: 0;
		background: none;
		cursor: pointer;
		flex-shrink: 0;
	}
	.music-disc.spinning {
		animation: spin-disc 4s linear infinite;
	}
	.music-disc-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.music-links-popout {
		display: flex;
		align-items: center;
		gap: 6px;
		animation: links-slide-in 200ms cubic-bezier(0.32, 0.72, 0, 1);
	}
	@keyframes links-slide-in {
		from {
			opacity: 0;
			transform: translateX(12px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	.music-link-pill {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		background: var(--reel-icon-circle-bg);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		color: var(--reel-text);
		text-decoration: none;
		transition:
			background 0.15s ease,
			transform 0.1s ease;
	}
	.music-link-pill:active {
		transform: scale(0.93);
		background: var(--reel-icon-circle-active);
	}
	@keyframes spin-disc {
		to {
			transform: rotate(360deg);
		}
	}
</style>
