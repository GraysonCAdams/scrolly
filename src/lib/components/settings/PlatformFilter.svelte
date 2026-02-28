<script lang="ts">
	import { ALL_PLATFORMS } from '$lib/url-validation';

	const {
		currentMode,
		currentPlatforms
	}: {
		currentMode: string;
		currentPlatforms: string[] | null;
	} = $props();

	let modeOverride = $state<string | null>(null);
	let platformsOverride = $state<string[] | null>(null);
	let saving = $state(false);
	let saveTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	const mode = $derived(modeOverride ?? currentMode);
	const platforms = $derived(platformsOverride ?? currentPlatforms ?? []);

	const videoPlatforms = ALL_PLATFORMS.filter((p) => p.contentType === 'video');
	const musicPlatforms = ALL_PLATFORMS.filter((p) => p.contentType === 'music');

	const allSelected = $derived(platforms.length === ALL_PLATFORMS.length);

	const modeIndex = $derived.by(() => {
		if (mode === 'all') return 0;
		if (mode === 'allow') return 1;
		return 2;
	});

	const description = $derived.by(() => {
		if (mode === 'all') return 'All supported platforms are accepted.';
		if (mode === 'allow') {
			return platforms.length === 1
				? `Only 1 platform can be added.`
				: `Only ${platforms.length} selected platforms can be added.`;
		}
		return platforms.length === 1
			? `1 platform is blocked.`
			: `${platforms.length} platforms are blocked.`;
	});

	async function saveFilter(newMode: string, newPlatforms: string[]) {
		saving = true;
		try {
			await fetch('/api/group/platforms', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode: newMode,
					platforms: newMode === 'all' ? [] : newPlatforms
				})
			});
		} finally {
			saving = false;
		}
	}

	function debouncedSave(newMode: string, newPlatforms: string[]) {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveFilter(newMode, newPlatforms), 300);
	}

	function handleModeChange(newMode: string) {
		modeOverride = newMode;
		if (newMode === 'all') {
			platformsOverride = [];
			saveFilter(newMode, []);
		} else if (platforms.length === 0) {
			// Default to all platforms selected when switching to allow/block
			const allKeys = ALL_PLATFORMS.map((p) => p.key);
			platformsOverride = allKeys;
			saveFilter(newMode, allKeys);
		} else {
			saveFilter(newMode, platforms);
		}
	}

	function togglePlatform(key: string) {
		const current = [...platforms];
		const idx = current.indexOf(key);
		if (idx >= 0) {
			// Don't allow deselecting the last platform in allow mode
			if (mode === 'allow' && current.length <= 1) return;
			current.splice(idx, 1);
		} else {
			current.push(key);
		}
		platformsOverride = current;
		debouncedSave(mode, current);
	}

	function toggleAll() {
		if (allSelected) {
			// In allow mode, keep at least one
			if (mode === 'allow') return;
			platformsOverride = [];
		} else {
			platformsOverride = ALL_PLATFORMS.map((p) => p.key);
		}
		debouncedSave(mode, platformsOverride);
	}
</script>

<div class="platform-filter">
	<div class="mode-toggle">
		<div class="mode-bg" style="transform: translateX({modeIndex * 100}%)"></div>
		<button
			class="mode-option"
			class:active={mode === 'all'}
			disabled={saving}
			onclick={() => handleModeChange('all')}>All sites</button
		>
		<button
			class="mode-option"
			class:active={mode === 'allow'}
			disabled={saving}
			onclick={() => handleModeChange('allow')}>Allow only</button
		>
		<button
			class="mode-option"
			class:active={mode === 'block'}
			disabled={saving}
			onclick={() => handleModeChange('block')}>Block</button
		>
	</div>

	<p class="desc">{description}</p>

	{#if mode !== 'all'}
		<div class="platform-list">
			<button
				class="toggle-all"
				onclick={toggleAll}
				disabled={saving || (mode === 'allow' && allSelected)}
			>
				{allSelected ? 'Deselect all' : 'Select all'}
			</button>

			<div class="group-label">Video</div>
			{#each videoPlatforms as p (p.key)}
				<label class="platform-row">
					<span class="platform-name">{p.label}</span>
					<button
						class="check"
						class:checked={platforms.includes(p.key)}
						disabled={saving ||
							(mode === 'allow' && platforms.length <= 1 && platforms.includes(p.key))}
						onclick={() => togglePlatform(p.key)}
						aria-label="Toggle {p.label}"
					>
						{#if platforms.includes(p.key)}
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
				</label>
			{/each}

			<div class="group-label">Music</div>
			{#each musicPlatforms as p (p.key)}
				<label class="platform-row">
					<span class="platform-name">{p.label}</span>
					<button
						class="check"
						class:checked={platforms.includes(p.key)}
						disabled={saving ||
							(mode === 'allow' && platforms.length <= 1 && platforms.includes(p.key))}
						onclick={() => togglePlatform(p.key)}
						aria-label="Toggle {p.label}"
					>
						{#if platforms.includes(p.key)}
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
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
	.platform-filter {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.mode-toggle {
		display: flex;
		gap: 2px;
		background: var(--bg-surface);
		border-radius: var(--radius-full);
		padding: 3px;
		position: relative;
	}

	.mode-bg {
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

	.mode-option {
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

	.mode-option.active {
		color: var(--bg-primary);
	}

	.mode-option:disabled {
		cursor: not-allowed;
	}

	.desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
	}

	.platform-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-top: var(--space-xs);
	}

	.toggle-all {
		align-self: flex-end;
		background: none;
		border: none;
		color: var(--accent-primary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		padding: var(--space-xs) 0;
	}

	.toggle-all:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.group-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		padding: var(--space-sm) 0 var(--space-xs);
	}

	.platform-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--bg-surface);
		cursor: pointer;
	}

	.platform-row:last-child {
		border-bottom: none;
	}

	.platform-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.check {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		border: 2px solid var(--border);
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		flex-shrink: 0;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.check.checked {
		background: var(--accent-primary);
		border-color: var(--accent-primary);
	}

	.check.checked svg {
		width: 14px;
		height: 14px;
		color: var(--bg-primary);
	}

	.check:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
