import type { RequestEvent } from '@sveltejs/kit';
import type { InferSelectModel } from 'drizzle-orm';
import type { users, groups } from '../../src/lib/server/db/schema';

type User = InferSelectModel<typeof users>;
type Group = InferSelectModel<typeof groups>;

interface MockEventOptions {
	method?: string;
	path?: string;
	body?: unknown;
	params?: Record<string, string>;
	searchParams?: Record<string, string>;
	user?: User | null;
	group?: Group | null;
	headers?: Record<string, string>;
}

export function createMockEvent(options: MockEventOptions = {}): RequestEvent {
	const {
		method = 'GET',
		path = '/api/test',
		body,
		params = {},
		searchParams = {},
		user = null,
		group = null,
		headers = {}
	} = options;

	const url = new URL(`http://localhost${path}`);
	for (const [k, v] of Object.entries(searchParams)) {
		url.searchParams.set(k, v);
	}

	const requestInit: RequestInit = { method, headers: new Headers(headers) };
	if (body !== undefined && method !== 'GET') {
		(requestInit.headers as Headers).set('Content-Type', 'application/json');
		requestInit.body = JSON.stringify(body);
	}

	const request = new Request(url.toString(), requestInit);

	return {
		request,
		url,
		params,
		locals: { user, group },
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
		route: { id: path },
		fetch: globalThis.fetch
	} as unknown as RequestEvent;
}
