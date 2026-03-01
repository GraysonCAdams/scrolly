/** Extract raw digits from a formatted phone display string. */
export function rawDigits(formatted: string): string {
	return formatted.replace(/\D/g, '');
}

/** Format digits as (XXX) XXX-XXXX for display. */
export function formatPhone(digits: string): string {
	if (digits.length === 0) return '';
	if (digits.length <= 3) return `(${digits}`;
	if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** Convert a formatted display string to E.164 format (+1XXXXXXXXXX). */
export function toE164(formatted: string): string {
	const digits = rawDigits(formatted);
	return `+1${digits}`;
}
