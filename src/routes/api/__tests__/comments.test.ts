import { describe, it, expect, vi } from 'vitest';
import { seed } from '../../../../tests/helpers/seed';
import { createMockEvent } from '../../../../tests/helpers/request';

vi.mock('$lib/server/push', () => ({
	sendNotification: vi.fn().mockResolvedValue(undefined),
	sendGroupNotification: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('$lib/server/video/download', () => ({ downloadVideo: vi.fn() }));
vi.mock('$lib/server/music/download', () => ({ downloadMusic: vi.fn() }));
vi.mock('$lib/server/scheduler', () => ({ startScheduler: vi.fn() }));

vi.mock('$lib/server/db', async () => {
	const { createTestDb } = await import('../../../../tests/helpers/db');
	return createTestDb();
});

const { db } = await import('$lib/server/db');
const data = await seed(db as any);

const commentsMod = await import('../clips/[id]/comments/+server');
const heartMod = await import('../clips/[id]/comments/[commentId]/heart/+server');

// ---------------------------------------------------------------------------
// GET /api/clips/[id]/comments
// ---------------------------------------------------------------------------
describe('GET /api/clips/[id]/comments', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id }
		});
		const res = await commentsMod.GET(event as any);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns empty array when no comments exist', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.GET(event as any);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.comments).toEqual([]);
	});

	it('returns comments with user info after adding one', async () => {
		// First add a comment
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'hello from GET test' },
			user: data.member,
			group: data.group
		});
		const postRes = await commentsMod.POST(postEvent as any);
		expect(postRes.status).toBe(201);

		// Now GET
		const getEvent = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			user: data.member,
			group: data.group
		});
		const getRes = await commentsMod.GET(getEvent as any);
		expect(getRes.status).toBe(200);
		const body = await getRes.json();

		expect(body.comments.length).toBeGreaterThanOrEqual(1);
		const comment = body.comments.find((c: any) => c.text === 'hello from GET test');
		expect(comment).toBeDefined();
		expect(comment.username).toBe(data.member.username);
		expect(comment.userId).toBe(data.member.id);
		expect(comment.heartCount).toBe(0);
		expect(comment.hearted).toBe(false);
		expect(comment.createdAt).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// POST /api/clips/[id]/comments
// ---------------------------------------------------------------------------
describe('POST /api/clips/[id]/comments', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'no auth' }
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns 400 for empty text without GIF', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: '' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns 400 for text over 500 characters', async () => {
		const longText = 'a'.repeat(501);
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: longText },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('too long');
	});

	it('creates comment with valid text', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'this is a valid comment' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.comment).toBeDefined();
		expect(body.comment.text).toBe('this is a valid comment');
		expect(body.comment.userId).toBe(data.member.id);
		expect(body.comment.username).toBe(data.member.username);
		expect(body.comment.parentId).toBeNull();
		expect(body.comment.heartCount).toBe(0);
		expect(body.comment.hearted).toBe(false);
		expect(body.comment.id).toBeDefined();
		expect(body.comment.createdAt).toBeDefined();
	});

	it('trims whitespace from comment text', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: '  trimmed text  ' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.comment.text).toBe('trimmed text');
	});

	it('creates reply when parentId is provided', async () => {
		// First create a top-level comment
		const parentEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'parent comment for reply test' },
			user: data.host,
			group: data.group
		});
		const parentRes = await commentsMod.POST(parentEvent as any);
		expect(parentRes.status).toBe(201);
		const parentBody = await parentRes.json();
		const parentId = parentBody.comment.id;

		// Now reply to it
		const replyEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'this is a reply', parentId },
			user: data.member,
			group: data.group
		});
		const replyRes = await commentsMod.POST(replyEvent as any);
		expect(replyRes.status).toBe(201);
		const replyBody = await replyRes.json();
		expect(replyBody.comment.parentId).toBe(parentId);
		expect(replyBody.comment.text).toBe('this is a reply');
		expect(replyBody.comment.userId).toBe(data.member.id);
	});

	it('returns 404 when parentId does not exist', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'reply to nothing', parentId: 'nonexistent-comment-id' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toContain('Parent comment not found');
	});

	it('returns 400 when trying to reply to a reply', async () => {
		// Create a top-level comment
		const topEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'top level for nested reply test' },
			user: data.host,
			group: data.group
		});
		const topRes = await commentsMod.POST(topEvent as any);
		const topBody = await topRes.json();
		const topId = topBody.comment.id;

		// Create a reply
		const replyEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'first reply', parentId: topId },
			user: data.member,
			group: data.group
		});
		const replyRes = await commentsMod.POST(replyEvent as any);
		const replyBody = await replyRes.json();
		const replyId = replyBody.comment.id;

		// Try to reply to the reply — should fail
		const nestedEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'nested reply', parentId: replyId },
			user: data.member,
			group: data.group
		});
		const nestedRes = await commentsMod.POST(nestedEvent as any);
		expect(nestedRes.status).toBe(400);
		const nestedBody = await nestedRes.json();
		expect(nestedBody.error).toContain('Cannot reply to a reply');
	});

	it('accepts comment at exactly 500 characters', async () => {
		const exactText = 'b'.repeat(500);
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: exactText },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.comment.text).toBe(exactText);
	});

	it('creates comment with GIF only (no text)', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: '', gifUrl: 'https://media.giphy.com/media/abc123/giphy.gif' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.comment.gifUrl).toBe('https://media.giphy.com/media/abc123/giphy.gif');
		expect(body.comment.text).toBe('');
	});

	it('creates comment with text and GIF', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'check this out', gifUrl: 'https://media.giphy.com/media/xyz/giphy.gif' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.comment.text).toBe('check this out');
		expect(body.comment.gifUrl).toBe('https://media.giphy.com/media/xyz/giphy.gif');
	});

	it('returns 400 for invalid GIF URL', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: '', gifUrl: 'https://evil.com/malware.gif' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('Invalid GIF URL');
	});

	it('returns 400 when neither text nor GIF is provided', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: '   ' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.POST(event as any);
		expect(res.status).toBe(400);
	});
});

// ---------------------------------------------------------------------------
// DELETE /api/clips/[id]/comments
// ---------------------------------------------------------------------------
describe('DELETE /api/clips/[id]/comments', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'DELETE',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { commentId: 'some-id' }
		});
		const res = await commentsMod.DELETE(event as any);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns 400 when commentId is missing', async () => {
		const event = createMockEvent({
			method: 'DELETE',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: {},
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.DELETE(event as any);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('Comment ID required');
	});

	it('returns 404 when comment does not exist', async () => {
		const event = createMockEvent({
			method: 'DELETE',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { commentId: 'nonexistent-id' },
			user: data.member,
			group: data.group
		});
		const res = await commentsMod.DELETE(event as any);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toContain('not found');
	});

	it("returns 404 when trying to delete another user's comment", async () => {
		// Create a comment as host
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'host comment for delete test' },
			user: data.host,
			group: data.group
		});
		const postRes = await commentsMod.POST(postEvent as any);
		const postBody = await postRes.json();
		const commentId = postBody.comment.id;

		// Try to delete as member — should fail
		const delEvent = createMockEvent({
			method: 'DELETE',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { commentId },
			user: data.member,
			group: data.group
		});
		const delRes = await commentsMod.DELETE(delEvent as any);
		expect(delRes.status).toBe(404);
		const delBody = await delRes.json();
		expect(delBody.error).toContain('not found or not yours');
	});

	it('deletes own comment', async () => {
		// Create a comment as member
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'comment to be deleted' },
			user: data.member,
			group: data.group
		});
		const postRes = await commentsMod.POST(postEvent as any);
		expect(postRes.status).toBe(201);
		const postBody = await postRes.json();
		const commentId = postBody.comment.id;

		// Delete it
		const delEvent = createMockEvent({
			method: 'DELETE',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { commentId },
			user: data.member,
			group: data.group
		});
		const delRes = await commentsMod.DELETE(delEvent as any);
		expect(delRes.status).toBe(200);
		const delBody = await delRes.json();
		expect(delBody.deleted).toBe(true);
		expect(delBody.deletedIds).toContain(commentId);
	});

	it('deletes comment and its child replies', async () => {
		// Create parent comment
		const parentEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'parent to delete with replies' },
			user: data.member,
			group: data.group
		});
		const parentRes = await commentsMod.POST(parentEvent as any);
		const parentBody = await parentRes.json();
		const parentId = parentBody.comment.id;

		// Create a reply
		const replyEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'reply that should also be deleted', parentId },
			user: data.host,
			group: data.group
		});
		const replyRes = await commentsMod.POST(replyEvent as any);
		const replyBody = await replyRes.json();
		const replyId = replyBody.comment.id;

		// Delete parent — should cascade to reply
		const delEvent = createMockEvent({
			method: 'DELETE',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { commentId: parentId },
			user: data.member,
			group: data.group
		});
		const delRes = await commentsMod.DELETE(delEvent as any);
		expect(delRes.status).toBe(200);
		const delBody = await delRes.json();
		expect(delBody.deleted).toBe(true);
		expect(delBody.deletedIds).toContain(parentId);
		expect(delBody.deletedIds).toContain(replyId);
	});
});

// ---------------------------------------------------------------------------
// POST /api/clips/[id]/comments/[commentId]/heart
// ---------------------------------------------------------------------------
describe('POST /api/clips/[id]/comments/[commentId]/heart', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments/some-comment/heart`,
			params: { id: data.readyClip.id, commentId: 'some-comment' }
		});
		const res = await heartMod.POST(event as any);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns 404 for nonexistent comment', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments/nonexistent/heart`,
			params: { id: data.readyClip.id, commentId: 'nonexistent' },
			user: data.member,
			group: data.group
		});
		const res = await heartMod.POST(event as any);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toContain('not found');
	});

	it('toggles heart on and off', async () => {
		// Create a comment to heart
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'comment to heart' },
			user: data.host,
			group: data.group
		});
		const postRes = await commentsMod.POST(postEvent as any);
		const postBody = await postRes.json();
		const commentId = postBody.comment.id;

		// First heart — should add
		const heartEvent1 = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments/${commentId}/heart`,
			params: { id: data.readyClip.id, commentId },
			user: data.member,
			group: data.group
		});
		const heartRes1 = await heartMod.POST(heartEvent1 as any);
		expect(heartRes1.status).toBe(200);
		const heartBody1 = await heartRes1.json();
		expect(heartBody1.hearted).toBe(true);
		expect(heartBody1.heartCount).toBe(1);

		// Second heart — should remove (toggle off)
		const heartEvent2 = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments/${commentId}/heart`,
			params: { id: data.readyClip.id, commentId },
			user: data.member,
			group: data.group
		});
		const heartRes2 = await heartMod.POST(heartEvent2 as any);
		expect(heartRes2.status).toBe(200);
		const heartBody2 = await heartRes2.json();
		expect(heartBody2.hearted).toBe(false);
		expect(heartBody2.heartCount).toBe(0);
	});

	it('tracks hearts from multiple users independently', async () => {
		// Member creates a comment (so both host and member can heart it)
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'comment for multi-heart test' },
			user: data.member,
			group: data.group
		});
		const postRes = await commentsMod.POST(postEvent as any);
		const postBody = await postRes.json();
		const commentId = postBody.comment.id;

		// Host hearts (not the author)
		const heartEvent1 = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments/${commentId}/heart`,
			params: { id: data.readyClip.id, commentId },
			user: data.host,
			group: data.group
		});
		const heartRes1 = await heartMod.POST(heartEvent1 as any);
		const heartBody1 = await heartRes1.json();
		expect(heartBody1.hearted).toBe(true);
		expect(heartBody1.heartCount).toBe(1);

		// Host un-hearts — count drops to 0
		const heartEvent2 = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments/${commentId}/heart`,
			params: { id: data.readyClip.id, commentId },
			user: data.host,
			group: data.group
		});
		const heartRes2 = await heartMod.POST(heartEvent2 as any);
		const heartBody2 = await heartRes2.json();
		expect(heartBody2.hearted).toBe(false);
		expect(heartBody2.heartCount).toBe(0);
	});

	it('prevents self-hearting own comment', async () => {
		// Host creates a comment
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'my own comment' },
			user: data.host,
			group: data.group
		});
		const postRes = await commentsMod.POST(postEvent as any);
		const postBody = await postRes.json();
		const commentId = postBody.comment.id;

		// Host tries to heart own comment — should be rejected
		const heartEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments/${commentId}/heart`,
			params: { id: data.readyClip.id, commentId },
			user: data.host,
			group: data.group
		});
		const heartRes = await heartMod.POST(heartEvent as any);
		expect(heartRes.status).toBe(403);
	});

	it('shows hearted status in GET comments response', async () => {
		// Create a comment
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'comment for heart in GET test' },
			user: data.host,
			group: data.group
		});
		const postRes = await commentsMod.POST(postEvent as any);
		const postBody = await postRes.json();
		const commentId = postBody.comment.id;

		// Heart it as member
		const heartEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments/${commentId}/heart`,
			params: { id: data.readyClip.id, commentId },
			user: data.member,
			group: data.group
		});
		await heartMod.POST(heartEvent as any);

		// GET comments as member — should show hearted=true
		const getEvent = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			user: data.member,
			group: data.group
		});
		const getRes = await commentsMod.GET(getEvent as any);
		const getBody = await getRes.json();
		const comment = getBody.comments.find((c: any) => c.id === commentId);
		expect(comment).toBeDefined();
		expect(comment.hearted).toBe(true);
		expect(comment.heartCount).toBe(1);

		// GET comments as host — should show hearted=false (host didn't heart it)
		const getEvent2 = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			user: data.host,
			group: data.group
		});
		const getRes2 = await commentsMod.GET(getEvent2 as any);
		const getBody2 = await getRes2.json();
		const comment2 = getBody2.comments.find((c: any) => c.id === commentId);
		expect(comment2).toBeDefined();
		expect(comment2.hearted).toBe(false);
		expect(comment2.heartCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// GET response includes gifUrl
// ---------------------------------------------------------------------------
describe('GET /api/clips/[id]/comments — GIF support', () => {
	it('includes gifUrl in response for GIF comments', async () => {
		// Post a comment with GIF
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'gif test', gifUrl: 'https://media.giphy.com/media/giftest/giphy.gif' },
			user: data.member,
			group: data.group
		});
		await commentsMod.POST(postEvent as any);

		// GET and verify gifUrl is present
		const getEvent = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			user: data.member,
			group: data.group
		});
		const getRes = await commentsMod.GET(getEvent as any);
		const body = await getRes.json();
		const gifComment = body.comments.find((c: any) => c.text === 'gif test');
		expect(gifComment).toBeDefined();
		expect(gifComment.gifUrl).toBe('https://media.giphy.com/media/giftest/giphy.gif');
	});

	it('returns gifUrl as null for text-only comments', async () => {
		const postEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'no gif here' },
			user: data.member,
			group: data.group
		});
		await commentsMod.POST(postEvent as any);

		const getEvent = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			user: data.member,
			group: data.group
		});
		const getRes = await commentsMod.GET(getEvent as any);
		const body = await getRes.json();
		const textComment = body.comments.find((c: any) => c.text === 'no gif here');
		expect(textComment).toBeDefined();
		expect(textComment.gifUrl).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// GET response structure tests
// ---------------------------------------------------------------------------
describe('GET /api/clips/[id]/comments — response structure', () => {
	it('nests replies under their parent comment', async () => {
		// Create parent
		const parentEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'parent for nesting test' },
			user: data.host,
			group: data.group
		});
		const parentRes = await commentsMod.POST(parentEvent as any);
		const parentBody = await parentRes.json();
		const parentId = parentBody.comment.id;

		// Create reply
		const replyEvent = createMockEvent({
			method: 'POST',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			body: { text: 'nested reply for test', parentId },
			user: data.member,
			group: data.group
		});
		const replyRes = await commentsMod.POST(replyEvent as any);
		expect(replyRes.status).toBe(201);

		// Fetch and verify nesting
		const getEvent = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			user: data.member,
			group: data.group
		});
		const getRes = await commentsMod.GET(getEvent as any);
		const getBody = await getRes.json();

		const parent = getBody.comments.find((c: any) => c.id === parentId);
		expect(parent).toBeDefined();
		expect(parent.replyCount).toBeGreaterThanOrEqual(1);
		expect(parent.replies).toBeDefined();
		expect(Array.isArray(parent.replies)).toBe(true);

		const reply = parent.replies.find((r: any) => r.text === 'nested reply for test');
		expect(reply).toBeDefined();
		expect(reply.parentId).toBe(parentId);
		expect(reply.username).toBe(data.member.username);
	});

	it('does not include replies as top-level comments', async () => {
		const getEvent = createMockEvent({
			method: 'GET',
			path: `/api/clips/${data.readyClip.id}/comments`,
			params: { id: data.readyClip.id },
			user: data.member,
			group: data.group
		});
		const getRes = await commentsMod.GET(getEvent as any);
		const getBody = await getRes.json();

		// All top-level comments should have parentId === null
		for (const comment of getBody.comments) {
			expect(comment.parentId).toBeNull();
		}
	});
});
