<script lang="ts">
	interface GifResult {
		id: string;
		title: string;
		url: string;
		stillUrl: string;
		width: number;
		height: number;
	}

	const {
		onselect,
		ondismiss
	}: {
		onselect: (gif: GifResult) => void;
		ondismiss: () => void;
	} = $props();

	let query = $state('');
	let gifs = $state<GifResult[]>([]);
	let loading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		loadGifs();
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	$effect(() => {
		// Debounced search on query change
		const q = query;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			loadGifs(q);
		}, 300);
	});

	async function loadGifs(q?: string) {
		loading = true;
		try {
			const searchParams = q?.trim() ? `q=${encodeURIComponent(q.trim())}&limit=20` : 'limit=20';
			const res = await fetch(`/api/gifs/search?${searchParams}`);
			if (res.ok) {
				const data = await res.json();
				gifs = data.gifs || [];
			}
		} catch {
			// Silently fail — GIF search is non-critical
		}
		loading = false;
	}
</script>

<div class="gif-picker">
	<div class="picker-header">
		<input type="text" bind:value={query} placeholder="Search GIFs..." inputmode="search" />
		<button class="close-btn" onclick={ondismiss}>&times;</button>
	</div>

	<div class="gif-grid">
		{#if loading && gifs.length === 0}
			<p class="status">Loading...</p>
		{:else if gifs.length === 0}
			<p class="status">No GIFs found</p>
		{:else}
			{#each gifs as gif (gif.id)}
				<button
					class="gif-item"
					onclick={() => onselect(gif)}
					style="aspect-ratio: {gif.width}/{gif.height}"
				>
					<img
						src={gif.stillUrl}
						alt={gif.title}
						loading="lazy"
						onmouseenter={(e) => {
							(e.currentTarget as HTMLImageElement).src = gif.url;
						}}
						onmouseleave={(e) => {
							(e.currentTarget as HTMLImageElement).src = gif.stillUrl;
						}}
						ontouchstart={(e) => {
							(e.currentTarget as HTMLImageElement).src = gif.url;
						}}
					/>
				</button>
			{/each}
		{/if}
	</div>

	<div class="attribution">Powered by GIPHY</div>
</div>

<style>
	.gif-picker {
		display: flex;
		flex-direction: column;
		height: 40vh;
		border-top: 1px solid var(--border);
		background: var(--bg-elevated);
	}

	.picker-header {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		flex-shrink: 0;
	}

	.picker-header input {
		flex: 1;
		padding: var(--space-xs) var(--space-md);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--bg-surface);
		color: var(--text-primary);
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.2s ease;
	}
	.picker-header input:focus {
		border-color: var(--accent-primary);
	}
	.picker-header input::placeholder {
		color: var(--text-muted);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1.25rem;
		cursor: pointer;
		padding: var(--space-xs);
		line-height: 1;
	}

	.gif-grid {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior-y: contain;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xs);
		padding: 0 var(--space-sm) var(--space-sm);
		align-content: start;
	}

	.status {
		grid-column: 1 / -1;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.875rem;
		padding: var(--space-xl);
		margin: 0;
	}

	.gif-item {
		background: var(--bg-surface);
		border: none;
		border-radius: var(--radius-sm);
		overflow: hidden;
		cursor: pointer;
		padding: 0;
		transition: transform 0.1s ease;
	}
	.gif-item:active {
		transform: scale(0.97);
	}
	.gif-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.attribution {
		text-align: center;
		font-size: 0.625rem;
		color: var(--text-muted);
		padding: var(--space-xs);
		flex-shrink: 0;
	}
</style>
