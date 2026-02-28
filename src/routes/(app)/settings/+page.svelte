<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		isPushSupported,
		getExistingSubscription,
		subscribeToPush,
		unsubscribeFromPush
	} from '$lib/push';
	import { ACCENT_COLORS, type AccentColorKey } from '$lib/colors';
	import { globalMuted } from '$lib/stores/mute';
	import MemberList from '$lib/components/settings/MemberList.svelte';
	import InviteLink from '$lib/components/settings/InviteLink.svelte';
	import GroupNameEdit from '$lib/components/settings/GroupNameEdit.svelte';
	import RetentionPicker from '$lib/components/settings/RetentionPicker.svelte';
	import ClipsManager from '$lib/components/settings/ClipsManager.svelte';

	const vapidPublicKey = $derived($page.data.vapidPublicKey as string);
	const user = $derived($page.data.user);
	const group = $derived($page.data.group);
	const isHost = $derived(group?.createdBy === user?.id);

	let activeTab = $state<'me' | 'group'>('me');

	let theme = $state<'system' | 'light' | 'dark'>(
		(user?.themePreference as 'system' | 'light' | 'dark') ?? 'system'
	);

	let autoScroll = $state(user?.autoScroll ?? false);
	let mutedByDefault = $state(user?.mutedByDefault ?? true);
	let currentAccent = $state<AccentColorKey>((group?.accentColor as AccentColorKey) ?? 'coral');

	let pushSupported = $state(false);
	let pushEnabled = $state(false);
	let pushLoading = $state(false);
	let prefsLoading = $state(true);

	let prefs = $state({
		newAdds: true,
		reactions: true,
		comments: true,
		dailyReminder: false
	});

	onMount(async () => {
		pushSupported = isPushSupported();

		if (pushSupported) {
			const sub = await getExistingSubscription();
			pushEnabled = !!sub;
		}

		const res = await fetch('/api/notifications/preferences');
		if (res.ok) {
			prefs = await res.json();
		}
		prefsLoading = false;
	});

	function handleThemeChange(value: 'system' | 'light' | 'dark') {
		theme = value;

		if (value === 'system') {
			document.documentElement.removeAttribute('data-theme');
		} else {
			document.documentElement.dataset.theme = value;
		}

		document.cookie = `scrolly_theme=${value};path=/;max-age=31536000;SameSite=Lax`;

		fetch('/api/profile/preferences', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ themePreference: value })
		});
	}

	function toggleAutoScroll() {
		autoScroll = !autoScroll;
		fetch('/api/profile/preferences', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ autoScroll })
		});
	}

	function toggleMutedByDefault() {
		mutedByDefault = !mutedByDefault;
		globalMuted.set(mutedByDefault);
		fetch('/api/profile/preferences', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mutedByDefault })
		});
	}

	async function togglePush() {
		pushLoading = true;
		try {
			if (pushEnabled) {
				await unsubscribeFromPush();
				pushEnabled = false;
			} else {
				const sub = await subscribeToPush(vapidPublicKey);
				pushEnabled = !!sub;
			}
		} finally {
			pushLoading = false;
		}
	}

	function handleAccentChange(key: AccentColorKey) {
		currentAccent = key;
		const color = ACCENT_COLORS[key];
		document.documentElement.style.setProperty('--accent-primary', color.hex);
		document.documentElement.style.setProperty('--accent-primary-dark', color.dark);
		document.cookie = `scrolly_accent=${encodeURIComponent(JSON.stringify({ hex: color.hex, dark: color.dark }))};path=/;max-age=31536000;SameSite=Lax`;
		fetch('/api/group/accent', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ accentColor: key })
		});
	}

	async function updatePref(key: string, value: boolean) {
		prefs = { ...prefs, [key]: value };
		await fetch('/api/notifications/preferences', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ [key]: value })
		});
	}
</script>

<svelte:head>
	<title>Settings — scrolly</title>
</svelte:head>

<div class="settings-page">
	<!-- Tab bar (only shown for hosts) -->
	{#if isHost}
		<div class="tab-bar">
			<button class="tab" class:active={activeTab === 'me'} onclick={() => (activeTab = 'me')}
				>Me</button
			>
			<button class="tab" class:active={activeTab === 'group'} onclick={() => (activeTab = 'group')}
				>Group</button
			>
		</div>
	{/if}

	<!-- ME TAB -->
	{#if activeTab === 'me'}
		<div class="tab-content">
			<!-- Profile header -->
			<div class="profile-header">
				<div class="avatar-large">
					{user?.username?.charAt(0)?.toUpperCase() ?? '?'}
				</div>
				<h2 class="profile-name">{user?.username}</h2>
				<span class="profile-phone">{user?.phone}</span>
				{#if group}
					<span class="group-pill">{group.name}</span>
				{/if}
			</div>

			<!-- Appearance -->
			<div class="settings-section">
				<h3 class="section-title">Appearance</h3>
				<div class="card">
					<div class="theme-toggle">
						<button
							class="theme-option"
							class:active={theme === 'system'}
							onclick={() => handleThemeChange('system')}>System</button
						>
						<button
							class="theme-option"
							class:active={theme === 'light'}
							onclick={() => handleThemeChange('light')}>Light</button
						>
						<button
							class="theme-option"
							class:active={theme === 'dark'}
							onclick={() => handleThemeChange('dark')}>Dark</button
						>
					</div>
				</div>
			</div>

			<!-- Playback -->
			<div class="settings-section">
				<h3 class="section-title">Playback</h3>
				<div class="card">
					<div class="setting-row">
						<div class="setting-label">
							<span class="setting-name">Start muted</span>
							<span class="setting-desc">Mute videos and songs by default</span>
						</div>
						<button class="toggle" class:active={mutedByDefault} onclick={toggleMutedByDefault}>
							<span class="toggle-thumb"></span>
						</button>
					</div>
					<div class="setting-row">
						<div class="setting-label">
							<span class="setting-name">Auto-scroll</span>
							<span class="setting-desc">Advance to next clip when current one ends</span>
						</div>
						<button class="toggle" class:active={autoScroll} onclick={toggleAutoScroll}>
							<span class="toggle-thumb"></span>
						</button>
					</div>
				</div>
			</div>

			<!-- Notifications -->
			<div class="settings-section">
				<h3 class="section-title">Notifications</h3>
				<div class="card">
					{#if !pushSupported}
						<p class="hint">Install scrolly to your home screen to enable push notifications.</p>
					{:else}
						<div class="setting-row">
							<div class="setting-label">
								<span class="setting-name">Push notifications</span>
								<span class="setting-desc">Receive alerts on this device</span>
							</div>
							<button
								class="toggle"
								class:active={pushEnabled}
								disabled={pushLoading}
								onclick={togglePush}
							>
								<span class="toggle-thumb"></span>
							</button>
						</div>

						{#if pushEnabled}
							<div class="divider"></div>
							<h4 class="sub-heading">Notify me about</h4>

							{#if prefsLoading}
								<p class="hint">Loading...</p>
							{:else}
								<div class="setting-row">
									<div class="setting-label">
										<span class="setting-name">New clips</span>
										<span class="setting-desc">When someone adds a video or song</span>
									</div>
									<button
										class="toggle"
										class:active={prefs.newAdds}
										onclick={() => updatePref('newAdds', !prefs.newAdds)}
									>
										<span class="toggle-thumb"></span>
									</button>
								</div>

								<div class="setting-row">
									<div class="setting-label">
										<span class="setting-name">Reactions</span>
										<span class="setting-desc">When someone reacts to your clip</span>
									</div>
									<button
										class="toggle"
										class:active={prefs.reactions}
										onclick={() => updatePref('reactions', !prefs.reactions)}
									>
										<span class="toggle-thumb"></span>
									</button>
								</div>

								<div class="setting-row">
									<div class="setting-label">
										<span class="setting-name">Comments</span>
										<span class="setting-desc">When someone comments on your clip</span>
									</div>
									<button
										class="toggle"
										class:active={prefs.comments}
										onclick={() => updatePref('comments', !prefs.comments)}
									>
										<span class="toggle-thumb"></span>
									</button>
								</div>

								<div class="setting-row last">
									<div class="setting-label">
										<span class="setting-name">Daily reminder</span>
										<span class="setting-desc">Nudge to check unwatched clips</span>
									</div>
									<button
										class="toggle"
										class:active={prefs.dailyReminder}
										onclick={() => updatePref('dailyReminder', !prefs.dailyReminder)}
									>
										<span class="toggle-thumb"></span>
									</button>
								</div>
							{/if}
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- GROUP TAB (host only) -->
	{#if activeTab === 'group' && isHost}
		<div class="tab-content">
			<!-- Group identity -->
			<div class="settings-section">
				<h3 class="section-title">Group Name</h3>
				<div class="card">
					<GroupNameEdit initialName={group.name} />
				</div>
			</div>

			<div class="settings-section">
				<h3 class="section-title">Accent Color</h3>
				<div class="card">
					<p class="setting-desc" style="margin-bottom: var(--space-md)">Applies to all members</p>
					<div class="color-palette">
						{#each Object.entries(ACCENT_COLORS) as [key, color]}
							<button
								class="color-swatch"
								class:active={currentAccent === key}
								style="--swatch-color: {color.hex}"
								onclick={() => handleAccentChange(key as AccentColorKey)}
								aria-label={color.label}
								title={color.label}
							>
								{#if currentAccent === key}
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="3"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Members -->
			<div class="settings-section">
				<h3 class="section-title">Members</h3>
				<div class="card">
					<MemberList groupId={group.id} hostId={group.createdBy} currentUserId={user.id} />
				</div>
			</div>

			<!-- Invite -->
			<div class="settings-section">
				<h3 class="section-title">Invite Link</h3>
				<div class="card">
					<InviteLink inviteCode={group.inviteCode} />
				</div>
			</div>

			<!-- Content Retention -->
			<div class="settings-section">
				<h3 class="section-title">Content Retention</h3>
				<div class="card">
					<RetentionPicker currentRetention={group.retentionDays} />
				</div>
			</div>

			<!-- Storage & Clips -->
			<div class="settings-section">
				<h3 class="section-title">Storage & Clips</h3>
				<div class="card">
					<ClipsManager />
				</div>
			</div>
		</div>
	{/if}

	<footer class="version-footer">
		<span>scrolly v{__APP_VERSION__}</span>
		<span class="attribution">
			Logo by <a
				href="https://thenounproject.com/icon/using-phone-on-toilet-970424/"
				target="_blank"
				rel="noopener">Gan Khoon Lay</a
			> via the Noun Project
		</span>
	</footer>
</div>

<style>
	.settings-page {
		max-width: 520px;
		margin: 0 auto;
		padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
	}

	/* Tab bar */
	.tab-bar {
		display: flex;
		gap: 2px;
		background: var(--bg-surface);
		border-radius: var(--radius-full);
		padding: 3px;
		margin-bottom: var(--space-xl);
	}

	.tab {
		flex: 1;
		padding: var(--space-sm) var(--space-lg);
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--text-secondary);
		font-family: var(--font-display);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tab.active {
		background: var(--text-primary);
		color: var(--bg-primary);
	}

	/* Tab content */
	.tab-content {
		display: flex;
		flex-direction: column;
	}

	/* Profile header - centered, prominent */
	.profile-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) 0 var(--space-xl);
	}

	.avatar-large {
		width: 80px;
		height: 80px;
		border-radius: var(--radius-full);
		background: var(--bg-surface);
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.75rem;
		flex-shrink: 0;
		margin-bottom: var(--space-xs);
	}

	.profile-name {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		text-transform: none;
		letter-spacing: -0.01em;
	}

	.profile-phone {
		color: var(--text-muted);
		font-size: 0.8125rem;
	}

	.group-pill {
		display: inline-flex;
		padding: 3px var(--space-sm);
		background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
		color: var(--accent-primary);
		border-radius: var(--radius-full);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		margin-top: var(--space-xs);
	}

	/* Settings sections */
	.settings-section {
		margin-bottom: var(--space-lg);
	}

	.section-title {
		font-family: var(--font-display);
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin: 0 0 var(--space-sm);
		padding: 0 var(--space-xs);
	}

	/* Cards */
	.card {
		background: var(--bg-elevated);
		border-radius: var(--radius-md);
		padding: var(--space-lg);
	}

	.divider {
		height: 1px;
		background: var(--bg-surface);
		margin: var(--space-lg) 0;
	}

	.sub-heading {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0 0 var(--space-sm);
	}

	/* Theme toggle */
	.theme-toggle {
		display: flex;
		gap: 2px;
		background: var(--bg-surface);
		border-radius: var(--radius-full);
		padding: 3px;
	}

	.theme-option {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.theme-option.active {
		background: var(--text-primary);
		color: var(--bg-primary);
	}

	/* Setting rows */
	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--bg-surface);
	}

	.setting-row.last,
	.setting-row:last-child {
		border-bottom: none;
	}

	.setting-label {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.setting-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.setting-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.hint {
		color: var(--text-muted);
		font-size: 0.8125rem;
		line-height: 1.5;
		margin: 0;
	}

	/* Toggle */
	.toggle {
		position: relative;
		width: 44px;
		height: 26px;
		border-radius: 13px;
		border: none;
		background: var(--border);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.2s;
		padding: 0;
	}

	.toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle.active {
		background: var(--accent-primary);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.toggle.active .toggle-thumb {
		transform: translateX(18px);
	}

	/* Color palette */
	.color-palette {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.color-swatch {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		border: 2px solid transparent;
		background: var(--swatch-color);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 0.2s ease,
			transform 0.1s ease;
		padding: 0;
	}

	.color-swatch:active {
		transform: scale(0.95);
	}

	.color-swatch.active {
		border-color: var(--text-primary);
		transform: scale(1.1);
	}

	.color-swatch svg {
		width: 16px;
		height: 16px;
		color: #000000;
	}

	.version-footer {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.75rem;
		padding: var(--space-xl) 0;
		margin-top: var(--space-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.attribution {
		font-size: 0.6875rem;
		color: var(--text-muted);
		opacity: 0.7;
	}

	.attribution a {
		color: var(--text-muted);
		text-decoration: underline;
	}
</style>
