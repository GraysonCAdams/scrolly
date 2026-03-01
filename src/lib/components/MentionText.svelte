<script lang="ts">
	const { text, usernames = [] }: { text: string; usernames?: string[] } = $props();

	interface Segment {
		type: 'text' | 'mention';
		value: string;
	}

	const usernameSet = $derived(new Set(usernames.map((u) => u.toLowerCase())));

	const segments = $derived.by(() => {
		const result: Segment[] = [];
		const regex = /@(\w+)/g;
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const isMember = usernameSet.has(match[1].toLowerCase());
			if (match.index > lastIndex) {
				result.push({ type: 'text', value: text.slice(lastIndex, match.index) });
			}
			result.push({ type: isMember ? 'mention' : 'text', value: match[0] });
			lastIndex = regex.lastIndex;
		}

		if (lastIndex < text.length) {
			result.push({ type: 'text', value: text.slice(lastIndex) });
		}

		return result;
	});
</script>

{#each segments as segment, i (i)}
	{#if segment.type === 'mention'}
		<span class="mention">{segment.value}</span>
	{:else}
		{segment.value}
	{/if}
{/each}

<style>
	.mention {
		color: var(--accent-blue);
		font-weight: 700;
	}
</style>
