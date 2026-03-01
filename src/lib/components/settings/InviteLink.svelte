<script lang="ts">
	import { confirm } from '$lib/stores/confirm';
	import { toast } from '$lib/stores/toasts';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import ArrowClockwiseIcon from 'phosphor-svelte/lib/ArrowClockwiseIcon';

	let { inviteCode: code }: { inviteCode: string } = $props();
	let copied = $state(false);
	let regenerating = $state(false);

	const inviteUrl = $derived(
		typeof window !== 'undefined' ? `${window.location.origin}/join/${code}` : `/join/${code}`
	);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(inviteUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			toast.error('Failed to copy link');
		}
	}

	async function handleRegenerate() {
		const confirmed = await confirm({
			title: 'Regenerate Invite Link',
			message:
				"This will invalidate the current invite link. Anyone with the old link won't be able to join. Continue?",
			confirmLabel: 'Regenerate',
			destructive: true
		});
		if (!confirmed) return;

		regenerating = true;
		try {
			const res = await fetch('/api/group/invite-code/regenerate', { method: 'POST' });
			if (res.ok) {
				const data = await res.json();
				code = data.inviteCode;
				toast.success('Invite link regenerated');
			} else {
				toast.error('Failed to regenerate link');
			}
		} catch {
			toast.error('Failed to regenerate link');
		} finally {
			regenerating = false;
		}
	}
</script>

<div class="invite-container">
	<div class="invite-url-box">
		<span class="invite-url">{inviteUrl}</span>
	</div>
	<div class="invite-actions">
		<button class="btn-copy" onclick={copyLink}>
			{#if copied}
				<CheckIcon size={15} weight="bold" />
				Copied!
			{:else}
				<CopyIcon size={15} />
				Copy Link
			{/if}
		</button>
		<button class="btn-regen" onclick={handleRegenerate} disabled={regenerating}>
			<ArrowClockwiseIcon size={15} />
			{regenerating ? 'Regenerating...' : 'New Link'}
		</button>
	</div>
</div>

<style>
	.invite-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.invite-url-box {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: var(--space-md) var(--space-lg);
		overflow: hidden;
	}

	.invite-url {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		word-break: break-all;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.invite-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.invite-actions button {
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

	.invite-actions button:active {
		transform: scale(0.97);
	}

	.invite-actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.invite-actions button :global(svg) {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
	}

	.btn-copy {
		background: var(--accent-primary);
		color: var(--bg-primary);
	}

	.invite-actions .btn-regen {
		background: var(--bg-surface);
		color: var(--text-primary);
		border: 1px solid var(--border);
	}
</style>
