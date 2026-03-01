import { describe, it, expect } from 'vitest';
import { rawDigits, formatPhone, toE164 } from '../phone';

describe('rawDigits', () => {
	it('strips non-digit characters', () => {
		expect(rawDigits('(555) 123-4567')).toBe('5551234567');
	});

	it('returns empty string for empty input', () => {
		expect(rawDigits('')).toBe('');
	});

	it('returns digits only from mixed input', () => {
		expect(rawDigits('+1 (555) 123-4567')).toBe('15551234567');
	});

	it('passes through pure digit strings unchanged', () => {
		expect(rawDigits('1234567890')).toBe('1234567890');
	});
});

describe('formatPhone', () => {
	it('returns empty string for no digits', () => {
		expect(formatPhone('')).toBe('');
	});

	it('formats 1-3 digits with opening paren', () => {
		expect(formatPhone('5')).toBe('(5');
		expect(formatPhone('55')).toBe('(55');
		expect(formatPhone('555')).toBe('(555');
	});

	it('formats 4-6 digits with area code and space', () => {
		expect(formatPhone('5551')).toBe('(555) 1');
		expect(formatPhone('55512')).toBe('(555) 12');
		expect(formatPhone('555123')).toBe('(555) 123');
	});

	it('formats 7-10 digits with full formatting', () => {
		expect(formatPhone('5551234')).toBe('(555) 123-4');
		expect(formatPhone('55512345')).toBe('(555) 123-45');
		expect(formatPhone('555123456')).toBe('(555) 123-456');
		expect(formatPhone('5551234567')).toBe('(555) 123-4567');
	});

	it('truncates digits beyond 10', () => {
		expect(formatPhone('55512345678')).toBe('(555) 123-4567');
	});
});

describe('toE164', () => {
	it('converts formatted phone to E.164', () => {
		expect(toE164('(555) 123-4567')).toBe('+15551234567');
	});

	it('converts raw digits to E.164', () => {
		expect(toE164('5551234567')).toBe('+15551234567');
	});

	it('handles empty string', () => {
		expect(toE164('')).toBe('+1');
	});

	it('handles partial input', () => {
		expect(toE164('(555')).toBe('+1555');
	});
});
