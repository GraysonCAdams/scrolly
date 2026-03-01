import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolve } from 'path';
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '$lib/server/api-utils';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data', 'avatars');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST: RequestHandler = withAuth(async ({ request }, { user }) => {
	const formData = await request.formData();
	const file = formData.get('avatar');

	if (!(file instanceof File)) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File too large. Maximum 5 MB.' }, { status: 400 });
	}

	mkdirSync(DATA_DIR, { recursive: true }); // eslint-disable-line security/detect-non-literal-fs-filename

	const filename = `${user.id}.jpg`;
	const filePath = resolve(DATA_DIR, filename);

	// Prevent directory traversal
	if (!filePath.startsWith(DATA_DIR)) {
		return json({ error: 'Invalid path' }, { status: 400 });
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	writeFileSync(filePath, buffer); // eslint-disable-line security/detect-non-literal-fs-filename
	await db.update(users).set({ avatarPath: filename }).where(eq(users.id, user.id));

	return json({ avatarPath: filename });
});

export const DELETE: RequestHandler = withAuth(async (_event, { user }) => {
	const filename = `${user.id}.jpg`;
	const filePath = resolve(DATA_DIR, filename);

	// Prevent directory traversal
	if (!filePath.startsWith(DATA_DIR)) {
		return json({ error: 'Invalid path' }, { status: 400 });
	}

	if (existsSync(filePath)) {
		// eslint-disable-line security/detect-non-literal-fs-filename
		unlinkSync(filePath); // eslint-disable-line security/detect-non-literal-fs-filename
	}

	await db.update(users).set({ avatarPath: null }).where(eq(users.id, user.id));

	return json({ ok: true });
});
