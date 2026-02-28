import { writable } from 'svelte/store';

/** Speeds in "tap to cycle" order starting from 1x */
const SPEED_CYCLE = [1, 1.5, 2, 0.5, 0.75] as const;

/** Speeds in ascending order for keyboard step up/down */
const SPEED_LADDER = [0.5, 0.75, 1, 1.5, 2] as const;

/** Global playback speed — shared across all reels (video + music). */
export const globalPlaybackSpeed = writable(1);

/** Cycle to next speed in tap order (1→1.5→2→0.5→0.75→1). */
export function cycleSpeed(): void {
	globalPlaybackSpeed.update((current) => {
		const idx = SPEED_CYCLE.indexOf(current as (typeof SPEED_CYCLE)[number]);
		return SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
	});
}

/** Step up to the next higher speed. */
export function stepSpeedUp(): void {
	globalPlaybackSpeed.update((current) => {
		const idx = SPEED_LADDER.indexOf(current as (typeof SPEED_LADDER)[number]);
		return idx < SPEED_LADDER.length - 1 ? SPEED_LADDER[idx + 1] : current;
	});
}

/** Step down to the next lower speed. */
export function stepSpeedDown(): void {
	globalPlaybackSpeed.update((current) => {
		const idx = SPEED_LADDER.indexOf(current as (typeof SPEED_LADDER)[number]);
		return idx > 0 ? SPEED_LADDER[idx - 1] : current;
	});
}
