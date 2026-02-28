<script lang="ts">
	import PlatformIcon from './PlatformIcon.svelte';
	import { toast } from '$lib/stores/toasts';

	const {
		username,
		avatarPath = null,
		platform,
		caption,
		reactions,
		onreaction,
		canEditCaption = false,
		seenByOthers = false,
		clipId = '',
		oncaptionedit,
		ondelete
	}: {
		username: string;
		avatarPath?: string | null;
		platform: string;
		caption: string | null;
		reactions: Record<string, { count: number; reacted: boolean }>;
		onreaction: (emoji: string) => void;
		canEditCaption?: boolean;
		seenByOthers?: boolean;
		clipId?: string;
		oncaptionedit?: (clipId: string, newCaption: string) => void;
		ondelete?: (clipId: string) => void;
	} = $props();

	let expanded = $state(false);
	let editing = $state(false);
	let editValue = $state('');
	let _saving = $state(false);
	let saved = $state(false);
	let confirmingDelete = $state(false);
	let deleting = $state(false);
	let inputEl: HTMLInputElement | null = $state(null);

	const canModify = $derived(canEditCaption && !seenByOthers);

	const reactionEntries = $derived(Object.entries(reactions).filter(([, v]) => v.count > 0));

	// Get initials from username for avatar fallback
	const initials = $derived(
		username
			.replace('@', '')
			.slice(0, 2)
			.toUpperCase()
	);

	function startEdit() {
		if (!canModify) return;
		editValue = caption || '';
		editing = true;
		confirmingDelete = false;
		requestAnimationFrame(() => {
			inputEl?.focus();
		});
	}

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
		if (e.key === 'Enter') {
			e.preventDefault();
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	}
</script>

<div class="reel-overlay">
	<div class="overlay-user">
		{#if avatarPath}
			<img
				src="/api/profile/avatar/{avatarPath}"
				alt=""
				class="overlay-avatar"
			/>
		{:else}
			<span class="overlay-avatar overlay-avatar-fallback">{initials}</span>
		{/if}
		<span class="username">@{username}</span>
		<span class="platform-badge"><PlatformIcon {platform} size={12} /></span>
	</div>

	{#if editing}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="caption-edit" onclick={(e) => e.stopPropagation()}>
			<input
				bind:this={inputEl}
				type="text"
				bind:value={editValue}
				onkeydown={handleKeydown}
				maxlength={200}
				placeholder="Add a caption..."
			/>
			<div class="edit-actions">
				<button class="edit-action save" onclick={saveEdit}>Save</button>
				<button class="edit-action cancel" onclick={cancelEdit}>Cancel</button>
			</div>
		</div>
	{:else if caption || canModify}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="caption-area">
			{#if caption}
				<p
					class="overlay-caption"
					class:expanded
					onclick={(e) => {
						e.stopPropagation();
						if (canModify) {
							startEdit();
						} else {
							expanded = !expanded;
						}
					}}
				>
					{caption}
				</p>
			{:else}
				<p
					class="overlay-caption placeholder"
					onclick={(e) => {
						e.stopPropagation();
						startEdit();
					}}
				>
					Add a caption...
				</p>
			{/if}
			{#if saved}
				<span class="saved-badge">Saved</span>
			{/if}
		</div>
	{/if}

	<!-- Host actions: Edit / Delete (only when clip hasn't been seen by others) -->
	{#if canModify && !editing}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="host-actions" onclick={(e) => e.stopPropagation()}>
			{#if confirmingDelete}
				<span class="confirm-label">Delete this clip?</span>
				<button class="host-action-btn confirm-yes" onclick={handleDelete} disabled={deleting}>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
				<span class="host-action-dot">·</span>
				<button class="host-action-btn" onclick={() => (confirmingDelete = false)}>Cancel</button>
			{:else}
				<button class="host-action-btn" onclick={startEdit}>Edit</button>
				<span class="host-action-dot">·</span>
				<button class="host-action-btn delete" onclick={() => (confirmingDelete = true)}
					>Delete</button
				>
			{/if}
		</div>
	{/if}

	{#if reactionEntries.length > 0}
		<div class="overlay-reactions">
			{#each reactionEntries as [emoji, data]}
				<button
					class="reaction-pill"
					class:reacted={data.reacted}
					onclick={(e) => {
						e.stopPropagation();
						onreaction(emoji);
					}}
				>
					{emoji}
					{data.count}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.reel-overlay {
		position: absolute;
		bottom: calc(90px + env(safe-area-inset-bottom));
		left: var(--space-lg);
		right: 72px;
		z-index: 5;
	}

	.overlay-user {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.overlay-avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		object-fit: cover;
		flex-shrink: 0;
		border: 2px solid rgba(255, 255, 255, 0.25);
	}

	.overlay-avatar-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		color: rgba(255, 255, 255, 0.8);
		font-family: var(--font-display);
		font-size: 0.75rem;
		font-weight: 700;
	}

	.username {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1rem;
		color: #fff;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
	}

	.platform-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.8);
	}

	/* Caption display area */
	.caption-area {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: 2px;
	}

	.overlay-caption {
		margin: 0;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		cursor: pointer;
		flex: 1;
	}

	.overlay-caption.placeholder {
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	.overlay-caption.expanded {
		-webkit-line-clamp: unset;
		display: block;
	}

	.saved-badge {
		flex-shrink: 0;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--accent-primary);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
		animation: fade-in 0.2s ease;
		margin-top: 2px;
	}

	/* Inline edit mode */
	.caption-edit {
		margin-bottom: var(--space-sm);
	}

	.caption-edit input {
		width: 100%;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-sm);
		color: #fff;
		font-size: 0.875rem;
		font-family: var(--font-body);
		outline: none;
	}

	.caption-edit input:focus {
		border-color: var(--accent-primary);
	}

	.caption-edit input::placeholder {
		color: rgba(255, 255, 255, 0.3);
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
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
	}

	.edit-action.save {
		color: var(--accent-primary);
	}

	.edit-action.cancel {
		color: rgba(255, 255, 255, 0.5);
	}

	/* Host action row (Edit / Delete) */
	.host-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: var(--space-sm);
		animation: fade-in 0.15s ease;
	}

	.host-action-btn {
		background: none;
		border: none;
		font-size: 0.6875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.45);
		cursor: pointer;
		padding: 0;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
		transition: color 0.15s ease;
	}

	.host-action-btn:active {
		color: rgba(255, 255, 255, 0.7);
	}

	.host-action-btn.delete {
		color: rgba(255, 255, 255, 0.35);
	}

	.host-action-btn.confirm-yes {
		color: var(--error);
	}

	.host-action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.host-action-dot {
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.6875rem;
		user-select: none;
	}

	.confirm-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
		margin-right: 2px;
	}

	/* Reactions */
	.overlay-reactions {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.reaction-pill {
		background: rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.9);
		padding: 2px 10px;
		border-radius: var(--radius-full);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.reaction-pill.reacted {
		border-color: var(--accent-primary);
		background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
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
