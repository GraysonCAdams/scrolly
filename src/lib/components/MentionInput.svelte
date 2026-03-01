<script lang="ts">
	import type { GroupMember } from '$lib/types';

	const {
		placeholder = '',
		maxlength = 500,
		disabled = false,
		members = [],
		singleLine = false,
		onchange,
		onsubmit
	}: {
		placeholder?: string;
		maxlength?: number;
		disabled?: boolean;
		members?: GroupMember[];
		singleLine?: boolean;
		onchange?: (text: string) => void;
		onsubmit?: () => void;
	} = $props();

	let text = $state('');
	let inputEl = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);
	let showDropdown = $state(false);
	let filteredMembers = $state<GroupMember[]>([]);
	let selectedIndex = $state(0);
	let mentionStart = $state(-1);

	function handleInput() {
		onchange?.(text);
		checkForMention();
	}

	function checkForMention() {
		if (!inputEl) return;
		const pos = inputEl.selectionStart ?? 0;
		const before = text.slice(0, pos);
		const atMatch = before.match(/@(\w*)$/);

		if (atMatch) {
			mentionStart = pos - atMatch[0].length;
			const partial = atMatch[1].toLowerCase();
			filteredMembers = members
				.filter((m) => m.username.toLowerCase().startsWith(partial))
				.slice(0, 5);
			showDropdown = filteredMembers.length > 0;
			selectedIndex = 0;
		} else {
			showDropdown = false;
		}
	}

	function selectMember(member: GroupMember) {
		const pos = inputEl?.selectionStart ?? text.length;
		const before = text.slice(0, mentionStart);
		const after = text.slice(pos);
		text = `${before}@${member.username} ${after}`;
		showDropdown = false;
		onchange?.(text);
		requestAnimationFrame(() => {
			const newPos = mentionStart + member.username.length + 2;
			inputEl?.setSelectionRange(newPos, newPos);
			inputEl?.focus();
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (showDropdown) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % filteredMembers.length;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedIndex = (selectedIndex - 1 + filteredMembers.length) % filteredMembers.length;
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				selectMember(filteredMembers[selectedIndex]);
				return;
			} else if (e.key === 'Escape') {
				e.preventDefault();
				showDropdown = false;
				return;
			}
		}

		if (singleLine && e.key === 'Enter' && !showDropdown) {
			e.preventDefault();
			onsubmit?.();
		}
	}

	export function focus() {
		inputEl?.focus();
	}

	export function clear() {
		text = '';
		onchange?.('');
	}

	export function getText(): string {
		return text;
	}
</script>

<div class="mention-input-wrap">
	{#if showDropdown}
		<div class="mention-dropdown">
			{#each filteredMembers as member, i (member.id)}
				<button
					class="mention-option"
					class:selected={i === selectedIndex}
					onmousedown={(e) => {
						e.preventDefault();
						selectMember(member);
					}}
				>
					<div class="mention-avatar">
						{#if member.avatarPath}
							<img src="/api/profile/avatar/{member.avatarPath}" alt="" />
						{:else}
							<span>{member.username.charAt(0).toUpperCase()}</span>
						{/if}
					</div>
					<span class="mention-username">@{member.username}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if singleLine}
		<input
			bind:this={inputEl}
			bind:value={text}
			type="text"
			{placeholder}
			{maxlength}
			{disabled}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onclick={checkForMention}
		/>
	{:else}
		<textarea
			bind:this={inputEl}
			bind:value={text}
			{placeholder}
			{maxlength}
			{disabled}
			rows="2"
			oninput={handleInput}
			onkeydown={handleKeydown}
			onclick={checkForMention}
		></textarea>
	{/if}
</div>

<style>
	.mention-input-wrap {
		position: relative;
		width: 100%;
	}

	input,
	textarea {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-elevated);
		color: var(--text-primary);
		font-size: 0.9375rem;
		font-family: var(--font-body);
		outline: none;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	input::placeholder,
	textarea::placeholder {
		color: var(--text-muted);
	}

	input:focus,
	textarea:focus {
		border-color: var(--accent-primary);
	}

	textarea {
		resize: none;
		line-height: 1.4;
	}

	.mention-dropdown {
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		margin-bottom: 4px;
		overflow: hidden;
		z-index: 20;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
	}

	.mention-option {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: none;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		font-size: 0.875rem;
		transition: background 0.1s ease;
	}

	.mention-option.selected,
	.mention-option:hover {
		background: var(--bg-surface);
	}

	.mention-avatar {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-full);
		overflow: hidden;
		background: var(--accent-magenta);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-size: 0.625rem;
		font-weight: 700;
		color: var(--constant-white);
	}

	.mention-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.mention-username {
		font-weight: 500;
		color: var(--text-primary);
	}
</style>
