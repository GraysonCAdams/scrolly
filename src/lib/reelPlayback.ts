export function trackVideoTime(
	videoEl: HTMLVideoElement,
	onUpdate: (currentTime: number, duration: number, paused: boolean) => void,
	onMetadata: (duration: number) => void,
	onWatchProgress: (percent: number) => void
): () => void {
	function handleTimeUpdate() {
		const d = videoEl.duration || 0;
		onUpdate(videoEl.currentTime, d, videoEl.paused);
		if (d > 0) onWatchProgress((videoEl.currentTime / d) * 100);
	}

	function handleLoadedMetadata() {
		onMetadata(videoEl.duration || 0);
	}

	function handlePlayPause() {
		onUpdate(videoEl.currentTime, videoEl.duration || 0, videoEl.paused);
	}

	videoEl.addEventListener('timeupdate', handleTimeUpdate);
	videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
	videoEl.addEventListener('play', handlePlayPause);
	videoEl.addEventListener('pause', handlePlayPause);

	if (videoEl.duration) {
		onMetadata(videoEl.duration);
		onUpdate(videoEl.currentTime, videoEl.duration, videoEl.paused);
	}

	return () => {
		videoEl.removeEventListener('timeupdate', handleTimeUpdate);
		videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
		videoEl.removeEventListener('play', handlePlayPause);
		videoEl.removeEventListener('pause', handlePlayPause);
	};
}

export function sendWatchPercent(clipId: string, maxPercent: number): void {
	if (maxPercent <= 0) return;
	const pct = Math.round(maxPercent);
	const body = JSON.stringify({ watchPercent: pct });
	if (navigator.sendBeacon) {
		navigator.sendBeacon(
			`/api/clips/${clipId}/watched`,
			new Blob([body], { type: 'application/json' })
		);
	} else {
		fetch(`/api/clips/${clipId}/watched`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
			keepalive: true
		}).catch(() => {});
	}
}

export function flashIndicator(
	setter: (visible: boolean) => void,
	currentTimer: ReturnType<typeof setTimeout> | null
): ReturnType<typeof setTimeout> {
	setter(true);
	if (currentTimer) clearTimeout(currentTimer);
	return setTimeout(() => setter(false), 800);
}
