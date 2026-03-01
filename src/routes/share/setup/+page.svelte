<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from '$lib/stores/toasts';
	import SetupStepCard from '$lib/components/settings/SetupStepCard.svelte';
	import SetupDoneState from '$lib/components/settings/SetupDoneState.svelte';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';

	const appUrl = $derived($page.data.appUrl as string);
	const shortcutUrl = $derived($page.data.shortcutUrl as string | null);
	const shortcutToken = $derived($page.data.shortcutToken as string | null);
	const apiUrl = $derived(
		shortcutToken ? `${appUrl}/api/clips/share?token=${shortcutToken}` : null
	);

	let currentStep = $state(0);
	let completedSteps = new SvelteSet<number>();
	let copied = $state(false);

	const totalSteps = 7;
	const isLastStep = $derived(currentStep === totalSteps - 1);
	const allDone = $derived(currentStep === totalSteps);

	function nextStep() {
		completedSteps.add(currentStep);
		if (currentStep < totalSteps) currentStep++;
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function goToStep(step: number) {
		if (step <= Math.max(...completedSteps, -1) + 1) {
			currentStep = step;
		}
	}

	async function copyApiUrl() {
		if (!apiUrl) return;
		try {
			await navigator.clipboard.writeText(apiUrl);
			copied = true;
			toast.success('Copied to clipboard');
			setTimeout(() => (copied = false), 2000);
		} catch {
			toast.error('Failed to copy');
		}
	}
</script>

<svelte:head>
	<title>Set up Share Shortcut — scrolly</title>
</svelte:head>

<div class="setup-page">
	<nav class="setup-nav">
		<a href={resolve('/settings')} class="back-link">
			<CaretLeftIcon size={20} />
			Settings
		</a>
		{#if !allDone}
			<span class="step-counter">{currentStep + 1} / {totalSteps}</span>
		{/if}
	</nav>

	<div class="setup-content">
		{#if !allDone}
			<!-- Progress dots -->
			<div class="progress-dots">
				{#each Array(totalSteps) as _, i (i)}
					<button
						class="dot"
						class:active={i === currentStep}
						class:completed={completedSteps.has(i)}
						class:reachable={i <= Math.max(...completedSteps, -1) + 1}
						onclick={() => goToStep(i)}
						aria-label="Step {i + 1}"
					>
						{#if completedSteps.has(i)}
							<CheckIcon size={14} weight="bold" />
						{/if}
					</button>
				{/each}
			</div>
		{/if}

		{#if shortcutUrl && currentStep === 0 && completedSteps.size === 0}
			<div class="shortcut-available">
				<h1 class="setup-title">Share from other apps</h1>
				<p class="setup-subtitle">
					Your group host has shared a ready-made shortcut. Install it with one tap, or follow the
					manual steps below.
				</p>
				<a href={shortcutUrl} class="icloud-btn" target="_blank" rel="external noopener">
					<DownloadSimpleIcon size={22} />
					Get Shortcut
				</a>
				<div class="divider">
					<span>or set it up manually</span>
				</div>
			</div>
		{/if}

		<!-- Step cards -->
		<SetupStepCard step={1} title="Open the Shortcuts app" visible={currentStep === 0 && !allDone}>
			{#if !(shortcutUrl && completedSteps.size === 0)}
				<h1 class="setup-title">Share from other apps</h1>
				<p class="setup-subtitle">
					Set up an iOS Shortcut to share clips directly from TikTok, Instagram, and other apps.
				</p>
			{/if}
			<p class="step-desc">
				It's pre-installed on all iPhones. If you deleted it, re-download it from the App Store.
			</p>
			<p class="step-desc">
				Look for the blue and pink icon that looks like two overlapping squares.
			</p>
		</SetupStepCard>

		<SetupStepCard step={2} title="Create a new shortcut" visible={currentStep === 1 && !allDone}>
			<p class="step-desc">
				Tap the <strong>+</strong> button in the top right corner, then tap
				<strong>Add Action</strong>.
			</p>
		</SetupStepCard>

		<SetupStepCard
			step={3}
			title="Receive from Share Sheet"
			visible={currentStep === 2 && !allDone}
		>
			<p class="step-desc">
				Search for <strong>"Receive"</strong> and select
				<strong>"Receive input from Share Sheet"</strong>.
			</p>
			<p class="step-desc">
				Then tap on <strong>"Any"</strong> and change it to accept <strong>"URLs"</strong> only. This
				ensures the shortcut only fires when sharing links.
			</p>
		</SetupStepCard>

		<SetupStepCard step={4} title="Get your phone number" visible={currentStep === 3 && !allDone}>
			<p class="step-desc">
				Add another action. Search for <strong>"Phone Number"</strong> and select
				<strong>"Phone Number"</strong> under Contacts.
			</p>
			<p class="step-desc">
				Set it to get numbers from <strong>your contact card</strong> (the "Me" card). This is how scrolly
				identifies who shared the clip.
			</p>
			<div class="info-box">
				<InfoIcon size={18} />
				<span>Your phone number must match the one you signed up with in scrolly.</span>
			</div>
		</SetupStepCard>

		<SetupStepCard step={5} title="Send it to scrolly" visible={currentStep === 4 && !allDone}>
			<p class="step-desc">
				Add another action. Search for <strong>"Get Contents of URL"</strong> and add it. Set the URL
				to:
			</p>
			{#if apiUrl}
				<div class="url-display">
					<code>{apiUrl}</code>
					<button class="copy-btn" onclick={copyApiUrl}>
						{copied ? 'Copied!' : 'Copy'}
					</button>
				</div>
			{:else}
				<div class="url-display">
					<code class="url-placeholder"
						>Ask your group host to set up the shortcut token in Settings.</code
					>
				</div>
			{/if}
			<p class="step-desc">
				Change the method to <strong>POST</strong> and set the body to <strong>JSON</strong>. Add
				these two keys:
			</p>
			<ul class="json-keys">
				<li>
					<code class="key-name">url</code> — set to the
					<strong>Shortcut Input</strong> variable
				</li>
				<li>
					<code class="key-name">phones</code> — set to the
					<strong>Phone Numbers</strong> from step 4
				</li>
			</ul>
		</SetupStepCard>

		<SetupStepCard step={6} title="Add a notification" visible={currentStep === 5 && !allDone}>
			<p class="step-desc">
				Add one more action. Search for <strong>"Show Notification"</strong> and add it.
			</p>
			<p class="step-desc">
				Set the title to <strong>"Added to scrolly!"</strong> and the body to the
				<strong>Shortcut Input</strong>. This gives you a confirmation when a clip is shared.
			</p>
		</SetupStepCard>

		<SetupStepCard step={7} title="Name it & save" visible={currentStep === 6 && !allDone}>
			<p class="step-desc">
				Tap the name at the top of the shortcut, rename it to <strong>"scrolly"</strong>, then tap
				<strong>Done</strong>.
			</p>
			<p class="step-desc">
				This makes it easy to find when you use the Share button in other apps.
			</p>
		</SetupStepCard>

		<!-- Done state -->
		{#if allDone}
			<SetupDoneState settingsHref={resolve('/settings')} />
		{/if}

		<!-- Navigation -->
		{#if !allDone}
			<div class="step-nav">
				{#if currentStep > 0}
					<button class="nav-btn nav-back" onclick={prevStep}>
						<CaretLeftIcon size={18} />
						Back
					</button>
				{:else}
					<div></div>
				{/if}
				<button class="nav-btn nav-next" onclick={nextStep}>
					{isLastStep ? "I'm done" : 'Next'}
					{#if !isLastStep}
						<CaretRightIcon size={18} />
					{/if}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.setup-page {
		min-height: 100dvh;
		background: var(--bg-primary);
	}
	.setup-nav {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-primary);
		border-bottom: 1px solid var(--border);
	}
	.back-link {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--accent-primary);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 600;
	}
	.back-link :global(svg) {
		width: 20px;
		height: 20px;
	}
	.step-counter {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		font-family: var(--font-display);
	}
	.setup-content {
		max-width: 520px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
		padding-bottom: calc(var(--space-3xl) + env(safe-area-inset-bottom, 0px));
	}
	.progress-dots {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
		margin-bottom: var(--space-xl);
	}
	.dot {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		border: 2px solid var(--border);
		background: transparent;
		cursor: default;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		padding: 0;
	}
	.dot.reachable {
		cursor: pointer;
	}
	.dot.active {
		border-color: var(--accent-primary);
		background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
	}
	.dot.completed {
		border-color: var(--accent-primary);
		background: var(--accent-primary);
	}
	.dot.completed :global(svg) {
		width: 14px;
		height: 14px;
		color: var(--bg-primary);
	}
	.shortcut-available {
		margin-bottom: var(--space-lg);
	}
	.setup-title {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}
	.setup-subtitle {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0 0 var(--space-xl);
		line-height: 1.5;
	}
	.icloud-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-md) var(--space-xl);
		background: var(--accent-primary);
		color: var(--bg-primary);
		border: none;
		border-radius: var(--radius-full);
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-display);
		text-decoration: none;
		transition: transform 0.1s ease;
	}
	.icloud-btn:active {
		transform: scale(0.97);
	}
	.icloud-btn :global(svg) {
		width: 22px;
		height: 22px;
	}
	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin: var(--space-xl) 0 0;
	}
	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}
	.divider span {
		font-size: 0.75rem;
		color: var(--text-muted);
		white-space: nowrap;
	}
	.step-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-2xl);
		gap: var(--space-md);
	}
	.nav-btn {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-lg);
		border: none;
		border-radius: var(--radius-full);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.1s ease;
	}
	.nav-btn:active {
		transform: scale(0.97);
	}
	.nav-btn :global(svg) {
		width: 18px;
		height: 18px;
	}
	.nav-back {
		background: var(--bg-surface);
		color: var(--text-secondary);
	}
	.nav-next {
		background: var(--accent-primary);
		color: var(--bg-primary);
		font-weight: 700;
		margin-left: auto;
	}
</style>
