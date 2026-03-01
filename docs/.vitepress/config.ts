import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
	defineConfig({
		title: 'Scrolly',
		description: 'Private video-sharing PWA for friend groups',
		base: '/scrolly/',

		// Exclude internal docs from the built site
		srcExclude: [
			'design-guidelines.md',
			'data-model.md',
			'architecture.md',
			'notifications.md',
			'playback-preferences.md',
			'platform-limitations.md',
			'features.md',
			'api.md',
			'inspo/**'
		],

		head: [['link', { rel: 'icon', href: '/scrolly/favicon.ico' }]],

		themeConfig: {
			nav: [
				{ text: 'Guide', link: '/guide/getting-started' },
				{ text: 'Deployment', link: '/deployment/docker' },
				{ text: 'API Reference', link: '/reference/api' }
			],

			sidebar: [
				{
					text: 'Guide',
					items: [
						{ text: 'Getting Started', link: '/guide/getting-started' },
						{ text: 'Features', link: '/guide/features' },
						{ text: 'Platform Support', link: '/guide/platform-support' },
						{ text: 'Download Providers', link: '/guide/download-providers' }
					]
				},
				{
					text: 'Deployment',
					items: [
						{ text: 'Docker', link: '/deployment/docker' },
						{ text: 'Manual', link: '/deployment/manual' },
						{ text: 'Configuration', link: '/deployment/configuration' }
					]
				},
				{
					text: 'Reference',
					items: [{ text: 'API', link: '/reference/api' }]
				}
			],

			socialLinks: [{ icon: 'github', link: 'https://github.com/312-dev/scrolly' }],

			search: {
				provider: 'local'
			},

			footer: {
				message: 'Released under the MIT License.',
				copyright: 'Copyright © 2026 312.dev LLC'
			}
		},

		mermaid: {}
	})
);
