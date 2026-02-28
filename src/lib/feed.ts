import type { FeedClip } from '$lib/types';

export type FeedFilter = 'all' | 'unwatched' | 'watched' | 'favorites';

export function buildClipParams(
	filter: FeedFilter,
	offset: number,
	pageSize: number
): URLSearchParams {
	const params = new URLSearchParams();
	if (filter !== 'all') params.set('filter', filter);
	params.set('limit', String(pageSize));
	params.set('offset', String(offset));
	return params;
}

export async function fetchClips(
	filter: FeedFilter,
	pageSize: number
): Promise<{ clips: FeedClip[]; hasMore: boolean } | null> {
	const params = buildClipParams(filter, 0, pageSize);
	const res = await fetch(`/api/clips?${params}`);
	if (res.ok) return res.json();
	return null;
}

export async function fetchMoreClips(
	filter: FeedFilter,
	offset: number,
	pageSize: number
): Promise<{ clips: FeedClip[]; hasMore: boolean } | null> {
	const params = buildClipParams(filter, offset, pageSize);
	const res = await fetch(`/api/clips?${params}`);
	if (res.ok) return res.json();
	return null;
}

export async function markClipWatched(clipId: string): Promise<void> {
	await fetch(`/api/clips/${clipId}/watched`, { method: 'POST' });
}

export async function toggleClipFavorite(
	clipId: string
): Promise<{ favorited: boolean } | null> {
	const res = await fetch(`/api/clips/${clipId}/favorite`, { method: 'POST' });
	if (res.ok) return res.json();
	return null;
}

export async function retryClipDownload(clipId: string): Promise<boolean> {
	const res = await fetch(`/api/clips/${clipId}/retry`, { method: 'POST' });
	return res.ok;
}

export async function sendClipReaction(
	clipId: string,
	emoji: string
): Promise<{ reactions: Record<string, { count: number; reacted: boolean }> } | null> {
	const res = await fetch(`/api/clips/${clipId}/reactions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ emoji })
	});
	if (res.ok) return res.json();
	return null;
}

export async function fetchSingleClip(clipId: string): Promise<FeedClip | null> {
	const res = await fetch(`/api/clips/${clipId}`);
	if (res.ok) return res.json();
	return null;
}

export async function submitClipUrl(
	url: string
): Promise<{ clip: { id: string; contentType: string } } | { error: string }> {
	const res = await fetch('/api/clips', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ url })
	});
	const data = await res.json();
	if (!res.ok) return { error: data.error || 'Failed to add' };
	return data;
}

export function extractDroppedUrl(dataTransfer: DataTransfer | null): string | null {
	const data =
		dataTransfer?.getData('text/uri-list') || dataTransfer?.getData('text/plain') || '';
	const url = data
		.split('\n')
		.find((line) => line.trim().startsWith('http'))
		?.trim();
	return url || null;
}

export function extractShareTargetUrl(): string | null {
	const params = new URLSearchParams(window.location.search);
	const sharedUrl = params.get('shared_url');
	const sharedText = params.get('shared_text');

	if (sharedUrl || sharedText) {
		const clean = new URL(window.location.href);
		clean.searchParams.delete('shared_url');
		clean.searchParams.delete('shared_text');
		clean.searchParams.delete('shared_title');
		history.replaceState(null, '', clean.pathname);
	}

	return (
		sharedUrl?.trim() ||
		sharedText
			?.split(/\s+/)
			.find((t) => t.startsWith('http'))
			?.trim() ||
		null
	);
}
