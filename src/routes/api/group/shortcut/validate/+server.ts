import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withHost, parseBody, isResponse } from '$lib/server/api-utils';
import { validateShortcut } from '$lib/server/shortcut-validator';

export const POST: RequestHandler = withHost(async ({ request, url }, { group }) => {
	const body = await parseBody<{ shortcutUrl: string }>(request);
	if (isResponse(body)) return body;

	const { shortcutUrl } = body;
	if (!shortcutUrl || typeof shortcutUrl !== 'string') {
		return json({ error: 'Shortcut URL is required' }, { status: 400 });
	}

	const appUrl = url.origin;
	const expectedToken = group.shortcutToken ?? '';

	const result = await validateShortcut(shortcutUrl.trim(), appUrl, expectedToken);

	return json(result);
});
