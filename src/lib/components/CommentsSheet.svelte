<script lang="ts">
	import { relativeTime } from '$lib/utils';
	import { fetchUnreadCount } from '$lib/stores/notifications';
	import { toast } from '$lib/stores/toasts';

	interface Comment {
		id: string;
		text: string;
		userId: string;
		username: string;
		avatarPath: string | null;
		parentId: string | null;
		heartCount: number;
		hearted: boolean;
		createdAt: string;
		replyCount?: number;
		replies?: Comment[];
	}

	const {
		clipId,
		currentUserId,
		ondismiss
	}: {
		clipId: string;
		currentUserId: string;
		ondismiss: () => void;
	} = $props();

	let comments = $state<Comment[]>([]);
	let newText = $state('');
	let loading = $state(true);
	let submitting = $state(false);
	let visible = $state(false);
	let scrollEl: HTMLDivElement | null = $state(null);
	let inputEl: HTMLInputElement | null = $state(null);
	let replyingTo = $state<{ id: string; username: string } | null>(null);

	const totalCount = $derived(comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0));

	// Animate in
	$effect(() => {
		requestAnimationFrame(() => {
			visible = true;
		});
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Load comments
	$effect(() => {
		loadComments();
	});

	async function loadComments() {
		loading = true;
		const res = await fetch(`/api/clips/${clipId}/comments`);
		if (res.ok) {
			const data = await res.json();
			comments = data.comments;
		}
		loading = false;
		// Mark comment notifications for this clip as read
		for (const type of ['comment', 'reply']) {
			fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clipId, type })
			})
				.then(() => fetchUnreadCount())
				.catch(() => {});
		}
	}

	async function handleSubmit() {
		if (!newText.trim() || submitting) return;
		submitting = true;

		try {
			const body: { text: string; parentId?: string } = { text: newText.trim() };
			if (replyingTo) body.parentId = replyingTo.id;

			const res = await fetch(`/api/clips/${clipId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (res.ok) {
				const data = await res.json();
				if (replyingTo) {
					// Nest reply under parent
					const parent = comments.find((c) => c.id === replyingTo!.id);
					if (parent) {
						if (!parent.replies) parent.replies = [];
						parent.replies = [...parent.replies, data.comment];
						parent.replyCount = (parent.replyCount || 0) + 1;
						comments = [...comments];
					}
					replyingTo = null;
				} else {
					// New top-level comment (0 hearts, newest) goes to top
					const newComment = { ...data.comment, replyCount: 0, replies: [] };
					comments = [newComment, ...comments];
				}
				newText = '';
			} else {
				toast.error('Failed to post comment');
			}
		} catch {
			toast.error('Failed to post comment');
		}
		submitting = false;
	}

	async function handleDelete(commentId: string) {
		try {
			const res = await fetch(`/api/clips/${clipId}/comments`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ commentId })
			});

			if (res.ok) {
				const data = await res.json();
				const deletedIds = new Set(data.deletedIds || [commentId]);

				// Remove top-level or filter replies
				comments = comments
					.filter((c) => !deletedIds.has(c.id))
					.map((c) => ({
						...c,
						replies: (c.replies || []).filter((r) => !deletedIds.has(r.id)),
						replyCount: (c.replies || []).filter((r) => !deletedIds.has(r.id)).length
					}));
			} else {
				toast.error('Failed to delete comment');
			}
		} catch {
			toast.error('Failed to delete comment');
		}
	}

	async function toggleHeart(comment: Comment) {
		const wasHearted = comment.hearted;
		const prevCount = comment.heartCount;

		// Optimistic update
		comment.hearted = !wasHearted;
		comment.heartCount += comment.hearted ? 1 : -1;
		comments = [...comments];

		try {
			const res = await fetch(`/api/clips/${clipId}/comments/${comment.id}/heart`, {
				method: 'POST'
			});

			if (res.ok) {
				const data = await res.json();
				comment.heartCount = data.heartCount;
				comment.hearted = data.hearted;
				comments = [...comments];
			} else {
				// Revert
				comment.hearted = wasHearted;
				comment.heartCount = prevCount;
				comments = [...comments];
			}
		} catch {
			comment.hearted = wasHearted;
			comment.heartCount = prevCount;
			comments = [...comments];
		}
	}

	function startReply(comment: Comment) {
		replyingTo = { id: comment.id, username: comment.username };
		requestAnimationFrame(() => inputEl?.focus());
	}

	function cancelReply() {
		replyingTo = null;
	}

	function dismiss() {
		visible = false;
		setTimeout(ondismiss, 300);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" class:visible onclick={dismiss} role="presentation"></div>

<div class="sheet" class:visible>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="handle-bar" onclick={dismiss} role="button" tabindex="-1">
		<div class="handle"></div>
	</div>

	<div class="header">
		<span class="title">Comments{totalCount > 0 ? ` (${totalCount})` : ''}</span>
	</div>

	<div class="comments-list" bind:this={scrollEl}>
		{#if loading}
			<p class="empty">Loading...</p>
		{:else if comments.length === 0}
			<p class="empty">No comments yet</p>
		{:else}
			{#each comments as comment (comment.id)}
				<div class="comment">
					<div class="comment-avatar">
						<span>{comment.username.charAt(0).toUpperCase()}</span>
					</div>
					<div class="comment-body">
						<div class="comment-header">
							<span class="comment-username">{comment.username}</span>
							<span class="comment-time">{relativeTime(comment.createdAt)}</span>
							{#if comment.userId === currentUserId}
								<button class="delete-btn" onclick={() => handleDelete(comment.id)}>
									&times;
								</button>
							{/if}
						</div>
						<p class="comment-text">{comment.text}</p>
						<div class="comment-actions">
							<button class="reply-btn" onclick={() => startReply(comment)}>Reply</button>
							<button
								class="heart-btn"
								class:hearted={comment.hearted}
								onclick={() => toggleHeart(comment)}
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill={comment.hearted ? 'currentColor' : 'none'}
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
									/>
								</svg>
								{#if comment.heartCount > 0}
									<span class="heart-count">{comment.heartCount}</span>
								{/if}
							</button>
						</div>

						{#if comment.replies && comment.replies.length > 0}
							<div class="replies">
								{#each comment.replies as reply (reply.id)}
									<div class="reply">
										<div class="reply-avatar">
											<span>{reply.username.charAt(0).toUpperCase()}</span>
										</div>
										<div class="reply-body">
											<div class="comment-header">
												<span class="reply-username">{reply.username}</span>
												<span class="comment-time">{relativeTime(reply.createdAt)}</span>
												{#if reply.userId === currentUserId}
													<button class="delete-btn" onclick={() => handleDelete(reply.id)}>
														&times;
													</button>
												{/if}
											</div>
											<p class="reply-text">{reply.text}</p>
											<div class="comment-actions">
												<button
													class="heart-btn"
													class:hearted={reply.hearted}
													onclick={() => toggleHeart(reply)}
												>
													<svg
														width="12"
														height="12"
														viewBox="0 0 24 24"
														fill={reply.hearted ? 'currentColor' : 'none'}
														stroke="currentColor"
														stroke-width="2"
													>
														<path
															d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
														/>
													</svg>
													{#if reply.heartCount > 0}
														<span class="heart-count">{reply.heartCount}</span>
													{/if}
												</button>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	{#if replyingTo}
		<div class="reply-indicator">
			<span>Replying to <strong>{replyingTo.username}</strong></span>
			<button class="cancel-reply" onclick={cancelReply}>&times;</button>
		</div>
	{/if}

	<form
		class="input-bar"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<input
			type="text"
			bind:value={newText}
			bind:this={inputEl}
			placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : 'Add a comment...'}
			maxlength={500}
			disabled={submitting}
		/>
		<button type="submit" disabled={!newText.trim() || submitting}> Send </button>
	</form>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 99;
		opacity: 0;
		transition: opacity 300ms ease;
	}

	.overlay.visible {
		opacity: 1;
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 70vh;
		background: var(--bg-surface);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		transform: translateY(100%);
		transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	.sheet.visible {
		transform: translateY(0);
	}

	.handle-bar {
		display: flex;
		justify-content: center;
		padding: var(--space-md);
		cursor: pointer;
	}

	.handle {
		width: 36px;
		height: 4px;
		background: var(--bg-subtle);
		border-radius: 2px;
	}

	.header {
		padding: 0 var(--space-lg) var(--space-md);
		border-bottom: 1px solid var(--border);
	}

	.title {
		font-family: var(--font-display);
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.comments-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md) var(--space-lg);
		-webkit-overflow-scrolling: touch;
	}

	.empty {
		text-align: center;
		color: var(--text-muted);
		padding: var(--space-2xl);
		margin: 0;
	}

	/* Top-level comment row */
	.comment {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}

	.comment-avatar {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background: var(--accent-magenta);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 0.75rem;
	}

	.comment-body {
		flex: 1;
		min-width: 0;
	}

	.comment-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: 2px;
	}

	.comment-username {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.comment-time {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.delete-btn {
		margin-left: auto;
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1rem;
		cursor: pointer;
		padding: 0 4px;
		line-height: 1;
		transition: color 0.2s ease;
	}

	.delete-btn:hover {
		color: var(--error);
	}

	.comment-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	/* Actions row (reply + heart) */
	.comment-actions {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-top: 4px;
	}

	.reply-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s ease;
	}

	.reply-btn:active {
		transform: scale(0.97);
	}

	.heart-btn {
		background: none;
		border: none;
		display: flex;
		align-items: center;
		gap: 3px;
		cursor: pointer;
		padding: 0;
		color: var(--text-muted);
		transition:
			color 0.2s ease,
			transform 0.1s ease;
	}

	.heart-btn:active {
		transform: scale(0.9);
	}

	.heart-btn.hearted {
		color: var(--accent-magenta);
	}

	.heart-count {
		font-size: 0.6875rem;
	}

	/* Replies section */
	.replies {
		margin-top: var(--space-sm);
		padding-left: 4px;
		border-left: 2px solid var(--border);
		margin-left: 2px;
	}

	.reply {
		display: flex;
		gap: 6px;
		padding: var(--space-xs) 0 var(--space-xs) var(--space-sm);
	}

	.reply-avatar {
		width: 22px;
		height: 22px;
		border-radius: var(--radius-full);
		background: var(--accent-magenta);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 0.625rem;
	}

	.reply-body {
		flex: 1;
		min-width: 0;
	}

	.reply-username {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.reply-text {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	/* Reply indicator banner */
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

	.reply-indicator strong {
		color: var(--text-primary);
	}

	.cancel-reply {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1rem;
		padding: var(--space-xs);
		line-height: 1;
	}

	/* Input bar */
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
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.2s ease;
	}

	.input-bar input:focus {
		border-color: var(--accent-primary);
	}

	.input-bar input::placeholder {
		color: var(--text-muted);
	}

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

	.input-bar button:active {
		transform: scale(0.97);
	}

	.input-bar button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
