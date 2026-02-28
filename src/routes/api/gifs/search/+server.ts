import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Not authenticated' }, { status: 401 });

	const apiKey = env.GIPHY_API_KEY;
	if (!apiKey) return json({ error: 'GIF search not configured' }, { status: 503 });

	const q = url.searchParams.get('q')?.trim();
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 30);
	const offset = parseInt(url.searchParams.get('offset') || '0') || 0;

	const endpoint = q
		? `${GIPHY_BASE}/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=r`
		: `${GIPHY_BASE}/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=r`;

	const res = await fetch(endpoint);
	if (!res.ok) return json({ error: 'GIF search failed' }, { status: 502 });

	const data = await res.json();

	const gifs = (data.data || []).map(
		(g: {
			id: string;
			title: string;
			images: {
				fixed_width: { url: string; width: string; height: string };
				fixed_width_still: { url: string; width: string; height: string };
			};
		}) => ({
			id: g.id,
			title: g.title,
			url: g.images.fixed_width.url,
			stillUrl: g.images.fixed_width_still.url,
			width: parseInt(g.images.fixed_width.width),
			height: parseInt(g.images.fixed_width.height)
		})
	);

	return json({ gifs });
};
