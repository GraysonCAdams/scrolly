import { describe, it, expect, vi } from 'vitest';
import { seed } from '../../../../tests/helpers/seed';
import { createMockEvent } from '../../../../tests/helpers/request';

vi.mock('$lib/server/sms/verify', () => ({
	sendVerification: vi.fn().mockResolvedValue({ status: 'pending' }),
	checkVerification: vi.fn().mockResolvedValue({ valid: true, status: 'approved' }),
	getAllowedChannels: vi.fn().mockReturnValue(['sms'])
}));
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

const { GET, POST } = await import('../auth/+server');

describe('GET /api/auth', () => {
	it('returns 401 when not authenticated', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/auth',
			user: null
		});

		const response = await GET(event);
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error).toBe('Not authenticated');
	});

	it('returns user and group when authenticated', async () => {
		// Build plain objects to avoid Drizzle circular references in json()
		const user = {
			id: data.host.id,
			username: data.host.username,
			phone: data.host.phone,
			groupId: data.host.groupId,
			themePreference: data.host.themePreference,
			autoScroll: data.host.autoScroll,
			mutedByDefault: data.host.mutedByDefault,
			avatarPath: data.host.avatarPath,
			removedAt: data.host.removedAt,
			createdAt: data.host.createdAt
		};
		const group = {
			id: data.group.id,
			name: data.group.name,
			inviteCode: data.group.inviteCode,
			accentColor: data.group.accentColor,
			createdBy: data.group.createdBy,
			createdAt: data.group.createdAt
		};
		const event = createMockEvent({
			method: 'GET',
			path: '/api/auth',
			user: user as typeof data.host,
			group: group as typeof data.group
		});

		const response = await GET(event);
		const text = await response.text();
		const body = JSON.parse(text);

		expect(response.status).toBe(200);
		expect(body.user.username).toBe('hostuser');
		expect(body.group.name).toBe('Test Group');
	});
});

describe('POST /api/auth { action: "join" }', () => {
	it('returns 400 when invite code is missing', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/auth',
			body: { action: 'join' }
		});

		const response = await POST(event);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBe('Invite code required');
	});

	it('returns 404 for invalid invite code', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/auth',
			body: { action: 'join', inviteCode: 'bad-code' }
		});

		const response = await POST(event);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBe('Invalid invite code');
	});

	it('creates user with valid invite code', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/auth',
			body: { action: 'join', inviteCode: 'test-invite-123' }
		});

		const response = await POST(event);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.userId).toBeDefined();
		expect(body.needsOnboarding).toBe(true);
		expect(body.group.name).toBe('Test Group');
		expect(body.group.inviteCode).toBe('test-invite-123');

		const setCookie = response.headers.get('Set-Cookie');
		expect(setCookie).toBeTruthy();
		expect(setCookie).toContain('scrolly_session=');
	});
});

describe('POST /api/auth { action: "login-send-code" }', () => {
	it('returns 404 for unknown phone number', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/auth',
			body: { action: 'login-send-code', phone: '+19999999999' }
		});

		const response = await POST(event);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBe('No account found with this phone number');
	});

	it('returns 400 for invalid phone format', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/auth',
			body: { action: 'login-send-code', phone: 'notaphone' }
		});

		const response = await POST(event);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toContain('E.164');
	});
});

describe('POST /api/auth { action: "login-verify-code" }', () => {
	it('returns 400 when phone and code are missing', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/auth',
			body: { action: 'login-verify-code' }
		});

		const response = await POST(event);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBe('Phone and code are required');
	});
});

describe('POST /api/auth { action: "invalid" }', () => {
	it('returns 400 for unknown action', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/auth',
			body: { action: 'invalid' }
		});

		const response = await POST(event);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBe('Invalid action');
	});
});
