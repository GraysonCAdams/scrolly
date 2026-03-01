<script lang="ts">
	import { showInstallBanner, triggerInstall, dismissInstall } from '$lib/stores/pwa';

	async function handleInstall() {
		await triggerInstall();
	}
</script>

{#if $showInstallBanner}
	<div class="install-banner" role="alert">
		<div class="install-content">
			<div class="install-icon">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
			</div>
			<div class="install-text">
				<strong>Install scrolly</strong>
				<span>Add to your home screen for the best experience</span>
			</div>
		</div>
		<div class="install-actions">
			<button class="install-btn" onclick={handleInstall}>Install</button>
			<button class="dismiss-btn" onclick={dismissInstall} aria-label="Dismiss">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	</div>
{/if}

<style>
	.install-banner {
		position: fixed;
		bottom: calc(80px + env(safe-area-inset-bottom) + var(--space-sm));
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
		width: calc(100% - var(--space-lg) * 2);
		max-width: 400px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
		animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.install-content {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex: 1;
		min-width: 0;
	}

	.install-icon {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
		border-radius: var(--radius-sm);
		color: var(--accent-primary);
	}

	.install-icon svg {
		width: 18px;
		height: 18px;
	}

	.install-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.install-text strong {
		font-family: var(--font-display);
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.install-text span {
		font-size: 0.6875rem;
		color: var(--text-muted);
		line-height: 1.3;
	}

	.install-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	.install-btn {
		padding: var(--space-xs) var(--space-md);
		background: var(--accent-primary);
		color: var(--bg-primary);
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		font-family: var(--font-body);
	}

	.install-btn:active {
		transform: scale(0.97);
	}

	.dismiss-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dismiss-btn svg {
		width: 16px;
		height: 16px;
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}
</style>
