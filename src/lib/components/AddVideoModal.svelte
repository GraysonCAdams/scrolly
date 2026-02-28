<script lang="ts">
	import AddVideo from './AddVideo.svelte';
	import UploadStatus from './UploadStatus.svelte';
	import { addToast, toast } from '$lib/stores/toasts';
	import { clipReadySignal, viewClipSignal } from '$lib/stores/toasts';
	import { dismissShortcutNudge } from '$lib/stores/shortcutNudge';

	const { ondismiss, initialUrl }: { ondismiss: () => void; initialUrl?: string } = $props();

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
	let closedViaBack = false;

	$effect(() => {
		requestAnimationFrame(() => {
			visible = true;
		});
		document.body.style.overflow = 'hidden';
		// Focus URL input after sheet animates in
		if (phase === 'form') {
			setTimeout(() => addVideoRef?.focus(), 350);
		}

		// Android back button / gesture support
		history.pushState({ sheet: 'addVideo' }, '');
		const handlePopState = () => {
			closedViaBack = true;
			ondismiss();
		};
		window.addEventListener('popstate', handlePopState);

		return () => {
			document.body.style.overflow = '';
			if (pollTimer) clearInterval(pollTimer);
			window.removeEventListener('popstate', handlePopState);
			if (!closedViaBack) history.back();
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

	function handleDismissNudge() {
		dismissShortcutNudge();
		visible = false;
		setTimeout(ondismiss, 300);
	}

	const displayTitle = $derived(captionDirty ? caption : serverTitle || caption || '');
</script>

<div class="overlay" class:visible onclick={dismiss} role="presentation"></div>

<div class="sheet" class:visible class:fullscreen={phase !== 'form'}>
	{#if phase === 'form'}
		<div
			class="handle-bar"
			onclick={dismiss}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') dismiss();
			}}
			role="button"
			tabindex="-1"
		>
			<div class="handle"></div>
		</div>
		<div class="header">
			<span class="title">Add to feed</span>
		</div>
		<div class="sheet-body">
			<AddVideo bind:this={addVideoRef} onsubmitted={handleSubmitted} {initialUrl} />
		</div>
	{:else}
		<UploadStatus
			{phase}
			{clipContentType}
			{displayTitle}
			{serverArtist}
			{serverAlbumArt}
			{savingCaption}
			ondismiss={dismiss}
			onretry={handleRetry}
			onsaveandview={handleSaveAndView}
			oncaptioninput={handleCaptionInput}
			ondismissnudge={handleDismissNudge}
		/>
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
</style>
