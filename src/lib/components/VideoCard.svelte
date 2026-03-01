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
		thumbnailPath: string | null;
		title: string | null;
		addedByUsername: string;
		platform: string;
		status: string;
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

	let videoEl: HTMLVideoElement | null = $state(null);
	let cardEl: HTMLDivElement | null = $state(null);
	let hasMarkedWatched = $state(false);

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

	function getVideoUrl(path: string | null): string {
		if (!path) return '';
		return `/api/videos/${basename(path)}`;
	}

	function getThumbnailUrl(path: string | null): string {
		if (!path) return '';
		return `/api/thumbnails/${basename(path)}`;
	}

	function handleTimeUpdate() {
		if (!videoEl || hasMarkedWatched || clip.watched) return;
		if (videoEl.currentTime >= 3) {
			hasMarkedWatched = true;
			onwatched(clip.id);
		}
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

<div class="video-card" class:is-watched={clip.watched || hasMarkedWatched} bind:this={cardEl}>
	{#if clip.status === 'ready' && clip.videoPath}
		<video
			bind:this={videoEl}
			src={getVideoUrl(clip.videoPath)}
			poster={getThumbnailUrl(clip.thumbnailPath)}
			playsinline
			preload="metadata"
			ontimeupdate={handleTimeUpdate}
			controls
		></video>
	{:else if clip.status === 'downloading'}
		<div class="placeholder">
			<span class="spinner"></span>
			<p>Downloading...</p>
		</div>
	{:else if clip.status === 'failed'}
		<div class="placeholder failed">
			<p>Download failed</p>
			<div class="failed-actions">
				<button class="retry-btn" onclick={() => onretry(clip.id)}>Retry</button>
				<a href={clip.originalUrl} target="_blank" rel="noopener">View original</a>
			</div>
		</div>
	{/if}

	<div class="info">
		<div class="meta">
			<span class="username">{clip.addedByUsername}</span>
			<span class="platform"><PlatformIcon platform={clip.platform} size={14} /></span>
		</div>
		{#if clip.title}
			<p class="caption">{clip.title}</p>
		{/if}
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
	.video-card {
		width: 100%;
		max-width: 480px;
		margin: 0 auto var(--space-xl);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--bg-elevated);
		position: relative;
	}

	video {
		width: 100%;
		display: block;
		max-height: 80vh;
		object-fit: contain;
		background: var(--bg-primary);
	}

	.placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 300px;
		color: var(--text-secondary);
		gap: var(--space-sm);
	}

	.placeholder.failed {
		color: var(--error);
	}

	.failed-actions {
		display: flex;
		gap: var(--space-md);
		align-items: center;
	}

	.retry-btn {
		background: var(--accent-primary);
		color: #000000;
		border: none;
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-full);
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
	}

	.placeholder a {
		color: var(--accent-blue);
		text-decoration: none;
	}

	.spinner {
		display: inline-block;
		width: 24px;
		height: 24px;
		border: 2px solid var(--border);
		border-top-color: var(--text-secondary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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

	.caption {
		margin: var(--space-xs) 0 var(--space-sm);
		font-size: 0.9375rem;
		line-height: 1.4;
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
