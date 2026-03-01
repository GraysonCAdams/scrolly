<script lang="ts">
	import { relativeTime } from '$lib/utils';
	import { toast } from '$lib/stores/toasts';
	import { onDestroy } from 'svelte';
	import CommentInput from './CommentInput.svelte';
	import GifPicker from './GifPicker.svelte';
	import BaseSheet from './BaseSheet.svelte';
	import {
		type Comment,
		fetchComments,
		postComment,
		deleteComment as apiDeleteComment,
		toggleCommentHeart,
		markCommentsRead
	} from '$lib/commentsApi';

	const {
		clipId,
		currentUserId,
		gifEnabled = false,
		autoFocus = false,
		ondismiss
	}: {
		clipId: string;
		currentUserId: string;
		gifEnabled?: boolean;
		autoFocus?: boolean;
		ondismiss: () => void;
	} = $props();

	let comments = $state<Comment[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let replyingTo = $state<{ id: string; username: string } | null>(null);
	let commentInput: ReturnType<typeof CommentInput> | null = $state(null);
	let showGifPicker = $state(false);
	let attachedGif = $state<{
		id: string;
		url: string;
		stillUrl: string;
		width: number;
		height: number;
	} | null>(null);

	const totalCount = $derived(comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0));

	let justHeartedIds = $state(new Set<string>());
	let justPostedId = $state<string | null>(null);
	let sheetRef = $state<ReturnType<typeof BaseSheet> | null>(null);

	let timers: ReturnType<typeof setTimeout>[] = [];

	function safeTimeout(fn: () => void, ms: number) {
		const id = setTimeout(fn, ms);
		timers.push(id);
		return id;
	}

	onDestroy(() => timers.forEach(clearTimeout));

	// Load comments
	$effect(() => {
		loadComments();
	});

	async function loadComments() {
		loading = true;
		comments = await fetchComments(clipId);
		loading = false;
		markCommentsRead(clipId);
		if (autoFocus) safeTimeout(() => commentInput?.focus(), 350);
	}

	async function handleSubmit(text: string, gifUrl?: string) {
		submitting = true;
		try {
			const newComment = await postComment(clipId, text, replyingTo?.id, gifUrl);
			if (replyingTo) {
				const parent = comments.find((c) => c.id === replyingTo!.id);
				if (parent) {
					if (!parent.replies) parent.replies = [];
					parent.replies = [...parent.replies, newComment];
					parent.replyCount = (parent.replyCount || 0) + 1;
					comments = [...comments];
				}
				replyingTo = null;
			} else {
				comments = [{ ...newComment, replyCount: 0, replies: [] }, ...comments];
				justPostedId = newComment.id;
				safeTimeout(() => {
					justPostedId = null;
				}, 300);
			}
			commentInput?.clear();
			attachedGif = null;
			showGifPicker = false;
		} catch {
			toast.error('Failed to post comment');
		}
		submitting = false;
	}

	async function handleDelete(commentId: string) {
		try {
			const deletedIds = new Set(await apiDeleteComment(clipId, commentId));
			comments = comments
				.filter((c) => !deletedIds.has(c.id))
				.map((c) => ({
					...c,
					replies: (c.replies || []).filter((r) => !deletedIds.has(r.id)),
					replyCount: (c.replies || []).filter((r) => !deletedIds.has(r.id)).length
				}));
		} catch {
			toast.error('Failed to delete comment');
		}
	}

	async function toggleHeart(comment: Comment) {
		const wasHearted = comment.hearted;
		const prevCount = comment.heartCount;
		comment.hearted = !wasHearted;
		comment.heartCount += comment.hearted ? 1 : -1;
		comments = [...comments];

		if (!wasHearted) {
			justHeartedIds = new Set([...justHeartedIds, comment.id]);
			safeTimeout(() => {
				justHeartedIds = new Set([...justHeartedIds].filter((id) => id !== comment.id));
			}, 300);
		}

		try {
			const result = await toggleCommentHeart(clipId, comment.id);
			comment.heartCount = result.heartCount;
			comment.hearted = result.hearted;
		} catch {
			comment.hearted = wasHearted;
			comment.heartCount = prevCount;
		}
		comments = [...comments];
	}

	function startReply(comment: Comment) {
		replyingTo = { id: comment.id, username: comment.username };
		requestAnimationFrame(() => commentInput?.focus());
	}
</script>

<div class="comments-sheet-wrapper">
	<BaseSheet
		bind:this={sheetRef}
		title="Comments{totalCount > 0 ? ` (${totalCount})` : ''}"
		sheetId="comments"
		{ondismiss}
	>
		<div class="comments-list" role="list" aria-label="Comments">
			{#if loading}
				<p class="empty">Loading...</p>
			{:else if comments.length === 0}
				<p class="empty">No comments yet</p>
			{:else}
				{#each comments as comment (comment.id)}
					<div class="comment" class:just-posted={comment.id === justPostedId} role="listitem">
						<div class="comment-avatar">
							<span>{comment.username.charAt(0).toUpperCase()}</span>
						</div>
						<div class="comment-body">
							<div class="comment-header">
								<span class="comment-username">{comment.username}</span>
								<span class="comment-time">{relativeTime(comment.createdAt)}</span>
								{#if comment.userId === currentUserId}
									<button
										class="delete-btn"
										onclick={() => handleDelete(comment.id)}
										aria-label="Delete comment by {comment.username}">&times;</button
									>
								{/if}
							</div>
							{#if comment.text}
								<p class="comment-text">{comment.text}</p>
							{/if}
							{#if comment.gifUrl}
								<img class="comment-gif" src={comment.gifUrl} alt="GIF" loading="lazy" />
							{/if}
							<div class="comment-actions">
								<button class="reply-btn" onclick={() => startReply(comment)}>Reply</button>
								<button
									class="heart-btn"
									class:hearted={comment.hearted}
									class:heart-pop={justHeartedIds.has(comment.id)}
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
									{#if comment.heartCount > 0}<span class="heart-count">{comment.heartCount}</span
										>{/if}
								</button>
							</div>

							{#if comment.replies && comment.replies.length > 0}
								<div class="replies" role="list" aria-label="Replies to {comment.username}">
									{#each comment.replies as reply (reply.id)}
										<div class="reply" role="listitem">
											<div class="reply-avatar">
												<span>{reply.username.charAt(0).toUpperCase()}</span>
											</div>
											<div class="reply-body">
												<div class="comment-header">
													<span class="reply-username">{reply.username}</span>
													<span class="comment-time">{relativeTime(reply.createdAt)}</span>
													{#if reply.userId === currentUserId}
														<button
															class="delete-btn"
															onclick={() => handleDelete(reply.id)}
															aria-label="Delete reply by {reply.username}">&times;</button
														>
													{/if}
												</div>
												{#if reply.text}
													<p class="reply-text">{reply.text}</p>
												{/if}
												{#if reply.gifUrl}
													<img class="reply-gif" src={reply.gifUrl} alt="GIF" loading="lazy" />
												{/if}
												<div class="comment-actions">
													<button
														class="heart-btn"
														class:hearted={reply.hearted}
														class:heart-pop={justHeartedIds.has(reply.id)}
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
														{#if reply.heartCount > 0}<span class="heart-count"
																>{reply.heartCount}</span
															>{/if}
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

		{#if showGifPicker}
			<GifPicker
				onselect={(gif) => {
					attachedGif = gif;
					showGifPicker = false;
				}}
				ondismiss={() => {
					showGifPicker = false;
				}}
			/>
		{/if}

		<CommentInput
			bind:this={commentInput}
			{replyingTo}
			{submitting}
			{gifEnabled}
			{attachedGif}
			onsubmit={handleSubmit}
			oncancelreply={() => {
				replyingTo = null;
			}}
			ongiftoggle={() => {
				showGifPicker = !showGifPicker;
			}}
			onremovegif={() => {
				attachedGif = null;
			}}
		/>
	</BaseSheet>
</div>

<style>
	.comments-sheet-wrapper :global(.base-overlay) {
		background: transparent;
	}
	.comments-sheet-wrapper :global(.base-sheet) {
		height: 70vh;
		background: rgba(0, 0, 0, 0.93);
	}
	.comments-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md) var(--space-lg);
		-webkit-overflow-scrolling: touch;
		overscroll-behavior-y: contain;
	}
	.empty {
		text-align: center;
		color: var(--text-muted);
		padding: var(--space-2xl);
		margin: 0;
	}

	.comment {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}
	.comment-avatar,
	.reply-avatar {
		border-radius: var(--radius-full);
		background: var(--accent-magenta);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-family: var(--font-display);
		font-weight: 700;
	}
	.comment-avatar {
		width: 28px;
		height: 28px;
		font-size: 0.75rem;
	}
	.comment-body,
	.reply-body {
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
		font-size: 0.875rem;
	}

	.comment-gif,
	.reply-gif {
		display: block;
		border-radius: var(--radius-sm);
		margin-top: var(--space-xs);
		object-fit: contain;
	}
	.comment-gif {
		max-width: 200px;
		max-height: 160px;
	}
	.reply-gif {
		max-width: 160px;
		max-height: 120px;
	}

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
		font-size: 0.625rem;
	}
	.reply-username {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
	}
	.comment-text,
	.reply-text {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.4;
	}
	.reply-text {
		font-size: 0.8125rem;
	}

	.heart-btn.heart-pop :global(svg) {
		animation: heart-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes heart-pop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.4);
		}
		100% {
			transform: scale(1);
		}
	}
	.comment.just-posted {
		animation: comment-slide-in 250ms cubic-bezier(0.32, 0.72, 0, 1);
	}
	@keyframes comment-slide-in {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
