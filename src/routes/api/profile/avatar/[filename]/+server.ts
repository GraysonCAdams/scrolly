import type { RequestHandler } from './$types';
import { resolve } from 'path';
import { readFileSync, statSync } from 'fs';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'avatars');

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const filePath = resolve(DATA_DIR, params.filename);

	// Prevent directory traversal
	if (!filePath.startsWith(DATA_DIR)) {
		return new Response('Forbidden', { status: 403 });
	}

	try {
		statSync(filePath); // eslint-disable-line security/detect-non-literal-fs-filename
	} catch {
		return new Response('Not found', { status: 404 });
	}

	const data = readFileSync(filePath); // eslint-disable-line security/detect-non-literal-fs-filename
	return new Response(data, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
