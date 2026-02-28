import { describe, it, expect } from 'vitest';
import { createMockEvent } from '../../../../tests/helpers/request';

// Import route handlers directly — these don't use the DB
const videoMod = await import('../videos/[filename]/+server');
const thumbMod = await import('../thumbnails/[filename]/+server');

describe('GET /api/videos/[filename]', () => {
	it('returns 403 for directory traversal attempt', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/videos/../../../etc/passwd',
			params: { filename: '../../../etc/passwd' }
		});

		const response = await videoMod.GET(event);
		expect(response.status).toBe(403);
	});

	it('returns 404 for nonexistent file', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/videos/nonexistent-file.mp4',
			params: { filename: 'nonexistent-file.mp4' }
		});

		const response = await videoMod.GET(event);
		expect(response.status).toBe(404);
	});
});

describe('GET /api/thumbnails/[filename]', () => {
	it('returns 403 for directory traversal attempt', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/thumbnails/../../../etc/passwd',
			params: { filename: '../../../etc/passwd' }
		});

		const response = await thumbMod.GET(event);
		expect(response.status).toBe(403);
	});

	it('returns 404 for nonexistent file', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/thumbnails/nonexistent.jpg',
			params: { filename: 'nonexistent.jpg' }
		});

		const response = await thumbMod.GET(event);
		expect(response.status).toBe(404);
	});
});
