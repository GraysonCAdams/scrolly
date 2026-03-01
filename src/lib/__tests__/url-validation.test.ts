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

	it('accepts YouTube URLs (shorts and regular)', () => {
		expect(isSupportedUrl('https://youtube.com/shorts/abc123')).toBe(true);
		expect(isSupportedUrl('https://www.youtube.com/shorts/xyz')).toBe(true);
		expect(isSupportedUrl('https://www.youtube.com/watch?v=abc123')).toBe(true);
		expect(isSupportedUrl('https://youtu.be/abc123')).toBe(true);
	});

	it('accepts X/Twitter URLs', () => {
		expect(isSupportedUrl('https://x.com/user/status/123')).toBe(true);
		expect(isSupportedUrl('https://twitter.com/user/status/123')).toBe(true);
		expect(isSupportedUrl('https://t.co/abc')).toBe(true);
	});

	it('accepts Reddit URLs', () => {
		expect(isSupportedUrl('https://www.reddit.com/r/funny/comments/abc')).toBe(true);
		expect(isSupportedUrl('https://v.redd.it/abc123')).toBe(true);
	});

	it('accepts Streamable URLs', () => {
		expect(isSupportedUrl('https://streamable.com/abc123')).toBe(true);
	});

	it('accepts Twitch URLs', () => {
		expect(isSupportedUrl('https://clips.twitch.tv/abc123')).toBe(true);
		expect(isSupportedUrl('https://www.twitch.tv/user/clip/abc')).toBe(true);
	});

	it('accepts Vimeo URLs', () => {
		expect(isSupportedUrl('https://vimeo.com/123456')).toBe(true);
	});

	it('accepts Threads URLs', () => {
		expect(isSupportedUrl('https://www.threads.net/@user/post/abc')).toBe(true);
	});

	it('accepts Bluesky URLs', () => {
		expect(isSupportedUrl('https://bsky.app/profile/user/post/abc')).toBe(true);
	});

	it('accepts Snapchat URLs', () => {
		expect(isSupportedUrl('https://www.snapchat.com/spotlight/abc')).toBe(true);
	});

	it('accepts Pinterest URLs', () => {
		expect(isSupportedUrl('https://www.pinterest.com/pin/123')).toBe(true);
		expect(isSupportedUrl('https://pin.it/abc')).toBe(true);
	});

	it('accepts Kick URLs', () => {
		expect(isSupportedUrl('https://kick.com/user/clips/abc')).toBe(true);
	});

	it('accepts Dailymotion URLs', () => {
		expect(isSupportedUrl('https://www.dailymotion.com/video/abc')).toBe(true);
		expect(isSupportedUrl('https://dai.ly/abc')).toBe(true);
	});

	it('accepts Imgur URLs', () => {
		expect(isSupportedUrl('https://imgur.com/abc')).toBe(true);
		expect(isSupportedUrl('https://i.imgur.com/abc.mp4')).toBe(true);
	});

	it('accepts Spotify URLs', () => {
		expect(isSupportedUrl('https://open.spotify.com/track/abc123')).toBe(true);
	});

	it('accepts Apple Music URLs', () => {
		expect(isSupportedUrl('https://music.apple.com/us/album/abc/123')).toBe(true);
	});

	it('accepts SoundCloud URLs', () => {
		expect(isSupportedUrl('https://soundcloud.com/artist/track')).toBe(true);
	});

	it('accepts YouTube Music URLs', () => {
		expect(isSupportedUrl('https://music.youtube.com/watch?v=abc')).toBe(true);
	});

	it('rejects unsupported domains', () => {
		expect(isSupportedUrl('https://google.com')).toBe(false);
		expect(isSupportedUrl('https://example.com/video')).toBe(false);
	});

	it('rejects invalid URLs', () => {
		expect(isSupportedUrl('')).toBe(false);
		expect(isSupportedUrl('not a url')).toBe(false);
	});

	it('accepts any protocol for supported domains', () => {
		// URL parser accepts any protocol, and the code only checks hostname

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

	it('returns "youtube" for YouTube URLs', () => {
		expect(detectPlatform('https://www.youtube.com/shorts/abc')).toBe('youtube');
		expect(detectPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
		expect(detectPlatform('https://youtu.be/abc')).toBe('youtube');
	});

	it('returns "twitter" for X/Twitter URLs', () => {
		expect(detectPlatform('https://x.com/user/status/123')).toBe('twitter');
		expect(detectPlatform('https://twitter.com/user/status/123')).toBe('twitter');
	});

	it('returns "reddit" for Reddit URLs', () => {
		expect(detectPlatform('https://www.reddit.com/r/funny/comments/abc')).toBe('reddit');
		expect(detectPlatform('https://v.redd.it/abc')).toBe('reddit');
	});

	it('returns "streamable" for Streamable URLs', () => {
		expect(detectPlatform('https://streamable.com/abc')).toBe('streamable');
	});

	it('returns "twitch" for Twitch URLs', () => {
		expect(detectPlatform('https://clips.twitch.tv/abc')).toBe('twitch');
	});

	it('returns "spotify" for Spotify URLs', () => {
		expect(detectPlatform('https://open.spotify.com/track/abc')).toBe('spotify');
	});

	it('returns "apple_music" for Apple Music URLs', () => {
		expect(detectPlatform('https://music.apple.com/us/album/abc/123')).toBe('apple_music');
	});

	it('returns "youtube_music" for YouTube Music URLs', () => {
		expect(detectPlatform('https://music.youtube.com/watch?v=abc')).toBe('youtube_music');
	});

	it('returns "soundcloud" for SoundCloud URLs', () => {
		expect(detectPlatform('https://soundcloud.com/artist/track')).toBe('soundcloud');
	});

	it('returns null for unsupported/invalid URLs', () => {
		expect(detectPlatform('https://google.com')).toBeNull();
		expect(detectPlatform('not a url')).toBeNull();
	});
});

describe('getContentType', () => {
	it('returns "music" for music platforms', () => {
		expect(getContentType('spotify')).toBe('music');
		expect(getContentType('apple_music')).toBe('music');
		expect(getContentType('soundcloud')).toBe('music');
		expect(getContentType('youtube_music')).toBe('music');
	});

	it('returns "video" for video platforms', () => {
		expect(getContentType('tiktok')).toBe('video');
		expect(getContentType('instagram')).toBe('video');
		expect(getContentType('facebook')).toBe('video');
		expect(getContentType('youtube')).toBe('video');
		expect(getContentType('twitter')).toBe('video');
		expect(getContentType('reddit')).toBe('video');
		expect(getContentType('streamable')).toBe('video');
		expect(getContentType('twitch')).toBe('video');
	});
});

describe('platformLabel', () => {
	it('returns display names for supported URLs', () => {
		expect(platformLabel('https://www.tiktok.com/@user/video/123')).toBe('TikTok');
		expect(platformLabel('https://www.instagram.com/reel/abc')).toBe('Instagram');
		expect(platformLabel('https://www.facebook.com/reel/123')).toBe('Facebook');
		expect(platformLabel('https://open.spotify.com/track/abc')).toBe('Spotify');
		expect(platformLabel('https://music.apple.com/us/album/abc/123')).toBe('Apple Music');
		expect(platformLabel('https://www.youtube.com/shorts/abc')).toBe('YouTube');
		expect(platformLabel('https://x.com/user/status/123')).toBe('X');
		expect(platformLabel('https://www.reddit.com/r/funny/comments/abc')).toBe('Reddit');
		expect(platformLabel('https://streamable.com/abc')).toBe('Streamable');
	});

	it('returns null for unsupported URLs', () => {
		expect(platformLabel('https://google.com')).toBeNull();
		expect(platformLabel('not a url')).toBeNull();
	});
});
