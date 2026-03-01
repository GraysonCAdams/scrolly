<script lang="ts">
	import WifiSlashIcon from 'phosphor-svelte/lib/WifiSlashIcon';
</script>

<svelte:head>
	<title>Offline — scrolly</title>
</svelte:head>

<div class="offline-container">
	<div class="offline-icon">
		<WifiSlashIcon size={64} />
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
		color: var(--text-muted);
		opacity: 0.5;
		margin-bottom: var(--space-xl);
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
