import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { watched } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	// Parse optional watchPercent from body
	let watchPercent: number | null = null;
	try {
		const body = await request.json();
		if (typeof body.watchPercent === 'number') {
			watchPercent = Math.max(0, Math.min(100, Math.round(body.watchPercent)));
		}
	} catch {
		// No body or invalid JSON — backward compatible with no-body calls
	}

	await db
		.insert(watched)
		.values({
			clipId: params.id,
			userId: locals.user.id,
			watchPercent,
			watchedAt: new Date()
		})
		.onConflictDoUpdate({
			target: [watched.clipId, watched.userId],
			set: {
				watchPercent:
					watchPercent === null
						? watched.watchPercent
						: sql`MAX(COALESCE(${watched.watchPercent}, 0), ${watchPercent})`,
				watchedAt: new Date()
			}
		});

	return json({ watched: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	await db
		.delete(watched)
		.where(and(eq(watched.clipId, params.id), eq(watched.userId, locals.user.id)));

	return json({ watched: false });
};
