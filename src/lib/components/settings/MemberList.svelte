<script lang="ts">
	import { onMount } from 'svelte';
	import { confirm } from '$lib/stores/confirm';
	import { toast } from '$lib/stores/toasts';

	const {
		groupId: _groupId,
		hostId,
		currentUserId
	}: {
		groupId: string;
		hostId: string;
		currentUserId: string;
	} = $props();

	type Member = {
		id: string;
		username: string;
		avatarPath: string | null;
		createdAt: string;
		isHost: boolean;
	};

	let members = $state<Member[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const res = await fetch('/api/group/members');
		if (res.ok) {
			members = await res.json();
		}
		loading = false;
	});

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			year: 'numeric'
		});
	}

	async function handleRemove(member: Member) {
		const confirmed = await confirm({
			title: 'Remove Member',
			message: `Remove ${member.username} from the group? Their clips will be preserved, but they won't be able to access the group anymore.`,
			confirmLabel: 'Remove',
			destructive: true
		});
		if (!confirmed) return;

		try {
			const res = await fetch(`/api/group/members/${member.id}`, { method: 'DELETE' });
			if (res.ok) {
				members = members.filter((m) => m.id !== member.id);
				toast.success(`${member.username} removed`);
			} else {
				toast.error('Failed to remove member');
			}
		} catch {
			toast.error('Failed to remove member');
		}
	}
</script>

{#if loading}
	<p class="hint">Loading members...</p>
{:else if members.length === 0}
	<p class="hint">No members found.</p>
{:else}
	<div class="member-list">
		{#each members as member}
			<div class="member-row">
				<div class="member-avatar">
					<span>{member.username?.charAt(0)?.toUpperCase() ?? '?'}</span>
				</div>
				<div class="member-info">
					<div class="member-name-row">
						<span class="member-name">{member.username}</span>
						{#if member.isHost}
							<span class="host-badge">Host</span>
						{/if}
					</div>
					<span class="member-joined">Joined {formatDate(member.createdAt)}</span>
				</div>
				{#if !member.isHost && currentUserId === hostId}
					<button
						class="remove-btn"
						onclick={() => handleRemove(member)}
						aria-label="Remove {member.username}"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.hint {
		color: var(--text-muted);
		font-size: 0.8125rem;
		margin: 0;
	}

	.member-list {
		display: flex;
		flex-direction: column;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--bg-surface);
	}

	.member-row:last-child {
		border-bottom: none;
	}

	.member-avatar {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		background: var(--accent-magenta);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1rem;
	}

	.member-info {
		flex: 1;
		min-width: 0;
	}

	.member-name-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.member-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.host-badge {
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent-primary);
		background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
		padding: 2px var(--space-xs);
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.member-joined {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.remove-btn {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		border: none;
		background: color-mix(in srgb, var(--error) 10%, transparent);
		color: var(--error);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background 0.2s ease;
		padding: 0;
	}

	.remove-btn:active {
		background: color-mix(in srgb, var(--error) 20%, transparent);
	}

	.remove-btn svg {
		width: 16px;
		height: 16px;
	}
</style>
