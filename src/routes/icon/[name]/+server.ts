import type { RequestHandler } from './$types';
import { generateIconSvg, resolveAccentHex } from '$lib/iconSvg';

const ICON_CONFIG: Record<string, { maskable?: boolean; monochrome?: boolean }> = {
	'favicon.svg': {},
	'icon-192.svg': {},
	'icon-512.svg': {},
	'icon-maskable-192.svg': { maskable: true },
	'icon-maskable-512.svg': { maskable: true },
	'apple-touch-icon.svg': {},
	'badge-72.svg': { monochrome: true }
};

export const GET: RequestHandler = ({ params, locals }) => {
	const config = ICON_CONFIG[params.name];
	if (!config) {
		return new Response('Not found', { status: 404 });
	}

	const accentHex = resolveAccentHex(locals.group?.accentColor);
	const svg = generateIconSvg(accentHex, config);

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'private, no-cache',
			Vary: 'Cookie'
		}
	});
};
