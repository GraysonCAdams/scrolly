<script lang="ts">
	import { page } from '$app/stores';
	import { toast } from '$lib/stores/toasts';

	const appUrl = $derived($page.data.appUrl as string);
	const shortcutICloudUrl = $derived($page.data.shortcutICloudUrl as string | null);
	const shareUrl = $derived(`${appUrl}/share?url=`);

	let copied = $state(false);

	async function copyUrl() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			toast.success('Copied to clipboard');
			setTimeout(() => (copied = false), 2000);
		} catch {
			toast.error('Failed to copy');
		}
	}
</script>

<svelte:head>
	<title>Set up Share Shortcut — scrolly</title>
</svelte:head>

<div class="setup-page">
	<nav class="setup-nav">
		<a href="/settings" class="back-link">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="15 18 9 12 15 6" />
			</svg>
			Settings
		</a>
	</nav>

	<div class="setup-content">
		<h1 class="setup-title">Share from other apps</h1>
		<p class="setup-subtitle">
			Set up an iOS Shortcut to share clips directly from TikTok, Instagram, and more.
		</p>

		{#if shortcutICloudUrl}
			<a href={shortcutICloudUrl} class="icloud-btn" target="_blank" rel="noopener">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				Get Shortcut
			</a>
			<div class="divider">
				<span>or create it manually</span>
			</div>
		{/if}

		<ol class="steps">
			<li class="step">
				<div class="step-number">1</div>
				<div class="step-body">
					<h3>Open the Shortcuts app</h3>
					<p>It's pre-installed on all iPhones. If you deleted it, re-download it from the App Store.</p>
				</div>
			</li>

			<li class="step">
				<div class="step-number">2</div>
				<div class="step-body">
					<h3>Create a new shortcut</h3>
					<p>Tap the <strong>+</strong> button in the top right.</p>
				</div>
			</li>

			<li class="step">
				<div class="step-number">3</div>
				<div class="step-body">
					<h3>Add "Receive input"</h3>
					<p>
						Tap <strong>Add Action</strong>, search for
						<strong>"Receive"</strong>, and select
						<strong>"Receive input from Share Sheet"</strong>.
						Tap on <strong>"Any"</strong> and change it to <strong>"URLs"</strong> only.
					</p>
				</div>
			</li>

			<li class="step">
				<div class="step-number">4</div>
				<div class="step-body">
					<h3>Add "Open URL"</h3>
					<p>
						Tap <strong>+</strong> to add another action. Search for
						<strong>"Open URL"</strong> and add it.
					</p>
				</div>
			</li>

			<li class="step">
				<div class="step-number">5</div>
				<div class="step-body">
					<h3>Set the URL</h3>
					<p>
						Tap the URL field, then type or paste the following. After pasting, tap at the end and
						insert the <strong>Shortcut Input</strong> variable from the suggestion bar above the keyboard.
					</p>
					<div class="url-display">
						<code>{shareUrl}</code>
						<button class="copy-btn" onclick={copyUrl}>
							{copied ? 'Copied!' : 'Copy'}
						</button>
					</div>
					<p class="step-hint">
						The final URL field should look like:<br />
						<code class="inline-code">{shareUrl}<em>Shortcut Input</em></code>
					</p>
				</div>
			</li>

			<li class="step">
				<div class="step-number">6</div>
				<div class="step-body">
					<h3>Name it & save</h3>
					<p>
						Tap the name at the top, rename it to <strong>"scrolly"</strong>, then tap
						<strong>Done</strong>.
					</p>
				</div>
			</li>
		</ol>

		<div class="done-card">
			<h3>You're all set!</h3>
			<p>
				Now when you tap <strong>Share</strong> in any app and choose your shortcut,
				the clip will open in scrolly ready to add to your feed.
			</p>
		</div>
	</div>
</div>

<style>
	.setup-page {
		min-height: 100dvh;
		background: var(--bg-primary);
	}

	.setup-nav {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-primary);
		border-bottom: 1px solid var(--border);
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--accent-primary);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.back-link svg {
		width: 20px;
		height: 20px;
	}

	.setup-content {
		max-width: 520px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
		padding-bottom: calc(var(--space-3xl) + env(safe-area-inset-bottom, 0px));
	}

	.setup-title {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.setup-subtitle {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0 0 var(--space-xl);
		line-height: 1.5;
	}

	/* iCloud shortcut button */
	.icloud-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-md) var(--space-xl);
		background: var(--accent-primary);
		color: #000;
		border: none;
		border-radius: var(--radius-full);
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-display);
		text-decoration: none;
		transition: transform 0.1s ease;
	}

	.icloud-btn:active {
		transform: scale(0.97);
	}

	.icloud-btn svg {
		width: 22px;
		height: 22px;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin: var(--space-xl) 0;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.divider span {
		font-size: 0.75rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	/* Steps */
	.steps {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.step {
		display: flex;
		gap: var(--space-md);
	}

	.step-number {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background: var(--bg-surface);
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.step-body {
		flex: 1;
		min-width: 0;
	}

	.step-body h3 {
		font-family: var(--font-display);
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.step-body p {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0 0 var(--space-sm);
	}

	.step-body p:last-child {
		margin-bottom: 0;
	}

	.step-hint {
		font-size: 0.75rem !important;
		color: var(--text-muted) !important;
	}

	/* URL display with copy */
	.url-display {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		margin: var(--space-sm) 0;
	}

	.url-display code {
		flex: 1;
		font-size: 0.6875rem;
		color: var(--accent-primary);
		word-break: break-all;
		font-family: monospace;
	}

	.copy-btn {
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

	.inline-code {
		display: inline;
		font-size: 0.6875rem;
		color: var(--accent-primary);
		font-family: monospace;
	}

	.inline-code em {
		background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
		color: var(--accent-primary);
		padding: 1px 4px;
		border-radius: 3px;
		font-style: normal;
		font-weight: 600;
	}

	/* Done card */
	.done-card {
		margin-top: var(--space-xl);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.done-card h3 {
		font-family: var(--font-display);
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.done-card p {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
	}
</style>
