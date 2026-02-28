<script lang="ts">
	import { swUpdateAvailable, applySwUpdate } from '$lib/stores/pwa';
</script>

{#if $swUpdateAvailable}
	<div class="update-toast" role="alert">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="23 4 23 10 17 10" />
			<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
		</svg>
		<span>New version available</span>
		<button onclick={applySwUpdate}>Update</button>
	</div>
{/if}

<style>
	.update-toast {
		position: fixed;
		top: max(var(--space-lg), env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		z-index: 400;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
		animation: drop-in 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.update-toast svg {
		width: 16px;
		height: 16px;
		color: var(--accent-blue);
		flex-shrink: 0;
	}

	span {
		font-family: var(--font-body);
		font-size: 0.8125rem;
		color: var(--text-primary);
		white-space: nowrap;
	}

	button {
		background: var(--accent-primary);
		color: #000000;
		border: none;
		border-radius: var(--radius-full);
		padding: var(--space-xs) var(--space-md);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		font-family: var(--font-body);
		flex-shrink: 0;
	}

	button:active {
		transform: scale(0.97);
	}

	@keyframes drop-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-12px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}
</style>
