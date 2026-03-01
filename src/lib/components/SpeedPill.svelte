<script lang="ts">
	import { globalPlaybackSpeed, cycleSpeed } from '$lib/stores/playbackSpeed';

	let {
		active,
		onspeedchange
	}: {
		active: boolean;
		onspeedchange: () => void;
	} = $props();

	let speed = $state($globalPlaybackSpeed);
	const unsubSpeed = globalPlaybackSpeed.subscribe((v) => {
		speed = v;
	});

	import { onDestroy } from 'svelte';
	onDestroy(unsubSpeed);

	function handleCycleSpeed() {
		cycleSpeed();
		onspeedchange();
	}
</script>

<button
	type="button"
	class="speed-pill"
	class:visible={active}
	class:highlight={speed !== 1}
	onclick={(e) => {
		e.stopPropagation();
		handleCycleSpeed();
	}}
	aria-label="Change playback speed"
>
	{speed}x
</button>

<style>
	.speed-pill {
		padding: 4px 10px;
		border: none;
		border-radius: var(--radius-full);
		background: rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: rgba(255, 255, 255, 0.6);
		font-family: var(--font-display);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.2s ease,
			background 0.2s ease,
			color 0.2s ease;
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.speed-pill.visible {
		opacity: 1;
		pointer-events: auto;
	}
	.speed-pill.highlight {
		background: rgba(255, 255, 255, 0.2);
		color: var(--reel-text);
	}
	.speed-pill:active {
		transform: scale(0.93);
	}
	@media (max-width: 768px) {
		.speed-pill {
			display: none;
		}
	}
</style>
