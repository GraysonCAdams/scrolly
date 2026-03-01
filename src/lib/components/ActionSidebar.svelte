<script lang="ts">
	/** SVG paths for reaction icons (matching ReactionPicker) */
	const REACTION_ICONS: Record<string, string> = {
		'👍': 'M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z',
		'👎': 'M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z',
		'😂': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
		'‼️': 'M12 2v12M12 18v2M6 2v12M6 18v2',
		'❓': 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01'
	};

	const {
		favorited,
		reactedEmoji = null,
		commentCount,
		unreadCommentCount = 0,
		originalUrl,
		muted = true,
		uiHidden = false,
		onsave,
		oncomment,
		onreactionhold,
		onmute
	}: {
		favorited: boolean;
		reactedEmoji?: string | null;
		commentCount: number;
		unreadCommentCount?: number;
		originalUrl: string;
		muted?: boolean;
		uiHidden?: boolean;
		onsave: () => void;
		oncomment: () => void;
		onreactionhold?: (x: number, y: number) => void;
		onmute?: () => void;
	} = $props();

	let saveBtnEl: HTMLButtonElement | null = $state(null);
	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let holdFired = false;

	let justSaved = $state(false);
	let prevFavorited = $state(false);
	$effect(() => {
		if (favorited && !prevFavorited) {
			justSaved = true;
			setTimeout(() => {
				justSaved = false;
			}, 300);
		}
		prevFavorited = favorited;
	});

	function stop(e: MouseEvent | PointerEvent) {
		e.stopPropagation();
	}

	function handleSaveDown(e: PointerEvent) {
		e.stopPropagation();
		holdFired = false;
		holdTimer = setTimeout(() => {
			holdFired = true;
			if (onreactionhold && saveBtnEl) {
				const rect = saveBtnEl.getBoundingClientRect();
				onreactionhold(rect.left + rect.width / 2, rect.top);
			}
		}, 350);
	}

	function handleSaveUp(e: PointerEvent) {
		e.stopPropagation();
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
		if (!holdFired) {
			onsave();
		}
		holdFired = false;
	}

	function formatCount(n: number): string {
		if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
		return String(n);
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- only external URLs in this component -->
<div class="action-sidebar" class:ui-hidden={uiHidden}>
	{#if onmute}
		<button
			class="sidebar-btn"
			onclick={(e) => {
				stop(e);
				onmute?.();
			}}
			aria-label={muted ? 'Unmute' : 'Mute'}
		>
			<span class="icon-circle">
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
			</span>
		</button>
	{/if}

	<button
		class="sidebar-btn"
		class:active={favorited}
		bind:this={saveBtnEl}
		onpointerdown={handleSaveDown}
		onpointerup={handleSaveUp}
		aria-label={favorited ? 'Unsave' : 'Save'}
	>
		<span class="icon-circle" class:pop={justSaved}>
			{#if reactedEmoji && reactedEmoji !== '❤️' && REACTION_ICONS[reactedEmoji]}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d={REACTION_ICONS[reactedEmoji]} />
				</svg>
			{:else}
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
			{/if}
		</span>
	</button>

	<button
		class="sidebar-btn"
		onclick={(e) => {
			stop(e);
			oncomment();
		}}
	>
		<span class="icon-circle">
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
			{#if unreadCommentCount > 0}
				<span class="unread-badge">{unreadCommentCount > 9 ? '9+' : unreadCommentCount}</span>
			{/if}
		</span>
		{#if commentCount > 0}
			<span class="sidebar-count">{formatCount(commentCount)}</span>
		{/if}
	</button>

	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL, not app navigation -->
	<a
		href={originalUrl}
		target="_blank"
		rel="noopener noreferrer"
		class="sidebar-btn"
		onclick={stop}
		aria-label="Open original"
	>
		<span class="icon-circle">
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
		</span>
	</a>
</div>

<style>
	.action-sidebar {
		position: absolute;
		right: var(--space-lg);
		bottom: calc(148px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-lg);
		z-index: 5;
		transition: opacity 0.3s ease;
	}

	.action-sidebar.ui-hidden {
		opacity: 0;
		pointer-events: none;
	}

	.sidebar-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		color: var(--reel-text);
		cursor: pointer;
		padding: 0;
		min-width: 44px;
		justify-content: center;
		text-decoration: none;
	}

	.icon-circle {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		background: var(--reel-icon-circle-bg);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		transition: background 0.15s ease;
	}

	.sidebar-btn:active .icon-circle {
		background: var(--reel-icon-circle-active);
		transform: scale(0.93);
	}

	.icon-circle svg {
		width: 24px;
		height: 24px;
		filter: drop-shadow(0 1px 2px var(--reel-icon-shadow));
	}

	.sidebar-btn.active .icon-circle {
		background: color-mix(in srgb, var(--accent-magenta) 20%, transparent);
	}

	.sidebar-btn.active {
		color: var(--accent-magenta);
	}

	.unread-badge {
		position: absolute;
		top: -2px;
		right: -2px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: var(--radius-full);
		background: var(--accent-magenta);
		color: var(--reel-text);
		font-size: 0.5625rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.sidebar-count {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--reel-text);
		text-shadow: 0 1px 3px var(--reel-text-shadow);
	}

	.icon-circle.pop {
		animation: icon-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes icon-pop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.3);
		}
		100% {
			transform: scale(1);
		}
	}

	.unread-badge {
		animation: badge-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes badge-pop {
		from {
			transform: scale(0);
		}
		to {
			transform: scale(1);
		}
	}
</style>
