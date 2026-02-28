import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = process.env.APP_VERSION || pkg.version;

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(version)
	}
});
