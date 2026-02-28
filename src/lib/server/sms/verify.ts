import twilio from 'twilio';
import { env } from '$env/dynamic/private';
import { createLogger } from '$lib/server/logger';

const log = createLogger('sms');

function smsDevMode() {
	return env.SMS_DEV_MODE === 'true';
}

function getVerifyService() {
	const sid = env.TWILIO_ACCOUNT_SID;
	const token = env.TWILIO_AUTH_TOKEN;
	const serviceSid = env.TWILIO_VERIFY_SERVICE_SID;
	if (!sid || !token) throw new Error('Twilio credentials not configured');
	if (!serviceSid) throw new Error('TWILIO_VERIFY_SERVICE_SID not configured');
	return twilio(sid, token).verify.v2.services(serviceSid);
}

export interface SendVerificationResult {
	status: 'pending' | 'error';
	error?: string;
}

export interface CheckVerificationResult {
	valid: boolean;
	status: string;
	error?: string;
}

export type VerifyChannel = 'sms' | 'email';

const ALLOWED_CHANNELS: readonly VerifyChannel[] = (() => {
	const raw = env.VERIFY_CHANNELS || 'sms';
	return raw.split(',').map((c) => c.trim()) as VerifyChannel[];
})();

export function getAllowedChannels(): readonly VerifyChannel[] {
	return ALLOWED_CHANNELS;
}

export async function sendVerification(
	to: string,
	channel: VerifyChannel = 'sms'
): Promise<SendVerificationResult> {
	if (!ALLOWED_CHANNELS.includes(channel)) {
		return { status: 'error', error: `Verification channel "${channel}" is not enabled` };
	}

	if (smsDevMode()) {
		log.debug({ channel, to }, 'dev mode: verification sent (any code will work)');
		return { status: 'pending' };
	}

	try {
		const verification = await getVerifyService().verifications.create({
			to,
			channel
		});
		return { status: verification.status as 'pending' };
	} catch (err: unknown) {
		if (isTwilioRateLimitError(err)) {
			return { status: 'error', error: 'Too many codes sent. Please wait before trying again.' };
		}

		log.error({ err }, 'sendVerification failed');
		return { status: 'error', error: 'Failed to send verification code. Please try again.' };
	}
}

export async function checkVerification(
	to: string,
	code: string
): Promise<CheckVerificationResult> {
	if (smsDevMode()) {
		log.debug({ to }, 'dev mode: verification auto-approved');
		return { valid: true, status: 'approved' };
	}

	try {
		const check = await getVerifyService().verificationChecks.create({ to, code });
		return { valid: check.valid, status: check.status };
	} catch (err: unknown) {
		if (isTwilioNotFoundError(err)) {
			return {
				valid: false,
				status: 'expired',
				error: 'No valid code found. Please request a new one.'
			};
		}

		if (isTwilioMaxAttemptsError(err)) {
			return {
				valid: false,
				status: 'max_attempts_reached',
				error: 'Too many attempts. Please request a new code.'
			};
		}

		log.error({ err }, 'checkVerification failed');
		return { valid: false, status: 'error', error: 'Verification check failed. Please try again.' };
	}
}

interface TwilioError extends Error {
	code?: number;
	status?: number;
}

function isTwilioRateLimitError(err: unknown): boolean {
	const e = err as TwilioError;
	return e?.status === 429 || e?.code === 60203;
}

function isTwilioNotFoundError(err: unknown): boolean {
	const e = err as TwilioError;
	return e?.status === 404 || e?.code === 20404;
}

function isTwilioMaxAttemptsError(err: unknown): boolean {
	const e = err as TwilioError;
	return e?.code === 60202;
}
