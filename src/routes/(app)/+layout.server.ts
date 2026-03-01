import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/join');
	}
	if (!locals.user.username) {
		redirect(302, '/onboard');
	}
	return {
		user: locals.user,
		group: locals.group,
		vapidPublicKey: env.VAPID_PUBLIC_KEY || '',
		gifEnabled: !!env.GIPHY_API_KEY
	};
};
