import { onTapHold, type TapHoldEvent } from '$lib/gestures';

const IGNORE_SELECTORS = [
	'.action-sidebar',
	'.reel-overlay',
	'.progress-bar',
	'.speed-pill',
	'.comment-prompt'
];

function shouldIgnoreTarget(e: { clientX: number; clientY: number }): boolean {
	const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
	if (!target) return false;
	return IGNORE_SELECTORS.some((sel) => target.closest(sel));
}

export interface GestureCallbacks {
	togglePlayPause: () => void;
	fireHeartReaction: (cx: number, cy: number) => void;
	openPicker: (cx: number, cy: number, drag: boolean) => void;
	isMusic: boolean;
}

export function setupDesktopGestures(
	element: HTMLElement,
	callbacks: GestureCallbacks
): () => void {
	let mouseDownTimer: ReturnType<typeof setTimeout> | null = null;
	let mouseHoldFired = false;
	let mouseDownX = 0;
	let mouseDownY = 0;

	function handleMouseDown(e: MouseEvent) {
		if (shouldIgnoreTarget(e)) return;
		mouseHoldFired = false;
		mouseDownX = e.clientX;
		mouseDownY = e.clientY;
		mouseDownTimer = setTimeout(() => {
			mouseHoldFired = true;
			callbacks.openPicker(e.clientX, e.clientY, true);
		}, 350);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!mouseDownTimer) return;
		if (Math.abs(e.clientX - mouseDownX) > 10 || Math.abs(e.clientY - mouseDownY) > 10) {
			clearTimeout(mouseDownTimer);
			mouseDownTimer = null;
		}
	}

	function handleMouseUp() {
		if (mouseDownTimer) {
			clearTimeout(mouseDownTimer);
			mouseDownTimer = null;
		}
	}

	function handleClick(e: MouseEvent) {
		if (mouseHoldFired) {
			mouseHoldFired = false;
			return;
		}
		if (shouldIgnoreTarget(e)) return;
		if (!callbacks.isMusic) callbacks.togglePlayPause();
	}

	function handleDblClick(e: MouseEvent) {
		if (shouldIgnoreTarget(e)) return;
		callbacks.fireHeartReaction(e.clientX, e.clientY);
	}

	element.addEventListener('mousedown', handleMouseDown);
	element.addEventListener('mousemove', handleMouseMove);
	element.addEventListener('mouseup', handleMouseUp);
	element.addEventListener('click', handleClick);
	element.addEventListener('dblclick', handleDblClick);

	return () => {
		element.removeEventListener('mousedown', handleMouseDown);
		element.removeEventListener('mousemove', handleMouseMove);
		element.removeEventListener('mouseup', handleMouseUp);
		element.removeEventListener('click', handleClick);
		element.removeEventListener('dblclick', handleDblClick);
		if (mouseDownTimer) clearTimeout(mouseDownTimer);
	};
}

export function setupMobileGestures(
	element: HTMLElement,
	callbacks: GestureCallbacks
): () => void {
	return onTapHold(element, {
		onSingleTap(e: TapHoldEvent) {
			if (shouldIgnoreTarget(e)) return;
			if (!callbacks.isMusic) callbacks.togglePlayPause();
		},
		onDoubleTap(e: TapHoldEvent) {
			if (shouldIgnoreTarget(e)) return;
			callbacks.fireHeartReaction(e.clientX, e.clientY);
		},
		onHoldStart(e: TapHoldEvent) {
			if (shouldIgnoreTarget(e)) return;
			callbacks.openPicker(e.clientX, e.clientY, true);
		}
	});
}

export interface KeyboardCallbacks {
	toggleMute: () => void;
	togglePlayPause: () => void;
	stepSpeedUp: () => void;
	stepSpeedDown: () => void;
	showSpeedChange: () => void;
	seek: (seconds: number) => void;
	isMusic: boolean;
}

export function setupReelKeyboard(
	callbacks: KeyboardCallbacks,
	shouldSuppress: () => boolean
): () => void {
	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		if (shouldSuppress()) return;

		switch (e.key) {
			case 'm':
			case 'M':
				callbacks.toggleMute();
				break;
			case '[':
				callbacks.stepSpeedDown();
				callbacks.showSpeedChange();
				break;
			case ']':
				callbacks.stepSpeedUp();
				callbacks.showSpeedChange();
				break;
		}

		if (!callbacks.isMusic) {
			switch (e.key) {
				case ' ':
					e.preventDefault();
					callbacks.togglePlayPause();
					break;
				case 'ArrowLeft':
					e.preventDefault();
					callbacks.seek(-5);
					break;
				case 'ArrowRight':
					e.preventDefault();
					callbacks.seek(5);
					break;
			}
		}
	}

	document.addEventListener('keydown', handleKeydown);
	return () => document.removeEventListener('keydown', handleKeydown);
}
