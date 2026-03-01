<script lang="ts">
	import { onMount } from 'svelte';
	import { relativeTime } from '$lib/utils';
	import { fetchUnreadCount } from '$lib/stores/notifications';

	interface Notification {
		id: string;
		type: 'reaction' | 'comment';
		clipId: string;
		emoji: string | null;
		commentPreview: string | null;
		actorUsername: string;
		actorAvatar: string | null;
		clipThumbnail: string | null;
		clipTitle: string | null;
		read: boolean;
		createdAt: string;
	}

	interface GroupedSection {
		label: string;
		items: Notification[];
	}

	let items = $state<Notification[]>([]);
	let loading = $state(true);

	const grouped = $derived.by(() => {
		if (items.length === 0) return [];

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterdayStart = new Date(todayStart.getTime() - 86400000);
		const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

		const sections: GroupedSection[] = [];
		const today: Notification[] = [];
		const yesterday: Notification[] = [];
		const thisWeek: Notification[] = [];
		const earlier: Notification[] = [];

		for (const n of items) {
			const d = new Date(n.createdAt);
			if (d >= todayStart) today.push(n);
			else if (d >= yesterdayStart) yesterday.push(n);
			else if (d >= weekStart) thisWeek.push(n);
			else earlier.push(n);
		}

		if (today.length) sections.push({ label: 'Today', items: today });
		if (yesterday.length) sections.push({ label: 'Yesterday', items: yesterday });
		if (thisWeek.length) sections.push({ label: 'This Week', items: thisWeek });
		if (earlier.length) sections.push({ label: 'Earlier', items: earlier });

		return sections;
	});

	onMount(async () => {
		const res = await fetch('/api/notifications?limit=50');
		if (res.ok) {
			const data = await res.json();
			items = data.notifications;
		}
		loading = false;

		// Mark all as read
		await fetch('/api/notifications/mark-read', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ all: true })
		});
		fetchUnreadCount();
	});

	function description(n: Notification): string {
		if (n.type === 'reaction') {
			return `reacted ${n.emoji} to your clip`;
		}
		return 'commented on your clip';
	}
</script>

<svelte:head>
	<title>Activity — scrolly</title>
</svelte:head>

<div class="activity-page">
	{#if loading}
		<div class="activity-empty">
			<span class="spinner"></span>
		</div>
	{:else if items.length === 0}
		<div class="activity-empty">
			<div class="empty-icon">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
					<path d="M13.73 21a2 2 0 0 1-3.46 0" />
				</svg>
			</div>
			<p class="empty-title">No activity yet</p>
			<p class="empty-sub">Reactions and comments on your clips will show up here</p>
		</div>
	{:else}
		{#each grouped as section}
			<div class="section">
				<h2 class="section-header">{section.label}</h2>
				<div class="notification-list">
					{#each section.items as n (n.id)}
						<a href="/?clip={n.clipId}" class="notification-item" class:unread={!n.read}>
							<div class="actor-avatar">
								{#if n.actorAvatar}
									<img src="/api/profile/avatar/{n.actorAvatar}" alt="" class="avatar-img" />
								{:else}
									<span class="avatar-initial">
										{n.actorUsername.charAt(0).toUpperCase()}
									</span>
								{/if}
							</div>
							<div class="notification-body">
								<p class="notification-text">
									<span class="actor-name">{n.actorUsername}</span>
									{description(n)}
								</p>
								{#if n.type === 'comment' && n.commentPreview}
									<p class="comment-preview">{n.commentPreview}</p>
								{/if}
								<span class="notification-time">{relativeTime(n.createdAt)}</span>
							</div>
							{#if n.clipThumbnail}
								<div class="clip-thumb">
									<img src="/api/thumbnails/{n.clipThumbnail}" alt="" />
								</div>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.activity-page {
		max-width: 520px;
		margin: 0 auto;
	}

	.section {
		margin-bottom: var(--space-lg);
	}

	.section-header {
		font-family: var(--font-display);
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--text-secondary);
		margin: 0;
		padding: var(--space-sm) 0 var(--space-sm);
		letter-spacing: 0.01em;
	}

	.activity-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-3xl) var(--space-lg);
		gap: var(--space-sm);
	}

	.empty-icon {
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		margin-bottom: var(--space-sm);
	}

	.empty-icon svg {
		width: 48px;
		height: 48px;
		opacity: 0.4;
	}

	.empty-title {
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.empty-sub {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
		max-width: 240px;
		line-height: 1.4;
	}

	.notification-list {
		display: flex;
		flex-direction: column;
	}

	.notification-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-sm);
		text-decoration: none;
		color: inherit;
		border-radius: var(--radius-sm);
		transition: background 0.15s ease;
	}

	.notification-item:active {
		background: var(--bg-surface);
	}

	.notification-item.unread {
		background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
	}

	.actor-avatar {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		overflow: hidden;
		flex-shrink: 0;
		background: var(--bg-surface);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initial {
		color: var(--text-secondary);
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1rem;
	}

	.notification-body {
		flex: 1;
		min-width: 0;
	}

	.notification-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.actor-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.comment-preview {
		margin: 2px 0 0;
		font-size: 0.8125rem;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.notification-time {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.clip-thumb {
		width: 44px;
		height: 56px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		flex-shrink: 0;
		background: var(--bg-surface);
	}

	.clip-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.spinner {
		display: inline-block;
		width: 32px;
		height: 32px;
		border: 2.5px solid var(--bg-subtle);
		border-top-color: var(--text-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
