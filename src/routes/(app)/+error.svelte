<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import MapPinIcon from 'phosphor-svelte/lib/MapPinIcon';
	import ShieldIcon from 'phosphor-svelte/lib/ShieldIcon';
	import SmileySadIcon from 'phosphor-svelte/lib/SmileySadIcon';

	const messages: Record<number, { title: string; subtitle: string }> = {
		404: {
			title: 'Page not found',
			subtitle: "This page doesn't exist or may have been moved."
		},
		403: {
			title: 'Access denied',
			subtitle: "You don't have permission to view this page."
		},
		500: {
			title: 'Something broke',
			subtitle: 'We hit a snag. Try refreshing or come back in a bit.'
		}
	};

	const info = $derived(
		messages[page.status] ?? {
			title: 'Something went wrong',
			subtitle: page.error?.message || 'An unexpected error occurred.'
		}
	);
</script>

<svelte:head>
	<title>{page.status} — scrolly</title>
</svelte:head>

<div class="error-content">
	<div class="error-code">{page.status}</div>

	<div class="error-icon">
		{#if page.status === 404}
			<MapPinIcon size={48} />
		{:else if page.status === 403}
			<ShieldIcon size={48} />
		{:else}
			<SmileySadIcon size={48} />
		{/if}
	</div>

	<h1>{info.title}</h1>
	<p>{info.subtitle}</p>

	<div class="actions">
		<a href={resolve('/')} class="btn-primary">Go home</a>
		{#if page.status >= 500}
			<button class="btn-secondary" onclick={() => window.location.reload()}>Try again</button>
		{/if}
	</div>
</div>

<style>
	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100dvh - 140px);
		padding: var(--space-xl) var(--space-lg);
		text-align: center;
	}

	.error-code {
		font-family: var(--font-display);
		font-size: 5rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1;
		color: var(--text-muted);
		opacity: 0.2;
		margin-bottom: var(--space-sm);
	}

	.error-icon {
		color: var(--accent-primary);
		opacity: 0.8;
		margin-bottom: var(--space-xl);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 var(--space-sm);
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	p {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0 0 var(--space-2xl);
		max-width: 240px;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		width: 100%;
		max-width: 220px;
	}

	.btn-primary {
		display: block;
		padding: var(--space-md) var(--space-2xl);
		background: var(--accent-primary);
		color: var(--bg-primary);
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.9375rem;
		font-weight: 700;
		font-family: var(--font-body);
		text-decoration: none;
		text-align: center;
		cursor: pointer;
	}

	.btn-primary:active {
		transform: scale(0.97);
	}

	.btn-secondary {
		padding: var(--space-md) var(--space-2xl);
		background: var(--bg-surface);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		font-size: 0.8125rem;
		font-weight: 600;
		font-family: var(--font-body);
		cursor: pointer;
	}

	.btn-secondary:active {
		transform: scale(0.97);
	}
</style>
