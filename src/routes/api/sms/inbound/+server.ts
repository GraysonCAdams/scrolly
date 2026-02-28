import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, clips } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseSmsBody, getContentType } from '$lib/server/sms/inbound';
import { validateTwilioSignature } from '$lib/server/sms/client';
import { downloadVideo } from '$lib/server/video/download';
import { downloadMusic } from '$lib/server/music/download';
import { sendGroupNotification } from '$lib/server/push';
import { normalizeUrl } from '$lib/server/download-lock';
import { v4 as uuid } from 'uuid';
import { env } from '$env/dynamic/private';

function twiml(message: string): Response {
	const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
	return new Response(xml, {
		headers: { 'Content-Type': 'text/xml' }
	});
}

export const POST: RequestHandler = async ({ request, url }) => {
	// Parse form body (Twilio sends application/x-www-form-urlencoded)
	const formData = await request.formData();
	const params: Record<string, string> = {};
	for (const [key, value] of formData.entries()) {
		params[key] = value.toString();
	}

	// Validate Twilio signature in production
	if (env.TWILIO_AUTH_TOKEN) {
		const signature = request.headers.get('X-Twilio-Signature') || '';
		const webhookUrl = `${env.PUBLIC_APP_URL || url.origin}/api/sms/inbound`;
		if (!validateTwilioSignature(webhookUrl, params, signature)) {
			return new Response('Forbidden', { status: 403 });
		}
	}

	const from = params.From;
	const body = params.Body || '';

	if (!from) {
		return twiml('Invalid request.');
	}

	// Look up user by phone number
	const user = await db.query.users.findFirst({
		where: eq(users.phone, from)
	});

	if (!user) {
		return twiml(
			"This number isn't registered with scrolly. Join at the invite link to get started."
		);
	}

	// Parse the SMS body
	const parsed = parseSmsBody(body);

	if (parsed.urls.length === 0) {
		return twiml(
			"I didn't find a link in your message. Send a TikTok, Instagram, Facebook, YouTube Shorts, Spotify, or Apple Music link."
		);
	}

	if (!parsed.platform) {
		return twiml(
			"Sorry, that link isn't from a supported platform (TikTok, Instagram, Facebook, YouTube Shorts, Spotify, Apple Music)."
		);
	}

	// Create clip records and trigger downloads
	let musicCount = 0;
	let videoCount = 0;
	let skippedCount = 0;

	for (const clipUrl of parsed.urls) {
		const platform = parseSmsBody(clipUrl).platform || parsed.platform;
		const contentType = getContentType(platform!);
		const normalizedUrl = normalizeUrl(clipUrl);

		// Skip if this URL already exists in the group's feed
		const existing = await db.query.clips.findFirst({
			where: and(eq(clips.groupId, user.groupId), eq(clips.originalUrl, normalizedUrl))
		});
		if (existing) {
			skippedCount++;
			continue;
		}

		const clipId = uuid();

		if (contentType === 'music') musicCount++;
		else videoCount++;

		await db.insert(clips).values({
			id: clipId,
			groupId: user.groupId,
			addedBy: user.id,
			originalUrl: normalizedUrl,
			title: parsed.caption || null,
			platform: platform!,
			contentType,
			status: 'downloading',
			createdAt: new Date()
		});

		// Route to appropriate download pipeline
		const markFailedOnError = async (err: unknown) => {
			console.error(`Download failed for clip ${clipId}:`, err);
			await db
				.update(clips)
				.set({ status: 'failed' })
				.where(and(eq(clips.id, clipId), eq(clips.status, 'downloading')));
		};

		if (contentType === 'music') {
			downloadMusic(clipId, clipUrl).catch(markFailedOnError);
		} else {
			downloadVideo(clipId, clipUrl).catch(markFailedOnError);
		}
	}

	const totalCount = videoCount + musicCount;

	// All URLs were duplicates
	if (totalCount === 0) {
		const s = skippedCount > 1 ? 'Those links have' : 'That link has';
		return twiml(`${s} already been added to the feed.`);
	}

	// Notify group members
	const contentDesc =
		totalCount > 1 ? `${totalCount} new clips` : `a new ${videoCount ? 'video' : 'song'}`;
	sendGroupNotification(
		user.groupId,
		{
			title: 'New clip added',
			body: `${user.username} shared ${contentDesc}`,
			url: '/',
			tag: 'new-clip'
		},
		'newAdds',
		user.id
	).catch((err) => console.error('Push notification failed:', err));

	const parts: string[] = [];
	if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
	if (musicCount > 0) parts.push(`${musicCount} song${musicCount > 1 ? 's' : ''}`);
	const plural = totalCount > 1 ? 'are' : 'is';
	let reply = `Got it! Your ${parts.join(' and ')} ${plural} being added to the feed.`;
	if (skippedCount > 0) {
		reply += ` (${skippedCount} duplicate${skippedCount > 1 ? 's' : ''} skipped)`;
	}
	return twiml(reply);
};
