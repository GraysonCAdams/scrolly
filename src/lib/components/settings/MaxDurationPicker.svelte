<script lang="ts">
	const { currentMaxDuration }: { currentMaxDuration: number } = $props();

	let duration = $state<string>(String(currentMaxDuration));
	let saving = $state(false);

	const options = [
		{ value: '60', label: '1 minute' },
		{ value: '120', label: '2 minutes' },
		{ value: '180', label: '3 minutes' },
		{ value: '300', label: '5 minutes' },
		{ value: '600', label: '10 minutes' },
		{ value: '900', label: '15 minutes' },
		{ value: '1800', label: '30 minutes' }
	];

	const description = $derived(() => {
		const secs = parseInt(duration);
		const mins = Math.round(secs / 60);
		return `Clips longer than ${mins} minute${mins === 1 ? '' : 's'} will be rejected.`;
	});

	async function handleChange(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		duration = value;
		saving = true;

		try {
			await fetch('/api/group/max-duration', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ maxDurationSeconds: parseInt(value) })
			});
		} finally {
			saving = false;
		}
	}
</script>

<div class="duration-picker">
	<select value={duration} onchange={handleChange} disabled={saving}>
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	<p class="desc">{description()}</p>
</div>

<style>
	.duration-picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	select {
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--text-primary);
		cursor: pointer;
		transition: border-color 0.2s ease;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right var(--space-md) center;
		padding-right: 2.5rem;
	}

	select:focus {
		outline: none;
		border-color: var(--accent-primary);
	}

	select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
	}
</style>
