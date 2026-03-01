<script lang="ts">
	const {
		viewCount,
		ontap
	}: {
		viewCount: number;
		ontap: () => void;
	} = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<button
	class="view-badge"
	onclick={(e) => {
		e.stopPropagation();
		ontap();
	}}
>
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
		<circle cx="12" cy="12" r="3" />
	</svg>
	<span>{viewCount}</span>
</button>

<style>
	.view-badge {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 6px 12px;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: none;
		border-radius: var(--radius-full);
		color: #fff;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		min-height: 32px;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
		transition: transform 0.1s ease;
	}

	.view-badge:active {
		transform: scale(0.95);
	}

	.view-badge svg {
		width: 14px;
		height: 14px;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
	}
</style>
