import { fetchUnreadCount } from '$lib/stores/notifications';

export interface Comment {
	id: string;
	text: string;
	gifUrl: string | null;
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

export async function fetchComments(clipId: string): Promise<Comment[]> {
	const res = await fetch(`/api/clips/${clipId}/comments`);
	if (res.ok) {
		const data = await res.json();
		return data.comments;
	}
	return [];
}

export async function postComment(
	clipId: string,
	text: string,
	parentId?: string,
	gifUrl?: string
): Promise<Comment> {
	const body: { text: string; parentId?: string; gifUrl?: string } = { text };
	if (parentId) body.parentId = parentId;
	if (gifUrl) body.gifUrl = gifUrl;

	const res = await fetch(`/api/clips/${clipId}/comments`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) throw new Error('Failed to post comment');
	const data = await res.json();
	return data.comment;
}

export async function deleteComment(clipId: string, commentId: string): Promise<string[]> {
	const res = await fetch(`/api/clips/${clipId}/comments`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ commentId })
	});

	if (!res.ok) throw new Error('Failed to delete comment');
	const data = await res.json();
	return data.deletedIds || [commentId];
}

export async function toggleCommentHeart(
	clipId: string,
	commentId: string
): Promise<{ heartCount: number; hearted: boolean }> {
	const res = await fetch(`/api/clips/${clipId}/comments/${commentId}/heart`, {
		method: 'POST'
	});

	if (!res.ok) throw new Error('Failed to toggle heart');
	const data = await res.json();
	return { heartCount: data.heartCount, hearted: data.hearted };
}

export function markCommentsRead(clipId: string): void {
	for (const type of ['comment', 'reply']) {
		fetch('/api/notifications/mark-read', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ clipId, type })
		})
			.then(() => fetchUnreadCount())
			.catch((err) => console.warn('[mark-comments-read]', err));
	}
	fetch(`/api/clips/${clipId}/comments/viewed`, { method: 'POST' }).catch((err) =>
		console.warn('[mark-comments-viewed]', err)
	);
}
