import { describe, it, expect } from 'vitest';
import { getAccentColor, ACCENT_COLORS, DEFAULT_ACCENT } from '../colors';

describe('getAccentColor', () => {
	it('returns coral for key "coral"', () => {
		const result = getAccentColor('coral');
		expect(result.hex).toBe('#FF6B35');
		expect(result.dark).toBe('#D4551F');
		expect(result.label).toBe('Coral');
	});

	it('returns correct values for all 8 color keys', () => {
		const keys = Object.keys(ACCENT_COLORS) as Array<keyof typeof ACCENT_COLORS>;
		expect(keys).toHaveLength(8);

		for (const key of keys) {
			const result = getAccentColor(key);
			expect(result).toEqual(ACCENT_COLORS[key]);
		}
	});

	it('returns default coral for unknown key', () => {
		expect(getAccentColor('nope')).toEqual(ACCENT_COLORS[DEFAULT_ACCENT]);
	});

	it('returns default coral for null', () => {
		expect(getAccentColor(null)).toEqual(ACCENT_COLORS[DEFAULT_ACCENT]);
	});

	it('returns default coral for undefined', () => {
		expect(getAccentColor(undefined)).toEqual(ACCENT_COLORS[DEFAULT_ACCENT]);
	});

	it('returns default coral for empty string', () => {
		expect(getAccentColor('')).toEqual(ACCENT_COLORS[DEFAULT_ACCENT]);
	});

	it('each color has hex, dark, and label properties', () => {
		for (const color of Object.values(ACCENT_COLORS)) {
			expect(color).toHaveProperty('hex');
			expect(color).toHaveProperty('dark');
			expect(color).toHaveProperty('label');
			expect(color.hex).toMatch(/^#[0-9A-F]{6}$/i);
			expect(color.dark).toMatch(/^#[0-9A-F]{6}$/i);
			expect(color.label).toBeTruthy();
		}
	});
});
