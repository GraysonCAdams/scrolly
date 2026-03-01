<script lang="ts">
	import InlineError from './InlineError.svelte';
	import {
		isSupportedUrl,
		platformLabel,
		detectPlatform,
		isPlatformAllowed
	} from '$lib/url-validation';
	import { addToast } from '$lib/stores/toasts';
	import { page } from '$app/stores';

	const {
		onsubmitted,
		initialUrl
	}: {
		onsubmitted?: (
			clip: { id: string; status: string; contentType: string },
			caption: string
		) => void;
		initialUrl?: string;
	} = $props();

	const hasProvider = $derived(!!$page.data.group?.downloadProvider);
	const platformFilterMode = $derived(($page.data.group?.platformFilterMode as string) ?? 'all');
	const platformFilterList = $derived<string[] | null>(
		$page.data.group?.platformFilterList
			? JSON.parse($page.data.group.platformFilterList as string)
			: null
	);
	let url = $state('');
	let error = $state('');
	let loading = $state(false);
	let urlInput = $state<HTMLInputElement | null>(null);
	let clipboardSuggestion = $state<{ url: string; label: string } | null>(null);

	const detectedPlatform = $derived(url.trim() ? detectPlatform(url.trim()) : null);
	const platformBlocked = $derived(
		detectedPlatform
			? !isPlatformAllowed(detectedPlatform, platformFilterMode, platformFilterList)
			: false
	);

	export function focus() {
		urlInput?.focus();
	}

	// Seed URL from prop
	$effect.pre(() => {
		if (initialUrl) url = initialUrl;
	});

	// Attempt clipboard read on mount (requires user gesture — modal tap counts)
	$effect(() => {
		if (initialUrl) return; // Skip if URL was provided externally
		(async () => {
			try {
				const text = await navigator.clipboard.readText();
				const trimmed = text?.trim();
				if (trimmed && isSupportedUrl(trimmed)) {
					const detected = detectPlatform(trimmed);
					if (detected && isPlatformAllowed(detected, platformFilterMode, platformFilterList)) {
						const label = platformLabel(trimmed);
						if (label) {
							clipboardSuggestion = { url: trimmed, label };
						}
					}
				}
			} catch {
				// Clipboard permission denied or API unavailable — silently ignore
			}
		})();
	});

	function acceptClipboard() {
		if (clipboardSuggestion) {
			url = clipboardSuggestion.url;
			clipboardSuggestion = null;
		}
	}

	function dismissClipboard() {
		clipboardSuggestion = null;
	}

	async function handleSubmit() {
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/clips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: url.trim() })
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Failed to add video';
				return;
			}
			url = '';
			// Always create a processing toast — persists in global ToastStack
			// even if modal is dismissed/destroyed. AddVideoModal removes it
			// when UploadStatus takes over as the feedback mechanism.
			addToast({
				type: 'processing',
				message: `Adding ${data.clip.contentType === 'music' ? 'song' : 'video'} to feed...`,
				clipId: data.clip.id,
				contentType: data.clip.contentType,
				autoDismiss: 0
			});
			onsubmitted?.(data.clip, '');
		} catch {
			error = 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

{#if !hasProvider}
	<div class="add-video no-provider-state">
		<svg
			class="no-provider-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
		<p class="no-provider-title">No download provider set up</p>
		<p class="no-provider-desc">Ask your group host to configure one in Settings.</p>
	</div>
{:else}
	<form
		class="add-video"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		{#if clipboardSuggestion}
			<div class="clipboard-suggestion">
				<div class="suggestion-content">
					<svg
						class="suggestion-icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
						<rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
					</svg>
					<div class="suggestion-text">
						<span class="suggestion-label">Paste from {clipboardSuggestion.label}?</span>
						<span class="suggestion-url">{clipboardSuggestion.url}</span>
					</div>
				</div>
				<div class="suggestion-actions">
					<button type="button" class="suggestion-confirm" onclick={acceptClipboard}>
						Paste
					</button>
					<button
						type="button"
						class="suggestion-dismiss"
						onclick={dismissClipboard}
						aria-label="Dismiss"
					>
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
				</div>
			</div>
		{/if}

		<div class="input-wrap" class:has-error={!!error}>
			<input
				bind:this={urlInput}
				type="url"
				bind:value={url}
				placeholder="Paste a link..."
				disabled={loading}
			/>
			<button type="submit" disabled={loading || !url.trim() || platformBlocked}>
				{#if loading}
					<span class="spinner"></span>
				{:else}
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="5" y1="12" x2="19" y2="12" />
						<polyline points="12 5 19 12 12 19" />
					</svg>
				{/if}
			</button>
		</div>
		{#if platformBlocked}
			<p class="platform-blocked">{platformLabel(url.trim())} links aren't allowed in this group</p>
		{/if}
		<InlineError message={error} />
	</form>
{/if}

<style>
	.add-video {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg) var(--space-lg);
	}

	/* Clipboard suggestion banner */
	.clipboard-suggestion {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		width: 100%;
		background: var(--bg-elevated);
		border: 1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		animation: slide-in 0.2s ease;
	}

	.suggestion-content {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		min-width: 0;
		flex: 1;
	}

	.suggestion-icon {
		width: 18px;
		height: 18px;
		color: var(--accent-primary);
		flex-shrink: 0;
	}

	.suggestion-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.suggestion-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.suggestion-url {
		font-size: 0.6875rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.suggestion-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	.suggestion-confirm {
		padding: var(--space-xs) var(--space-md);
		background: var(--accent-primary);
		color: var(--bg-primary);
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		width: auto;
		height: auto;
		margin: 0;
	}

	.suggestion-dismiss {
		background: none;
		border: none;
		padding: 4px;
		color: var(--text-muted);
		cursor: pointer;
		width: auto;
		height: auto;
		margin: 0;
	}

	.suggestion-dismiss svg {
		width: 16px;
		height: 16px;
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.input-wrap {
		display: flex;
		align-items: center;
		width: 100%;
		background: var(--bg-elevated);
		border: 1.5px solid var(--border);
		border-radius: var(--radius-full);
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
		overflow: hidden;
	}

	.input-wrap:focus-within {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary) 15%, transparent);
	}

	.input-wrap.has-error {
		border-color: var(--error);
	}

	input {
		flex: 1;
		padding: 14px 0 14px 20px;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-size: 1rem;
		font-family: var(--font-body);
		outline: none;
		min-width: 0;
	}

	input::placeholder {
		color: var(--text-muted);
	}

	button {
		flex-shrink: 0;
		width: 42px;
		height: 42px;
		margin: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-primary);
		color: var(--bg-primary);
		border: none;
		border-radius: var(--radius-full);
		cursor: pointer;
		transition:
			transform 0.1s ease,
			opacity 0.15s ease;
	}

	button svg {
		width: 20px;
		height: 20px;
	}

	button:active {
		transform: scale(0.92);
	}

	button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2.5px solid rgba(0, 0, 0, 0.15);
		border-top-color: var(--bg-primary);
		border-radius: var(--radius-full);
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.platform-blocked {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--error);
		text-align: center;
	}

	.no-provider-state {
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-2xl) var(--space-lg);
	}

	.no-provider-icon {
		width: 40px;
		height: 40px;
		color: var(--text-muted);
		opacity: 0.4;
		margin-bottom: var(--space-md);
	}

	.no-provider-title {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.no-provider-desc {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0;
	}
</style>
