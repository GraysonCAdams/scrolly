/**
 * Shared icon configuration for reaction emoji → Phosphor component mappings.
 * Used by ActionSidebar and ReactionPicker to avoid duplicating icon definitions.
 */
import type { Component } from 'svelte';
import HeartIcon from 'phosphor-svelte/lib/HeartIcon';
import ThumbsUpIcon from 'phosphor-svelte/lib/ThumbsUpIcon';
import ThumbsDownIcon from 'phosphor-svelte/lib/ThumbsDownIcon';
import SmileyIcon from 'phosphor-svelte/lib/SmileyIcon';
import WarningIcon from 'phosphor-svelte/lib/WarningIcon';
import QuestionIcon from 'phosphor-svelte/lib/QuestionIcon';

export interface ReactionDef {
	emoji: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	weight: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

export const REACTIONS: ReactionDef[] = [
	{ emoji: '❤️', component: HeartIcon, weight: 'fill' },
	{ emoji: '👍', component: ThumbsUpIcon, weight: 'regular' },
	{ emoji: '👎', component: ThumbsDownIcon, weight: 'regular' },
	{ emoji: '😂', component: SmileyIcon, weight: 'regular' },
	{ emoji: '‼️', component: WarningIcon, weight: 'bold' },
	{ emoji: '❓', component: QuestionIcon, weight: 'regular' }
];

/** Map from emoji to its Phosphor component + weight for quick lookup in ActionSidebar */
export const REACTION_MAP = new Map(REACTIONS.map((r) => [r.emoji, r]));
