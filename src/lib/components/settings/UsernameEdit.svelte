<script lang="ts">
	import { toast } from '$lib/stores/toasts';
	import { saveUsername } from '$lib/settingsApi';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';

	const { initialUsername }: { initialUsername: string } = $props();

	let savedName = $state(initialUsername);
	let name = $state(initialUsername);
	let saving = $state(false);
	let saved = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let savedFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
			if (savedFeedbackTimer) clearTimeout(savedFeedbackTimer);
		};
	});

	function debouncedSave() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => save(), 800);
	}

	async function save() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = null;
		const trimmed = name.trim();
		if (!trimmed || trimmed === savedName) {
			name = savedName;
			return;
		}

		saving = true;
		try {
			const result = await saveUsername(trimmed);
			if (result) {
				savedName = result.username;
				name = result.username;
				saved = true;
				savedFeedbackTimer = setTimeout(() => (saved = false), 2000);
			} else {
				name = savedName;
				toast.error('Failed to save username');
			}
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			(e.target as HTMLInputElement).blur();
		}
	}
</script>

<div class="name-edit">
	<input
		type="text"
		bind:value={name}
		onblur={save}
		oninput={debouncedSave}
		onkeydown={handleKeydown}
		maxlength="30"
		disabled={saving}
		placeholder="Your name"
	/>
	{#if saved}
		<span class="saved-indicator">
			<CheckIcon size={18} weight="bold" />
		</span>
	{/if}
</div>

<style>
	.name-edit {
		position: relative;
		display: flex;
		align-items: center;
	}

	input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		text-align: center;
		transition: border-color 0.2s ease;
	}

	input:hover {
		border-color: var(--border);
	}

	input:focus {
		outline: none;
		border-color: var(--accent-primary);
		background: var(--bg-surface);
	}

	input:disabled {
		opacity: 0.5;
	}

	input::placeholder {
		color: var(--text-muted);
	}

	.saved-indicator {
		position: absolute;
		right: var(--space-sm);
		color: var(--success);
		display: flex;
		align-items: center;
		animation: fade-in 0.2s ease;
	}

	.saved-indicator :global(svg) {
		width: 18px;
		height: 18px;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
