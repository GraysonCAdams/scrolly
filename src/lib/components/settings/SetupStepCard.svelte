<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		step,
		title,
		visible = true,
		children
	}: {
		step: number;
		title: string;
		visible?: boolean;
		children: Snippet;
	} = $props();
</script>

<div class="step-card" class:hidden={!visible}>
	<div class="step-header">
		<span class="step-badge">Step {step}</span>
		<h2>{title}</h2>
	</div>
	{@render children()}
</div>

<style>
	.step-card {
		min-height: 200px;
	}
	.step-card.hidden {
		display: none;
	}
	.step-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}
	.step-badge {
		font-family: var(--font-display);
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent-primary);
	}
	.step-header h2 {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}
	.step-card :global(.step-desc) {
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-md);
	}
	.step-card :global(.step-desc:last-child) {
		margin-bottom: 0;
	}
	.step-card :global(.setup-title) {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}
	.step-card :global(.setup-subtitle) {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0 0 var(--space-xl);
		line-height: 1.5;
	}
	.step-card :global(.info-box) {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent);
		border-radius: var(--radius-sm);
		margin-top: var(--space-md);
	}
	.step-card :global(.info-box svg) {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		color: var(--accent-primary);
		margin-top: 1px;
	}
	.step-card :global(.info-box span) {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}
	.step-card :global(.url-display) {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		margin: var(--space-sm) 0 var(--space-md);
	}
	.step-card :global(.url-display code) {
		flex: 1;
		font-size: 0.6875rem;
		color: var(--accent-primary);
		word-break: break-all;
		font-family: monospace;
	}
	.step-card :global(.url-display code.url-placeholder) {
		color: var(--text-muted);
		font-family: var(--font-body);
		font-size: 0.75rem;
	}
	.step-card :global(.copy-btn) {
		flex-shrink: 0;
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		color: var(--text-primary);
		font-size: 0.6875rem;
		font-weight: 600;
		cursor: pointer;
	}
	.step-card :global(.json-keys) {
		list-style: none;
		padding: 0;
		margin: var(--space-sm) 0 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}
	.step-card :global(.json-keys li) {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.5;
		padding-left: var(--space-md);
		position: relative;
	}
	.step-card :global(.json-keys li::before) {
		content: '';
		position: absolute;
		left: 0;
		top: 0.55em;
		width: 5px;
		height: 5px;
		border-radius: var(--radius-full);
		background: var(--text-muted);
	}
	.step-card :global(.key-name) {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 0.75rem;
		background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
		color: var(--accent-primary);
		padding: 1px 6px;
		border-radius: 4px;
		font-weight: 600;
	}
</style>
