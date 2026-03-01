<script lang="ts">
	const EMOJI = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

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
	let exitedDragMode = $state(false);
	const isDragging = $derived(dragMode && !exitedDragMode);
	const btnEls: HTMLButtonElement[] = $state([]);

	// Animate in
	$effect(() => {
		const raf = requestAnimationFrame(() => {
			visible = true;
		});
		return () => cancelAnimationFrame(raf);
	});

	// Auto-dismiss after 4s (only in tap mode)
	$effect(() => {
		if (isDragging) return;
		const timer = setTimeout(ondismiss, 4000);
		return () => clearTimeout(timer);
	});

	// Dismiss on outside click (tap mode only)
	$effect(() => {
		if (isDragging) return;

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
		if (!isDragging) return;

		function hitTestEmoji(cx: number, cy: number): number {
			for (let i = 0; i < btnEls.length; i++) {
				const el = btnEls[i];
				if (!el) continue;
				const rect = el.getBoundingClientRect();
				// Generous hit area
				const pad = 4;
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
				onpick(EMOJI[idx]);
			} else {
				// Released outside emoji — switch to tap mode
				exitedDragMode = true;
				hoveredIndex = -1;
			}
		}

		document.addEventListener('pointermove', handleMove);
		document.addEventListener('pointerup', handleUp);

		return () => {
			document.removeEventListener('pointermove', handleMove);
			document.removeEventListener('pointerup', handleUp);
		};
	});

	// Keep picker on screen
	function getStyle() {
		const pw = 284;
		const ph = 52;
		let left = x - pw / 2;
		let top = y - ph - 16;

		left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
		if (top < 8) top = y + 16;

		return `left:${left}px;top:${top}px`;
	}
</script>

<div
	class="picker"
	class:visible
	style={getStyle()}
	bind:this={pickerEl}
	role="listbox"
	aria-label="Reaction picker"
>
	{#each EMOJI as emoji, i (emoji)}
		<button
			class="emoji-btn"
			class:hovered={hoveredIndex === i}
			bind:this={btnEls[i]}
			onclick={() => {
				if (!isDragging) onpick(emoji);
			}}
			aria-label="React with {emoji}"
		>
			<span class="emoji-inner">{emoji}</span>
		</button>
	{/each}
</div>

<style>
	.picker {
		position: fixed;
		z-index: 200;
		display: flex;
		gap: 4px;
		padding: 8px 12px;
		background: var(--reel-picker-bg);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: var(--radius-full);
		border: 1px solid var(--reel-picker-border);
		box-shadow: 0 8px 32px var(--reel-icon-shadow);
		transform: scale(0.6);
		opacity: 0;
		transition:
			transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 150ms ease;
		pointer-events: auto;
	}

	.picker.visible {
		transform: scale(1);
		opacity: 1;
	}

	.emoji-btn {
		background: none;
		border: none;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border-radius: var(--radius-full);
		padding: 0;
		transition: background 120ms ease;
		-webkit-tap-highlight-color: transparent;
	}

	.emoji-inner {
		font-size: 1.5rem;
		line-height: 1;
		display: block;
		transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
		pointer-events: none;
	}

	.emoji-btn.hovered .emoji-inner {
		transform: scale(1.45) translateY(-6px);
	}

	.emoji-btn.hovered {
		background: var(--reel-picker-active);
	}

	.emoji-btn:hover:not(.hovered) {
		background: var(--reel-picker-hover);
	}

	.emoji-btn:hover:not(.hovered) .emoji-inner {
		transform: scale(1.15);
	}

	.emoji-btn:active .emoji-inner {
		transform: scale(0.9);
	}
</style>
