import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { commentViews } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const clipId = params.id;
	const userId = locals.user.id;
	const now = new Date();

	// Upsert: insert or update viewedAt
	const existing = await db.query.commentViews.findFirst({
		where: and(eq(commentViews.clipId, clipId), eq(commentViews.userId, userId))
	});

	if (existing) {
		await db
			.update(commentViews)
			.set({ viewedAt: now })
			.where(and(eq(commentViews.clipId, clipId), eq(commentViews.userId, userId)));
	} else {
		await db.insert(commentViews).values({ clipId, userId, viewedAt: now });
	}

	return json({ ok: true });
};
