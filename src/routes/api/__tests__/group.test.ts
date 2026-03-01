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

// Import route handlers after mocks are established
const membersMod = await import('../group/members/+server');
const memberDeleteMod = await import('../group/members/[userId]/+server');
const nameMod = await import('../group/name/+server');
const accentMod = await import('../group/accent/+server');
const inviteCodeMod = await import('../group/invite-code/regenerate/+server');
const retentionMod = await import('../group/retention/+server');
const statsMod = await import('../group/stats/+server');

// ---------------------------------------------------------------------------
// GET /api/group/members
// ---------------------------------------------------------------------------
describe('GET /api/group/members', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/group/members'
		});

		const res = await membersMod.GET(event);
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns active members with isHost flag', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/group/members',
			user: data.host,
			group: data.group
		});

		const res = await membersMod.GET(event);
		expect(res.status).toBe(200);

		const members = await res.json();
		expect(Array.isArray(members)).toBe(true);
		expect(members.length).toBeGreaterThanOrEqual(2);

		const hostEntry = members.find((m: { id: string }) => m.id === data.host.id);
		expect(hostEntry).toBeDefined();
		expect(hostEntry.isHost).toBe(true);
		expect(hostEntry.username).toBe('hostuser');

		const memberEntry = members.find((m: { id: string }) => m.id === data.member.id);
		expect(memberEntry).toBeDefined();
		expect(memberEntry.isHost).toBe(false);

		// Should NOT include users from other groups
		const outsider = members.find((m: { id: string }) => m.id === data.otherUser.id);
		expect(outsider).toBeUndefined();
	});

	it('returns members when called by a regular member', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/group/members',
			user: data.member,
			group: data.group
		});

		const res = await membersMod.GET(event);
		expect(res.status).toBe(200);

		const members = await res.json();
		expect(members.length).toBeGreaterThanOrEqual(2);
	});
});

// ---------------------------------------------------------------------------
// DELETE /api/group/members/[userId]
// ---------------------------------------------------------------------------
describe('DELETE /api/group/members/[userId]', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'DELETE',
			path: '/api/group/members/some-id',
			params: { userId: 'some-id' }
		});

		const res = await memberDeleteMod.DELETE(event);
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns 403 when non-host tries to remove a member', async () => {
		const event = createMockEvent({
			method: 'DELETE',
			path: `/api/group/members/${data.host.id}`,
			params: { userId: data.host.id },
			user: data.member,
			group: data.group
		});

		const res = await memberDeleteMod.DELETE(event);
		expect(res.status).toBe(403);

		const body = await res.json();
		expect(body.error).toContain('host');
	});

	it('returns 400 when host tries to remove themselves', async () => {
		const event = createMockEvent({
			method: 'DELETE',
			path: `/api/group/members/${data.host.id}`,
			params: { userId: data.host.id },
			user: data.host,
			group: data.group
		});

		const res = await memberDeleteMod.DELETE(event);
		expect(res.status).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('yourself');
	});

	it('returns 404 for user not in this group', async () => {
		const event = createMockEvent({
			method: 'DELETE',
			path: `/api/group/members/${data.otherUser.id}`,
			params: { userId: data.otherUser.id },
			user: data.host,
			group: data.group
		});

		const res = await memberDeleteMod.DELETE(event);
		expect(res.status).toBe(404);

		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns 404 for nonexistent user', async () => {
		const event = createMockEvent({
			method: 'DELETE',
			path: '/api/group/members/nonexistent-id',
			params: { userId: 'nonexistent-id' },
			user: data.host,
			group: data.group
		});

		const res = await memberDeleteMod.DELETE(event);
		expect(res.status).toBe(404);
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/group/name
// ---------------------------------------------------------------------------
describe('PATCH /api/group/name', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/name',
			body: { name: 'New Name' }
		});

		const res = await nameMod.PATCH(event);
		expect(res.status).toBe(401);
	});

	it('returns 403 when non-host tries to rename', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/name',
			body: { name: 'Hijacked Name' },
			user: data.member,
			group: data.group
		});

		const res = await nameMod.PATCH(event);
		expect(res.status).toBe(403);

		const body = await res.json();
		expect(body.error).toContain('host');
	});

	it('returns 400 for empty name', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/name',
			body: { name: '' },
			user: data.host,
			group: data.group
		});

		const res = await nameMod.PATCH(event);
		expect(res.status).toBe(400);

		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns 400 for whitespace-only name', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/name',
			body: { name: '   ' },
			user: data.host,
			group: data.group
		});

		const res = await nameMod.PATCH(event);
		expect(res.status).toBe(400);
	});

	it('returns 400 for name exceeding 50 characters', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/name',
			body: { name: 'A'.repeat(51) },
			user: data.host,
			group: data.group
		});

		const res = await nameMod.PATCH(event);
		expect(res.status).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('1-50');
	});

	it('updates group name when host provides valid name', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/name',
			body: { name: 'Renamed Group' },
			user: data.host,
			group: data.group
		});

		const res = await nameMod.PATCH(event);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.name).toBe('Renamed Group');
	});

	it('trims whitespace from the name', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/name',
			body: { name: '  Padded Name  ' },
			user: data.host,
			group: data.group
		});

		const res = await nameMod.PATCH(event);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.name).toBe('Padded Name');
	});

	it('accepts name at exactly 50 characters', async () => {
		const name50 = 'A'.repeat(50);
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/name',
			body: { name: name50 },
			user: data.host,
			group: data.group
		});

		const res = await nameMod.PATCH(event);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.name).toBe(name50);
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/group/accent
// ---------------------------------------------------------------------------
describe('PATCH /api/group/accent', () => {
	it('returns 403 for non-host', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/accent',
			body: { accentColor: 'violet' },
			user: data.member,
			group: data.group
		});

		const res = await accentMod.PATCH(event);
		expect(res.status).toBe(403);

		const body = await res.json();
		expect(body.error).toContain('host');
	});

	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/accent',
			body: { accentColor: 'violet' }
		});

		const res = await accentMod.PATCH(event);
		expect(res.status).toBe(401);
	});

	it('returns 400 for invalid accent color key', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/accent',
			body: { accentColor: 'nope' },
			user: data.host,
			group: data.group
		});

		const res = await accentMod.PATCH(event);
		expect(res.status).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('Invalid');
	});

	it('returns 400 when accentColor is missing', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/accent',
			body: {},
			user: data.host,
			group: data.group
		});

		const res = await accentMod.PATCH(event);
		expect(res.status).toBe(400);
	});

	it('updates accent color for valid key', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/accent',
			body: { accentColor: 'violet' },
			user: data.host,
			group: data.group
		});

		const res = await accentMod.PATCH(event);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.accentColor).toBe('violet');
	});

	it('accepts all valid accent color keys', async () => {
		const validKeys = ['coral', 'violet', 'cyan', 'rose', 'gold', 'mint', 'sky', 'lime'];

		for (const key of validKeys) {
			const event = createMockEvent({
				method: 'PATCH',
				path: '/api/group/accent',
				body: { accentColor: key },
				user: data.host,
				group: data.group
			});

			const res = await accentMod.PATCH(event);
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.accentColor).toBe(key);
		}
	});
});

// ---------------------------------------------------------------------------
// POST /api/group/invite-code/regenerate
// ---------------------------------------------------------------------------
describe('POST /api/group/invite-code/regenerate', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/group/invite-code/regenerate'
		});

		const res = await inviteCodeMod.POST(event);
		expect(res.status).toBe(401);
	});

	it('returns 403 for non-host', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/group/invite-code/regenerate',
			user: data.member,
			group: data.group
		});

		const res = await inviteCodeMod.POST(event);
		expect(res.status).toBe(403);

		const body = await res.json();
		expect(body.error).toContain('host');
	});

	it('generates new invite code for host', async () => {
		const event = createMockEvent({
			method: 'POST',
			path: '/api/group/invite-code/regenerate',
			user: data.host,
			group: data.group
		});

		const res = await inviteCodeMod.POST(event);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.inviteCode).toBeDefined();
		expect(typeof body.inviteCode).toBe('string');
		expect(body.inviteCode.length).toBeGreaterThan(0);
	});

	it('generates a different code each time', async () => {
		const event1 = createMockEvent({
			method: 'POST',
			path: '/api/group/invite-code/regenerate',
			user: data.host,
			group: data.group
		});
		const res1 = await inviteCodeMod.POST(event1);
		const body1 = await res1.json();

		const event2 = createMockEvent({
			method: 'POST',
			path: '/api/group/invite-code/regenerate',
			user: data.host,
			group: data.group
		});
		const res2 = await inviteCodeMod.POST(event2);
		const body2 = await res2.json();

		expect(body1.inviteCode).not.toBe(body2.inviteCode);
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/group/retention
// ---------------------------------------------------------------------------
describe('PATCH /api/group/retention', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/retention',
			body: { retentionDays: 30 }
		});

		const res = await retentionMod.PATCH(event);
		expect(res.status).toBe(401);
	});

	it('returns 403 for non-host', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/retention',
			body: { retentionDays: 30 },
			user: data.member,
			group: data.group
		});

		const res = await retentionMod.PATCH(event);
		expect(res.status).toBe(403);

		const body = await res.json();
		expect(body.error).toContain('host');
	});

	it('returns 400 for invalid retention value', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/retention',
			body: { retentionDays: 5 },
			user: data.host,
			group: data.group
		});

		const res = await retentionMod.PATCH(event);
		expect(res.status).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('Invalid');
	});

	it('returns 400 for negative retention value', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/retention',
			body: { retentionDays: -1 },
			user: data.host,
			group: data.group
		});

		const res = await retentionMod.PATCH(event);
		expect(res.status).toBe(400);
	});

	it('returns 400 for string retention value', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/retention',
			body: { retentionDays: 'forever' },
			user: data.host,
			group: data.group
		});

		const res = await retentionMod.PATCH(event);
		expect(res.status).toBe(400);
	});

	it('updates retention for valid value (30)', async () => {
		const event = createMockEvent({
			method: 'PATCH',
			path: '/api/group/retention',
			body: { retentionDays: 30 },
			user: data.host,
			group: data.group
		});

		const res = await retentionMod.PATCH(event);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.retentionDays).toBe(30);
	});

	it('accepts all valid retention values', async () => {
		const validValues = [null, 7, 14, 30, 60, 90];

		for (const val of validValues) {
			const event = createMockEvent({
				method: 'PATCH',
				path: '/api/group/retention',
				body: { retentionDays: val },
				user: data.host,
				group: data.group
			});

			const res = await retentionMod.PATCH(event);
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.retentionDays).toBe(val);
		}
	});
});

// ---------------------------------------------------------------------------
// GET /api/group/stats
// ---------------------------------------------------------------------------
describe('GET /api/group/stats', () => {
	it('returns 401 without auth', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/group/stats'
		});

		const res = await statsMod.GET(event);
		expect(res.status).toBe(401);

		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it('returns stats with clipCount and memberCount', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/group/stats',
			user: data.host,
			group: data.group
		});

		const res = await statsMod.GET(event);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(typeof body.clipCount).toBe('number');
		expect(typeof body.memberCount).toBe('number');
		expect(typeof body.storageMb).toBe('number');
		expect(body.clipCount).toBeGreaterThanOrEqual(2); // seed creates 2 clips
		expect(body.memberCount).toBeGreaterThanOrEqual(2); // host + member
	});

	it('returns stats when called by a regular member', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/group/stats',
			user: data.member,
			group: data.group
		});

		const res = await statsMod.GET(event);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.clipCount).toBeDefined();
		expect(body.memberCount).toBeDefined();
	});

	it('includes storageMb and maxStorageMb in response', async () => {
		const event = createMockEvent({
			method: 'GET',
			path: '/api/group/stats',
			user: data.host,
			group: data.group
		});

		const res = await statsMod.GET(event);
		const body = await res.json();

		expect('storageMb' in body).toBe(true);
		expect('maxStorageMb' in body).toBe(true);
	});
});
