import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const shareUrl = url.searchParams.get('url') || url.searchParams.get('text');

	if (!shareUrl) {
		redirect(302, '/');
	}

	if (!locals.user) {
		const returnTo = `/share?url=${encodeURIComponent(shareUrl)}`;
		redirect(302, `/join?returnTo=${encodeURIComponent(returnTo)}`);
	}

	if (!locals.user.username) {
		redirect(302, '/onboard');
	}

	return {
		shareUrl,
		user: locals.user,
		group: locals.group
	};
};
