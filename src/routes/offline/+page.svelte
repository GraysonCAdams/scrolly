<svelte:head>
	<title>Offline — scrolly</title>
</svelte:head>

<div class="offline-container">
	<div class="offline-icon">
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<line x1="1" y1="1" x2="23" y2="23" />
			<path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
			<path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
			<path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
			<path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
			<path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
			<line x1="12" y1="20" x2="12.01" y2="20" />
		</svg>
	</div>
	<h1>You're offline</h1>
	<p>Check your connection and try again.</p>
	<button onclick={() => window.location.reload()}>Retry</button>
</div>

<style>
	.offline-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		padding: var(--space-xl);
		text-align: center;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.offline-icon {
		width: 64px;
		height: 64px;
		color: var(--text-muted);
		opacity: 0.5;
		margin-bottom: var(--space-xl);
	}

	.offline-icon svg {
		width: 100%;
		height: 100%;
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 var(--space-sm);
		color: var(--text-primary);
	}

	p {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0 0 var(--space-2xl);
		max-width: 240px;
	}

	button {
		padding: var(--space-md) var(--space-2xl);
		background: var(--accent-primary);
		color: var(--bg-primary);
		border: none;
		border-radius: var(--radius-full);
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		font-family: var(--font-body);
	}

	button:active {
		transform: scale(0.97);
	}
</style>
