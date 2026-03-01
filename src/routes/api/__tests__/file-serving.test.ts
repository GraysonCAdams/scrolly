import { describe, it, expect } from 'vitest';
import { createMockEvent } from '../../../../tests/helpers/request';

// Import route handlers directly — these don't use the DB
const videoMod = await import('../videos/[filename]/+server');
const thumbMod = await import('../thumbnails/[filename]/+server');

// Minimal mock user/group for auth — file-serving routes require locals.user
const mockUser = {
	id: 'test-user',
	username: 'tester',
	phone: '+10000000000',
	groupId: 'test-group'
} as any;

describe('GET /api/videos/[filename]', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/videos/test.mp4',
			params: { filename: 'test.mp4' }
		});
		const response = await videoMod.GET(event);
		expect(response.status).toBe(401);
	});

	it('returns 403 for directory traversal attempt', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/videos/../../../etc/passwd',
			params: { filename: '../../../etc/passwd' },
			user: mockUser
		});

		const response = await videoMod.GET(event);
		expect(response.status).toBe(403);
	});

	it('returns 404 for nonexistent file', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/videos/nonexistent-file.mp4',
			params: { filename: 'nonexistent-file.mp4' },
			user: mockUser
		});

		const response = await videoMod.GET(event);
		expect(response.status).toBe(404);
	});
});

describe('GET /api/thumbnails/[filename]', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/thumbnails/test.jpg',
			params: { filename: 'test.jpg' }
		});
		const response = await thumbMod.GET(event);
		expect(response.status).toBe(401);
	});

	it('returns 403 for directory traversal attempt', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/thumbnails/../../../etc/passwd',
			params: { filename: '../../../etc/passwd' },
			user: mockUser
		});

		const response = await thumbMod.GET(event);
		expect(response.status).toBe(403);
	});

	it('returns 404 for nonexistent file', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/thumbnails/nonexistent.jpg',
			params: { filename: 'nonexistent.jpg' },
			user: mockUser
		});

		const response = await thumbMod.GET(event);
		expect(response.status).toBe(404);
	});
});
