import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateInviteCode, createSessionCookie } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users, notificationPreferences } from '$lib/server/db/schema';
import { v4 as uuid } from 'uuid';

export const GET: RequestHandler = async ({ params }) => {
	const group = await validateInviteCode(params.code);
	if (!group) {
		redirect(302, '/join');
	}

	const userId = uuid();
	await db.insert(users).values({
		id: userId,
		username: '',
		phone: '',
		groupId: group.id,
		createdAt: new Date()
	});

	await db.insert(notificationPreferences).values({ userId });

	const cookie = createSessionCookie(userId);
	return new Response(null, {
		status: 302,
		headers: {
			Location: '/onboard',
			'Set-Cookie': cookie
		}
	});
};
