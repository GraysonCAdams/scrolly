<script lang="ts">
	import { resolve } from '$app/paths';
	import { confirm } from '$lib/stores/confirm';
	import { toast } from '$lib/stores/toasts';

	let {
		shortcutToken: token,
		shortcutUrl: propUrl
	}: {
		shortcutToken: string;
		shortcutUrl: string | null;
	} = $props();

	let savedUrl = $state(propUrl ?? '');
	let shortcutUrl = $state(propUrl ?? '');
	let saving = $state(false);
	let regenerating = $state(false);
	let copiedUrl = $state(false);

	const apiUrl = $derived(
		typeof window !== 'undefined'
			? `${window.location.origin}/api/clips/share?token=${token}`
			: `/api/clips/share?token=${token}`
	);

	async function copyApiUrl() {
		try {
			await navigator.clipboard.writeText(apiUrl);
			copiedUrl = true;
			setTimeout(() => (copiedUrl = false), 2000);
		} catch {
			toast.error('Failed to copy');
		}
	}

	async function saveShortcutUrl() {
		const trimmed = shortcutUrl.trim();
		if (trimmed === savedUrl) return;

		saving = true;
		try {
			const res = await fetch('/api/group/shortcut', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ shortcutUrl: trimmed || null })
			});
			if (res.ok) {
				const data = await res.json();
				shortcutUrl = data.shortcutUrl ?? '';
				savedUrl = data.shortcutUrl ?? '';
				toast.success('Shortcut link saved');
			} else {
				const data = await res.json();
				toast.error(data.error || 'Failed to save');
			}
		} catch {
			toast.error('Failed to save');
		} finally {
			saving = false;
		}
	}

	async function handleRegenerate() {
		const confirmed = await confirm({
			title: 'Regenerate Shortcut Token',
			message:
				'This will invalidate the current token. All group members will need to recreate their shortcut. Continue?',
			confirmLabel: 'Regenerate',
			destructive: true
		});
		if (!confirmed) return;

		regenerating = true;
		try {
			const res = await fetch('/api/group/shortcut/regenerate-token', { method: 'POST' });
			if (res.ok) {
				const data = await res.json();
				token = data.shortcutToken;
				toast.success('Token regenerated');
			} else {
				toast.error('Failed to regenerate token');
			}
		} catch {
			toast.error('Failed to regenerate token');
		} finally {
			regenerating = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			(e.target as HTMLInputElement).blur();
		}
	}
</script>

<div class="shortcut-manager">
	<a href={resolve('/share/setup')} class="setup-link">
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</svg>
		<div class="setup-link-text">
			<span class="setup-link-title">How to create the shortcut</span>
			<span class="setup-link-desc">Step-by-step setup guide for group members</span>
		</div>
		<svg
			class="setup-link-chevron"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="9 18 15 12 9 6" />
		</svg>
	</a>

	<div class="how-it-works">
		<div class="subsection-label">How it works</div>
		<p class="subsection-desc">
			The shortcut receives a shared URL, grabs the user's phone number to identify them, and POSTs
			both to the API endpoint below. See the setup guide above for full instructions.
		</p>
	</div>

	<div class="subsection">
		<div class="subsection-label">API Endpoint</div>
		<p class="subsection-desc">
			Used in the shortcut's "Get Contents of URL" action. POSTs JSON with
			<code class="inline-code">url</code> and <code class="inline-code">phones</code> keys.
		</p>
		<div class="url-box">
			<span class="url-text">{apiUrl}</span>
		</div>
		<div class="action-row">
			<button class="btn-copy" onclick={copyApiUrl}>
				{#if copiedUrl}
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
					Copied!
				{:else}
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
						<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
					</svg>
					Copy URL
				{/if}
			</button>
			<button class="btn-regen" onclick={handleRegenerate} disabled={regenerating}>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 2v6h-6" />
					<path d="M3 12a9 9 0 0115.36-6.36L21 8" />
					<path d="M3 22v-6h6" />
					<path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
				</svg>
				{regenerating ? 'Regenerating...' : 'New Token'}
			</button>
		</div>
	</div>

	<div class="divider"></div>

	<div class="subsection">
		<div class="subsection-label">iCloud Shortcut Link</div>
		<p class="subsection-desc">
			Once you've created the shortcut, share it via iCloud and paste the link here. Group members
			will see a "Get Shortcut" button on the setup page so they can install it with one tap.
		</p>
		<input
			type="url"
			class="icloud-input"
			bind:value={shortcutUrl}
			onblur={saveShortcutUrl}
			onkeydown={handleKeydown}
			placeholder="https://www.icloud.com/shortcuts/..."
			disabled={saving}
		/>
	</div>
</div>

<style>
	.shortcut-manager {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.setup-link {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent);
		border-radius: var(--radius-sm);
		text-decoration: none;
		transition: transform 0.1s ease;
	}

	.setup-link:active {
		transform: scale(0.98);
	}

	.setup-link > svg:first-child {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--accent-primary);
	}

	.setup-link-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		flex: 1;
		min-width: 0;
	}

	.setup-link-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.setup-link-desc {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.setup-link-chevron {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		color: var(--text-muted);
	}

	.how-it-works {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.inline-code {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 0.6875rem;
		background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
		color: var(--accent-primary);
		padding: 1px 5px;
		border-radius: 4px;
		font-weight: 600;
	}

	.subsection {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.subsection-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.subsection-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.4;
	}

	.url-box {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: var(--space-md) var(--space-lg);
		overflow: hidden;
	}

	.url-text {
		font-size: 0.75rem;
		color: var(--text-secondary);
		word-break: break-all;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.action-row {
		display: flex;
		gap: var(--space-sm);
	}

	.action-row button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.1s ease,
			opacity 0.2s ease;
		border: none;
	}

	.action-row button:active {
		transform: scale(0.97);
	}

	.action-row button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-row button svg {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
	}

	.btn-copy {
		background: var(--accent-primary);
		color: var(--bg-primary);
	}

	.action-row .btn-regen {
		background: var(--bg-surface);
		color: var(--text-primary);
		border: 1px solid var(--border);
	}

	.divider {
		height: 1px;
		background: var(--bg-surface);
	}

	.icloud-input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		font-size: 0.8125rem;
		outline: none;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	.icloud-input::placeholder {
		color: var(--text-muted);
	}

	.icloud-input:focus {
		border-color: var(--accent-primary);
	}

	.icloud-input:disabled {
		opacity: 0.5;
	}
</style>
