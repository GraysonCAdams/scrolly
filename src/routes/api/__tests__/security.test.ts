import { describe, it, expect, vi } from 'vitest';

// Mock the modules that hooks.server.ts imports
vi.mock('$lib/server/scheduler', () => ({ startScheduler: vi.fn() }));

vi.mock('$lib/server/db', async () => {
	const { createTestDb } = await import('../../../../tests/helpers/db');
	return createTestDb();
});

const { handle } = await import('../../../../src/hooks.server');

function createMockResolveEvent(user: unknown = null, group: unknown = null) {
	const url = new URL('http://localhost/');
	const request = new Request(url.toString());

	return {
		event: {
			request,
			url,
			locals: { user, group },
			route: { id: '/' },
			cookies: {
				get: () => undefined,
				getAll: () => [],
				set: () => {},
				delete: () => {},
				serialize: () => ''
			},
			getClientAddress: () => '127.0.0.1',
			platform: undefined,
			isDataRequest: false,
			isSubRequest: false,
			params: {},
			fetch: globalThis.fetch
		},
		resolve: async () =>
			new Response('<html lang="en"><body>test</body></html>', {
				headers: { 'Content-Type': 'text/html' }
			})
	};
}

describe('Security headers', () => {
	it('sets X-Frame-Options: DENY', async () => {
		const { event, resolve } = createMockResolveEvent();
		const response = await handle({ event: event as never, resolve: resolve as never });
		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
	});

	it('sets X-Content-Type-Options: nosniff', async () => {
		const { event, resolve } = createMockResolveEvent();
		const response = await handle({ event: event as never, resolve: resolve as never });
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
	});

	it('sets Content-Security-Policy', async () => {
		const { event, resolve } = createMockResolveEvent();
		const response = await handle({ event: event as never, resolve: resolve as never });
		const csp = response.headers.get('Content-Security-Policy');
		expect(csp).toContain("default-src 'self'");
		expect(csp).toContain("frame-ancestors 'none'");
	});

	it('sets Referrer-Policy', async () => {
		const { event, resolve } = createMockResolveEvent();
		const response = await handle({ event: event as never, resolve: resolve as never });
		expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
	});

	it('sets Permissions-Policy denying camera, microphone, geolocation', async () => {
		const { event, resolve } = createMockResolveEvent();
		const response = await handle({ event: event as never, resolve: resolve as never });
		const pp = response.headers.get('Permissions-Policy');
		expect(pp).toContain('camera=()');
		expect(pp).toContain('microphone=()');
		expect(pp).toContain('geolocation=()');
	});
});
