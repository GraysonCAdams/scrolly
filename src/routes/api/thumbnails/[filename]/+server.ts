import type { RequestHandler } from './$types';
import { resolve } from 'path';
import { readFileSync, statSync } from 'fs';
import { unauthorized, forbidden, notFound } from '$lib/server/api-utils';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'videos');

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return unauthorized();
	}

	const filePath = resolve(DATA_DIR, params.filename);

	// Prevent directory traversal
	if (!filePath.startsWith(DATA_DIR)) {
		return forbidden();
	}

	try {
		statSync(filePath); // eslint-disable-line security/detect-non-literal-fs-filename
	} catch {
		return notFound();
	}

	const data = readFileSync(filePath); // eslint-disable-line security/detect-non-literal-fs-filename
	return new Response(data, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
