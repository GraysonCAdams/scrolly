<script lang="ts">
	import type { NotificationPrefs } from '$lib/settingsApi';

	let {
		pushSupported,
		pushEnabled,
		pushLoading,
		prefs,
		prefsLoading,
		onTogglePush,
		onUpdatePref
	}: {
		pushSupported: boolean;
		pushEnabled: boolean;
		pushLoading: boolean;
		prefs: NotificationPrefs;
		prefsLoading: boolean;
		onTogglePush: () => void;
		onUpdatePref: (key: string, value: boolean) => void;
	} = $props();
</script>

{#if !pushSupported}
	<p class="hint">Install scrolly to your home screen to enable push notifications.</p>
{:else}
	<div class="setting-row last">
		<div class="setting-label">
			<span class="setting-name">Push notifications</span>
			<span class="setting-desc">Receive alerts on this device</span>
		</div>
		<button
			class="toggle"
			class:active={pushEnabled}
			disabled={pushLoading}
			onclick={onTogglePush}
			aria-label="Toggle push notifications"
		>
			<span class="toggle-thumb"></span>
		</button>
	</div>

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
				class:active={prefs.newAdds && pushEnabled}
				disabled={!pushEnabled}
				onclick={() => onUpdatePref('newAdds', !prefs.newAdds)}
				aria-label="Toggle new clips notifications"
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
				class:active={prefs.reactions && pushEnabled}
				disabled={!pushEnabled}
				onclick={() => onUpdatePref('reactions', !prefs.reactions)}
				aria-label="Toggle reaction notifications"
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
				class:active={prefs.comments && pushEnabled}
				disabled={!pushEnabled}
				onclick={() => onUpdatePref('comments', !prefs.comments)}
				aria-label="Toggle comment notifications"
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
				class:active={prefs.dailyReminder && pushEnabled}
				disabled={!pushEnabled}
				onclick={() => onUpdatePref('dailyReminder', !prefs.dailyReminder)}
				aria-label="Toggle daily reminder"
			>
				<span class="toggle-thumb"></span>
			</button>
		</div>
	{/if}
{/if}

<style>
	.hint {
		color: var(--text-muted);
		font-size: 0.8125rem;
		line-height: 1.5;
		margin: 0;
	}

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
		border-radius: var(--radius-full);
		background: var(--constant-white);
		transition: transform 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}
	.toggle.active .toggle-thumb {
		transform: translateX(18px);
	}
</style>
