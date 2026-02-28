const SUPPORTED_DOMAINS = [
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

const URL_REGEX = /https?:\/\/[^\s]+/gi;

export interface ParsedSms {
	urls: string[];
	caption: string;
	platform: string | null;
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

function isSupportedUrl(url: string): boolean {
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

export function parseSmsBody(body: string): ParsedSms {
	const urlMatches = body.match(URL_REGEX) || [];
	const supportedUrls = urlMatches.filter(isSupportedUrl);

	// Caption is everything that isn't a URL, trimmed and collapsed
	let caption = body;
	for (const url of urlMatches) {
		caption = caption.replace(url, '');
	}
	caption = caption.replace(/\s+/g, ' ').trim();

	const platform = supportedUrls.length > 0 ? detectPlatform(supportedUrls[0]) : null;

	return {
		urls: supportedUrls,
		caption,
		platform
	};
}
