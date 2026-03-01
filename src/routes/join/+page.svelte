<script lang="ts">
	import iconUrl from '$lib/assets/icon.svg?url';
	import InlineError from '$lib/components/InlineError.svelte';

	let view = $state<'login' | 'verify'>('login');
	let phoneDisplay = $state('');
	let code = $state('');
	let error = $state('');
	let loading = $state(false);
	let resendCountdown = $state(0);
	let resendTimer: ReturnType<typeof setInterval> | null = null;
	let mounted = $state(false);

	$effect(() => {
		mounted = true;
		return () => {
			if (resendTimer) clearInterval(resendTimer);
		};
	});

	// Extract raw digits from formatted display
	function rawDigits(formatted: string): string {
		return formatted.replace(/\D/g, '');
	}

	// Format digits as (XXX) XXX-XXXX for display
	function formatPhone(digits: string): string {
		if (digits.length === 0) return '';
		if (digits.length <= 3) return `(${digits}`;
		if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
	}

	// Convert display format to E.164 for Twilio
	function toE164(formatted: string): string {
		const digits = rawDigits(formatted);
		return `+1${digits}`;
	}

	function handlePhoneInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const digits = rawDigits(input.value).slice(0, 10);
		phoneDisplay = formatPhone(digits);
		// Reset cursor to end after formatting
		requestAnimationFrame(() => {
			input.setSelectionRange(phoneDisplay.length, phoneDisplay.length);
		});
	}

	function handlePhoneKeydown(e: KeyboardEvent) {
		// Allow backspace to work naturally with formatting
		if (e.key === 'Backspace' && phoneDisplay.length > 0) {
			e.preventDefault();
			const digits = rawDigits(phoneDisplay);
			phoneDisplay = formatPhone(digits.slice(0, -1));
		}
	}

	// Phone is valid when we have exactly 10 digits
	const phoneValid = $derived(rawDigits(phoneDisplay).length === 10);
	const phoneE164 = $derived(toE164(phoneDisplay));

	function startResendTimer() {
		resendCountdown = 60;
		resendTimer = setInterval(() => {
			resendCountdown--;
			if (resendCountdown <= 0 && resendTimer) {
				clearInterval(resendTimer);
				resendTimer = null;
			}
		}, 1000);
	}

	async function handleSendLoginCode() {
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'login-send-code', phone: phoneE164 })
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Failed to send code';
				return;
			}
			view = 'verify';
			startResendTimer();
		} catch {
			error = 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	async function handleVerifyLogin() {
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'login-verify-code', phone: phoneE164, code: code.trim() })
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Invalid code';
				return;
			}
			window.location.href = '/';
		} catch {
			error = 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	async function handleResend() {
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'login-send-code', phone: phoneE164 })
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Failed to resend';
				return;
			}
			code = '';
			startResendTimer();
		} catch {
			error = 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	// Individual code digit inputs
	let codeDigits = $state<string[]>(['', '', '', '', '', '']);
	const codeInputs = $state<HTMLInputElement[]>([]);

	function handleCodeInput(index: number, e: Event) {
		const input = e.target as HTMLInputElement;
		const value = input.value.replace(/\D/g, '');

		if (value.length > 0) {
			codeDigits[index] = value[0];
			// Auto-advance to next input
			if (index < 5) {
				codeInputs[index + 1]?.focus();
			}
		} else {
			codeDigits[index] = '';
		}
		code = codeDigits.join('');
	}

	function handleCodeKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace') {
			if (codeDigits[index] === '' && index > 0) {
				codeInputs[index - 1]?.focus();
				codeDigits[index - 1] = '';
				code = codeDigits.join('');
			} else {
				codeDigits[index] = '';
				code = codeDigits.join('');
			}
		}
	}

	function handleCodePaste(e: ClipboardEvent) {
		e.preventDefault();
		const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
		for (let i = 0; i < 6; i++) {
			codeDigits[i] = pasted[i] || '';
		}
		code = codeDigits.join('');
		// Focus the next empty input or the last one
		const nextEmpty = codeDigits.findIndex((d) => d === '');
		codeInputs[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
	}
</script>

<svelte:head>
	<title>scrolly — Sign In</title>
</svelte:head>

<div class="join-page" class:mounted>
	<div class="bg-noise"></div>

	<div class="content">
		<div class="brand">
			<img src={iconUrl} alt="scrolly" class="brand-logo" />
			<h1>scrolly</h1>
			<p class="tagline">your crew's <span class="tagline-accent">private</span> feed</p>
		</div>

		{#if view === 'login'}
			<div class="form-card">
				<p class="form-label">Sign in with your phone number</p>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSendLoginCode();
					}}
				>
					<div class="phone-input-group">
						<span class="country-code">+1</span>
						<input
							type="tel"
							value={phoneDisplay}
							oninput={handlePhoneInput}
							onkeydown={handlePhoneKeydown}
							placeholder="(555) 123-4567"
							autocomplete="tel"
							disabled={loading}
							class="phone-input"
						/>
					</div>
					<button type="submit" class="btn-primary" disabled={loading || !phoneValid}>
						{#if loading}
							<span class="spinner"></span>
							Sending...
						{:else}
							Send Code
							<svg viewBox="0 0 20 20" fill="none" class="btn-icon">
								<path
									d="M4 10H16M16 10L11 5M16 10L11 15"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						{/if}
					</button>
				</form>
			</div>
		{:else}
			<div class="form-card">
				<p class="form-label">Enter the code we sent to</p>
				<p class="phone-echo">{phoneDisplay}</p>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleVerifyLogin();
					}}
				>
					<div class="code-inputs" onpaste={handleCodePaste}>
						{#each codeDigits as digit, i}
							<input
								type="text"
								inputmode="numeric"
								maxlength="1"
								value={digit}
								oninput={(e) => handleCodeInput(i, e)}
								onkeydown={(e) => handleCodeKeydown(i, e)}
								disabled={loading}
								class="code-box"
								class:filled={digit !== ''}
								bind:this={codeInputs[i]}
								autocomplete={i === 0 ? 'one-time-code' : 'off'}
							/>
						{/each}
					</div>

					<button type="submit" class="btn-primary" disabled={loading || code.length !== 6}>
						{#if loading}
							<span class="spinner"></span>
							Verifying...
						{:else}
							Log In
						{/if}
					</button>

					<div class="resend-row">
						<button
							type="button"
							class="btn-ghost"
							onclick={handleResend}
							disabled={loading || resendCountdown > 0}
						>
							{resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
						</button>
						<button
							type="button"
							class="btn-ghost"
							onclick={() => {
								view = 'login';
								error = '';
								code = '';
								codeDigits = ['', '', '', '', '', ''];
							}}
						>
							Change number
						</button>
					</div>
				</form>
			</div>
		{/if}

		<InlineError message={error} />
	</div>

	<p class="footer-note">if you know, you know.</p>
</div>

<style>
	.join-page {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		padding: var(--space-xl);
		background: var(--bg-primary);
		overflow: hidden;
	}

	/* --- Background grain texture --- */
	.bg-noise {
		position: absolute;
		inset: 0;
		opacity: 0.04;
		pointer-events: none;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 256px 256px;
	}

	/* --- Content --- */
	.content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 380px;
		opacity: 0;
		transform: translateY(12px);
		transition:
			opacity 0.6s ease,
			transform 0.6s ease;
	}

	.mounted .content {
		opacity: 1;
		transform: translateY(0);
	}

	/* --- Brand --- */
	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: var(--space-3xl);
	}

	.brand-logo {
		width: 72px;
		height: 72px;
		margin-bottom: var(--space-lg);
	}

	h1 {
		font-family: 'Unbounded', var(--font-display), sans-serif;
		font-size: 2.75rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		line-height: 1;
		margin: 0;
		color: var(--text-primary);
		text-transform: lowercase;
	}

	.tagline {
		font-family: 'Space Mono', monospace;
		font-size: 0.8125rem;
		font-weight: 400;
		color: var(--text-muted);
		margin: var(--space-md) 0 0;
		letter-spacing: 0.02em;
	}

	.tagline-accent {
		color: var(--accent-primary);
		font-weight: 700;
	}

	/* --- Form card --- */
	.form-card {
		width: 100%;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		padding: var(--space-2xl);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.form-label {
		font-size: 0.9375rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-xl);
		text-align: center;
	}

	.phone-echo {
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--accent-primary);
		margin: -0.75rem 0 var(--space-xl);
		text-align: center;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		width: 100%;
	}

	/* --- Phone input --- */
	.phone-input-group {
		display: flex;
		align-items: center;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		overflow: hidden;
		transition: border-color 0.2s ease;
	}

	.phone-input-group:focus-within {
		border-color: var(--accent-primary);
	}

	.country-code {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-muted);
		padding: var(--space-md) 0 var(--space-md) var(--space-lg);
		user-select: none;
		flex-shrink: 0;
	}

	.phone-input {
		flex: 1;
		padding: var(--space-md) var(--space-lg) var(--space-md) var(--space-sm);
		border: none;
		border-radius: 0;
		font-size: 1.125rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		background: transparent;
		color: var(--text-primary);
	}

	.phone-input::placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.phone-input:focus {
		outline: none;
	}

	/* --- Code inputs --- */
	.code-inputs {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
		margin-bottom: var(--space-sm);
	}

	.code-box {
		width: 46px;
		height: 56px;
		text-align: center;
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 700;
		border: 1.5px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		color: var(--text-primary);
		transition:
			border-color 0.2s ease,
			background 0.2s ease;
		padding: 0;
	}

	.code-box:focus {
		outline: none;
		border-color: var(--accent-primary);
		background: var(--bg-subtle);
	}

	.code-box.filled {
		border-color: var(--accent-primary);
	}

	/* --- Buttons --- */
	.btn-primary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-xl);
		background: var(--accent-primary);
		color: #000000;
		border: none;
		border-radius: var(--radius-full);
		font-size: 1rem;
		font-weight: 700;
		font-family: var(--font-display);
		cursor: pointer;
		transition:
			transform 0.1s ease,
			opacity 0.2s ease;
		margin-top: var(--space-sm);
	}

	.btn-primary:active:not(:disabled) {
		transform: scale(0.97);
	}

	.btn-primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-icon {
		width: 18px;
		height: 18px;
	}

	.btn-ghost {
		background: transparent;
		color: var(--text-secondary);
		border: none;
		font-size: 0.8125rem;
		padding: var(--space-sm);
		font-weight: 500;
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: color 0.2s ease;
	}

	.btn-ghost:hover:not(:disabled) {
		color: var(--text-primary);
	}

	.btn-ghost:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.resend-row {
		display: flex;
		justify-content: space-between;
		gap: var(--space-sm);
		margin-top: var(--space-xs);
	}

	/* --- Spinner --- */
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(0, 0, 0, 0.2);
		border-top-color: #000000;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* --- Footer --- */
	.footer-note {
		position: relative;
		z-index: 1;
		margin-top: var(--space-3xl);
		font-family: 'Space Mono', monospace;
		font-size: 0.6875rem;
		color: var(--text-muted);
		text-align: center;
		letter-spacing: 0.03em;
	}
</style>
