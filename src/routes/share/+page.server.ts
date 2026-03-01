import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const shareUrl = url.searchParams.get('url') || url.searchParams.get('text');
	const fromShortcut = url.searchParams.get('error') === 'true';

	if (!shareUrl) {
		redirect(302, '/');
	}

	if (!locals.user) {
		let returnTo = `/share?url=${encodeURIComponent(shareUrl)}`;
		if (fromShortcut) returnTo += '&error=true';
		redirect(302, `/join?returnTo=${encodeURIComponent(returnTo)}`);
	}

	if (!locals.user.username) {
		redirect(302, '/onboard');
	}

	return {
		shareUrl,
		fromShortcut,
		user: locals.user,
		group: locals.group
	};
};
