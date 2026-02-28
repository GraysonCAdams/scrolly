import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	validateInviteCode,
	createSessionCookie,
	getUserIdFromCookies,
	getUserWithGroup
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users, groups, notificationPreferences, verificationCodes } from '$lib/server/db/schema';
import { v4 as uuid } from 'uuid';
import { eq, and, gt, isNull, desc } from 'drizzle-orm';
import { sendSms } from '$lib/server/sms/client';
import crypto from 'node:crypto';
import { dev } from '$app/environment';

function generateOtp(): string {
	return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

async function handleJoin(body: Record<string, string>) {
	const { inviteCode } = body;
	if (!inviteCode) return json({ error: 'Invite code required' }, { status: 400 });

	const group = await validateInviteCode(inviteCode);
	if (!group) return json({ error: 'Invalid invite code' }, { status: 404 });

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
	return json({ userId, group, needsOnboarding: true }, { headers: { 'Set-Cookie': cookie } });
}

async function handleSendCode(userId: string, body: Record<string, string>) {
	const { phone } = body;
	if (!phone) return json({ error: 'Phone number required' }, { status: 400 });

	if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
		return json({ error: 'Phone must be in E.164 format (e.g., +1234567890)' }, { status: 400 });
	}

	// Check if this phone is already claimed by another user
	const existingUser = await db.query.users.findFirst({
		where: eq(users.phone, phone)
	});
	if (existingUser && existingUser.id !== userId) {
		return json({ error: 'This phone number is already in use' }, { status: 409 });
	}

	// Rate limit: max 3 codes per phone per 10-minute window
	const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
	const recentCodes = await db
		.select()
		.from(verificationCodes)
		.where(and(eq(verificationCodes.phone, phone), gt(verificationCodes.createdAt, tenMinutesAgo)));
	if (recentCodes.length >= 3) {
		return json(
			{ error: 'Too many codes sent. Please wait before trying again.' },
			{ status: 429 }
		);
	}

	const code = generateOtp();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

	await db.insert(verificationCodes).values({
		id: uuid(),
		phone,
		code,
		userId,
		attempts: 0,
		expiresAt,
		createdAt: now
	});

	await sendSms(phone, `Your scrolly verification code is: ${code}`);

	return json({ sent: true });
}

async function handleVerifyCode(userId: string, body: Record<string, string>) {
	const { phone, code } = body;
	if (!phone || !code) {
		return json({ error: 'Phone and code are required' }, { status: 400 });
	}

	const now = new Date();
	const record = await db
		.select()
		.from(verificationCodes)
		.where(
			and(
				eq(verificationCodes.phone, phone),
				eq(verificationCodes.userId, userId),
				gt(verificationCodes.expiresAt, now),
				isNull(verificationCodes.verifiedAt)
			)
		)
		.orderBy(desc(verificationCodes.createdAt))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	if (!record) {
		return json({ error: 'No valid code found. Please request a new one.' }, { status: 400 });
	}

	if (record.attempts >= 5) {
		return json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
	}

	// Increment attempts before checking
	await db
		.update(verificationCodes)
		.set({ attempts: record.attempts + 1 })
		.where(eq(verificationCodes.id, record.id));

	if (!dev) {
		const codeBuffer = Buffer.from(code.padStart(6, '0'));
		const recordBuffer = Buffer.from(record.code);
		if (
			codeBuffer.length !== recordBuffer.length ||
			!crypto.timingSafeEqual(codeBuffer, recordBuffer)
		) {
			const remaining = 4 - record.attempts;
			return json({ error: `Incorrect code. ${remaining} attempt(s) remaining.` }, { status: 400 });
		}
	}

	await db
		.update(verificationCodes)
		.set({ verifiedAt: now })
		.where(eq(verificationCodes.id, record.id));

	return json({ verified: true });
}

async function handleOnboard(userId: string, body: Record<string, string>) {
	const { username, phone } = body;
	if (!username || !phone) {
		return json({ error: 'Username and phone number required' }, { status: 400 });
	}

	if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
		return json({ error: 'Phone must be in E.164 format (e.g., +1234567890)' }, { status: 400 });
	}

	// Confirm this phone was verified by this user
	const verified = await db
		.select()
		.from(verificationCodes)
		.where(and(eq(verificationCodes.phone, phone), eq(verificationCodes.userId, userId)))
		.orderBy(desc(verificationCodes.createdAt))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	if (!verified || !verified.verifiedAt) {
		return json({ error: 'Phone number not verified' }, { status: 403 });
	}

	// Verification must be recent (within 30 minutes)
	const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
	if (verified.verifiedAt < thirtyMinutesAgo) {
		return json({ error: 'Verification expired. Please verify again.' }, { status: 403 });
	}

	await db.update(users).set({ username, phone }).where(eq(users.id, userId));

	const data = await getUserWithGroup(userId);
	return json({ user: data?.user, group: data?.group });
}

async function handleLoginSendCode(body: Record<string, string>) {
	const { phone } = body;
	if (!phone) return json({ error: 'Phone number required' }, { status: 400 });

	if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
		return json({ error: 'Phone must be in E.164 format (e.g., +1234567890)' }, { status: 400 });
	}

	// Find a fully onboarded user with this phone
	let user = await db.query.users.findFirst({
		where: eq(users.phone, phone)
	});
	if ((!user || !user.username) && dev) {
		// Dev mode: auto-create a group + user for any phone number
		let group = await db.query.groups.findFirst({
			where: eq(groups.inviteCode, 'dev')
		});
		const isNewGroup = !group;
		if (!group) {
			const groupId = uuid();
			await db.insert(groups).values({
				id: groupId,
				name: 'Dev Group',
				inviteCode: 'dev',
				createdAt: new Date()
			});
			group = await db.query.groups.findFirst({
				where: eq(groups.id, groupId)
			});
		}
		if (user && !user.username) {
			await db.update(users).set({ username: 'dev', phone }).where(eq(users.id, user.id));
			user = await db.query.users.findFirst({ where: eq(users.id, user.id) });
			// Make the first dev user the host if group has no host
			if (!group!.createdBy) {
				await db.update(groups).set({ createdBy: user!.id }).where(eq(groups.id, group!.id));
			}
		} else {
			const userId = uuid();
			await db.insert(users).values({
				id: userId,
				username: 'dev',
				phone,
				groupId: group!.id,
				createdAt: new Date()
			});
			await db.insert(notificationPreferences).values({ userId });
			user = await db.query.users.findFirst({ where: eq(users.id, userId) });
			// First user in a new dev group becomes the host
			if (isNewGroup || !group!.createdBy) {
				await db.update(groups).set({ createdBy: userId }).where(eq(groups.id, group!.id));
			}
		}
		console.log(`[DEV] Auto-created user for ${phone}`);
	} else if (!user || !user.username) {
		return json({ error: 'No account found with this phone number' }, { status: 404 });
	}

	// Rate limit: max 3 codes per phone per 10-minute window
	const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
	const recentCodes = await db
		.select()
		.from(verificationCodes)
		.where(and(eq(verificationCodes.phone, phone), gt(verificationCodes.createdAt, tenMinutesAgo)));
	if (recentCodes.length >= 3) {
		return json(
			{ error: 'Too many codes sent. Please wait before trying again.' },
			{ status: 429 }
		);
	}

	const code = generateOtp();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

	await db.insert(verificationCodes).values({
		id: uuid(),
		phone,
		code,
		userId: user.id,
		attempts: 0,
		expiresAt,
		createdAt: now
	});

	await sendSms(phone, `Your scrolly login code is: ${code}`);

	return json({ sent: true });
}

async function handleLoginVerifyCode(body: Record<string, string>) {
	const { phone, code } = body;
	if (!phone || !code) {
		return json({ error: 'Phone and code are required' }, { status: 400 });
	}

	const user = await db.query.users.findFirst({
		where: eq(users.phone, phone)
	});
	if (!user) {
		return json({ error: 'No account found with this phone number' }, { status: 404 });
	}

	const now = new Date();
	const record = await db
		.select()
		.from(verificationCodes)
		.where(
			and(
				eq(verificationCodes.phone, phone),
				eq(verificationCodes.userId, user.id),
				gt(verificationCodes.expiresAt, now),
				isNull(verificationCodes.verifiedAt)
			)
		)
		.orderBy(desc(verificationCodes.createdAt))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	if (!record) {
		return json({ error: 'No valid code found. Please request a new one.' }, { status: 400 });
	}

	if (record.attempts >= 5) {
		return json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
	}

	await db
		.update(verificationCodes)
		.set({ attempts: record.attempts + 1 })
		.where(eq(verificationCodes.id, record.id));

	if (!dev) {
		const codeBuffer = Buffer.from(code.padStart(6, '0'));
		const recordBuffer = Buffer.from(record.code);
		if (
			codeBuffer.length !== recordBuffer.length ||
			!crypto.timingSafeEqual(codeBuffer, recordBuffer)
		) {
			const remaining = 4 - record.attempts;
			return json({ error: `Incorrect code. ${remaining} attempt(s) remaining.` }, { status: 400 });
		}
	}

	await db
		.update(verificationCodes)
		.set({ verifiedAt: now })
		.where(eq(verificationCodes.id, record.id));

	const cookie = createSessionCookie(user.id);
	const data = await getUserWithGroup(user.id);
	return json({ user: data?.user, group: data?.group }, { headers: { 'Set-Cookie': cookie } });
}

// POST /api/auth - Login, join, send/verify phone code, or onboard
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { action } = body;

	// Unauthenticated actions
	if (action === 'join') return handleJoin(body);
	if (action === 'login-send-code') return handleLoginSendCode(body);
	if (action === 'login-verify-code') return handleLoginVerifyCode(body);

	// Authenticated actions
	if (action === 'send-code' || action === 'verify-code' || action === 'onboard') {
		const userId = getUserIdFromCookies(request.headers.get('cookie'));
		if (!userId) return json({ error: 'Not authenticated' }, { status: 401 });

		if (action === 'send-code') return handleSendCode(userId, body);
		if (action === 'verify-code') return handleVerifyCode(userId, body);
		return handleOnboard(userId, body);
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

// GET /api/auth - Get current user
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });
	return json({ user: locals.user, group: locals.group });
};
