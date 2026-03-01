<script lang="ts">
	import { toast } from '$lib/stores/toasts';

	const { initialName }: { initialName: string } = $props();

	let savedName = $state('');
	let name = $state('');
	let initialized = false;

	$effect(() => {
		if (!initialized) {
			savedName = initialName;
			name = initialName;
			initialized = true;
		}
	});
	let saving = $state(false);
	let saved = $state(false);

	async function save() {
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
				setTimeout(() => (saved = false), 2000);
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
		onkeydown={handleKeydown}
		maxlength="50"
		disabled={saving}
		placeholder="Group name"
	/>
	{#if saved}
		<span class="saved-indicator">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="20 6 9 17 4 12" />
			</svg>
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

	.saved-indicator svg {
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
