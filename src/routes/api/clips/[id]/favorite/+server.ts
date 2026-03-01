import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { favorites } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { withClipAuth } from '$lib/server/api-utils';

export const POST: RequestHandler = withClipAuth(async ({ params }, { user }) => {
	// Toggle — check if already favorited
	const existing = await db.query.favorites.findFirst({
		where: and(eq(favorites.clipId, params.id), eq(favorites.userId, user.id))
	});

	if (existing) {
		await db
			.delete(favorites)
			.where(and(eq(favorites.clipId, params.id), eq(favorites.userId, user.id)));
		return json({ favorited: false });
	}

	await db.insert(favorites).values({
		clipId: params.id,
		userId: user.id,
		createdAt: new Date()
	});

	return json({ favorited: true });
});
