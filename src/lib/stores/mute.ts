import { writable } from 'svelte/store';

/** Global muted state — shared across all reels (video + music). */
export const globalMuted = writable(true);
