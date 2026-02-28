<script lang="ts">
	import {
		toasts,
		removeToast,
		replaceToast,
		clipReadySignal,
		viewClipSignal,
		type Toast
	} from '$lib/stores/toasts';
	import { onDestroy } from 'svelte';

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive tracking maps, cleaned up in onDestroy
	const pollIntervals = new Map<string, ReturnType<typeof setInterval>>();
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive tracking maps, cleaned up in onDestroy
	const dismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

	$effect(() => {
		const currentToasts = $toasts;

		for (const toast of currentToasts) {
			// Start polling for processing toasts with clipId
			if (toast.type === 'processing' && toast.clipId && !pollIntervals.has(toast.id)) {
				const interval = setInterval(() => pollClipStatus(toast), 3000);
				pollIntervals.set(toast.id, interval);
			}

			// Schedule auto-dismiss
			if (toast.autoDismiss && toast.autoDismiss > 0 && !dismissTimeouts.has(toast.id)) {
				const timeout = setTimeout(() => {
					dismissTimeouts.delete(toast.id);
					handleDismiss(toast.id);
				}, toast.autoDismiss);
				dismissTimeouts.set(toast.id, timeout);
			}
		}

		// Clean up intervals for removed toasts
		const activeIds = new Set(currentToasts.map((t) => t.id));
		for (const [id, interval] of pollIntervals) {
			if (!activeIds.has(id)) {
				clearInterval(interval);
				pollIntervals.delete(id);
			}
		}
		for (const [id, timeout] of dismissTimeouts) {
			if (!activeIds.has(id)) {
				clearTimeout(timeout);
				dismissTimeouts.delete(id);
			}
		}
	});

	async function pollClipStatus(toast: Toast) {
		if (!toast.clipId) return;
		try {
			const res = await fetch(`/api/clips/${toast.clipId}`);
			if (!res.ok) return;
			const data = await res.json();

			if (data.status === 'ready') {
				const interval = pollIntervals.get(toast.id);
				if (interval) clearInterval(interval);
				pollIntervals.delete(toast.id);

				const contentLabel = toast.contentType === 'music' ? 'song' : 'video';
				replaceToast(toast.id, {
					type: 'success',
					message: data.title ? `"${data.title}" is ready` : `Your ${contentLabel} is ready`
				});

				const timeout = setTimeout(() => removeToast(toast.id), 6000);
				dismissTimeouts.set(toast.id, timeout);

				clipReadySignal.set(toast.clipId);
			} else if (data.status === 'failed') {
				const interval = pollIntervals.get(toast.id);
				if (interval) clearInterval(interval);
				pollIntervals.delete(toast.id);

				replaceToast(toast.id, {
					type: 'error',
					message: 'Download failed'
				});
			}
		} catch {
			// Network error — keep polling
		}
	}

	function handleView(toast: Toast) {
		if (toast.clipId) {
			viewClipSignal.set(toast.clipId);
		}
		handleDismiss(toast.id);
	}

	let dismissingIds = $state(new Set<string>());

	function handleDismiss(id: string) {
		if (dismissingIds.has(id)) return;
		const interval = pollIntervals.get(id);
		if (interval) clearInterval(interval);
		pollIntervals.delete(id);
		const timeout = dismissTimeouts.get(id);
		if (timeout) clearTimeout(timeout);
		dismissTimeouts.delete(id);

		dismissingIds = new Set([...dismissingIds, id]);
		setTimeout(() => {
			dismissingIds = new Set([...dismissingIds].filter((d) => d !== id));
			removeToast(id);
		}, 200);
	}

	onDestroy(() => {
		for (const interval of pollIntervals.values()) clearInterval(interval);
		for (const timeout of dismissTimeouts.values()) clearTimeout(timeout);
	});
</script>

{#if $toasts.length > 0}
	<div class="toast-stack">
		{#each $toasts as toast (toast.id)}
			<div
				class="toast toast-{toast.type}"
				class:dismissing={dismissingIds.has(toast.id)}
				role="alert"
			>
				<div class="toast-icon">
					{#if toast.type === 'processing'}
						<div class="spinner-ring"></div>
					{:else if toast.type === 'success'}
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					{:else if toast.type === 'info'}
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="16" x2="12" y2="12" />
							<line x1="12" y1="8" x2="12.01" y2="8" />
						</svg>
					{:else}
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="15" y1="9" x2="9" y2="15" />
							<line x1="9" y1="9" x2="15" y2="15" />
						</svg>
					{/if}
				</div>
				<span class="toast-message">{toast.message}</span>
				{#if toast.type === 'success' && toast.clipId}
					<button class="toast-view" onclick={() => handleView(toast)}>View</button>
				{/if}
				<button class="toast-dismiss" onclick={() => handleDismiss(toast.id)} aria-label="Dismiss">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
				{#if toast.type === 'processing'}
					<div class="progress-track">
						<div class="progress-bar"></div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-stack {
		position: fixed;
		bottom: calc(80px + env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		z-index: 300;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		width: calc(100% - var(--space-lg) * 2);
		max-width: 400px;
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-family: var(--font-body);
		font-size: 0.8125rem;
		pointer-events: auto;
		animation: toast-in 0.3s cubic-bezier(0.32, 0.72, 0, 1);
		position: relative;
		overflow: hidden;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
	}

	.toast-success {
		border-color: color-mix(in srgb, var(--success) 40%, transparent);
	}

	.toast-error {
		border-color: color-mix(in srgb, var(--error) 40%, transparent);
	}

	.toast-info {
		border-color: color-mix(in srgb, var(--accent-blue) 40%, transparent);
	}

	.toast-icon {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.toast-icon svg {
		width: 16px;
		height: 16px;
	}

	.toast-success .toast-icon {
		color: var(--success);
	}

	.toast-error .toast-icon {
		color: var(--error);
	}

	.toast-info .toast-icon {
		color: var(--accent-blue);
	}

	.toast-message {
		flex: 1;
		min-width: 0;
		line-height: 1.4;
	}

	.toast-view {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--accent-primary);
		cursor: pointer;
		padding: 2px 4px;
		font-family: var(--font-body);
		font-size: 0.8125rem;
		font-weight: 600;
		transition: opacity 0.15s ease;
	}

	.toast-view:active {
		opacity: 0.7;
	}

	.toast-dismiss {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.15s ease;
	}

	.toast-dismiss:active {
		color: var(--text-primary);
	}

	.toast-dismiss svg {
		width: 14px;
		height: 14px;
	}

	.progress-track {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--bg-subtle);
	}

	.progress-bar {
		height: 100%;
		width: 40%;
		background: var(--accent-primary);
		border-radius: 1px;
		animation: indeterminate 1.5s ease-in-out infinite;
	}

	.spinner-ring {
		width: 16px;
		height: 16px;
		border: 2px solid var(--bg-subtle);
		border-top-color: var(--accent-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes indeterminate {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(150%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.toast.dismissing {
		animation: toast-out 200ms ease-out forwards;
	}

	@keyframes toast-out {
		to {
			opacity: 0;
			transform: translateY(12px) scale(0.97);
		}
	}
</style>
