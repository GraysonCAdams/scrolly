import { vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		SESSION_SECRET: 'test-secret-key-for-hmac-signing-minimum-32-chars',
		TWILIO_ACCOUNT_SID: 'test-sid',
		TWILIO_AUTH_TOKEN: 'test-token',
		TWILIO_VERIFY_SERVICE_SID: 'test-verify-sid',
		SMS_DEV_MODE: 'true',
		VAPID_PUBLIC_KEY: 'test-vapid-public',
		VAPID_PRIVATE_KEY: 'test-vapid-private',
		VAPID_SUBJECT: 'mailto:test@test.com',
		VERIFY_CHANNELS: 'sms'
	}
}));

vi.mock('$app/environment', () => ({
	dev: false,
	building: false,
	version: '1.0.0-test'
}));
