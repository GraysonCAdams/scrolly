import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, '/join');
	}

	return {
		appUrl: url.origin,
		shortcutToken: locals.group?.shortcutToken ?? null,
		hostPhone: locals.user.phone
	};
};
