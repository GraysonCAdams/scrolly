import type { ClipSummary } from '$lib/types';

export type MonthGroup = {
	key: string;
	label: string;
	clips: ClipSummary[];
	totalSizeMb: number;
};

export function formatSize(mb: number): string {
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
	if (mb >= 1) return `${mb.toFixed(1)} MB`;
	return `${Math.round(mb * 1024)} KB`;
}

export function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	});
}

export function groupClipsByMonth(clips: ClipSummary[]): MonthGroup[] {
	const groups = new Map<string, MonthGroup>();
	for (const clip of clips) {
		const date = new Date(clip.createdAt);
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
		if (!groups.has(key)) {
			groups.set(key, { key, label, clips: [], totalSizeMb: 0 });
		}
		const group = groups.get(key)!;
		group.clips.push(clip);
		group.totalSizeMb = Math.round((group.totalSizeMb + clip.sizeMb) * 100) / 100;
	}
	return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export async function fetchClipsList(
	sort: 'largest' | 'newest',
	limit: number,
	offset: number
): Promise<{
	clips: ClipSummary[];
	totalSizeMb: number;
	totalClips: number;
	hasMore: boolean;
} | null> {
	const res = await fetch(`/api/group/clips?sort=${sort}&limit=${limit}&offset=${offset}`);
	if (!res.ok) return null;
	return res.json();
}

export async function deleteClips(clipIds: string[]): Promise<boolean> {
	try {
		const res = await fetch('/api/group/clips', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ clipIds })
		});
		return res.ok;
	} catch {
		return false;
	}
}
