export interface MultiTapEvent {
	tapCount: number;
	x: number;
	y: number;
	clientX: number;
	clientY: number;
}

type MultiTapCallback = (event: MultiTapEvent) => void;

const TAP_WINDOW = 300; // ms between taps
const SPATIAL_TOLERANCE = 30; // px

/**
 * Returns true if the device has a fine pointer (mouse/trackpad).
 * Safe to call on server (returns false).
 */
export function isPointerFine(): boolean {
	if (globalThis.window === undefined) return false;
	return globalThis.matchMedia('(pointer: fine)').matches;
}

export interface TapHoldEvent {
	clientX: number;
	clientY: number;
}

export interface TapHoldHandlers {
	onSingleTap?: (e: TapHoldEvent) => void;
	onDoubleTap?: (e: TapHoldEvent) => void;
	onHoldStart?: (e: TapHoldEvent) => void;
	holdDelay?: number;
}

const HOLD_DELAY = 350; // ms
const MOVE_TOLERANCE = 10; // px — cancel hold if finger moves more than this

/**
 * Combined tap/double-tap/hold gesture handler.
 * - Quick tap → onSingleTap (after 300ms wait to rule out double-tap)
 * - Double-tap → onDoubleTap
 * - Press-and-hold (350ms) → onHoldStart, suppresses tap
 * Cancels hold if pointer moves >10px (user is scrolling).
 */
export function onTapHold(element: HTMLElement, handlers: TapHoldHandlers): () => void {
	const delay = handlers.holdDelay ?? HOLD_DELAY;

	let tapCount = 0;
	let lastTapTime = 0;
	let lastTapX = 0;
	let lastTapY = 0;
	let tapTimer: ReturnType<typeof setTimeout> | null = null;

	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let holdFired = false;
	let downX = 0;
	let downY = 0;
	let isDown = false;

	function cancelHold() {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
	}

	function handlePointerDown(e: PointerEvent) {
		isDown = true;
		holdFired = false;
		downX = e.clientX;
		downY = e.clientY;

		cancelHold();
		holdTimer = setTimeout(() => {
			holdFired = true;
			// Clear any pending tap so single-tap doesn't fire
			if (tapTimer) {
				clearTimeout(tapTimer);
				tapTimer = null;
			}
			tapCount = 0;
			handlers.onHoldStart?.({ clientX: downX, clientY: downY });
		}, delay);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDown) return;
		const dx = Math.abs(e.clientX - downX);
		const dy = Math.abs(e.clientY - downY);
		if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
			cancelHold();
		}
	}

	function handlePointerUp(e: PointerEvent) {
		isDown = false;
		cancelHold();

		if (holdFired) {
			holdFired = false;
			return;
		}

		// Tap logic (reuses multi-tap counting)
		const now = Date.now();
		const dx = Math.abs(e.clientX - lastTapX);
		const dy = Math.abs(e.clientY - lastTapY);

		if (now - lastTapTime < TAP_WINDOW && dx < SPATIAL_TOLERANCE && dy < SPATIAL_TOLERANCE) {
			tapCount++;
		} else {
			tapCount = 1;
		}

		lastTapTime = now;
		lastTapX = e.clientX;
		lastTapY = e.clientY;

		if (tapTimer) clearTimeout(tapTimer);

		const cx = e.clientX;
		const cy = e.clientY;

		if (tapCount >= 2) {
			// Double-tap fires immediately
			tapTimer = null;
			handlers.onDoubleTap?.({ clientX: cx, clientY: cy });
			tapCount = 0;
		} else {
			// Wait to see if another tap is coming
			tapTimer = setTimeout(() => {
				handlers.onSingleTap?.({ clientX: cx, clientY: cy });
				tapCount = 0;
			}, TAP_WINDOW);
		}
	}

	function handlePointerCancel() {
		isDown = false;
		cancelHold();
	}

	element.addEventListener('pointerdown', handlePointerDown);
	element.addEventListener('pointermove', handlePointerMove);
	element.addEventListener('pointerup', handlePointerUp);
	element.addEventListener('pointercancel', handlePointerCancel);

	return () => {
		element.removeEventListener('pointerdown', handlePointerDown);
		element.removeEventListener('pointermove', handlePointerMove);
		element.removeEventListener('pointerup', handlePointerUp);
		element.removeEventListener('pointercancel', handlePointerCancel);
		cancelHold();
		if (tapTimer) clearTimeout(tapTimer);
	};
}

export function onMultiTap(element: HTMLElement, callback: MultiTapCallback): () => void {
	let tapCount = 0;
	let lastTapTime = 0;
	let lastX = 0;
	let lastY = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	function handlePointerUp(e: PointerEvent) {
		const now = Date.now();
		const dx = Math.abs(e.clientX - lastX);
		const dy = Math.abs(e.clientY - lastY);

		if (now - lastTapTime < TAP_WINDOW && dx < SPATIAL_TOLERANCE && dy < SPATIAL_TOLERANCE) {
			tapCount++;
		} else {
			tapCount = 1;
		}

		lastTapTime = now;
		lastX = e.clientX;
		lastY = e.clientY;

		if (timer) clearTimeout(timer);

		// Wait to see if more taps are coming
		timer = setTimeout(() => {
			callback({
				tapCount: Math.min(tapCount, 3),
				x: lastX,
				y: lastY,
				clientX: lastX,
				clientY: lastY
			});
			tapCount = 0;
		}, TAP_WINDOW);
	}

	element.addEventListener('pointerup', handlePointerUp);

	return () => {
		element.removeEventListener('pointerup', handlePointerUp);
		if (timer) clearTimeout(timer);
	};
}
