import type { RequestHandler } from './$types';

const startedAt = Date.now();

export const GET: RequestHandler = async () => {
	const uptime = Math.floor((Date.now() - startedAt) / 1000);

	return new Response(
		JSON.stringify({
			status: 'ok',
			version: __APP_VERSION__,
			uptime
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
