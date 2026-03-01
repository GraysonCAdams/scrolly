<script lang="ts">
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import ExportIcon from 'phosphor-svelte/lib/ExportIcon';
	import AppleLogoIcon from 'phosphor-svelte/lib/AppleLogoIcon';
	import AndroidLogoIcon from 'phosphor-svelte/lib/AndroidLogoIcon';
	import { toast } from '$lib/stores/toasts';

	let {
		settingsHref,
		shortcutUrl
	}: {
		settingsHref: string;
		shortcutUrl: string;
	} = $props();

	let copiedLink = $state(false);

	async function copyShortcutLink() {
		try {
			await navigator.clipboard.writeText(shortcutUrl);
			copiedLink = true;
			setTimeout(() => (copiedLink = false), 2000);
		} catch {
			toast.error('Failed to copy');
		}
	}
</script>

<div class="done-state">
	<div class="done-icon">
		<CheckIcon size={32} weight="bold" />
	</div>
	<h1 class="done-title">You're all set!</h1>
	<p class="done-desc">
		Now when you tap <strong>Share</strong> in any app and choose your shortcut, the clip will be added
		to scrolly in the background.
	</p>

	<!-- What members will see -->
	<div class="preview-section">
		<h2 class="section-heading">What your members will see</h2>
		<div class="preview-frame">
			<div class="preview-cta">
				<ExportIcon size={18} />
				<div class="preview-cta-content">
					<span class="preview-cta-title">Share from other apps</span>
					<span class="preview-cta-desc">Install the iOS Shortcut to share clips directly</span>
				</div>
				<span class="preview-cta-btn">Get</span>
			</div>
		</div>
		<ul class="preview-notes">
			<li>
				<AppleLogoIcon size={14} class="platform-icon" />
				iOS members will see this card with a <strong>Get</strong> button to install the shortcut
			</li>
			<li>
				<AndroidLogoIcon size={14} class="platform-icon" />
				Android members see a note that sharing works automatically via the installed app
			</li>
		</ul>
	</div>

	<!-- Share directly -->
	<div class="share-section">
		<h2 class="section-heading">Share directly</h2>
		<p class="share-desc">
			Send this link to your group members so they can install the shortcut directly.
		</p>
		<div class="security-note">
			<strong>Only share with people you trust.</strong> Anyone with this shortcut can post clips to your
			group's feed if they know a member's phone number.
		</div>
		<div class="link-display">
			<code>{shortcutUrl}</code>
			<button class="copy-btn" onclick={copyShortcutLink}>
				{#if copiedLink}
					<CheckIcon size={14} weight="bold" />
					Copied
				{:else}
					<CopyIcon size={14} />
					Copy
				{/if}
			</button>
		</div>
	</div>

	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- settingsHref is pre-resolved by caller -->
	<a href={settingsHref} class="done-btn">Back to Settings</a>
</div>

<style>
	.done-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-3xl) 0;
	}
	.done-icon {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-full);
		background: var(--accent-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--space-xl);
		color: var(--bg-primary);
	}
	.done-title {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0 0 var(--space-sm);
	}
	.done-desc {
		font-size: 1rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0 0 var(--space-2xl);
		max-width: 340px;
	}

	/* --- Section headings --- */
	.section-heading {
		font-family: var(--font-display);
		font-size: 0.8125rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin: 0 0 var(--space-md);
	}

	/* --- Preview section --- */
	.preview-section {
		width: 100%;
		margin-bottom: var(--space-2xl);
	}

	.preview-frame {
		background: var(--bg-surface);
		border: 1px dashed var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		pointer-events: none;
		margin-bottom: var(--space-md);
	}

	.preview-cta {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		background: var(--bg-elevated);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.preview-cta :global(svg:first-child) {
		flex-shrink: 0;
		color: var(--accent-primary);
	}

	.preview-cta-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		flex: 1;
		text-align: left;
	}

	.preview-cta-title {
		font-family: var(--font-display);
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.preview-cta-desc {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.preview-cta-btn {
		flex-shrink: 0;
		background: var(--accent-primary);
		color: var(--bg-primary);
		font-size: 0.8125rem;
		font-weight: 700;
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-full);
	}

	.preview-notes {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		text-align: left;
	}

	.preview-notes li {
		font-size: 0.9375rem;
		color: var(--text-secondary);
		line-height: 1.5;
		padding-left: var(--space-xl);
		position: relative;
	}

	.preview-notes li :global(.platform-icon) {
		position: absolute;
		left: 0;
		top: 0.3em;
		color: var(--text-muted);
	}

	.preview-notes li strong {
		color: var(--text-primary);
	}

	/* --- Share section --- */
	.share-section {
		width: 100%;
		margin-bottom: var(--space-2xl);
	}

	.share-desc {
		font-size: 0.9375rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-md);
		line-height: 1.5;
	}

	.security-note {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.5;
		padding: var(--space-sm) var(--space-md);
		background: color-mix(in srgb, var(--warning) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--warning) 15%, transparent);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-md);
	}

	.security-note strong {
		color: var(--warning);
	}

	.link-display {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
	}

	.link-display code {
		flex: 1;
		font-size: 0.8125rem;
		color: var(--accent-primary);
		word-break: break-all;
		font-family: monospace;
		text-align: left;
	}

	.copy-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		color: var(--text-primary);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.copy-btn:active {
		transform: scale(0.97);
	}

	.copy-btn :global(svg) {
		width: 14px;
		height: 14px;
	}

	/* --- Back button --- */
	.done-btn {
		display: inline-flex;
		padding: var(--space-sm) var(--space-xl);
		background: var(--bg-surface);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
		transition: transform 0.1s ease;
	}
	.done-btn:active {
		transform: scale(0.97);
	}
</style>
