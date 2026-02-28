/**
 * Platform definitions for URL validation, detection, and labeling.
 * Each entry maps a platform key to its domain matchers and display label.
 */
interface PlatformDef {
	label: string;
	/** Return true if this hostname (www-stripped) + URL belong to this platform */
	match: (hostname: string, url: URL) => boolean;
	contentType: 'video' | 'music';
}

const PLATFORMS: Record<string, PlatformDef> = {
	tiktok: {
		label: 'TikTok',
		match: (h) => h.includes('tiktok.com'),
		contentType: 'video'
	},
	instagram: {
		label: 'Instagram',
		match: (h) => h.includes('instagram.com'),
		contentType: 'video'
	},
	facebook: {
		label: 'Facebook',
		match: (h) => h.includes('facebook.com') || h === 'fb.watch',
		contentType: 'video'
	},
	youtube: {
		label: 'YouTube',
		match: (h, u) =>
			(h.includes('youtube.com') && !h.includes('music.youtube.com')) ||
			h === 'youtu.be' ||
			(h.includes('youtube.com') && u.pathname.startsWith('/shorts/')),
		contentType: 'video'
	},
	twitter: {
		label: 'X',
		match: (h) => h.includes('twitter.com') || h === 'x.com' || h === 't.co',
		contentType: 'video'
	},
	reddit: {
		label: 'Reddit',
		match: (h) => h.includes('reddit.com') || h === 'v.redd.it' || h === 'redd.it',
		contentType: 'video'
	},
	streamable: {
		label: 'Streamable',
		match: (h) => h.includes('streamable.com'),
		contentType: 'video'
	},
	twitch: {
		label: 'Twitch',
		match: (h) => h.includes('twitch.tv') || h.includes('clips.twitch.tv'),
		contentType: 'video'
	},
	vimeo: {
		label: 'Vimeo',
		match: (h) => h.includes('vimeo.com'),
		contentType: 'video'
	},
	threads: {
		label: 'Threads',
		match: (h) => h.includes('threads.net'),
		contentType: 'video'
	},
	bluesky: {
		label: 'Bluesky',
		match: (h) => h.includes('bsky.app'),
		contentType: 'video'
	},
	snapchat: {
		label: 'Snapchat',
		match: (h) => h.includes('snapchat.com'),
		contentType: 'video'
	},
	pinterest: {
		label: 'Pinterest',
		match: (h) => h.includes('pinterest.com') || h === 'pin.it',
		contentType: 'video'
	},
	kick: {
		label: 'Kick',
		match: (h) => h.includes('kick.com'),
		contentType: 'video'
	},
	dailymotion: {
		label: 'Dailymotion',
		match: (h) => h.includes('dailymotion.com') || h === 'dai.ly',
		contentType: 'video'
	},
	imgur: {
		label: 'Imgur',
		match: (h) => h.includes('imgur.com'),
		contentType: 'video'
	},
	soundcloud: {
		label: 'SoundCloud',
		match: (h) => h.includes('soundcloud.com'),
		contentType: 'music'
	},
	spotify: {
		label: 'Spotify',
		match: (h) => h.includes('spotify.com') || h === 'spotify.link',
		contentType: 'music'
	},
	apple_music: {
		label: 'Apple Music',
		match: (h) => h.includes('music.apple.com'),
		contentType: 'music'
	},
	youtube_music: {
		label: 'YouTube Music',
		match: (h) => h.includes('music.youtube.com'),
		contentType: 'music'
	}
};

export function isSupportedUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname.replace(/^www\./, '');
		return Object.values(PLATFORMS).some((p) => p.match(hostname, parsed));
	} catch {
		return false;
	}
}

export function detectPlatform(url: string): string | null {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname.replace(/^www\./, '');
		for (const [key, def] of Object.entries(PLATFORMS)) {
			if (def.match(hostname, parsed)) return key;
		}
		return null;
	} catch {
		return null;
	}
}

export function getContentType(platform: string): 'video' | 'music' {
	return PLATFORMS[platform]?.contentType ?? 'video';
}

const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
	Object.entries(PLATFORMS).map(([key, def]) => [key, def.label])
);

export function platformLabel(url: string): string | null {
	const platform = detectPlatform(url);
	return platform ? (PLATFORM_LABELS[platform] ?? null) : null;
}

/** All platform labels for display purposes (e.g. "TikTok, YouTube, X, ...") */
export const ALL_PLATFORM_LABELS = Object.values(PLATFORMS).map((p) => p.label);
