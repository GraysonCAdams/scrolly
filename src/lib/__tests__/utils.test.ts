import { describe, it, expect, vi, afterEach } from 'vitest';
import { basename, relativeTime } from '../utils';

describe('basename', () => {
	it('returns filename from path', () => {
		expect(basename('/foo/bar/baz.txt')).toBe('baz.txt');
	});

	it('returns the string itself if no slashes', () => {
		expect(basename('file.txt')).toBe('file.txt');
	});

	it('returns original string for trailing slash (fallback on empty pop)', () => {
		// pop() returns '' which is falsy, so || returns the original
		expect(basename('/foo/bar/')).toBe('/foo/bar/');
	});

	it('handles empty string', () => {
		expect(basename('')).toBe('');
	});

	it('handles single segment paths', () => {
		expect(basename('filename')).toBe('filename');
	});
});

describe('relativeTime', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns "just now" for timestamps < 60s ago', () => {
		const now = new Date();
		expect(relativeTime(now.toISOString())).toBe('just now');
	});

	it('returns minutes ago for 5 minutes', () => {
		vi.useFakeTimers();
		const now = Date.now();
		vi.setSystemTime(now);
		const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
		expect(relativeTime(fiveMinAgo)).toBe('5m ago');
		vi.useRealTimers();
	});

	it('returns hours ago', () => {
		vi.useFakeTimers();
		const now = Date.now();
		vi.setSystemTime(now);
		const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
		expect(relativeTime(twoHoursAgo)).toBe('2h ago');
		vi.useRealTimers();
	});

	it('returns days ago', () => {
		vi.useFakeTimers();
		const now = Date.now();
		vi.setSystemTime(now);
		const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
		expect(relativeTime(threeDaysAgo)).toBe('3d ago');
		vi.useRealTimers();
	});

	it('returns weeks ago', () => {
		vi.useFakeTimers();
		const now = Date.now();
		vi.setSystemTime(now);
		const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
		expect(relativeTime(twoWeeksAgo)).toBe('2w ago');
		vi.useRealTimers();
	});

	it('returns date string for > 4 weeks ago', () => {
		vi.useFakeTimers();
		const now = Date.now();
		vi.setSystemTime(now);
		const twoMonthsAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
		const result = relativeTime(twoMonthsAgo.toISOString());
		expect(result).not.toContain('ago');
		expect(result).not.toBe('just now');
		vi.useRealTimers();
	});
});
