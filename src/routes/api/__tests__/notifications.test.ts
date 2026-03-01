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

const notifMod = await import('../notifications/+server');
const markReadMod = await import('../notifications/mark-read/+server');
const unreadCountMod = await import('../notifications/unread-count/+server');
const prefsMod = await import('../notifications/preferences/+server');

describe('GET /api/notifications', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/notifications'
		});
		const response = await notifMod.GET(event);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Not authenticated');
	});

	it('returns empty array when no notifications', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/notifications',
			searchParams: { limit: '10', offset: '0' },
			user: data.host,
			group: data.group
		});
		const response = await notifMod.GET(event);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.notifications).toEqual([]);
	});
});

describe('POST /api/notifications/mark-read', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/notifications/mark-read',
			body: { all: true }
		});
		const response = await markReadMod.POST(event);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Not authenticated');
	});

	it('responds successfully with { all: true }', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/notifications/mark-read',
			body: { all: true },
			user: data.host,
			group: data.group
		});
		const response = await markReadMod.POST(event);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.ok).toBe(true);
	});
});

describe('GET /api/notifications/unread-count', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/notifications/unread-count'
		});
		const response = await unreadCountMod.GET(event);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Not authenticated');
	});

	it('returns { count: 0 } when no unread notifications', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/notifications/unread-count',
			user: data.host,
			group: data.group
		});
		const response = await unreadCountMod.GET(event);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.count).toBe(0);
	});
});

describe('GET /api/notifications/preferences', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/notifications/preferences'
		});
		const response = await prefsMod.GET(event);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Not authenticated');
	});

	it('returns default preferences', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/notifications/preferences',
			user: data.host,
			group: data.group
		});
		const response = await prefsMod.GET(event);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({
			newAdds: true,
			reactions: true,
			comments: true,
			mentions: true,
			dailyReminder: false
		});
	});
});

describe('PATCH /api/notifications/preferences', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/notifications/preferences',
			body: { dailyReminder: true }
		});
		const response = await prefsMod.PATCH(event);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Not authenticated');
	});

	it('updates individual preference keys', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/notifications/preferences',
			body: { dailyReminder: true },
			user: data.host,
			group: data.group
		});
		const response = await prefsMod.PATCH(event);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.dailyReminder).toBe(true);
		expect(body.newAdds).toBe(true);
		expect(body.reactions).toBe(true);
		expect(body.comments).toBe(true);
	});
});
