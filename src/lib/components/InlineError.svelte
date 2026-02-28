<script lang="ts">
	const { message }: { message: string } = $props();
</script>

{#if message}
	<div class="inline-error" role="alert">
		<svg viewBox="0 0 20 20" fill="none" class="error-icon">
			<circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5" />
			<path
				d="M10 6V11M10 13.5V14"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
		</svg>
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

	.error-icon {
		width: 18px;
		height: 18px;
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
