<script lang="ts">
	import { resolve } from '$app/paths';
	import { toast } from '$lib/stores/toasts';
	import QuestionIcon from 'phosphor-svelte/lib/QuestionIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';

	let {
		shortcutUrl: propUrl
	}: {
		shortcutUrl: string | null;
	} = $props();

	let savedUrl = $state(propUrl ?? '');
	let shortcutUrl = $state(propUrl ?? '');
	let saving = $state(false);

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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			(e.target as HTMLInputElement).blur();
		}
	}
</script>

<div class="shortcut-manager">
	<a href={resolve('/share/setup')} class="setup-link">
		<QuestionIcon size={20} />
		<div class="setup-link-text">
			<span class="setup-link-title">How to set up the shortcut</span>
			<span class="setup-link-desc"
				>Download the template, customize, and share with your group</span
			>
		</div>
		<CaretRightIcon size={16} class="setup-link-chevron" />
	</a>

	<div class="how-it-works">
		<div class="subsection-label">How it works</div>
		<p class="subsection-desc">
			The shortcut receives a shared URL and POSTs it to your scrolly instance. It uses the
			browser's login session (cookie) to identify who shared — no tokens or phone numbers needed.
			If the user isn't logged in, it opens scrolly in Safari to add the clip manually.
		</p>
	</div>

	<div class="divider"></div>

	<div class="subsection">
		<div class="subsection-label">iCloud Shortcut Link</div>
		<p class="subsection-desc">
			Once you've customized the shortcut, share it via iCloud and paste the link here. Group
			members on iOS will see a "Get Shortcut" button in their settings.
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

	.setup-link > :global(svg:first-child) {
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

	.setup-link :global(.setup-link-chevron) {
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
