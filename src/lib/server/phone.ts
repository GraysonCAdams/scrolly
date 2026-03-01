/**
 * Normalize a phone number to E.164 format for comparison.
 * Handles common formats from iOS Contact Cards:
 * (555) 123-4567, 555-123-4567, +15551234567, 1-555-123-4567, etc.
 * Returns null if the input cannot be normalized.
 */
export function normalizePhone(raw: string): string | null {
	const hadPlus = raw.trimStart().startsWith('+');
	const digits = raw.replace(/\D/g, '');

	// Already E.164 with country code
	if (hadPlus && digits.length >= 10 && digits.length <= 15) {
		return '+' + digits;
	}

	// 10 digits = US number without country code
	if (digits.length === 10) {
		return '+1' + digits;
	}

	// 11 digits starting with 1 = US number with country code
	if (digits.length === 11 && digits.startsWith('1')) {
		return '+' + digits;
	}

	// Cannot normalize
	return null;
}

/**
 * Given an array of raw phone strings, normalize each and return
 * the set of unique E.164 numbers.
 */
export function normalizePhones(phones: string[]): string[] {
	const results = new Set<string>();
	for (const phone of phones) {
		if (typeof phone === 'string' && phone.trim()) {
			const normalized = normalizePhone(phone);
			if (normalized) results.add(normalized);
		}
	}
	return Array.from(results);
}
