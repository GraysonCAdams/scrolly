<script lang="ts">
	/* eslint-disable max-lines */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		isPushSupported,
		getExistingSubscription,
		subscribeToPush,
		unsubscribeFromPush
	} from '$lib/push';
	import { type AccentColorKey } from '$lib/colors';
	import { globalMuted } from '$lib/stores/mute';
	import CameraIcon from 'phosphor-svelte/lib/CameraIcon';
	import ExportIcon from 'phosphor-svelte/lib/ExportIcon';
	import {
		applyTheme,
		saveThemePreference,
		saveAutoScroll,
		saveMutedByDefault,
		applyAccentColor,
		saveAccentColor,
		fetchNotificationPrefs,
		updateNotificationPref,
		type NotificationPrefs
	} from '$lib/settingsApi';
	import MemberList from '$lib/components/settings/MemberList.svelte';
	import InviteLink from '$lib/components/settings/InviteLink.svelte';
	import GroupNameEdit from '$lib/components/settings/GroupNameEdit.svelte';
	import RetentionPicker from '$lib/components/settings/RetentionPicker.svelte';
	import MaxFileSizePicker from '$lib/components/settings/MaxFileSizePicker.svelte';
	import ClipsManager from '$lib/components/settings/ClipsManager.svelte';
	import NotificationSettings from '$lib/components/settings/NotificationSettings.svelte';
	import AccentColorPicker from '$lib/components/settings/AccentColorPicker.svelte';
	import DownloadProviderManager from '$lib/components/settings/DownloadProviderManager.svelte';
	import PlatformFilter from '$lib/components/settings/PlatformFilter.svelte';
	import ShortcutManager from '$lib/components/settings/ShortcutManager.svelte';
	import AvatarCropModal from '$lib/components/AvatarCropModal.svelte';

	const vapidPublicKey = $derived($page.data.vapidPublicKey as string);
	const user = $derived($page.data.user);
	const group = $derived($page.data.group);
	const isHost = $derived(group?.createdBy === user?.id);

	let activeTab = $state<'me' | 'group'>('me');
	let showAvatarCrop = $state(false);
	let avatarOverride = $state<string | null | undefined>(undefined);
	let avatarCacheBust = $state(0);
	const avatarPath = $derived(
		avatarOverride !== undefined ? avatarOverride : (user?.avatarPath ?? null)
	);
	const avatarUrl = $derived(
		avatarPath ? `/api/profile/avatar/${avatarPath}?v=${avatarCacheBust}` : null
	);

	function handleAvatarUploaded(path: string) {
		avatarOverride = path;
		avatarCacheBust = Date.now();
		showAvatarCrop = false;
	}

	async function handleRemoveAvatar() {
		const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
		if (res.ok) {
			avatarOverride = null;
		}
	}
	let themeOverride = $state<'system' | 'light' | 'dark' | null>(null);
	let autoScrollOverride = $state<boolean | null>(null);
	let mutedByDefaultOverride = $state<boolean | null>(null);
	let currentAccentOverride = $state<AccentColorKey | null>(null);

	const theme = $derived(
		themeOverride ?? (user?.themePreference as 'system' | 'light' | 'dark') ?? 'system'
	);
	const autoScroll = $derived(autoScrollOverride ?? user?.autoScroll ?? false);
	const mutedByDefault = $derived(mutedByDefaultOverride ?? user?.mutedByDefault ?? true);
	const currentAccent = $derived(
		currentAccentOverride ?? (group?.accentColor as AccentColorKey) ?? 'coral'
	);
	const themeIndex = $derived.by(() => {
		if (theme === 'system') return 0;
		if (theme === 'light') return 1;
		return 2;
	});

	let showShareCta = $state(false);
	let pushSupported = $state(false);
	let pushEnabled = $state(false);
	let pushLoading = $state(false);
	let prefsLoading = $state(true);
	let prefs = $state<NotificationPrefs>({
		newAdds: true,
		reactions: true,
		comments: true,
		mentions: true,
		dailyReminder: false
	});

	onMount(async () => {
		const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
		showShareCta = isMobile || import.meta.env.DEV;

		pushSupported = isPushSupported();
		if (pushSupported) {
			const sub = await getExistingSubscription();
			pushEnabled = !!sub;
		}
		prefs = await fetchNotificationPrefs();
		prefsLoading = false;
	});

	function handleThemeChange(value: 'system' | 'light' | 'dark') {
		themeOverride = value;
		applyTheme(value);
		saveThemePreference(value);
	}

	function toggleAutoScroll() {
		autoScrollOverride = !autoScroll;
		saveAutoScroll(!autoScroll);
	}

	function toggleMutedByDefault() {
		mutedByDefaultOverride = !mutedByDefault;
		globalMuted.set(!mutedByDefault);
		saveMutedByDefault(!mutedByDefault);
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
		currentAccentOverride = key;
		applyAccentColor(key);
		saveAccentColor(key);
	}

	function handleUpdatePref(key: string, value: boolean) {
		prefs = { ...prefs, [key]: value };
		updateNotificationPref(key, value);
	}
</script>

<svelte:head>
	<title>Settings — scrolly</title>
</svelte:head>

<div class="settings-page">
	{#if isHost}
		<div class="tab-bar">
			<div class="tab-bg" style="transform: translateX({activeTab === 'me' ? '0%' : '100%'})"></div>
			<button class="tab" class:active={activeTab === 'me'} onclick={() => (activeTab = 'me')}
				>Me</button
			>
			<button class="tab" class:active={activeTab === 'group'} onclick={() => (activeTab = 'group')}
				>Group</button
			>
		</div>
	{/if}

	{#if activeTab === 'me'}
		<div class="tab-content">
			<div class="profile-header">
				<button class="avatar-btn" onclick={() => (showAvatarCrop = true)}>
					{#if avatarUrl}
						<img src={avatarUrl} alt="Profile" class="avatar-large avatar-img" />
					{:else}
						<div class="avatar-large avatar-initials">
							{user?.username?.charAt(0)?.toUpperCase() ?? '?'}
						</div>
					{/if}
					<span class="avatar-edit-badge">
						<CameraIcon size={14} />
					</span>
				</button>
				{#if avatarPath}
					<button class="remove-photo-btn" onclick={handleRemoveAvatar}>Remove photo</button>
				{/if}
				<h2 class="profile-name">{user?.username}</h2>
				<span class="profile-phone">{user?.phone}</span>
				{#if group}
					<span class="group-pill">{group.name}</span>
				{/if}
			</div>

			{#if showShareCta}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="/share/setup" class="share-cta">
					<ExportIcon size={18} class="share-cta-icon" />
					<div class="share-cta-content">
						<span class="share-cta-title">Share from other apps</span>
						<span class="share-cta-desc">Add clips directly from supported platforms</span>
					</div>
					<span class="share-cta-btn">Set up</span>
				</a>
			{/if}

			<div class="settings-section">
				<h3 class="section-title">Playback</h3>
				<div class="card">
					<div class="setting-row">
						<div class="setting-label">
							<span class="setting-name">Start muted</span>
							<span class="setting-desc">Mute videos and songs by default</span>
						</div>
						<button
							class="toggle"
							class:active={mutedByDefault}
							onclick={toggleMutedByDefault}
							aria-label="Toggle start muted"
						>
							<span class="toggle-thumb"></span>
						</button>
					</div>
					<div class="setting-row">
						<div class="setting-label">
							<span class="setting-name">Auto-scroll</span>
							<span class="setting-desc">Advance to next clip when current one ends</span>
						</div>
						<button
							class="toggle"
							class:active={autoScroll}
							onclick={toggleAutoScroll}
							aria-label="Toggle auto-scroll"
						>
							<span class="toggle-thumb"></span>
						</button>
					</div>
				</div>
			</div>

			<div class="settings-section">
				<h3 class="section-title">Notifications</h3>
				<div class="card">
					<NotificationSettings
						{pushSupported}
						{pushEnabled}
						{pushLoading}
						{prefs}
						{prefsLoading}
						onTogglePush={togglePush}
						onUpdatePref={handleUpdatePref}
					/>
				</div>
			</div>

			<div class="settings-section">
				<h3 class="section-title">Appearance</h3>
				<div class="card">
					<div class="theme-toggle">
						<div class="theme-bg" style="transform: translateX({themeIndex * 100}%)"></div>
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
		</div>
	{/if}

	{#if activeTab === 'group' && isHost}
		<div class="tab-content">
			<div class="settings-section">
				<h3 class="section-title">Group Name</h3>
				<div class="card"><GroupNameEdit initialName={group.name} /></div>
			</div>
			<div class="settings-section">
				<h3 class="section-title">Accent Color</h3>
				<div class="card">
					<AccentColorPicker {currentAccent} onchange={handleAccentChange} />
				</div>
			</div>

			<div class="settings-section">
				<h3 class="section-title">Members</h3>
				<div class="card">
					<MemberList groupId={group.id} hostId={group.createdBy} currentUserId={user.id} />
				</div>
			</div>
			<div class="settings-section">
				<h3 class="section-title">Invite Link</h3>
				<div class="card"><InviteLink inviteCode={group.inviteCode} /></div>
			</div>

			<div class="settings-section">
				<h3 class="section-title">Download Provider</h3>
				<div class="card"><DownloadProviderManager /></div>
			</div>
			<div class="settings-section">
				<h3 class="section-title">Allowed Platforms</h3>
				<div class="card">
					<PlatformFilter
						currentMode={group.platformFilterMode}
						currentPlatforms={group.platformFilterList
							? JSON.parse(group.platformFilterList)
							: null}
					/>
				</div>
			</div>
			{#if group.shortcutToken}
				<div class="settings-section">
					<h3 class="section-title">iOS Shortcut</h3>
					<div class="card">
						<ShortcutManager shortcutToken={group.shortcutToken} shortcutUrl={group.shortcutUrl} />
					</div>
				</div>
			{/if}

			<div class="settings-section">
				<h3 class="section-title">Max Clip Size</h3>
				<div class="card">
					<MaxFileSizePicker currentMaxFileSizeMb={group.maxFileSizeMb} />
				</div>
			</div>
			<div class="settings-section">
				<h3 class="section-title">Content Retention</h3>
				<div class="card"><RetentionPicker currentRetention={group.retentionDays} /></div>
			</div>
			<div class="settings-section">
				<h3 class="section-title">Storage & Clips</h3>
				<div class="card"><ClipsManager /></div>
			</div>
		</div>
	{/if}

	{#if showAvatarCrop}
		<AvatarCropModal ondismiss={() => (showAvatarCrop = false)} onuploaded={handleAvatarUploaded} />
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

	.tab-bar {
		display: flex;
		gap: 2px;
		background: var(--bg-surface);
		border-radius: var(--radius-full);
		padding: 3px;
		margin-bottom: var(--space-xl);
		position: relative;
	}

	.tab-bg {
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 3px;
		width: calc(50% - 3px);
		background: var(--text-primary);
		border-radius: var(--radius-full);
		transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
		z-index: 0;
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
		transition: color 0.2s ease;
		position: relative;
		z-index: 1;
	}

	.tab.active {
		color: var(--bg-primary);
	}

	.tab-content {
		display: flex;
		flex-direction: column;
	}

	.profile-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) 0 var(--space-xl);
	}

	.avatar-btn {
		position: relative;
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
		margin-bottom: var(--space-xs);
	}

	.avatar-btn:active {
		transform: scale(0.97);
	}

	.avatar-large {
		width: 80px;
		height: 80px;
		border-radius: var(--radius-full);
	}

	.avatar-initials {
		background: var(--bg-surface);
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.75rem;
	}

	.avatar-img {
		object-fit: cover;
		display: block;
	}

	.avatar-edit-badge {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background: var(--accent-primary);
		color: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--bg-primary);
	}

	.remove-photo-btn {
		border: none;
		background: none;
		color: var(--error);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}

	.profile-name {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
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

	.card {
		background: var(--bg-elevated);
		border-radius: var(--radius-md);
		padding: var(--space-lg);
	}

	.theme-toggle {
		display: flex;
		gap: 2px;
		background: var(--bg-surface);
		border-radius: var(--radius-full);
		padding: 3px;
		position: relative;
	}

	.theme-bg {
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 3px;
		width: calc(33.333% - 2px);
		background: var(--text-primary);
		border-radius: var(--radius-full);
		transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
		z-index: 0;
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
		transition: color 0.2s ease;
		position: relative;
		z-index: 1;
	}

	.theme-option.active {
		color: var(--bg-primary);
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--bg-surface);
	}

	.setting-row:first-child {
		padding-top: 0;
	}

	.setting-row:last-child {
		border-bottom: none;
		padding-bottom: 0;
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

	.share-cta {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		background: var(--bg-elevated);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin: var(--space-lg) 0;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.share-cta:active {
		transform: scale(0.98);
	}

	.share-cta :global(.share-cta-icon) {
		flex-shrink: 0;
		color: var(--accent-primary);
	}

	.share-cta-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		flex: 1;
	}

	.share-cta-title {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.share-cta-desc {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.share-cta-btn {
		flex-shrink: 0;
		background: var(--accent-primary);
		color: var(--bg-primary);
		font-size: 0.8125rem;
		font-weight: 700;
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-full);
	}

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

	.toggle.active {
		background: var(--accent-primary);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 22px;
		height: 22px;
		border-radius: var(--radius-full);
		background: var(--constant-white);
		transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.toggle.active .toggle-thumb {
		transform: translateX(18px);
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
