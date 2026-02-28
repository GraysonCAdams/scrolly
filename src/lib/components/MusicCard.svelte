<script lang="ts">
	import { basename } from '$lib/utils';
	import { onTapHold, type TapHoldEvent } from '$lib/gestures';
	import ReactionPicker from './ReactionPicker.svelte';
	import EmojiShower from './EmojiShower.svelte';
	import CommentsSheet from './CommentsSheet.svelte';
	import PlatformIcon from './PlatformIcon.svelte';

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
		reactions: Record<string, { count: number; reacted: boolean }>;
		createdAt: string;
	}

	const {
		clip,
		currentUserId,
		onwatched,
		onfavorited,
		onreaction,
		onretry
	}: {
		clip: Clip;
		currentUserId: string;
		onwatched: (id: string) => void;
		onfavorited: (id: string) => void;
		onreaction: (clipId: string, emoji: string) => Promise<void>;
		onretry: (id: string) => void;
	} = $props();

	let audioEl: HTMLAudioElement | null = $state(null);
	let cardEl: HTMLDivElement | null = $state(null);
	let hasMarkedWatched = $state(false);
	let playing = $state(false);
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

	function getAudioUrl(path: string | null): string {
		if (!path) return '';
		return `/api/videos/${basename(path)}`;
	}

	function handleTimeUpdate() {
		if (!audioEl) return;
		currentTime = audioEl.currentTime;
		duration = audioEl.duration || 0;

		if (!hasMarkedWatched && !clip.watched && currentTime >= 10) {
			hasMarkedWatched = true;
			onwatched(clip.id);
		}
	}

	function togglePlay() {
		if (!audioEl) return;
		if (playing) {
			audioEl.pause();
		} else {
			audioEl.play();
		}
	}

	function handleSeek(e: Event) {
		if (!audioEl) return;
		const target = e.target as HTMLInputElement;
		audioEl.currentTime = parseFloat(target.value);
	}

	function formatTime(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	// Gesture handler: double-tap = ❤️, hold = picker
	$effect(() => {
		if (!cardEl) return;
		return onTapHold(cardEl, {
			onDoubleTap(e: TapHoldEvent) {
				showerEmoji = '❤️';
				showerX = e.clientX;
				showerY = e.clientY;
				showShower = true;
				onreaction(clip.id, '❤️');
			},
			onHoldStart(e: TapHoldEvent) {
				pickerX = e.clientX;
				pickerY = e.clientY;
				pickerDragMode = true;
				showPicker = true;
			}
		});
	});

	function handlePickEmoji(emoji: string) {
		showPicker = false;
		showerEmoji = emoji;
		showerX = pickerX;
		showerY = pickerY;
		showShower = true;
		onreaction(clip.id, emoji);
	}

	const reactionEntries = $derived(Object.entries(clip.reactions).filter(([, v]) => v.count > 0));
</script>

<div class="music-card" class:is-watched={clip.watched || hasMarkedWatched} bind:this={cardEl}>
	<div class="player" style={clip.albumArt ? `--bg: url(${clip.albumArt})` : ''}>
		{#if clip.albumArt}
			<div class="album-bg"></div>
		{/if}
		<div class="player-content">
			{#if clip.albumArt}
				<img class="album-art" src={clip.albumArt} alt="Album art" />
			{:else}
				<div class="album-art placeholder-art">♫</div>
			{/if}

			<p class="song-title">{clip.title || 'Unknown Title'}</p>
			{#if clip.artist}
				<p class="song-artist">{clip.artist}</p>
			{/if}

			{#if clip.status === 'ready' && clip.audioPath}
				<audio
					bind:this={audioEl}
					src={getAudioUrl(clip.audioPath)}
					preload="metadata"
					ontimeupdate={handleTimeUpdate}
					onplay={() => (playing = true)}
					onpause={() => (playing = false)}
					onloadedmetadata={() => {
						if (audioEl) duration = audioEl.duration;
					}}
				></audio>

				<div class="controls">
					<button class="play-btn" onclick={togglePlay}>
						{playing ? '⏸' : '▶'}
					</button>
					<span class="time">{formatTime(currentTime)}</span>
					<input
						type="range"
						min="0"
						max={duration || 0}
						step="0.1"
						value={currentTime}
						oninput={handleSeek}
						class="progress"
					/>
					<span class="time">{formatTime(duration)}</span>
				</div>
			{:else if clip.durationSeconds}
				<p class="song-duration">{formatTime(clip.durationSeconds)}</p>
			{/if}

			{#if clip.status === 'downloading'}
				<div class="status-row">
					<span class="spinner"></span>
					<span class="status-label">Finding song...</span>
				</div>
			{:else if clip.status === 'failed'}
				<div class="status-row">
					<span class="status-label error-label">Couldn't download audio</span>
					<button class="retry-btn" onclick={() => onretry(clip.id)}>Retry</button>
				</div>
			{/if}

			{#if clip.spotifyUrl || clip.appleMusicUrl || clip.youtubeMusicUrl}
				<div class="platform-links">
					{#if clip.spotifyUrl}
						<a
							href={clip.spotifyUrl}
							target="_blank"
							rel="noopener"
							class="platform-pill"
							aria-label="Spotify"
						>
							<PlatformIcon platform="spotify" size={16} />
							<span>Spotify</span>
						</a>
					{/if}
					{#if clip.appleMusicUrl}
						<a
							href={clip.appleMusicUrl}
							target="_blank"
							rel="noopener"
							class="platform-pill"
							aria-label="Apple Music"
						>
							<PlatformIcon platform="apple_music" size={16} />
							<span>Apple</span>
						</a>
					{/if}
					{#if clip.youtubeMusicUrl}
						<a
							href={clip.youtubeMusicUrl}
							target="_blank"
							rel="noopener"
							class="platform-pill"
							aria-label="YouTube Music"
						>
							<PlatformIcon platform="youtube" size={16} />
							<span>YouTube</span>
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="info">
		<div class="meta">
			<span class="username">{clip.addedByUsername}</span>
			<span class="platform"><PlatformIcon platform={clip.platform} size={14} /></span>
		</div>
		<div class="actions">
			{#if reactionEntries.length > 0}
				<div class="reaction-pills">
					{#each reactionEntries as [emoji, data]}
						<button
							class="reaction-pill"
							class:reacted={data.reacted}
							onclick={() => onreaction(clip.id, emoji)}
						>
							{emoji}
							{data.count}
						</button>
					{/each}
				</div>
			{/if}
			<button class="action-btn" class:active={clip.favorited} onclick={() => onfavorited(clip.id)}>
				{clip.favorited ? '★' : '☆'}
			</button>
			<button class="action-btn" onclick={() => (showComments = true)}>
				💬{clip.commentCount > 0 ? ` ${clip.commentCount}` : ''}
			</button>
			<a href={clip.originalUrl} target="_blank" rel="noopener" class="action-btn">↗</a>
		</div>
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
	<CommentsSheet clipId={clip.id} {currentUserId} ondismiss={() => (showComments = false)} />
{/if}

<style>
	.music-card {
		width: 100%;
		max-width: 480px;
		margin: 0 auto var(--space-xl);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--bg-elevated);
		position: relative;
	}

	.player {
		position: relative;
		min-height: 360px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: var(--bg-elevated);
	}

	.album-bg {
		position: absolute;
		inset: -20px;
		background-image: var(--bg);
		background-size: cover;
		background-position: center;
		filter: blur(20px) brightness(0.4);
	}

	.player-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-2xl) var(--space-xl);
		width: 100%;
		text-align: center;
	}

	.album-art {
		width: 180px;
		height: 180px;
		border-radius: var(--radius-md);
		object-fit: cover;
		margin-bottom: var(--space-lg);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.placeholder-art {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-subtle);
		color: var(--text-muted);
		font-size: 3rem;
	}

	.song-title {
		margin: 0 0 2px;
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 600;
		color: #fff;
	}

	.song-artist {
		margin: 0;
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.song-duration {
		margin: var(--space-xs) 0 0;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.45);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		max-width: 320px;
		margin-top: var(--space-lg);
	}

	.play-btn {
		background: var(--overlay-btn);
		border: none;
		color: #fff;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.play-btn:active {
		background: var(--overlay-btn-active);
	}

	.time {
		font-size: 0.75rem;
		color: var(--overlay-text);
		min-width: 32px;
		flex-shrink: 0;
	}

	.progress {
		flex: 1;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--overlay-track);
		border-radius: 2px;
		outline: none;
	}

	.progress::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #fff;
		cursor: pointer;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-top-color: rgba(255, 255, 255, 0.7);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.status-label {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.error-label {
		color: rgba(255, 255, 255, 0.45);
	}

	.retry-btn {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.8);
		padding: 3px 14px;
		border-radius: var(--radius-full);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.retry-btn:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.platform-links {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: var(--space-lg);
	}

	.platform-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		font-size: 0.8125rem;
		font-weight: 500;
		transition: background 0.2s ease;
	}

	.platform-pill:active {
		background: rgba(255, 255, 255, 0.18);
	}

	.info {
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-surface);
		color: var(--text-primary);
	}

	.meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.875rem;
		margin-bottom: var(--space-xs);
	}

	.username {
		font-weight: 600;
	}
	.platform {
		color: var(--text-secondary);
		display: inline-flex;
		align-items: center;
	}

	.actions {
		display: flex;
		gap: var(--space-sm);
		align-items: center;
		flex-wrap: wrap;
	}

	.reaction-pills {
		display: flex;
		gap: 4px;
	}

	.reaction-pill {
		background: var(--bg-subtle);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 2px 8px;
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.reaction-pill.reacted {
		border-color: var(--accent-primary);
		background: var(--bg-surface);
	}

	.action-btn {
		background: none;
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 1rem;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.2s ease;
	}

	.action-btn.active {
		color: var(--accent-magenta);
		border-color: var(--accent-magenta);
	}

	.is-watched {
		opacity: 0.7;
	}
</style>
