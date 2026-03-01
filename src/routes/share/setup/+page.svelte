<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import SetupStepCard from '$lib/components/settings/SetupStepCard.svelte';
	import SetupDoneState from '$lib/components/settings/SetupDoneState.svelte';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import InfoIcon from 'phosphor-svelte/lib/InfoIcon';

	const TEMPLATE_SHORTCUT_URL = 'https://www.icloud.com/shortcuts/72a027bd24b448d983c31287a68603f1';

	const appUrl = $derived($page.data.appUrl as string);

	let currentStep = $state(0);
	let completedSteps = new SvelteSet<number>();

	const totalSteps = 3;
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

		<!-- Step cards -->
		<SetupStepCard step={1} title="Download the template" visible={currentStep === 0 && !allDone}>
			<h1 class="setup-title">Set up Share Shortcut</h1>
			<p class="setup-subtitle">
				Create an iOS Shortcut so your group can share clips directly from TikTok, Instagram, and
				other apps.
			</p>
			<p class="step-desc">
				Tap the button below to download the pre-built shortcut template. It has everything
				configured — you just need to update the URL.
			</p>
			<a href={TEMPLATE_SHORTCUT_URL} class="icloud-btn" target="_blank" rel="external noopener">
				<DownloadSimpleIcon size={22} />
				Get Template Shortcut
			</a>
		</SetupStepCard>

		<SetupStepCard step={2} title="Change the URL" visible={currentStep === 1 && !allDone}>
			<p class="step-desc">
				Open the shortcut you just downloaded in the Shortcuts app. You'll see two actions that
				reference a URL — update both to your scrolly instance:
			</p>
			<div class="url-display">
				<code>{appUrl}</code>
			</div>
			<p class="step-desc">
				Look for the <strong>"Get Contents of URL"</strong> action and the
				<strong>"Open URLs"</strong> action inside the "Otherwise" block. Replace the placeholder URL
				in each with your URL above.
			</p>
			<div class="info-box">
				<InfoIcon size={18} />
				<span>
					The shortcut uses your browser's login session to identify who shared the clip. Group
					members need to be logged into scrolly in Safari for it to work automatically.
				</span>
			</div>
		</SetupStepCard>

		<SetupStepCard step={3} title="Share with your group" visible={currentStep === 2 && !allDone}>
			<p class="step-desc">
				Long-press your customized shortcut and choose
				<strong>"Share"</strong>, then <strong>"Copy iCloud Link"</strong>.
			</p>
			<p class="step-desc">
				Go back to <strong>Settings → iOS Shortcut</strong> in scrolly and paste the iCloud link.
				Once saved, your group members will see a <strong>"Get Shortcut"</strong> button in their settings
				to install it with one tap.
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
