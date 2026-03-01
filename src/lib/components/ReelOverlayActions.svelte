<script lang="ts">
	import { toast } from '$lib/stores/toasts';

	let {
		clipId,
		caption,
		canModify,
		expanded,
		onexpandtoggle,
		oncaptionedit,
		ondelete,
		editing = $bindable(false),
		confirmingDelete = $bindable(false)
	}: {
		clipId: string;
		caption: string | null;
		canModify: boolean;
		expanded: boolean;
		onexpandtoggle: () => void;
		oncaptionedit?: (clipId: string, newCaption: string) => void;
		ondelete?: (clipId: string) => void;
		editing?: boolean;
		confirmingDelete?: boolean;
	} = $props();

	let editValue = $state('');
	let _saving = $state(false);
	let saved = $state(false);
	let deleting = $state(false);
	let inputEl: HTMLTextAreaElement | null = $state(null);

	$effect(() => {
		if (editing) {
			editValue = caption || '';
			confirmingDelete = false;
			requestAnimationFrame(() => {
				inputEl?.focus();
			});
		}
	});

	function cancelEdit() {
		editing = false;
	}
	async function saveEdit() {
		if (!editing) return;
		editing = false;
		const newCaption = editValue.trim();
		if (newCaption === (caption || '').trim()) return;

		_saving = true;
		try {
			const res = await fetch(`/api/clips/${clipId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: newCaption })
			});
			if (res.ok) {
				oncaptionedit?.(clipId, newCaption);
				saved = true;
				setTimeout(() => (saved = false), 1500);
			} else {
				toast.error('Failed to save caption');
			}
		} catch {
			toast.error('Failed to save caption');
		}
		_saving = false;
	}
	async function handleDelete() {
		if (deleting) return;
		deleting = true;
		try {
			const res = await fetch(`/api/clips/${clipId}`, { method: 'DELETE' });
			if (res.ok) {
				ondelete?.(clipId);
			} else {
				toast.error('Failed to delete clip');
			}
		} catch {
			toast.error('Failed to delete clip');
		}
		deleting = false;
		confirmingDelete = false;
	}
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			cancelEdit();
		}
	}
</script>

{#if editing}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="caption-edit"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<textarea
			bind:this={inputEl}
			bind:value={editValue}
			onkeydown={handleKeydown}
			maxlength={200}
			rows={3}
			placeholder="Add a caption..."
		></textarea>
		<div class="edit-actions">
			<button class="edit-action save" onclick={saveEdit}>Save</button>
			<button class="edit-action cancel" onclick={cancelEdit}>Cancel</button>
		</div>
	</div>
{:else if caption || canModify}
	<div class="caption-area">
		{#if caption}
			<button
				type="button"
				class="overlay-caption"
				class:expanded
				onclick={(e) => {
					e.stopPropagation();
					if (canModify) {
						editing = true;
					} else {
						onexpandtoggle();
					}
				}}
			>
				{caption}
			</button>
		{:else}
			<button
				type="button"
				class="overlay-caption placeholder"
				onclick={(e) => {
					e.stopPropagation();
					editing = true;
				}}
			>
				Add a caption...
			</button>
		{/if}
		{#if saved}
			<span class="saved-badge">Saved</span>
		{/if}
	</div>
	{#if confirmingDelete}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="confirm-row"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<span class="confirm-label">Delete this clip?</span>
			<button class="host-action-btn confirm-yes" onclick={handleDelete} disabled={deleting}>
				{deleting ? 'Deleting...' : 'Yes'}
			</button>
			<span class="host-action-dot">·</span>
			<button class="host-action-btn" onclick={() => (confirmingDelete = false)}>No</button>
		</div>
	{/if}
{/if}

<style>
	.caption-area {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: 2px;
	}
	.overlay-caption {
		margin: 0;
		padding: 0;
		background: none;
		border: none;
		font: inherit;
		text-align: left;
		font-size: 0.875rem;
		color: var(--reel-text-bright);
		text-shadow: 0 1px 4px var(--reel-text-shadow);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		cursor: pointer;
		flex: 1;
	}
	.overlay-caption.placeholder {
		color: var(--reel-text-faint);
		font-style: italic;
	}
	.overlay-caption.expanded {
		-webkit-line-clamp: unset;
		line-clamp: unset;
		display: block;
	}
	.saved-badge {
		flex-shrink: 0;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--accent-primary);
		text-shadow: 0 1px 3px var(--reel-text-shadow);
		animation: fade-in 0.2s ease;
		margin-top: 2px;
	}
	.confirm-row {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: var(--space-xs);
		animation: fade-in 0.15s ease;
	}
	.host-action-btn {
		background: none;
		border: none;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--reel-text-faint);
		cursor: pointer;
		padding: 0;
		text-shadow: 0 1px 3px var(--reel-text-shadow);
		transition: color 0.15s ease;
	}
	.host-action-btn:active {
		color: var(--reel-text-dim);
	}
	.host-action-btn.confirm-yes {
		color: var(--error);
	}
	.host-action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.host-action-dot {
		color: var(--reel-text-disabled);
		font-size: 0.6875rem;
		user-select: none;
	}
	.confirm-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--reel-text-subtle);
		text-shadow: 0 1px 3px var(--reel-text-shadow);
		margin-right: 2px;
	}
	.caption-edit {
		margin-bottom: var(--space-sm);
	}
	.caption-edit textarea {
		width: 100%;
		padding: 8px 12px;
		background: var(--reel-input-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--reel-input-border);
		border-radius: var(--radius-sm);
		color: var(--reel-text);
		font-size: 0.875rem;
		font-family: var(--font-body);
		line-height: 1.4;
		outline: none;
		resize: none;
	}
	.caption-edit textarea:focus {
		border-color: var(--accent-primary);
	}
	.caption-edit textarea::placeholder {
		color: var(--reel-text-placeholder);
	}
	.edit-actions {
		display: flex;
		gap: var(--space-sm);
		margin-top: 6px;
	}
	.edit-action {
		background: none;
		border: none;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
		text-shadow: 0 1px 3px var(--reel-text-shadow);
	}
	.edit-action.save {
		color: var(--accent-primary);
	}
	.edit-action.cancel {
		color: var(--reel-text-subtle);
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
