<script lang="ts">
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';

	const { message }: { message: string } = $props();
</script>

{#if message}
	<div class="inline-error" role="alert">
		<InfoIcon size={18} />
		{message}
	</div>
{/if}

<style>
	.inline-error {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
		padding: var(--space-md) var(--space-lg);
		background: color-mix(in srgb, var(--error) 12%, var(--bg-elevated));
		border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
		border-radius: var(--radius-full);
		color: var(--error);
		font-size: 0.875rem;
		font-weight: 500;
		animation: inline-error-in 0.3s ease;
	}

	.inline-error :global(svg) {
		flex-shrink: 0;
	}

	@keyframes inline-error-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
