<script lang="ts">
	import InlineError from './InlineError.svelte';

	const {
		onsubmitted
	}: {
		onsubmitted?: (
			clip: { id: string; status: string; contentType: string },
			caption: string
		) => void;
	} = $props();

	let url = $state('');
	let error = $state('');
	let loading = $state(false);
	let urlInput = $state<HTMLInputElement | null>(null);

	export function focus() {
		urlInput?.focus();
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
			onsubmitted?.(data.clip, '');
		} catch {
			error = 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

<form
	class="add-video"
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
>
	<div class="input-wrap" class:has-error={!!error}>
		<input
			bind:this={urlInput}
			type="url"
			bind:value={url}
			placeholder="Paste a link..."
			disabled={loading}
		/>
		<button type="submit" disabled={loading || !url.trim()}>
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
	<InlineError message={error} />
	<p class="platforms">TikTok, Instagram, YouTube Shorts, Spotify, Apple Music</p>
</form>

<style>
	.add-video {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg) var(--space-lg);
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
		font-size: 0.9375rem;
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
		color: #000;
		border: none;
		border-radius: 50%;
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
		border-top-color: #000;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.platforms {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-muted);
		text-align: center;
		letter-spacing: 0.01em;
	}
</style>
