<script lang="ts">
	import { ACCENT_COLORS, type AccentColorKey } from '$lib/colors';

	let {
		currentAccent,
		onchange
	}: {
		currentAccent: AccentColorKey;
		onchange: (key: AccentColorKey) => void;
	} = $props();
</script>

<p class="setting-desc">Applies to all members</p>
<div class="color-palette">
	{#each Object.entries(ACCENT_COLORS) as [key, color] (key)}
		<button
			class="color-swatch"
			class:active={currentAccent === key}
			style="--swatch-color: {color.hex}"
			onclick={() => onchange(key as AccentColorKey)}
			aria-label={color.label}
			title={color.label}
		>
			{#if currentAccent === key}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="20 6 9 17 4 12" />
				</svg>
			{/if}
		</button>
	{/each}
</div>

<style>
	.setting-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0 0 var(--space-md);
	}

	.color-palette {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.color-swatch {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		border: 2px solid transparent;
		background: var(--swatch-color);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 0.2s ease,
			transform 0.1s ease;
		padding: 0;
	}
	.color-swatch:active {
		transform: scale(0.95);
	}
	.color-swatch.active {
		border-color: var(--text-primary);
		transform: scale(1.1);
	}
	.color-swatch svg {
		width: 16px;
		height: 16px;
		color: var(--bg-primary);
		animation: check-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes check-in {
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
