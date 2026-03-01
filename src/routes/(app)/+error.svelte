<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

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
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12.75 7.09a3 3 0 0 1 2.16 2.16" />
				<path d="M17.072 17.072L12 22l-7-7a7 7 0 0 1 9.9-9.9" />
				<path d="M6.929 6.929A7 7 0 0 1 19 15" />
				<line x1="2" y1="2" x2="22" y2="22" />
			</svg>
		{:else if page.status === 403}
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
				/>
				<path d="m14.5 9.5-5 5" />
				<path d="m9.5 9.5 5 5" />
			</svg>
		{:else}
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M16 16s-1.5-2-4-2-4 2-4 2" />
				<line x1="9" y1="9" x2="9.01" y2="9" />
				<line x1="15" y1="9" x2="15.01" y2="9" />
			</svg>
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
		width: 48px;
		height: 48px;
		color: var(--accent-primary);
		opacity: 0.8;
		margin-bottom: var(--space-xl);
	}

	.error-icon svg {
		width: 100%;
		height: 100%;
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
