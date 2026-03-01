import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/join');
	}

	return {
		appUrl: env.PUBLIC_APP_URL || 'http://localhost:3000'
	};
};
