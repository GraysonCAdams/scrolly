import type { Handle } from '@sveltejs/kit';
import { getUserIdFromCookies, getUserWithGroup } from '$lib/server/auth';
import { getAccentColor } from '$lib/colors';
import { startScheduler } from '$lib/server/scheduler';

startScheduler();

export const handle: Handle = async ({ event, resolve }) => {
	const userId = getUserIdFromCookies(event.request.headers.get('cookie'));

	if (userId) {
		const data = await getUserWithGroup(userId);
		if (data && !data.user.removedAt) {
			event.locals.user = data.user;
			event.locals.group = data.group;
		}
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			const theme = event.locals.user?.themePreference;
			const accent = getAccentColor(event.locals.group?.accentColor);

			let attrs = '';
			if (theme && theme !== 'system') {
				attrs += ` data-theme="${theme}"`;
			}
			attrs += ` style="--accent-primary:${accent.hex};--accent-primary-dark:${accent.dark}"`;

			return html.replace('<html lang="en">', `<html lang="en"${attrs}>`);
		}
	});

	// Security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline'",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"font-src 'self' https://fonts.gstatic.com",
			"img-src 'self' blob: data:",
			"media-src 'self' blob:",
			"connect-src 'self'",
			"frame-ancestors 'none'"
		].join('; ')
	);

	// Set theme cookie if user has preference but cookie is missing
	const cookies = event.request.headers.get('cookie') || '';
	if (event.locals.user?.themePreference) {
		if (!cookies.includes('scrolly_theme=')) {
			response.headers.append(
				'Set-Cookie',
				`scrolly_theme=${event.locals.user.themePreference};Path=/;Max-Age=31536000;SameSite=Lax`
			);
		}
	}

	// Set accent color cookie for flash prevention
	if (event.locals.group?.accentColor) {
		const accent = getAccentColor(event.locals.group.accentColor);
		const accentValue = encodeURIComponent(JSON.stringify({ hex: accent.hex, dark: accent.dark }));
		response.headers.append(
			'Set-Cookie',
			`scrolly_accent=${accentValue};Path=/;Max-Age=31536000;SameSite=Lax`
		);
	}

	return response;
};
