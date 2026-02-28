import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { favorites } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	// Toggle — check if already favorited
	const existing = await db.query.favorites.findFirst({
		where: and(eq(favorites.clipId, params.id), eq(favorites.userId, locals.user.id))
	});

	if (existing) {
		await db
			.delete(favorites)
			.where(and(eq(favorites.clipId, params.id), eq(favorites.userId, locals.user.id)));
		return json({ favorited: false });
	}

	await db.insert(favorites).values({
		clipId: params.id,
		userId: locals.user.id,
		createdAt: new Date()
	});

	return json({ favorited: true });
};
