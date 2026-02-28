export const ACCENT_COLORS = {
	coral: { label: 'Coral', hex: '#FF6B35', dark: '#D4551F' },
	violet: { label: 'Violet', hex: '#A855F7', dark: '#7E22CE' },
	cyan: { label: 'Cyan', hex: '#22D3EE', dark: '#0E7490' },
	rose: { label: 'Rose', hex: '#FB7185', dark: '#E11D48' },
	gold: { label: 'Gold', hex: '#FACC15', dark: '#CA8A04' },
	mint: { label: 'Mint', hex: '#34D399', dark: '#059669' },
	sky: { label: 'Sky', hex: '#38BDF8', dark: '#0284C7' },
	lime: { label: 'Lime', hex: '#D4FF00', dark: '#A3C800' }
} as const;

export type AccentColorKey = keyof typeof ACCENT_COLORS;
export const DEFAULT_ACCENT: AccentColorKey = 'coral';

export function getAccentColor(key: string | null | undefined) {
	if (key && key in ACCENT_COLORS) {
		return ACCENT_COLORS[key as AccentColorKey];
	}
	return ACCENT_COLORS[DEFAULT_ACCENT];
}
