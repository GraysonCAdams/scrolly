<script lang="ts">
	import { onMount } from 'svelte';

	const {
		emoji,
		x,
		y,
		oncomplete
	}: {
		emoji: string;
		x: number;
		y: number;
		oncomplete: () => void;
	} = $props();

	interface Particle {
		id: number;
		emoji: string;
		x: number;
		y: number;
		scale: number;
		travel: number;
		wobble: number;
		rotation: number;
		duration: number;
		delay: number;
	}

	let particles = $state<Particle[]>([]);

	onMount(() => {
		const count = 10 + Math.floor(Math.random() * 6);
		let maxEnd = 0;

		particles = Array.from({ length: count }, (_, i) => {
			const dur = 1.0 + Math.random() * 0.8;
			const del = Math.random() * 250;
			maxEnd = Math.max(maxEnd, dur * 1000 + del);

			return {
				id: i,
				emoji,
				x: x + (Math.random() - 0.5) * 30,
				y: y + (Math.random() - 0.5) * 20,
				scale: 0.5 + Math.random() * 0.9,
				travel: 200 + Math.random() * 200,
				wobble: 20 + Math.random() * 30,
				rotation: (Math.random() - 0.5) * 30,
				duration: dur,
				delay: del
			};
		});

		setTimeout(oncomplete, maxEnd + 50);
	});
</script>

<div class="shower-container">
	{#each particles as p (p.id)}
		<div
			class="particle"
			style="
				left:{p.x}px;
				top:{p.y}px;
				--travel:{p.travel}px;
				--wobble:{p.wobble}px;
				--scale:{p.scale};
				--rotation:{p.rotation}deg;
				--duration:{p.duration}s;
				--delay:{p.delay}ms;
			"
		>
			{p.emoji}
		</div>
	{/each}
</div>

<style>
	.shower-container {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 300;
		overflow: hidden;
	}

	.particle {
		position: absolute;
		font-size: 1.5rem;
		opacity: 0;
		transform: translate(-50%, -50%) scale(0);
		animation: float-up var(--duration) ease-out var(--delay) forwards;
		will-change: transform, opacity;
	}

	@keyframes float-up {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(0) rotate(0deg);
		}
		8% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(var(--scale)) rotate(0deg);
		}
		25% {
			opacity: 1;
			transform: translate(calc(-50% + var(--wobble)), calc(-50% - var(--travel) * 0.25))
				scale(var(--scale)) rotate(var(--rotation));
		}
		50% {
			opacity: 1;
			transform: translate(calc(-50% - var(--wobble) * 0.5), calc(-50% - var(--travel) * 0.5))
				scale(var(--scale)) rotate(calc(var(--rotation) * -0.5));
		}
		75% {
			opacity: 0.7;
			transform: translate(calc(-50% + var(--wobble) * 0.3), calc(-50% - var(--travel) * 0.75))
				scale(calc(var(--scale) * 0.8)) rotate(var(--rotation));
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% - var(--wobble) * 0.2), calc(-50% - var(--travel)))
				scale(calc(var(--scale) * 0.5)) rotate(calc(var(--rotation) * -1));
		}
	}
</style>
