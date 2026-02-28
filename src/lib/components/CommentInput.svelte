<script lang="ts">
	const {
		replyingTo,
		submitting,
		onsubmit,
		oncancelreply
	}: {
		replyingTo: { id: string; username: string } | null;
		submitting: boolean;
		onsubmit: (text: string) => void;
		oncancelreply: () => void;
	} = $props();

	let text = $state('');
	let inputEl: HTMLInputElement | null = $state(null);

	export function focus() {
		inputEl?.focus();
	}

	export function clear() {
		text = '';
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!text.trim() || submitting) return;
		onsubmit(text.trim());
	}
</script>

{#if replyingTo}
	<div class="reply-indicator">
		<span>Replying to <strong>{replyingTo.username}</strong></span>
		<button class="cancel-reply" onclick={oncancelreply}>&times;</button>
	</div>
{/if}

<form class="input-bar" onsubmit={handleSubmit}>
	<input
		type="text"
		bind:value={text}
		bind:this={inputEl}
		placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : 'Add a comment...'}
		maxlength={500}
		disabled={submitting}
	/>
	<button type="submit" disabled={!text.trim() || submitting}>Send</button>
</form>

<style>
	.reply-indicator {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-lg);
		background: var(--bg-elevated);
		border-top: 1px solid var(--border);
		font-size: 0.75rem;
		color: var(--text-secondary);
	}
	.reply-indicator strong { color: var(--text-primary); }

	.cancel-reply {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1rem;
		padding: var(--space-xs);
		line-height: 1;
	}

	.input-bar {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		border-top: 1px solid var(--border);
		background: var(--bg-surface);
		padding-bottom: max(12px, env(safe-area-inset-bottom));
	}
	.input-bar input {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--bg-elevated);
		color: var(--text-primary);
		font-size: 1rem;
		outline: none;
		transition: border-color 0.2s ease;
	}
	.input-bar input:focus { border-color: var(--accent-primary); }
	.input-bar input::placeholder { color: var(--text-muted); }

	.input-bar button {
		padding: var(--space-sm) var(--space-lg);
		background: var(--accent-primary);
		color: #000000;
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.1s ease;
	}
	.input-bar button:active { transform: scale(0.97); }
	.input-bar button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
