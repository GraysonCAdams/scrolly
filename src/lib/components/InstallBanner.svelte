<script lang="ts">
	import {
		showInstallBanner,
		showIosInstallBanner,
		triggerInstall,
		dismissInstall
	} from '$lib/stores/pwa';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import ExportIcon from 'phosphor-svelte/lib/ExportIcon';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';

	let showingInstructions = $state(false);

	const isIos = $derived($showIosInstallBanner);
	const show = $derived($showInstallBanner || $showIosInstallBanner);

	async function handleInstall() {
		if (isIos) {
			showingInstructions = true;
		} else {
			await triggerInstall();
		}
	}
</script>

{#if show}
	{#if isIos}
		<!-- iOS Smart App Banner style -->
		<div class="smart-banner" role="alert">
			<div class="smart-banner-row">
				<button class="smart-close" onclick={dismissInstall} aria-label="Close">
					<XIcon size={16} />
				</button>
				<img class="smart-icon" src="/icons/apple-touch-icon.png" alt="scrolly" />
				<div class="smart-text">
					<strong>scrolly</strong>
					<span>Add to your Home Screen</span>
				</div>
				{#if !showingInstructions}
					<button class="smart-install" onclick={handleInstall}>INSTALL</button>
				{/if}
			</div>

			{#if showingInstructions}
				<div class="smart-instructions">
					<div class="smart-step">
						<span class="smart-step-num">1</span>
						<span>
							Tap
							<ExportIcon size={16} class="inline-share-icon" />
							<strong>Share</strong> in Safari
						</span>
					</div>
					<div class="smart-step">
						<span class="smart-step-num">2</span>
						<span>Tap <strong>Add to Home Screen</strong></span>
					</div>
					<div class="smart-step">
						<span class="smart-step-num">3</span>
						<span>Tap <strong>Add</strong></span>
					</div>
					<button class="smart-gotit" onclick={dismissInstall}>OK</button>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Android / Chrome install banner -->
		<div class="install-banner" role="alert">
			<div class="install-content">
				<div class="install-icon">
					<DownloadSimpleIcon size={18} />
				</div>
				<div class="install-text">
					<strong>Install scrolly</strong>
					<span>Add to your home screen for the best experience</span>
				</div>
			</div>
			<div class="install-actions">
				<button class="install-btn" onclick={handleInstall}>Install</button>
				<button class="dismiss-btn" onclick={dismissInstall} aria-label="Dismiss">
					<XIcon size={16} />
				</button>
			</div>
		</div>
	{/if}
{/if}

<style>
	/* ========== iOS Smart App Banner ========== */

	.smart-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 200;
		background: var(--bg-elevated);
		border-bottom: 1px solid var(--border);
		padding-top: env(safe-area-inset-top);
		animation: slide-down 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.smart-banner-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
	}

	.smart-close {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.smart-close :global(svg) {
		width: 16px;
		height: 16px;
	}

	.smart-icon {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		object-fit: cover;
	}

	.smart-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.smart-text strong {
		font-family: var(--font-display);
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.smart-text span {
		font-size: 0.6875rem;
		color: var(--text-muted);
		line-height: 1.2;
	}

	.smart-install {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--accent-blue);
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		cursor: pointer;
		padding: var(--space-xs) var(--space-sm);
		font-family: var(--font-body);
	}

	.smart-install:active {
		opacity: 0.6;
	}

	/* --- iOS instructions --- */

	.smart-instructions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-md) var(--space-md);
		border-top: 1px solid var(--border);
		margin: 0 var(--space-md);
		padding-top: var(--space-sm);
		animation: fade-in 0.2s ease-out;
	}

	.smart-step {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.smart-step strong {
		color: var(--text-primary);
		font-weight: 600;
	}

	.smart-step-num {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-surface);
		border-radius: var(--radius-full);
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.smart-step :global(.inline-share-icon) {
		display: inline-block;
		vertical-align: middle;
		width: 16px;
		height: 16px;
		color: var(--accent-blue);
		margin: 0 1px;
	}

	.smart-gotit {
		align-self: flex-end;
		background: none;
		border: none;
		color: var(--accent-blue);
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
		padding: var(--space-xs) var(--space-sm);
		font-family: var(--font-body);
	}

	.smart-gotit:active {
		opacity: 0.6;
	}

	/* ========== Android install banner ========== */

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

	.install-icon :global(svg) {
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

	.dismiss-btn :global(svg) {
		width: 16px;
		height: 16px;
	}

	/* ========== Animations ========== */

	@keyframes slide-down {
		from {
			opacity: 0;
			transform: translateY(-100%);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
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

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
