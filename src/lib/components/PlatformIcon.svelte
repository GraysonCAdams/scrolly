<script lang="ts">
	/**
	 * Renders branded SVG icons for supported platforms.
	 * Icons sourced from the `simple-icons` npm package.
	 */
	import { PLATFORM_ICONS } from '$lib/platform-icons';

	const {
		platform,
		size = 16
	}: {
		platform: string;
		size?: number;
	} = $props();

	const icon = $derived(PLATFORM_ICONS[platform]);
</script>

{#if icon}
	<svg
		class="platform-icon"
		width={size}
		height={size}
		viewBox={icon.viewBox ?? '0 0 24 24'}
		fill="currentColor"
		aria-label={icon.label}
		role="img"
	>
		<path d={icon.path} />
	</svg>
{/if}

<style>
	.platform-icon {
		display: inline-block;
		vertical-align: middle;
		flex-shrink: 0;
	}
</style>
