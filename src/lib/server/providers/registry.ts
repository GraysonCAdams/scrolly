import type { KnownProvider } from './types';

export const KNOWN_PROVIDERS: KnownProvider[] = [
	{
		id: 'ytdlp',
		name: 'yt-dlp',
		description: 'Community-maintained media downloader supporting 1000+ sites',
		homepage: 'https://github.com/yt-dlp/yt-dlp',
		license: 'Unlicense',
		capabilities: ['video', 'music'],
		binaryUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
		dependencies: ['ffmpeg', 'python3']
	}
];

export function getKnownProvider(id: string): KnownProvider | undefined {
	return KNOWN_PROVIDERS.find((p) => p.id === id);
}
