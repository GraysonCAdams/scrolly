<script lang="ts">
	const {
		currentTime,
		duration,
		isDesktop,
		onseek
	}: {
		currentTime: number;
		duration: number;
		isDesktop: boolean;
		onseek: (time: number) => void;
	} = $props();

	let barEl: HTMLDivElement | null = $state(null);
	let scrubbing = $state(false);
	let hoverProgress = $state<number | null>(null);

	const progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

	function getTimeFromX(clientX: number): number {
		if (!barEl) return 0;
		const rect = barEl.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		return ratio * duration;
	}

	function handleMouseDown(e: MouseEvent) {
		if (!isDesktop) return;
		e.preventDefault();
		e.stopPropagation();
		scrubbing = true;
		onseek(getTimeFromX(e.clientX));

		function handleMouseMove(ev: MouseEvent) {
			onseek(getTimeFromX(ev.clientX));
		}

		function handleMouseUp() {
			scrubbing = false;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleHover(e: MouseEvent) {
		if (scrubbing) return;
		hoverProgress = getTimeFromX(e.clientX);
	}

	function handleMouseLeave() {
		if (!scrubbing) {
			hoverProgress = null;
		}
	}

	function handleTouchStart(e: TouchEvent) {
		e.stopPropagation();
		scrubbing = true;
		const touch = e.touches[0];
		onseek(getTimeFromX(touch.clientX));
	}

	function handleTouchMove(e: TouchEvent) {
		if (!scrubbing) return;
		e.stopPropagation();
		const touch = e.touches[0];
		onseek(getTimeFromX(touch.clientX));
	}

	function handleTouchEnd() {
		scrubbing = false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="progress-bar"
	class:desktop={isDesktop}
	class:scrubbing
	bind:this={barEl}
	onmousedown={handleMouseDown}
	onmousemove={handleHover}
	onmouseleave={handleMouseLeave}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	tabindex="0"
	role="slider"
	aria-label="Video progress"
	aria-valuenow={currentTime}
	aria-valuemin={0}
	aria-valuemax={duration}
>
	<div class="progress-track">
		{#if isDesktop && hoverProgress !== null}
			<div class="progress-hover" style="width: {(hoverProgress / duration) * 100}%"></div>
		{/if}
		<div class="progress-fill" style="width: {progress}%"></div>
	</div>
</div>

<style>
	.progress-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 4;
		height: 14px;
		display: flex;
		align-items: flex-end;
		cursor: default;
		padding: 0;
	}

	.progress-bar.desktop {
		cursor: pointer;
	}

	.progress-track {
		width: 100%;
		height: 2px;
		background: rgba(255, 255, 255, 0.2);
		position: relative;
		transition: height 0.15s ease;
	}

	.progress-bar.desktop:hover .progress-track,
	.progress-bar.scrubbing .progress-track {
		height: 4px;
	}

	.progress-fill {
		height: 100%;
		background: rgba(255, 255, 255, 0.85);
		position: absolute;
		top: 0;
		left: 0;
	}

	.progress-hover {
		height: 100%;
		background: rgba(255, 255, 255, 0.3);
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.progress-bar.desktop:hover .progress-fill::after,
	.progress-bar.scrubbing .progress-fill::after {
		content: '';
		position: absolute;
		right: -5px;
		top: 50%;
		transform: translateY(-50%);
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
	}
</style>
