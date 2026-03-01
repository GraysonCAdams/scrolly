<script lang="ts">
	import { basename } from '$lib/utils';
	import { connectNormalizer } from '$lib/audio/normalizer';
	import PlatformIcon from './PlatformIcon.svelte';

	const {
		clip,
		active,
		muted,
		autoScroll,
		playbackRate = 1,
		onretry,
		onended
	}: {
		clip: {
			id: string;
			audioPath: string | null;
			albumArt: string | null;
			title: string | null;
			artist: string | null;
			durationSeconds: number | null;
			spotifyUrl: string | null;
			appleMusicUrl: string | null;
			youtubeMusicUrl: string | null;
			status: string;
			originalUrl: string;
		};
		active: boolean;
		muted: boolean;
		autoScroll: boolean;
		playbackRate?: number;
		onretry: (id: string) => void;
		onended: () => void;
	} = $props();

	let audioEl: HTMLAudioElement | null = $state(null);
	let playing = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);

	function getAudioUrl(path: string | null): string {
		if (!path) return '';
		return `/api/videos/${basename(path)}`;
	}

	function formatTime(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function togglePlay() {
		if (!audioEl) return;
		if (playing) {
			audioEl.pause();
		} else {
			audioEl.play().catch(() => {});
		}
	}

	function handleTimeUpdate() {
		if (!audioEl) return;
		currentTime = audioEl.currentTime;
		duration = audioEl.duration || 0;
	}

	function handleSeek(e: Event) {
		if (!audioEl) return;
		const target = e.target as HTMLInputElement;
		audioEl.currentTime = parseFloat(target.value);
	}

	// Autoplay/pause based on active state + connect volume normalizer
	$effect(() => {
		if (!audioEl) return;
		if (active) {
			connectNormalizer(audioEl);
			audioEl.currentTime = 0;
			audioEl.play().catch(() => {});
		} else {
			audioEl.pause();
		}
	});

	// Sync muted prop to audio element
	$effect(() => {
		if (audioEl) {
			audioEl.muted = muted;
		}
	});

	// Sync playback rate
	$effect(() => {
		if (audioEl) {
			audioEl.playbackRate = playbackRate;
		}
	});
</script>

<div class="reel-music">
	{#if clip.albumArt}
		<div class="music-bg" style="background-image: url({clip.albumArt})"></div>
	{:else}
		<div class="music-bg-fallback"></div>
	{/if}

	<div class="music-content">
		{#if clip.albumArt}
			<img
				class="album-art"
				class:is-playing={clip.status === 'ready' && playing}
				src={clip.albumArt}
				alt="Album art"
			/>
		{:else}
			<div
				class="album-art album-art-placeholder"
				class:is-playing={clip.status === 'ready' && playing}
			>
				♫
			</div>
		{/if}

		<p class="song-title">{clip.title || 'Unknown Title'}</p>
		{#if clip.artist}
			<p class="song-artist">{clip.artist}</p>
		{/if}

		{#if clip.status === 'ready' && clip.audioPath}
			<audio
				bind:this={audioEl}
				src={getAudioUrl(clip.audioPath)}
				preload="auto"
				loop={!autoScroll}
				ontimeupdate={handleTimeUpdate}
				onplay={() => (playing = true)}
				onpause={() => (playing = false)}
				onloadedmetadata={() => {
					if (audioEl) duration = audioEl.duration;
				}}
				onended={() => {
					if (autoScroll) onended();
				}}
			></audio>

			<button class="play-btn" onclick={togglePlay}>
				{#if playing}
					<svg viewBox="0 0 24 24" fill="currentColor"
						><rect x="6" y="4" width="4" height="16" rx="1" /><rect
							x="14"
							y="4"
							width="4"
							height="16"
							rx="1"
						/></svg
					>
				{:else}
					<svg viewBox="0 0 24 24" fill="currentColor"
						><path
							d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z"
						/></svg
					>
				{/if}
			</button>

			<div class="progress-row">
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
						rel="external noopener"
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
						rel="external noopener"
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
						rel="external noopener"
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

<style>
	.reel-music {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.music-bg {
		position: absolute;
		inset: -40px;
		background-size: cover;
		background-position: center;
		filter: blur(40px) brightness(0.3);
	}

	.music-bg-fallback {
		position: absolute;
		inset: 0;
		background: var(--bg-primary);
	}

	.music-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-2xl);
		width: 100%;
		max-width: 340px;
		text-align: center;
	}

	.album-art {
		width: 220px;
		height: 220px;
		border-radius: var(--radius-lg);
		object-fit: cover;
		margin-bottom: var(--space-xl);
		box-shadow: 0 12px 40px var(--reel-text-shadow);
		transition: transform 0.3s ease;
	}

	.album-art.is-playing {
		animation: pulse-art 3s ease-in-out infinite;
	}

	@keyframes pulse-art {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.02);
		}
	}

	.album-art-placeholder {
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
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--reel-text);
		text-shadow: 0 1px 4px var(--reel-text-shadow);
	}

	.song-artist {
		margin: 0;
		font-size: 1rem;
		color: var(--reel-text-dim);
	}

	.song-duration {
		margin: var(--space-xs) 0 0;
		font-size: 0.8125rem;
		color: var(--reel-text-faint);
	}

	.play-btn {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: none;
		background: var(--reel-frosted-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		color: var(--reel-text);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: var(--space-xl);
		margin-bottom: var(--space-xl);
		transition: transform 0.1s ease;
	}

	.play-btn:active {
		transform: scale(0.93);
	}

	.play-btn svg {
		width: 24px;
		height: 24px;
	}

	.progress-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	.time {
		font-size: 0.75rem;
		color: var(--reel-text-subtle);
		min-width: 32px;
		flex-shrink: 0;
	}

	.progress {
		flex: 1;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--reel-spinner-track);
		border-radius: 2px;
		outline: none;
	}

	.progress::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--reel-text);
		cursor: pointer;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
	}

	.spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid var(--reel-spinner-track);
		border-top-color: var(--reel-spinner-head);
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
		font-size: 0.875rem;
		color: var(--reel-text-subtle);
	}

	.error-label {
		color: var(--reel-text-faint);
	}

	.retry-btn {
		background: none;
		border: 1px solid var(--reel-input-border);
		color: var(--reel-text-medium);
		padding: 4px 16px;
		border-radius: var(--radius-full);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.retry-btn:active {
		background: var(--reel-glass-pill-bg);
	}

	.platform-links {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: var(--space-xl);
	}

	.platform-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: var(--radius-full);
		background: var(--reel-glass-pill-bg);
		color: var(--reel-text-bright);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: background 0.2s ease;
	}

	.platform-pill:active {
		background: var(--reel-frosted-bg-active);
	}
</style>
