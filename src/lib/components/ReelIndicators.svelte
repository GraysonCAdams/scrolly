<script lang="ts">
	const {
		showSpeedIndicator,
		speed,
		showMuteIndicator,
		muted,
		showPlayIndicator,
		paused,
		isMusic
	}: {
		showSpeedIndicator: boolean;
		speed: number;
		showMuteIndicator: boolean;
		muted: boolean;
		showPlayIndicator: boolean;
		paused: boolean;
		isMusic: boolean;
	} = $props();
</script>

{#if showSpeedIndicator}
	<div class="center-indicator">{speed}x</div>
{/if}

{#if showMuteIndicator}
	<div class="center-indicator icon">
		{#if muted}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
				<line x1="23" y1="9" x2="17" y2="15" />
				<line x1="17" y1="9" x2="23" y2="15" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
				<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
			</svg>
		{/if}
	</div>
{/if}

{#if showPlayIndicator && !isMusic}
	<div class="center-indicator icon" class:persist={paused}>
		<svg viewBox="0 0 24 24" fill="currentColor">
			<path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z" />
		</svg>
	</div>
{/if}

{#if paused && !showPlayIndicator && !isMusic}
	<div class="center-indicator icon persist">
		<svg viewBox="0 0 24 24" fill="currentColor">
			<path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z" />
		</svg>
	</div>
{/if}

<style>
	.center-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
		min-width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 700;
		padding: 0 16px;
		animation: indicator-fade 0.8s ease forwards;
		pointer-events: none;
	}

	.center-indicator.icon {
		width: 56px;
		min-width: unset;
		padding: 0;
		font-size: inherit;
	}

	.center-indicator.persist {
		animation: none;
		opacity: 0.8;
	}

	.center-indicator svg {
		width: 24px;
		height: 24px;
	}

	@keyframes indicator-fade {
		0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
		70% { opacity: 1; }
		100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
	}
</style>
