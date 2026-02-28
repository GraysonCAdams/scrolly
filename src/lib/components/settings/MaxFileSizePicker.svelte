<script lang="ts">
	const { currentMaxFileSizeMb }: { currentMaxFileSizeMb: number | null } = $props();

	const STEPS = [
		{ mb: 25, label: '25 MB', duration: '~15 seconds' },
		{ mb: 50, label: '50 MB', duration: '~30 seconds' },
		{ mb: 100, label: '100 MB', duration: '~1 minute' },
		{ mb: 200, label: '200 MB', duration: '~2 minutes' },
		{ mb: 500, label: '500 MB', duration: '~5 minutes' },
		{ mb: null, label: '\u221E', duration: 'No limit' }
	];

	function mbToIndex(mb: number | null): number {
		const idx = STEPS.findIndex((s) => s.mb === mb);
		return idx >= 0 ? idx : STEPS.length - 1;
	}

	let sliderIndex = $state(mbToIndex(currentMaxFileSizeMb));
	let saving = $state(false);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	const currentStep = $derived(STEPS[sliderIndex]);
	const isNoLimit = $derived(sliderIndex === STEPS.length - 1);
	const progress = $derived((sliderIndex / (STEPS.length - 1)) * 100);

	function handleInput(e: Event) {
		sliderIndex = parseInt((e.target as HTMLInputElement).value);

		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => save(currentStep.mb), 300);
	}

	async function save(mb: number | null) {
		saving = true;
		try {
			await fetch('/api/group/max-file-size', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ maxFileSizeMb: mb })
			});
		} finally {
			saving = false;
		}
	}
</script>

<div class="size-picker">
	<div class="value-display">
		<span class="value-text" class:infinity={isNoLimit}>
			{currentStep.label}
		</span>
		<span class="duration-estimate">
			{currentStep.duration}
			{#if saving}
				<span class="saving-dot"></span>
			{/if}
		</span>
	</div>

	<div class="slider-container">
		<input
			type="range"
			min="0"
			max={STEPS.length - 1}
			step="1"
			value={sliderIndex}
			oninput={handleInput}
			class="slider"
			style="--progress: {progress}%"
			aria-label="Max file size"
		/>
		<div class="ticks">
			{#each STEPS as step, i (i)}
				<button
					class="tick"
					class:active={i <= sliderIndex}
					class:current={i === sliderIndex}
					onclick={() => {
						sliderIndex = i;
						if (saveTimeout) clearTimeout(saveTimeout);
						saveTimeout = setTimeout(() => save(step.mb), 300);
					}}
					aria-label="Set max size to {step.label}"
				>
					<div class="tick-mark"></div>
					<span class="tick-label">{step.mb ?? '\u221E'}</span>
				</button>
			{/each}
		</div>
	</div>

	<p class="desc">
		{#if isNoLimit}
			No file size limit. Clips of any size will be accepted.
		{:else}
			Clips larger than {currentStep.label} will be rejected.
		{/if}
	</p>
</div>

<style>
	.size-picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.value-display {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.value-text {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		line-height: 1.1;
		transition:
			font-size 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
			color 0.2s ease;
	}

	.value-text.infinity {
		font-size: 2.5rem;
		color: var(--accent-primary);
	}

	.duration-estimate {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.saving-dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: var(--accent-primary);
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}

	/* Slider container */
	.slider-container {
		position: relative;
		padding: var(--space-xs) 0 var(--space-2xl);
	}

	/* Range input */
	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: linear-gradient(
			to right,
			var(--accent-primary) 0%,
			var(--accent-primary) var(--progress),
			var(--bg-surface) var(--progress),
			var(--bg-surface) 100%
		);
		outline: none;
		cursor: pointer;
		margin: 0;
	}

	/* WebKit thumb */
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 26px;
		height: 26px;
		border-radius: var(--radius-full);
		background: var(--accent-primary);
		border: 3px solid var(--bg-elevated);
		box-shadow:
			0 2px 6px rgba(0, 0, 0, 0.3),
			0 0 0 1px rgba(0, 0, 0, 0.1);
		cursor: grab;
		transition: transform 0.15s ease;
	}

	.slider::-webkit-slider-thumb:active {
		cursor: grabbing;
		transform: scale(1.15);
	}

	/* Firefox thumb */
	.slider::-moz-range-thumb {
		width: 26px;
		height: 26px;
		border-radius: var(--radius-full);
		background: var(--accent-primary);
		border: 3px solid var(--bg-elevated);
		box-shadow:
			0 2px 6px rgba(0, 0, 0, 0.3),
			0 0 0 1px rgba(0, 0, 0, 0.1);
		cursor: grab;
	}

	.slider::-moz-range-thumb:active {
		cursor: grabbing;
		transform: scale(1.15);
	}

	.slider::-moz-range-track {
		height: 6px;
		border-radius: 3px;
		background: var(--bg-surface);
		border: none;
	}

	.slider::-moz-range-progress {
		height: 6px;
		border-radius: 3px;
		background: var(--accent-primary);
	}

	/* Tick marks */
	.ticks {
		display: flex;
		justify-content: space-between;
		position: absolute;
		left: 0;
		right: 0;
		top: 22px;
		pointer-events: auto;
	}

	.tick {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		background: none;
		border: none;
		padding: 4px 2px;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.tick:active {
		transform: scale(0.95);
	}

	.tick-mark {
		width: 2px;
		height: 8px;
		background: var(--border);
		border-radius: 1px;
		transition:
			background 0.2s ease,
			height 0.2s ease;
	}

	.tick.active .tick-mark {
		background: var(--accent-primary);
	}

	.tick.current .tick-mark {
		height: 12px;
		background: var(--accent-primary);
	}

	.tick-label {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--text-muted);
		transition: color 0.2s ease;
		line-height: 1;
	}

	.tick.active .tick-label {
		color: var(--text-secondary);
	}

	.tick.current .tick-label {
		color: var(--accent-primary);
		font-weight: 700;
	}

	.desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
		text-align: center;
	}
</style>
