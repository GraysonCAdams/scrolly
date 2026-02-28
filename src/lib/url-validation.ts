export const SUPPORTED_DOMAINS = [
	'tiktok.com',
	'vm.tiktok.com',
	'instagram.com',
	'facebook.com',
	'fb.watch',
	'www.tiktok.com',
	'www.instagram.com',
	'www.facebook.com',
	'open.spotify.com',
	'spotify.link',
	'music.apple.com',
	'youtube.com',
	'www.youtube.com'
];

export function isSupportedUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname.replace(/^www\./, '');
		if (hostname.includes('youtube.com')) {
			return parsed.pathname.startsWith('/shorts/');
		}
		return SUPPORTED_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
	} catch {
		return false;
	}
}

export function detectPlatform(url: string): string | null {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname.replace(/^www\./, '');
		if (hostname.includes('tiktok.com')) return 'tiktok';
		if (hostname.includes('instagram.com')) return 'instagram';
		if (hostname.includes('facebook.com') || hostname === 'fb.watch') return 'facebook';
		if (hostname.includes('spotify.com') || hostname === 'spotify.link') return 'spotify';
		if (hostname.includes('music.apple.com')) return 'apple_music';
		if (hostname.includes('youtube.com') && parsed.pathname.startsWith('/shorts/'))
			return 'youtube';
		return null;
	} catch {
		return null;
	}
}

export function getContentType(platform: string): 'video' | 'music' {
	return platform === 'spotify' || platform === 'apple_music' ? 'music' : 'video';
}

const PLATFORM_LABELS: Record<string, string> = {
	tiktok: 'TikTok',
	instagram: 'Instagram',
	facebook: 'Facebook',
	spotify: 'Spotify',
	apple_music: 'Apple Music',
	youtube: 'YouTube Shorts'
};

export function platformLabel(url: string): string | null {
	const platform = detectPlatform(url);
	return platform ? (PLATFORM_LABELS[platform] ?? null) : null;
}
