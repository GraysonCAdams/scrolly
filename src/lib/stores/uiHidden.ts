import { writable } from 'svelte/store';

/** Whether the active reel's UI overlays are hidden (feed page only). */
export const feedUiHidden = writable(false);
