<script lang="ts">
	import AddVideo from './AddVideo.svelte';
	import { addToast, toast } from '$lib/stores/toasts';
	import { clipReadySignal, viewClipSignal } from '$lib/stores/toasts';

	const { ondismiss }: { ondismiss: () => void } = $props();

	let phase = $state<'form' | 'uploading' | 'done' | 'failed'>('form');
	let visible = $state(false);
	let clipId = $state('');
	let clipContentType = $state('');
	let caption = $state('');
	let captionDirty = $state(false);
	let serverTitle = $state<string | null>(null);
	let serverArtist = $state<string | null>(null);
	let serverAlbumArt = $state<string | null>(null);
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let savingCaption = $state(false);
	let addVideoRef = $state<ReturnType<typeof AddVideo> | null>(null);

	$effect(() => {
		requestAnimationFrame(() => {
			visible = true;
		});
		document.body.style.overflow = 'hidden';
		// Focus URL input after sheet animates in
		if (phase === 'form') {
			setTimeout(() => addVideoRef?.focus(), 350);
		}
		return () => {
			document.body.style.overflow = '';
			if (pollTimer) clearInterval(pollTimer);
		};
	});

	function handleSubmitted(
		clip: { id: string; status: string; contentType: string },
		submittedCaption: string
	) {
		clipId = clip.id;
		clipContentType = clip.contentType;
		caption = submittedCaption;
		phase = 'uploading';
		startPolling();
	}

	function startPolling() {
		pollTimer = setInterval(async () => {
			try {
				const res = await fetch(`/api/clips/${clipId}`);
				if (!res.ok) return;
				const data = await res.json();

				// Update metadata from server (e.g. music title/artist from Odesli)
				if (data.title && !captionDirty) {
					serverTitle = data.title;
				}
				if (data.artist) serverArtist = data.artist;
				if (data.albumArt) serverAlbumArt = data.albumArt;

				if (data.status === 'ready') {
					if (pollTimer) clearInterval(pollTimer);
					pollTimer = null;
					phase = 'done';
				} else if (data.status === 'failed') {
					if (pollTimer) clearInterval(pollTimer);
					pollTimer = null;
					phase = 'failed';
				}
			} catch {
				// Network error, keep polling
			}
		}, 3000);
	}

	async function handleRetry() {
		phase = 'uploading';
		try {
			const res = await fetch(`/api/clips/${clipId}/retry`, { method: 'POST' });
			if (res.ok) {
				startPolling();
			} else {
				phase = 'failed';
			}
		} catch {
			phase = 'failed';
		}
	}

	async function saveCaption() {
		if (!captionDirty || !caption.trim()) return;
		savingCaption = true;
		try {
			const res = await fetch(`/api/clips/${clipId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: caption.trim() })
			});
			if (!res.ok) {
				toast.error('Failed to save caption');
			}
		} catch {
			toast.error('Failed to save caption');
		}
		savingCaption = false;
	}

	function dismiss() {
		// If still uploading, push a background toast
		if (phase === 'uploading') {
			addToast({
				type: 'processing',
				message: `Adding ${clipContentType === 'music' ? 'song' : 'video'} to feed...`,
				clipId,
				contentType: clipContentType,
				autoDismiss: 0
			});
		}
		visible = false;
		setTimeout(ondismiss, 300);
	}

	async function handleSaveAndView() {
		if (captionDirty && caption.trim()) {
			await saveCaption();
		}
		clipReadySignal.set(clipId);
		viewClipSignal.set(clipId);
		visible = false;
		setTimeout(ondismiss, 300);
	}

	function handleCaptionInput(e: Event) {
		caption = (e.target as HTMLInputElement).value;
		captionDirty = true;
	}

	const statusText = $derived(
		phase === 'uploading'
			? clipContentType === 'music'
				? 'Finding song...'
				: 'Downloading video...'
			: phase === 'done'
				? 'Ready!'
				: 'Download failed'
	);

	const displayTitle = $derived(captionDirty ? caption : serverTitle || caption || '');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" class:visible onclick={dismiss} role="presentation"></div>

<div class="sheet" class:visible class:fullscreen={phase !== 'form'}>
	{#if phase === 'form'}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="handle-bar" onclick={dismiss} role="button" tabindex="-1">
			<div class="handle"></div>
		</div>
		<div class="header">
			<span class="title">Add to feed</span>
		</div>
		<div class="sheet-body">
			<AddVideo bind:this={addVideoRef} onsubmitted={handleSubmitted} />
		</div>
	{:else}
		<!-- Upload / Done / Failed screen -->
		<button class="close-btn" onclick={dismiss} aria-label="Close">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>

		<div class="upload-screen">
			{#if serverAlbumArt && clipContentType === 'music'}
				<div class="album-bg" style="background-image: url({serverAlbumArt})"></div>
			{/if}

			<div class="upload-content">
				<!-- Circle progress -->
				<div class="circle-wrap" class:done={phase === 'done'} class:failed={phase === 'failed'}>
					<svg class="circle-svg" viewBox="0 0 120 120">
						<circle class="circle-track" cx="60" cy="60" r="54" />
						<circle
							class="circle-progress"
							class:complete={phase === 'done'}
							class:error={phase === 'failed'}
							cx="60"
							cy="60"
							r="54"
						/>
					</svg>
					<div class="circle-inner">
						{#if phase === 'uploading'}
							<div class="pulse-dot"></div>
						{:else if phase === 'done'}
							<svg
								class="check-icon"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{:else}
							<svg
								class="error-icon"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						{/if}
					</div>
				</div>

				<p class="status-label">{statusText}</p>

				{#if serverArtist && clipContentType === 'music'}
					<p class="artist-label">{serverArtist}</p>
				{/if}

				<!-- Caption input -->
				<div class="caption-field">
					<input
						type="text"
						value={displayTitle}
						oninput={handleCaptionInput}
						placeholder="Add a caption..."
						maxlength={200}
					/>
				</div>

				<!-- Action buttons -->
				{#if phase === 'done'}
					<button class="primary-btn" onclick={handleSaveAndView} disabled={savingCaption}>
						{savingCaption ? 'Saving...' : 'View in feed'}
					</button>
				{:else if phase === 'failed'}
					<button class="primary-btn" onclick={handleRetry}> Try again </button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 99;
		opacity: 0;
		transition: opacity 300ms ease;
	}

	.overlay.visible {
		opacity: 1;
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--bg-surface);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		transform: translateY(100%);
		transition:
			transform 300ms cubic-bezier(0.32, 0.72, 0, 1),
			height 400ms cubic-bezier(0.32, 0.72, 0, 1),
			border-radius 400ms ease;
		max-height: 80vh;
	}

	.sheet.visible {
		transform: translateY(0);
	}

	.sheet.fullscreen {
		top: 0;
		max-height: none;
		border-radius: 0;
		background: #0a0a0a;
	}

	.handle-bar {
		display: flex;
		justify-content: center;
		padding: var(--space-md);
		cursor: pointer;
	}

	.handle {
		width: 36px;
		height: 4px;
		background: var(--bg-subtle);
		border-radius: 2px;
	}

	.header {
		padding: 0 var(--space-lg) var(--space-sm);
	}

	.title {
		font-family: var(--font-display);
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.sheet-body {
		padding-bottom: max(var(--space-lg), env(safe-area-inset-bottom));
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	/* Close button */
	.close-btn {
		position: absolute;
		top: max(var(--space-lg), env(safe-area-inset-top));
		right: var(--space-lg);
		z-index: 10;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		cursor: pointer;
	}

	.close-btn svg {
		width: 20px;
		height: 20px;
	}

	/* Upload screen */
	.upload-screen {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}

	.album-bg {
		position: absolute;
		inset: -40px;
		background-size: cover;
		background-position: center;
		filter: blur(40px) brightness(0.2);
	}

	.upload-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-2xl);
		width: 100%;
		max-width: 320px;
	}

	/* Circle progress */
	.circle-wrap {
		width: 120px;
		height: 120px;
		position: relative;
		margin-bottom: var(--space-xl);
	}

	.circle-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.circle-track {
		fill: none;
		stroke: rgba(255, 255, 255, 0.08);
		stroke-width: 4;
	}

	.circle-progress {
		fill: none;
		stroke: var(--accent-primary);
		stroke-width: 4;
		stroke-linecap: round;
		stroke-dasharray: 339.292;
		stroke-dashoffset: 169.646;
		animation: circle-spin 2s linear infinite;
		transform-origin: center;
	}

	.circle-progress.complete {
		animation: circle-complete 0.6s cubic-bezier(0.32, 0.72, 0, 1) forwards;
	}

	.circle-progress.error {
		stroke: var(--error);
		animation: circle-complete 0.6s cubic-bezier(0.32, 0.72, 0, 1) forwards;
		stroke-dashoffset: 339.292;
	}

	.circle-inner {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pulse-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent-primary);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.check-icon {
		width: 36px;
		height: 36px;
		color: var(--accent-primary);
		animation: check-pop 0.4s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.error-icon {
		width: 32px;
		height: 32px;
		color: var(--error);
	}

	.status-label {
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 4px;
		text-align: center;
	}

	.artist-label {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 var(--space-xl);
	}

	/* Caption field */
	.caption-field {
		width: 100%;
		margin-top: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.caption-field input {
		width: 100%;
		padding: 12px var(--space-lg);
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--radius-md);
		color: #fff;
		font-size: 0.9375rem;
		font-family: var(--font-body);
		text-align: center;
		outline: none;
		transition: border-color 0.2s ease;
	}

	.caption-field input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.caption-field input:focus {
		border-color: var(--accent-primary);
	}

	/* Buttons */
	.primary-btn {
		padding: 14px 32px;
		background: var(--accent-primary);
		color: #000;
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.9375rem;
		font-weight: 700;
		font-family: var(--font-body);
		cursor: pointer;
		transition: transform 0.1s ease;
		min-width: 160px;
	}

	.primary-btn:active {
		transform: scale(0.97);
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Animations */
	@keyframes circle-spin {
		0% {
			stroke-dashoffset: 169.646;
			transform: rotate(0deg);
		}
		50% {
			stroke-dashoffset: 254.469;
		}
		100% {
			stroke-dashoffset: 169.646;
			transform: rotate(360deg);
		}
	}

	@keyframes circle-complete {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.5);
			opacity: 0.5;
		}
	}

	@keyframes check-pop {
		from {
			transform: scale(0);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
