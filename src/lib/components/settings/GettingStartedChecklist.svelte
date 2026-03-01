<script lang="ts">
	import { onMount } from 'svelte';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';

	const {
		group,
		isStandaloneMode,
		memberCount,
		onscrollto
	}: {
		group: { name: string; accentColor: string; shortcutUrl: string | null };
		isStandaloneMode: boolean;
		memberCount: number;
		onscrollto: (sectionId: string) => void;
	} = $props();

	const STORAGE_KEY = 'scrolly_getting_started';

	let dismissed = $state(false);
	let manualChecks = $state<Record<string, boolean>>({});
	let loaded = $state(false);

	onMount(() => {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			try {
				const data = JSON.parse(raw);
				if (data.dismissed) dismissed = true;
				if (data.manualChecks) manualChecks = { ...data.manualChecks };
			} catch {
				/* ignore corrupt data */
			}
		}
		loaded = true;
	});

	$effect(() => {
		if (!loaded) return;
		// Read reactive values to track them
		const _d = dismissed;
		const _m = { ...manualChecks };
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: _d, manualChecks: _m }));
	});

	type ChecklistItem = {
		key: string;
		label: string;
		description: string;
		sectionId: string;
		autoComplete: boolean;
	};

	const items = $derived<ChecklistItem[]>([
		{
			key: 'groupName',
			label: 'Set a group name',
			description: 'Give your group a memorable name',
			sectionId: 'section-group-name',
			autoComplete: group.name !== 'Scrolly' && group.name.trim().length > 0
		},
		{
			key: 'groupColor',
			label: 'Pick a group color',
			description: 'Personalize with an accent color',
			sectionId: 'section-accent-color',
			autoComplete: group.accentColor !== 'coral'
		},
		{
			key: 'addMember',
			label: 'Add your first member',
			description: 'Invite someone to the group',
			sectionId: 'section-members',
			autoComplete: memberCount > 1
		},
		{
			key: 'shareAction',
			label: 'Set up Share Shortcut',
			description: 'Let Apple device members share clips from other apps',
			sectionId: 'section-share-from-apps',
			autoComplete: !!group.shortcutUrl
		},
		{
			key: 'installPwa',
			label: 'Install scrolly as an app',
			description: 'Add to your home screen for the full experience',
			sectionId: '',
			autoComplete: isStandaloneMode
		}
	]);

	const itemsWithStatus = $derived(
		items.map((item) => ({
			...item,
			completed: item.autoComplete || !!manualChecks[item.key]
		}))
	);

	const completedCount = $derived(itemsWithStatus.filter((i) => i.completed).length);
	const allComplete = $derived(completedCount === items.length);

	function toggleManualCheck(key: string) {
		manualChecks = { ...manualChecks, [key]: !manualChecks[key] };
	}

	function handleDismiss() {
		dismissed = true;
	}

	function handleItemClick(item: ChecklistItem) {
		if (item.sectionId) {
			onscrollto(item.sectionId);
		}
	}
</script>

{#if !dismissed && loaded}
	<div class="getting-started">
		<div class="getting-started-header">
			<div class="title-row">
				<h3 class="title">Getting started</h3>
				<button class="dismiss-btn" onclick={handleDismiss} aria-label="Dismiss checklist">
					<XIcon size={14} />
				</button>
			</div>
			<div class="progress-row">
				<div class="progress-bar">
					<div class="progress-fill" style="width: {(completedCount / items.length) * 100}%"></div>
				</div>
				<span class="progress-text">{completedCount}/{items.length}</span>
			</div>
		</div>

		<div class="checklist">
			{#each itemsWithStatus as item (item.key)}
				<div class="checklist-item" class:completed={item.completed}>
					<button
						class="check-circle"
						class:checked={item.completed}
						onclick={() => toggleManualCheck(item.key)}
						aria-label="Mark {item.label} as {item.completed ? 'incomplete' : 'complete'}"
					>
						{#if item.completed}
							<CheckIcon size={12} weight="bold" />
						{/if}
					</button>
					{#if item.sectionId}
						<button class="checklist-content" onclick={() => handleItemClick(item)}>
							<span class="checklist-label">{item.label}</span>
							<span class="checklist-desc">{item.description}</span>
						</button>
						<CaretRightIcon size={14} class="checklist-chevron" />
					{:else}
						<div class="checklist-content">
							<span class="checklist-label">{item.label}</span>
							<span class="checklist-desc">{item.description}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if allComplete}
			<button class="dismiss-complete-btn" onclick={handleDismiss}>
				All done — dismiss checklist
			</button>
		{/if}
	</div>
{/if}

<style>
	.getting-started {
		background: var(--bg-elevated);
		border-radius: var(--radius-md);
		padding: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.getting-started-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title {
		font-family: var(--font-display);
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.dismiss-btn {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		border: none;
		background: var(--bg-surface);
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: all 0.2s ease;
	}

	.dismiss-btn:active {
		transform: scale(0.93);
	}

	.progress-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.progress-bar {
		flex: 1;
		height: 4px;
		background: var(--bg-surface);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--accent-primary);
		border-radius: var(--radius-full);
		transition: width 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.progress-text {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.checklist {
		display: flex;
		flex-direction: column;
	}

	.checklist-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--bg-surface);
	}

	.checklist-item:first-child {
		padding-top: 0;
	}

	.checklist-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.check-circle {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-full);
		border: 2px solid var(--border);
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
		transition: all 0.2s ease;
		color: var(--bg-primary);
	}

	.check-circle.checked {
		background: var(--accent-primary);
		border-color: var(--accent-primary);
	}

	.check-circle:active {
		transform: scale(0.9);
	}

	.checklist-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: default;
		color: inherit;
		font: inherit;
	}

	button.checklist-content {
		cursor: pointer;
	}

	.checklist-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		transition: color 0.2s ease;
	}

	.completed .checklist-label {
		color: var(--text-muted);
		text-decoration: line-through;
	}

	.checklist-desc {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.checklist-item :global(.checklist-chevron) {
		flex-shrink: 0;
		color: var(--text-muted);
	}

	.dismiss-complete-btn {
		width: 100%;
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-lg);
		background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
		color: var(--accent-primary);
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.dismiss-complete-btn:active {
		transform: scale(0.97);
	}
</style>
