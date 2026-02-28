import { describe, it, expect } from 'vitest';
import { isSupportedUrl, detectPlatform, getContentType, platformLabel } from '../url-validation';

describe('isSupportedUrl', () => {
	it('accepts TikTok URLs', () => {
		expect(isSupportedUrl('https://www.tiktok.com/@user/video/123')).toBe(true);
		expect(isSupportedUrl('https://vm.tiktok.com/abc123')).toBe(true);
		expect(isSupportedUrl('https://tiktok.com/@user/video/456')).toBe(true);
	});

	it('accepts Instagram URLs', () => {
		expect(isSupportedUrl('https://www.instagram.com/reel/abc123')).toBe(true);
		expect(isSupportedUrl('https://instagram.com/p/xyz')).toBe(true);
	});

	it('accepts Facebook URLs', () => {
		expect(isSupportedUrl('https://www.facebook.com/reel/123')).toBe(true);
		expect(isSupportedUrl('https://fb.watch/abc123')).toBe(true);
	});

	it('accepts YouTube Shorts URLs', () => {
		expect(isSupportedUrl('https://youtube.com/shorts/abc123')).toBe(true);
		expect(isSupportedUrl('https://www.youtube.com/shorts/xyz')).toBe(true);
	});

	it('rejects regular YouTube URLs (not /shorts/)', () => {
		expect(isSupportedUrl('https://www.youtube.com/watch?v=abc123')).toBe(false);
		expect(isSupportedUrl('https://youtube.com/playlist?list=xyz')).toBe(false);
	});

	it('accepts Spotify URLs', () => {
		expect(isSupportedUrl('https://open.spotify.com/track/abc123')).toBe(true);
	});

	it('accepts Apple Music URLs', () => {
		expect(isSupportedUrl('https://music.apple.com/us/album/abc/123')).toBe(true);
	});

	it('rejects unsupported domains', () => {
		expect(isSupportedUrl('https://twitter.com/user/status/123')).toBe(false);
		expect(isSupportedUrl('https://reddit.com/r/funny')).toBe(false);
		expect(isSupportedUrl('https://google.com')).toBe(false);
	});

	it('rejects invalid URLs', () => {
		expect(isSupportedUrl('')).toBe(false);
		expect(isSupportedUrl('not a url')).toBe(false);
	});

	it('accepts any protocol for supported domains', () => {
		// URL parser accepts any protocol, and the code only checks hostname
		// eslint-disable-next-line sonarjs/no-clear-text-protocols -- intentional test of non-https protocol handling
		expect(isSupportedUrl('ftp://tiktok.com/@user/video/123')).toBe(true);
	});

	it('handles URLs with query parameters', () => {
		expect(
			isSupportedUrl('https://www.tiktok.com/@user/video/123?is_from_webapp=1&sender_device=pc')
		).toBe(true);
	});
});

describe('detectPlatform', () => {
	it('returns "tiktok" for TikTok URLs', () => {
		expect(detectPlatform('https://www.tiktok.com/@user/video/123')).toBe('tiktok');
		expect(detectPlatform('https://vm.tiktok.com/abc')).toBe('tiktok');
	});

	it('returns "instagram" for Instagram URLs', () => {
		expect(detectPlatform('https://www.instagram.com/reel/abc')).toBe('instagram');
	});

	it('returns "facebook" for Facebook URLs', () => {
		expect(detectPlatform('https://www.facebook.com/reel/123')).toBe('facebook');
		expect(detectPlatform('https://fb.watch/abc')).toBe('facebook');
	});

	it('returns "youtube" for YouTube Shorts', () => {
		expect(detectPlatform('https://www.youtube.com/shorts/abc')).toBe('youtube');
	});

	it('returns null for regular YouTube', () => {
		expect(detectPlatform('https://www.youtube.com/watch?v=abc')).toBeNull();
	});

	it('returns "spotify" for Spotify URLs', () => {
		expect(detectPlatform('https://open.spotify.com/track/abc')).toBe('spotify');
	});

	it('returns "apple_music" for Apple Music URLs', () => {
		expect(detectPlatform('https://music.apple.com/us/album/abc/123')).toBe('apple_music');
	});

	it('returns null for unsupported/invalid URLs', () => {
		expect(detectPlatform('https://twitter.com/user')).toBeNull();
		expect(detectPlatform('not a url')).toBeNull();
	});
});

describe('getContentType', () => {
	it('returns "music" for spotify', () => {
		expect(getContentType('spotify')).toBe('music');
	});

	it('returns "music" for apple_music', () => {
		expect(getContentType('apple_music')).toBe('music');
	});

	it('returns "video" for all other platforms', () => {
		expect(getContentType('tiktok')).toBe('video');
		expect(getContentType('instagram')).toBe('video');
		expect(getContentType('facebook')).toBe('video');
		expect(getContentType('youtube')).toBe('video');
	});
});

describe('platformLabel', () => {
	it('returns display names for supported URLs', () => {
		expect(platformLabel('https://www.tiktok.com/@user/video/123')).toBe('TikTok');
		expect(platformLabel('https://www.instagram.com/reel/abc')).toBe('Instagram');
		expect(platformLabel('https://www.facebook.com/reel/123')).toBe('Facebook');
		expect(platformLabel('https://open.spotify.com/track/abc')).toBe('Spotify');
		expect(platformLabel('https://music.apple.com/us/album/abc/123')).toBe('Apple Music');
		expect(platformLabel('https://www.youtube.com/shorts/abc')).toBe('YouTube Shorts');
	});

	it('returns null for unsupported URLs', () => {
		expect(platformLabel('https://twitter.com/user')).toBeNull();
		expect(platformLabel('not a url')).toBeNull();
	});
});
