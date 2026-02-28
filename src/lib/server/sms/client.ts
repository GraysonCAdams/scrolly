import twilio from 'twilio';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

function getClient() {
	const sid = env.TWILIO_ACCOUNT_SID;
	const token = env.TWILIO_AUTH_TOKEN;
	if (!sid || !token) throw new Error('Twilio credentials not configured');
	return twilio(sid, token);
}

export function getPhoneNumber(): string {
	const num = env.TWILIO_PHONE_NUMBER;
	if (!num) throw new Error('TWILIO_PHONE_NUMBER not configured');
	return num;
}

export async function sendSms(to: string, body: string): Promise<void> {
	if (dev) {
		console.log(`[DEV SMS] To: ${to} | ${body}`);
		return;
	}
	const client = getClient();
	await client.messages.create({
		to,
		from: getPhoneNumber(),
		body
	});
}

export async function sendMmsWithVcf(to: string, body: string, vcfUrl: string): Promise<void> {
	const client = getClient();
	await client.messages.create({
		to,
		from: getPhoneNumber(),
		body,
		mediaUrl: [vcfUrl]
	});
}

export function validateTwilioSignature(
	url: string,
	params: Record<string, string>,
	signature: string
): boolean {
	const token = env.TWILIO_AUTH_TOKEN;
	if (!token) return false;
	return twilio.validateRequest(token, signature, url, params);
}
