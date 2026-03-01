<script lang="ts">
	/** SVG icon paths for each reaction (Lucide-style, 24x24 viewBox) */
	const REACTIONS: { emoji: string; path: string }[] = [
		{
			emoji: '❤️',
			path: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'
		},
		{
			emoji: '👍',
			path: 'M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z'
		},
		{
			emoji: '👎',
			path: 'M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z'
		},
		{
			emoji: '😂',
			path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01'
		},
		{
			emoji: '‼️',
			path: 'M12 2v12M12 18v2M6 2v12M6 18v2'
		},
		{
			emoji: '❓',
			path: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01'
		}
	];

	const RADIUS = 140;
	const START_DEG = 120;
	const END_DEG = 240;

	const {
		x,
		y,
		onpick,
		ondismiss,
		dragMode = false
	}: {
		x: number;
		y: number;
		onpick: (emoji: string) => void;
		ondismiss: () => void;
		dragMode?: boolean;
	} = $props();

	let pickerEl: HTMLDivElement | null = $state(null);
	let visible = $state(false);
	let hoveredIndex = $state(-1);
	const btnEls: HTMLButtonElement[] = $state([]);

	// Pre-compute arc positions (math coords, screen-y inverted)
	const positions = REACTIONS.map((_, i) => {
		const deg = START_DEG + (END_DEG - START_DEG) * (i / (REACTIONS.length - 1));
		const rad = (deg * Math.PI) / 180;
		return {
			x: RADIUS * Math.cos(rad),
			y: -RADIUS * Math.sin(rad)
		};
	});

	// Animate in
	$effect(() => {
		const raf = requestAnimationFrame(() => {
			visible = true;
		});
		return () => cancelAnimationFrame(raf);
	});

	// Auto-dismiss after 4s (tap mode only)
	$effect(() => {
		if (dragMode) return;
		const timer = setTimeout(ondismiss, 4000);
		return () => clearTimeout(timer);
	});

	// Dismiss on outside click (tap mode only)
	$effect(() => {
		if (dragMode) return;

		function handleOutsideClick(e: PointerEvent) {
			if (pickerEl && !pickerEl.contains(e.target as Node)) {
				ondismiss();
			}
		}

		const timer = setTimeout(() => {
			document.addEventListener('pointerup', handleOutsideClick);
		}, 50);
		return () => {
			clearTimeout(timer);
			document.removeEventListener('pointerup', handleOutsideClick);
		};
	});

	// Drag mode: track pointer and pick on release
	$effect(() => {
		if (!dragMode) return;

		function hitTestEmoji(cx: number, cy: number): number {
			for (let i = 0; i < btnEls.length; i++) {
				const el = btnEls[i];
				if (!el) continue;
				const rect = el.getBoundingClientRect();
				const pad = 8;
				if (
					cx >= rect.left - pad &&
					cx <= rect.right + pad &&
					cy >= rect.top - pad &&
					cy <= rect.bottom + pad
				) {
					return i;
				}
			}
			return -1;
		}

		function handleMove(e: PointerEvent) {
			hoveredIndex = hitTestEmoji(e.clientX, e.clientY);
		}

		function handleUp(e: PointerEvent) {
			const idx = hitTestEmoji(e.clientX, e.clientY);
			if (idx >= 0) {
				onpick(REACTIONS[idx].emoji);
			} else {
				ondismiss();
			}
		}

		document.addEventListener('pointermove', handleMove);
		document.addEventListener('pointerup', handleUp);

		return () => {
			document.removeEventListener('pointermove', handleMove);
			document.removeEventListener('pointerup', handleUp);
		};
	});
</script>

<div
	class="picker-anchor"
	style="left:{x}px;top:{y}px"
	bind:this={pickerEl}
	role="listbox"
	aria-label="Reaction picker"
>
	{#each REACTIONS as reaction, i (reaction.emoji)}
		<button
			class="reaction-btn"
			class:visible
			class:hovered={hoveredIndex === i}
			style="--tx:{positions[i].x}px;--ty:{positions[i].y}px;transition-delay:{visible
				? i * 30
				: 0}ms"
			bind:this={btnEls[i]}
			onclick={() => {
				if (!dragMode) onpick(reaction.emoji);
			}}
			aria-label="React with {reaction.emoji}"
		>
			<svg
				viewBox="0 0 24 24"
				fill={i === 0 ? 'currentColor' : 'none'}
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d={reaction.path} />
			</svg>
		</button>
	{/each}
</div>

<style>
	.picker-anchor {
		position: fixed;
		z-index: 200;
		pointer-events: none;
	}

	.reaction-btn {
		position: absolute;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		cursor: pointer;
		padding: 0;
		border-radius: var(--radius-full);
		background: none;
		color: var(--reel-text);
		transform: translate(-50%, -50%) scale(0);
		opacity: 0;
		transition:
			transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 150ms ease,
			color 120ms ease;
		pointer-events: none;
		-webkit-tap-highlight-color: transparent;
	}

	.reaction-btn.visible {
		transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1);
		opacity: 1;
		pointer-events: auto;
	}

	.reaction-btn.hovered {
		transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.45);
		color: var(--accent-magenta);
	}

	.reaction-btn:hover:not(.hovered) svg {
		transform: scale(1.15);
	}

	.reaction-btn svg {
		width: 26px;
		height: 26px;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 8px rgba(0, 0, 0, 0.4));
		transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
		pointer-events: none;
	}
</style>
