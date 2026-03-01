<script lang="ts">
	import { toast } from '$lib/stores/toasts';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';

	const { initialName }: { initialName: string } = $props();

	let savedName = $state(initialName);
	let name = $state(initialName);
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
			const res = await fetch('/api/group/name', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: trimmed })
			});
			if (res.ok) {
				const data = await res.json();
				savedName = data.name;
				name = data.name;
				saved = true;
				savedFeedbackTimer = setTimeout(() => (saved = false), 2000);
			} else {
				name = savedName;
				toast.error('Failed to save group name');
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
		maxlength="50"
		disabled={saving}
		placeholder="Group name"
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
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-primary);
		transition: border-color 0.2s ease;
	}

	input:focus {
		outline: none;
		border-color: var(--accent-primary);
	}

	input:disabled {
		opacity: 0.5;
	}

	input::placeholder {
		color: var(--text-muted);
	}

	.saved-indicator {
		position: absolute;
		right: var(--space-md);
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
