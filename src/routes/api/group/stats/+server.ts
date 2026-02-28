import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips, users } from '$lib/server/db/schema';
import { eq, count, isNull, and } from 'drizzle-orm';
import { stat } from 'fs/promises';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.group) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const [clipCount] = await db
		.select({ count: count() })
		.from(clips)
		.where(eq(clips.groupId, locals.group.id));

	const [memberCount] = await db
		.select({ count: count() })
		.from(users)
		.where(and(eq(users.groupId, locals.group.id), isNull(users.removedAt)));

	const groupClips = await db.query.clips.findMany({
		where: eq(clips.groupId, locals.group.id)
	});

	let totalBytes = 0;
	for (const clip of groupClips) {
		for (const path of [clip.videoPath, clip.audioPath, clip.thumbnailPath]) {
			if (path) {
				try {
					const s = await stat(path);
					totalBytes += s.size;
				} catch {
					// File may have been deleted
				}
			}
		}
	}

	return json({
		clipCount: clipCount.count,
		memberCount: memberCount.count,
		storageMb: Math.round((totalBytes / 1024 / 1024) * 10) / 10,
		maxStorageMb: locals.group.maxStorageMb
	});
};
