import type { RequestHandler } from './$types';
import { resolve } from 'path';
import { statSync, createReadStream } from 'fs';
import { lookup } from 'mrmime';
import { unauthorized, forbidden, notFound } from '$lib/server/api-utils';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'videos');

export const GET: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return unauthorized();
	}

	const filePath = resolve(DATA_DIR, params.filename);

	// Prevent directory traversal
	if (!filePath.startsWith(DATA_DIR)) {
		return forbidden();
	}

	let stat;
	try {
		stat = statSync(filePath); // eslint-disable-line security/detect-non-literal-fs-filename
	} catch {
		return notFound();
	}

	const contentType = lookup(filePath) || 'application/octet-stream';
	const rangeHeader = request.headers.get('range');

	if (rangeHeader) {
		const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
		if (match) {
			const start = parseInt(match[1], 10);
			const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
			const chunkSize = end - start + 1;

			const stream = createReadStream(filePath, { start, end }); // eslint-disable-line security/detect-non-literal-fs-filename
			let cancelled = false;
			const readable = new ReadableStream({
				start(controller) {
					stream.on('data', (chunk: Buffer) => {
						if (!cancelled) controller.enqueue(chunk);
					});
					stream.on('end', () => {
						if (!cancelled) controller.close();
					});
					stream.on('error', (err) => {
						if (!cancelled) controller.error(err);
					});
				},
				cancel() {
					cancelled = true;
					stream.destroy();
				}
			});

			return new Response(readable, {
				status: 206,
				headers: {
					'Content-Type': contentType,
					'Content-Range': `bytes ${start}-${end}/${stat.size}`,
					'Content-Length': String(chunkSize),
					'Accept-Ranges': 'bytes'
				}
			});
		}
	}

	const stream = createReadStream(filePath); // eslint-disable-line security/detect-non-literal-fs-filename
	let cancelled = false;
	const readable = new ReadableStream({
		start(controller) {
			stream.on('data', (chunk: Buffer) => {
				if (!cancelled) controller.enqueue(chunk);
			});
			stream.on('end', () => {
				if (!cancelled) controller.close();
			});
			stream.on('error', (err) => {
				if (!cancelled) controller.error(err);
			});
		},
		cancel() {
			cancelled = true;
			stream.destroy();
		}
	});

	return new Response(readable, {
		headers: {
			'Content-Type': contentType,
			'Content-Length': String(stat.size),
			'Accept-Ranges': 'bytes'
		}
	});
};
