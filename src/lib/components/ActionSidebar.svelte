<script lang="ts">
	const {
		favorited,
		commentCount,
		originalUrl,
		muted = true,
		onfavorite,
		oncomment,
		onreaction,
		onreactionhold,
		onmute
	}: {
		favorited: boolean;
		commentCount: number;
		originalUrl: string;
		muted?: boolean;
		onfavorite: () => void;
		oncomment: () => void;
		onreaction: () => void;
		onreactionhold?: (x: number, y: number) => void;
		onmute?: () => void;
	} = $props();

	let reactionBtnEl: HTMLButtonElement | null = $state(null);
	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let holdFired = false;

	function stop(e: MouseEvent | PointerEvent) {
		e.stopPropagation();
	}

	function handleReactionDown(e: PointerEvent) {
		e.stopPropagation();
		holdFired = false;
		holdTimer = setTimeout(() => {
			holdFired = true;
			if (onreactionhold && reactionBtnEl) {
				const rect = reactionBtnEl.getBoundingClientRect();
				onreactionhold(rect.left + rect.width / 2, rect.top);
			}
		}, 350);
	}

	function handleReactionUp(e: PointerEvent) {
		e.stopPropagation();
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
		if (!holdFired) {
			onreaction();
		}
		holdFired = false;
	}
</script>

<div class="action-sidebar">
	{#if onmute}
		<button
			class="sidebar-btn"
			onclick={(e) => {
				stop(e);
				onmute?.();
			}}
			aria-label={muted ? 'Unmute' : 'Mute'}
		>
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
		</button>
	{/if}

	<button
		class="sidebar-btn"
		class:active={favorited}
		onclick={(e) => {
			stop(e);
			onfavorite();
		}}
	>
		<svg
			viewBox="0 0 24 24"
			fill={favorited ? 'currentColor' : 'none'}
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path
				d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
			/>
		</svg>
	</button>

	<button
		class="sidebar-btn"
		onclick={(e) => {
			stop(e);
			oncomment();
		}}
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
		{#if commentCount > 0}
			<span class="sidebar-count">{commentCount}</span>
		{/if}
	</button>

	<button
		class="sidebar-btn"
		bind:this={reactionBtnEl}
		onpointerdown={handleReactionDown}
		onpointerup={handleReactionUp}
	>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M8 14s1.5 2 4 2 4-2 4-2" />
			<line x1="9" y1="9" x2="9.01" y2="9" />
			<line x1="15" y1="9" x2="15.01" y2="9" />
		</svg>
	</button>

	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<a href={originalUrl} target="_blank" rel="noopener" class="sidebar-btn" onclick={stop}>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
			<polyline points="15 3 21 3 21 9" />
			<line x1="10" y1="14" x2="21" y2="3" />
		</svg>
	</a>
</div>

<style>
	.action-sidebar {
		position: absolute;
		right: var(--space-md);
		bottom: calc(90px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xl);
		z-index: 5;
	}

	.sidebar-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0;
		min-width: 44px;
		min-height: 44px;
		justify-content: center;
		text-decoration: none;
	}

	.sidebar-btn svg {
		width: 28px;
		height: 28px;
		filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6));
	}

	.sidebar-btn.active {
		color: var(--accent-magenta);
	}

	.sidebar-count {
		font-size: 0.75rem;
		font-weight: 600;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
	}
</style>
