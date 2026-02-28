import type { RequestHandler } from './$types';
import { resolve } from 'path';
import { statSync, createReadStream } from 'fs';
import { lookup } from 'mrmime';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'videos');

export const GET: RequestHandler = async ({ params, request }) => {
	const filePath = resolve(DATA_DIR, params.filename);

	// Prevent directory traversal
	if (!filePath.startsWith(DATA_DIR)) {
		return new Response('Forbidden', { status: 403 });
	}

	let stat;
	try {
		stat = statSync(filePath);
	} catch {
		return new Response('Not found', { status: 404 });
	}

	const contentType = lookup(filePath) || 'application/octet-stream';
	const rangeHeader = request.headers.get('range');

	if (rangeHeader) {
		const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
		if (match) {
			const start = parseInt(match[1], 10);
			const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
			const chunkSize = end - start + 1;

			const stream = createReadStream(filePath, { start, end });
			const readable = new ReadableStream({
				start(controller) {
					stream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
					stream.on('end', () => controller.close());
					stream.on('error', (err) => controller.error(err));
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

	const stream = createReadStream(filePath);
	const readable = new ReadableStream({
		start(controller) {
			stream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
			stream.on('end', () => controller.close());
			stream.on('error', (err) => controller.error(err));
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
