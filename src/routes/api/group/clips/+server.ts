import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	clips,
	users,
	watched,
	favorites,
	reactions,
	comments,
	commentHearts,
	notifications
} from '$lib/server/db/schema';
import { eq, and, inArray, not, desc, sql } from 'drizzle-orm';
import { stat, unlink } from 'fs/promises';
import { withHost, safeInt, parseBody, isResponse } from '$lib/server/api-utils';

/** Delete media files from disk if no other clip references them. */
async function cleanupClipFiles(targetClips: (typeof clips.$inferSelect)[], idsToDelete: string[]) {
	for (const clip of targetClips) {
		for (const pathField of ['videoPath', 'audioPath', 'thumbnailPath'] as const) {
			const filePath = clip[pathField];
			if (!filePath) continue;
			const otherRef = await db.query.clips.findFirst({
				where: and(eq(clips[pathField], filePath), not(inArray(clips.id, idsToDelete)))
			});
			if (!otherRef) {
				try {
					await unlink(filePath); // eslint-disable-line security/detect-non-literal-fs-filename
				} catch {
					// File may already be gone
				}
			}
		}
	}
}

/** Backfill fileSizeBytes for clips that don't have it yet. */
async function backfillFileSizes(clipRows: (typeof clips.$inferSelect)[]) {
	const needsBackfill = clipRows.filter((c) => c.fileSizeBytes === null && c.status === 'ready');
	if (needsBackfill.length === 0) return;

	await Promise.all(
		needsBackfill.map(async (clip) => {
			let bytes = 0;
			for (const path of [clip.videoPath, clip.audioPath, clip.thumbnailPath]) {
				if (path) {
					try {
						const s = await stat(path); // eslint-disable-line security/detect-non-literal-fs-filename
						bytes += s.size;
					} catch {
						// File may have been deleted
					}
				}
			}
			if (bytes > 0) {
				clip.fileSizeBytes = bytes;
				await db.update(clips).set({ fileSizeBytes: bytes }).where(eq(clips.id, clip.id));
			}
		})
	);
}

export const GET: RequestHandler = withHost(async ({ url }, { group }) => {
	const limit = safeInt(url.searchParams.get('limit'), 30, 50);
	const offset = safeInt(url.searchParams.get('offset'), 0);
	const sort = url.searchParams.get('sort') === 'newest' ? 'newest' : 'largest';

	// Get totals from DB (fast — no stat calls needed once backfilled)
	const [totals] = await db
		.select({
			totalClips: sql<number>`count(*)`,
			totalBytes: sql<number>`coalesce(sum(${clips.fileSizeBytes}), 0)`
		})
		.from(clips)
		.where(eq(clips.groupId, group.id));

	// Build member lookup
	const memberMap = new Map<string, string>();
	const members = await db.query.users.findMany({
		where: eq(users.groupId, group.id)
	});
	for (const m of members) {
		memberMap.set(m.id, m.username || 'Unknown');
	}

	// Paginated query with server-side sort
	const orderBy =
		sort === 'newest'
			? [desc(clips.createdAt)]
			: [desc(clips.fileSizeBytes), desc(clips.createdAt)];

	const groupClips = await db.query.clips.findMany({
		where: eq(clips.groupId, group.id),
		orderBy,
		limit,
		offset
	});

	// Lazy backfill for clips missing fileSizeBytes
	await backfillFileSizes(groupClips);

	const result = groupClips.map((clip) => ({
		id: clip.id,
		title: clip.title,
		platform: clip.platform,
		contentType: clip.contentType,
		addedBy: clip.addedBy,
		addedByUsername: memberMap.get(clip.addedBy) ?? 'Unknown',
		createdAt: clip.createdAt.toISOString(),
		sizeMb: Math.round(((clip.fileSizeBytes ?? 0) / 1024 / 1024) * 100) / 100,
		thumbnailPath: clip.thumbnailPath,
		status: clip.status
	}));

	return json({
		clips: result,
		totalClips: totals.totalClips,
		totalSizeMb: Math.round((totals.totalBytes / 1024 / 1024) * 10) / 10,
		hasMore: offset + limit < totals.totalClips
	});
});

export const DELETE: RequestHandler = withHost(async ({ request }, { group }) => {
	const body = await parseBody<{ clipIds?: string[] }>(request);
	if (isResponse(body)) return body;

	const clipIds = body.clipIds;

	if (!Array.isArray(clipIds) || clipIds.length === 0) {
		return json({ error: 'clipIds must be a non-empty array' }, { status: 400 });
	}

	// Fetch clips to get file paths and verify they belong to this group
	const toDelete = await db.query.clips.findMany({
		where: and(eq(clips.groupId, group.id))
	});

	const targetClips = toDelete.filter((c) => clipIds.includes(c.id));

	if (targetClips.length === 0) {
		return json({ error: 'No valid clips to delete' }, { status: 404 });
	}

	const idsToDelete = targetClips.map((c) => c.id);

	// Delete associated data
	await db.delete(notifications).where(inArray(notifications.clipId, idsToDelete));
	await db.delete(watched).where(inArray(watched.clipId, idsToDelete));
	await db.delete(favorites).where(inArray(favorites.clipId, idsToDelete));
	await db.delete(reactions).where(inArray(reactions.clipId, idsToDelete));
	// Delete comment hearts before comments (FK constraint)
	const clipComments = await db.query.comments.findMany({
		where: inArray(comments.clipId, idsToDelete)
	});
	if (clipComments.length > 0) {
		await db.delete(commentHearts).where(
			inArray(
				commentHearts.commentId,
				clipComments.map((c) => c.id)
			)
		);
	}
	await db.delete(comments).where(inArray(comments.clipId, idsToDelete));
	await db.delete(clips).where(inArray(clips.id, idsToDelete));

	await cleanupClipFiles(targetClips, idsToDelete);

	return json({ deleted: targetClips.length });
});
