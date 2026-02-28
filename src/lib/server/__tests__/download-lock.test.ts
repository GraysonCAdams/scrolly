import { describe, it, expect } from 'vitest';
import { normalizeUrl } from '../download-lock';

describe('normalizeUrl', () => {
	it('strips utm_source parameter', () => {
		expect(normalizeUrl('https://example.com/page?utm_source=twitter')).toBe(
			'https://example.com/page'
		);
	});

	it('strips utm_medium and utm_campaign', () => {
		expect(normalizeUrl('https://example.com/page?utm_medium=social&utm_campaign=launch')).toBe(
			'https://example.com/page'
		);
	});

	it('strips si parameter (Spotify tracking)', () => {
		expect(normalizeUrl('https://open.spotify.com/track/abc?si=xyz123')).toBe(
			'https://open.spotify.com/track/abc'
		);
	});

	it('strips igshid and igsh parameters (Instagram)', () => {
		expect(normalizeUrl('https://www.instagram.com/reel/abc?igshid=xyz&igsh=abc')).toBe(
			'https://www.instagram.com/reel/abc'
		);
	});

	it('strips fbclid parameter (Facebook)', () => {
		expect(normalizeUrl('https://fb.watch/abc?fbclid=xyz123')).toBe('https://fb.watch/abc');
	});

	it('preserves non-tracking parameters', () => {
		expect(normalizeUrl('https://example.com/page?id=123&q=hello')).toBe(
			'https://example.com/page?id=123&q=hello'
		);
	});

	it('strips multiple tracking params at once', () => {
		const url = 'https://example.com/page?id=1&utm_source=tw&utm_medium=social&si=abc&fbclid=xyz';
		expect(normalizeUrl(url)).toBe('https://example.com/page?id=1');
	});

	it('handles URLs without parameters', () => {
		expect(normalizeUrl('https://example.com/page')).toBe('https://example.com/page');
	});

	it('returns original string for invalid URLs', () => {
		expect(normalizeUrl('not a url')).toBe('not a url');
	});
});
