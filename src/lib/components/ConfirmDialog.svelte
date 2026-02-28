<script lang="ts">
	import { confirmState, resolveConfirm } from '$lib/stores/confirm';

	let visible = $state(false);

	$effect(() => {
		if ($confirmState.open) {
			requestAnimationFrame(() => {
				visible = true;
			});
		}
	});

	function dismiss() {
		visible = false;
		setTimeout(() => resolveConfirm(false), 200);
	}

	function handleConfirm() {
		visible = false;
		setTimeout(() => resolveConfirm(true), 200);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') dismiss();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $confirmState.open}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div class="overlay" class:visible onclick={dismiss}>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div class="dialog" class:visible onclick={(e) => e.stopPropagation()}>
			<h3>{$confirmState.options.title}</h3>
			<p>{$confirmState.options.message}</p>
			<div class="actions">
				<button class="btn-cancel" onclick={dismiss}>
					{$confirmState.options.cancelLabel || 'Cancel'}
				</button>
				<button
					class="btn-confirm"
					class:destructive={$confirmState.options.destructive}
					onclick={handleConfirm}
				>
					{$confirmState.options.confirmLabel || 'Confirm'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 400;
		opacity: 0;
		transition: opacity 0.2s ease;
		padding: var(--space-lg);
	}

	.overlay.visible {
		opacity: 1;
	}

	.dialog {
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		max-width: 340px;
		width: 100%;
		transform: scale(0.95);
		transition: transform 0.2s ease;
	}

	.dialog.visible {
		transform: scale(1);
	}

	h3 {
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 var(--space-sm);
	}

	p {
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0 0 var(--space-xl);
	}

	.actions {
		display: flex;
		gap: var(--space-sm);
	}

	.actions button {
		flex: 1;
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.1s ease,
			opacity 0.2s ease;
		border: none;
	}

	.actions button:active {
		transform: scale(0.97);
	}

	.btn-cancel {
		background: var(--bg-surface);
		color: var(--text-primary);
	}

	.btn-confirm {
		background: var(--accent-primary);
		color: #000000;
	}

	.btn-confirm.destructive {
		background: var(--error);
		color: #ffffff;
	}
</style>
