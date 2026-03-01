import { writable } from 'svelte/store';
import type { GroupMember } from '$lib/types';

export const groupMembers = writable<GroupMember[]>([]);

export async function fetchGroupMembers(): Promise<void> {
	try {
		const res = await fetch('/api/group/members');
		if (res.ok) {
			const data: { id: string; username: string; avatarPath: string | null }[] = await res.json();
			groupMembers.set(
				data.map((m) => ({ id: m.id, username: m.username, avatarPath: m.avatarPath }))
			);
		}
	} catch {
		// silently fail — members list is optional for core functionality
	}
}
