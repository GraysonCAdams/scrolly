<script lang="ts">
	import { onMount } from 'svelte';

	interface ProviderInfo {
		id: string;
		name: string;
		description: string;
		homepage: string;
		license: string;
		capabilities: string[];
		dependencies: string[];
		installed: boolean;
		active: boolean;
		version: string | null;
	}

	let providers = $state<ProviderInfo[]>([]);
	let loading = $state(true);
	let actionLoading = $state<string | null>(null);
	let error = $state('');

	onMount(loadProviders);

	async function loadProviders() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/group/provider');
			if (!res.ok) throw new Error('Failed to load');
			const data = await res.json();
			providers = data.providers;
		} catch {
			error = 'Failed to load providers';
		} finally {
			loading = false;
		}
	}

	async function installProvider(id: string) {
		actionLoading = id;
		error = '';
		try {
			const res = await fetch('/api/group/provider/install', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ providerId: id })
			});
			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Installation failed';
				return;
			}
			await loadProviders();
		} catch {
			error = 'Installation failed';
		} finally {
			actionLoading = null;
		}
	}

	async function activateProvider(id: string) {
		actionLoading = id;
		error = '';
		try {
			const res = await fetch('/api/group/provider', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ providerId: id })
			});
			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Activation failed';
				return;
			}
			await loadProviders();
		} catch {
			error = 'Activation failed';
		} finally {
			actionLoading = null;
		}
	}

	async function uninstallProvider(id: string) {
		actionLoading = id;
		error = '';
		try {
			await fetch('/api/group/provider/install', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ providerId: id })
			});
			await loadProviders();
		} catch {
			error = 'Uninstall failed';
		} finally {
			actionLoading = null;
		}
	}
</script>

{#if loading}
	<p class="loading">Loading providers...</p>
{:else if providers.length === 0}
	<p class="empty">No download providers available.</p>
{:else}
	{#each providers as p (p.id)}
		<div class="provider-card" class:active={p.active}>
			<div class="provider-header">
				<div class="provider-name">{p.name}</div>
				{#if p.active}
					<span class="status-badge active-badge">Active</span>
				{:else if actionLoading === p.id}
					<span class="status-badge installing-badge">Working...</span>
				{:else if p.installed}
					<span class="status-badge installed-badge">Installed</span>
				{:else}
					<span class="status-badge">Not installed</span>
				{/if}
			</div>

			<p class="provider-desc">{p.description}</p>

			<div class="provider-meta">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
				<a href={p.homepage} target="_blank" rel="noopener" class="provider-link">Homepage</a>
				<span class="provider-license">{p.license}</span>
				{#if p.version}
					<span class="provider-version">v{p.version}</span>
				{/if}
			</div>

			{#if p.dependencies.length > 0}
				<p class="provider-deps">Requires: {p.dependencies.join(', ')}</p>
			{/if}

			<div class="provider-actions">
				{#if !p.installed}
					<button
						class="action-btn install-btn"
						onclick={() => installProvider(p.id)}
						disabled={actionLoading !== null}
					>
						{actionLoading === p.id ? 'Installing...' : 'Install'}
					</button>
				{:else if !p.active}
					<button
						class="action-btn activate-btn"
						onclick={() => activateProvider(p.id)}
						disabled={actionLoading !== null}
					>
						Activate
					</button>
					<button
						class="action-btn uninstall-btn"
						onclick={() => uninstallProvider(p.id)}
						disabled={actionLoading !== null}
					>
						Uninstall
					</button>
				{:else}
					<button
						class="action-btn uninstall-btn"
						onclick={() => uninstallProvider(p.id)}
						disabled={actionLoading !== null}
					>
						Uninstall
					</button>
				{/if}
			</div>
		</div>
	{/each}
{/if}

{#if error}
	<p class="error">{error}</p>
{/if}

<style>
	.loading,
	.empty {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.provider-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.provider-card.active {
		border-left: 3px solid var(--accent-primary);
		padding-left: var(--space-md);
		margin-left: calc(-1 * var(--space-md) - 3px);
	}

	.provider-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.provider-name {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.status-badge {
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 2px var(--space-sm);
		border-radius: var(--radius-full);
		background: var(--bg-surface);
		color: var(--text-muted);
	}

	.status-badge.active-badge {
		background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
		color: var(--accent-primary);
	}

	.status-badge.installed-badge {
		background: color-mix(in srgb, var(--success) 15%, transparent);
		color: var(--success);
	}

	.status-badge.installing-badge {
		background: color-mix(in srgb, var(--warning) 15%, transparent);
		color: var(--warning);
	}

	.provider-desc {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.provider-meta {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		font-size: 0.75rem;
	}

	.provider-link {
		color: var(--accent-blue);
		text-decoration: none;
	}

	.provider-license,
	.provider-version {
		color: var(--text-muted);
	}

	.provider-deps {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
	}

	.provider-actions {
		display: flex;
		gap: var(--space-sm);
		margin-top: var(--space-xs);
	}

	.action-btn {
		padding: var(--space-sm) var(--space-lg);
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn:active {
		transform: scale(0.97);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.install-btn,
	.activate-btn {
		background: var(--accent-primary);
		color: var(--bg-primary);
	}

	.uninstall-btn {
		background: var(--bg-surface);
		color: var(--text-secondary);
	}

	.error {
		font-size: 0.8125rem;
		color: var(--error);
		margin: var(--space-sm) 0 0;
	}
</style>
