/**
 * Volume normalizer using Web Audio API DynamicsCompressorNode.
 * Routes media element audio through a compressor + makeup gain
 * so clips play at a consistent perceived volume.
 */

let audioCtx: AudioContext | null = null;
const connectedElements = new WeakSet<HTMLMediaElement>();

function isSupported(): boolean {
	return (
		typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)
	);
}

/**
 * Create and resume the AudioContext.
 * Must be called from a user gesture (click/tap) to satisfy autoplay policy.
 */
export function initAudioContext(): void {
	if (!isSupported()) return;
	if (!audioCtx) {
		audioCtx = new (
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
		)();
	}
	if (audioCtx.state === 'suspended') {
		audioCtx.resume().catch(() => {});
	}
}

/**
 * Connect a media element through volume normalization.
 * Idempotent — safe to call multiple times on the same element.
 * Returns true if the element was successfully connected.
 */
export function connectNormalizer(element: HTMLMediaElement): boolean {
	if (connectedElements.has(element)) return true;
	if (!audioCtx || audioCtx.state !== 'running') return false;

	try {
		const source = audioCtx.createMediaElementSource(element);
		const compressor = audioCtx.createDynamicsCompressor();

		// Conservative compression for transparent normalization
		compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
		compressor.knee.setValueAtTime(30, audioCtx.currentTime);
		compressor.ratio.setValueAtTime(4, audioCtx.currentTime);
		compressor.attack.setValueAtTime(0.01, audioCtx.currentTime);
		compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

		// Makeup gain to compensate for compression
		const makeupGain = audioCtx.createGain();
		makeupGain.gain.setValueAtTime(1.4, audioCtx.currentTime);

		source.connect(compressor);
		compressor.connect(makeupGain);
		makeupGain.connect(audioCtx.destination);

		connectedElements.add(element);
		return true;
	} catch {
		return false;
	}
}
