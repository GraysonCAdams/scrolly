import { db } from '../db';
import { groups } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { KnownProvider, DownloadProvider } from './types';
import { YtDlpProvider } from './ytdlp';

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

// Singleton instances — providers are stateless, one per type is fine
const providerInstances: Record<string, DownloadProvider> = {
	ytdlp: new YtDlpProvider()
};

export function getProviderInstance(id: string): DownloadProvider | undefined {
	return providerInstances[id];
}

export async function getActiveProvider(groupId: string): Promise<DownloadProvider | null> {
	const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
	if (!group?.downloadProvider) return null;

	const provider = providerInstances[group.downloadProvider];
	if (!provider) return null;

	const installed = await provider.isInstalled();
	if (!installed) return null;

	return provider;
}

export interface ProviderStatus {
	id: string;
	name: string;
	description: string;
	homepage: string;
	license: string;
	capabilities: ('video' | 'music')[];
	dependencies: string[];
	installed: boolean;
	active: boolean;
	version: string | null;
}

export async function listProvidersWithStatus(groupId: string): Promise<ProviderStatus[]> {
	const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
	const activeId = group?.downloadProvider ?? null;

	return Promise.all(
		KNOWN_PROVIDERS.map(async (known) => {
			const instance = providerInstances[known.id];
			const installed = instance ? await instance.isInstalled() : false;
			const version = installed && instance ? await instance.getVersion() : null;
			return {
				...known,
				installed,
				active: known.id === activeId && installed,
				version
			};
		})
	);
}
