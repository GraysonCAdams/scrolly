<script lang="ts">
	import PlatformIcon from './PlatformIcon.svelte';
	import { toast } from '$lib/stores/toasts';

	const {
		username,
		avatarPath = null,
		platform,
		caption,
		canEditCaption = false,
		seenByOthers = false,
		clipId = '',
		active = false,
		uiHidden = false,
		hasDiscOverlap = false,
		oncaptionedit,
		ondelete,
		oncomment
	}: {
		username: string;
		avatarPath?: string | null;
		platform: string;
		caption: string | null;
		canEditCaption?: boolean;
		seenByOthers?: boolean;
		clipId?: string;
		active?: boolean;
		uiHidden?: boolean;
		hasDiscOverlap?: boolean;
		oncaptionedit?: (clipId: string, newCaption: string) => void;
		ondelete?: (clipId: string) => void;
		oncomment?: () => void;
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

	// Get initials from username for avatar fallback
	const initials = $derived(username.replace('@', '').slice(0, 2).toUpperCase());

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

<div class="reel-overlay" class:ui-hidden={uiHidden}>
	<div class="overlay-content">
		<div class="overlay-user">
			{#if avatarPath}
				<img src="/api/profile/avatar/{avatarPath}" alt="" class="overlay-avatar" />
			{:else}
				<span class="overlay-avatar overlay-avatar-fallback">{initials}</span>
			{/if}
			<span class="username">@{username}</span>
			<span class="platform-badge"><PlatformIcon {platform} size={12} /></span>
			{#if canModify && !editing && !confirmingDelete}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span
					class="host-actions-inline"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
				>
					<button class="host-icon-btn" onclick={startEdit} aria-label="Edit caption">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
							<path d="m15 5 4 4" />
						</svg>
					</button>
					<button
						class="host-icon-btn delete"
						onclick={() => (confirmingDelete = true)}
						aria-label="Delete clip"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
							<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
						</svg>
					</button>
				</span>
			{/if}
		</div>

		{#if editing}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="caption-edit"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
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
			<div class="caption-area">
				{#if caption}
					<button
						type="button"
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
					</button>
				{:else}
					<button
						type="button"
						class="overlay-caption placeholder"
						onclick={(e) => {
							e.stopPropagation();
							startEdit();
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
	</div>

	{#if active && oncomment}
		<button
			type="button"
			class="comment-prompt"
			class:disc-inset={hasDiscOverlap}
			onclick={(e) => {
				e.stopPropagation();
				oncomment();
			}}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
			>
			<span>Add a comment...</span>
		</button>
	{/if}
</div>

<style>
	.reel-overlay {
		position: absolute;
		bottom: calc(94px + env(safe-area-inset-bottom));
		left: var(--space-lg);
		right: var(--space-lg);
		z-index: 5;
		transition: opacity 0.3s ease;
	}
	.reel-overlay.ui-hidden {
		opacity: 0;
		pointer-events: none;
	}
	.overlay-content {
		margin-right: 64px;
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
		border: 2px solid var(--reel-avatar-border);
	}
	.overlay-avatar-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--reel-frosted-bg);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		color: var(--reel-text-medium);
		font-family: var(--font-display);
		font-size: 0.75rem;
		font-weight: 700;
	}
	.username {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1rem;
		color: var(--reel-text);
		text-shadow: 0 1px 4px var(--reel-text-shadow);
	}
	.platform-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border-radius: var(--radius-full);
		background: var(--reel-frosted-bg);
		color: var(--reel-text-medium);
	}

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

	.host-actions-inline {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}
	.host-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: none;
		border: none;
		border-radius: var(--radius-full);
		color: var(--reel-text-ghost);
		cursor: pointer;
		padding: 0;
		transition: color 0.15s ease;
	}
	.host-icon-btn svg {
		width: 13px;
		height: 13px;
		filter: drop-shadow(0 1px 2px var(--reel-icon-shadow));
	}
	.host-icon-btn:active {
		color: var(--reel-text-dim);
		transform: scale(0.9);
	}
	.host-icon-btn.delete:active {
		color: var(--error);
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
	.caption-edit input {
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
		outline: none;
	}
	.caption-edit input:focus {
		border-color: var(--accent-primary);
	}
	.caption-edit input::placeholder {
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

	.comment-prompt {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-full);
		background: var(--reel-glass-pill-bg);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid var(--reel-glass-border);
		cursor: pointer;
		font: inherit;
		text-align: left;
		transition: background 0.2s ease;
		animation: comment-prompt-in 0.3s ease;
	}
	.comment-prompt.disc-inset {
		width: calc(100% - 56px);
	}
	.comment-prompt:active {
		background: var(--reel-frosted-bg-active);
	}
	.comment-prompt svg {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		color: var(--reel-text-subtle);
	}
	.comment-prompt span {
		font-size: 0.875rem;
		color: var(--reel-text-subtle);
	}
	@keyframes comment-prompt-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
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
