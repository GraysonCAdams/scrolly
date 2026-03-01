import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips, users } from '$lib/server/db/schema';
import { eq, count, isNull, and, sql } from 'drizzle-orm';
import { withAuth } from '$lib/server/api-utils';

export const GET: RequestHandler = withAuth(async (_event, { group }) => {
	const [clipCount] = await db
		.select({ count: count() })
		.from(clips)
		.where(eq(clips.groupId, group.id));

	const [memberCount] = await db
		.select({ count: count() })
		.from(users)
		.where(and(eq(users.groupId, group.id), isNull(users.removedAt)));

	const [storage] = await db
		.select({ totalBytes: sql<number>`coalesce(sum(${clips.fileSizeBytes}), 0)` })
		.from(clips)
		.where(eq(clips.groupId, group.id));

	return json({
		clipCount: clipCount.count,
		memberCount: memberCount.count,
		storageMb: Math.round((storage.totalBytes / 1024 / 1024) * 10) / 10,
		maxStorageMb: group.maxStorageMb
	});
});
