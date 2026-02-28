/**
 * Platform icon data sourced from the `simple-icons` npm package.
 * Streamable uses a custom path extracted from its brand assets.
 *
 * All icons use a 24x24 viewBox unless overridden.
 */
import {
	siTiktok,
	siInstagram,
	siFacebook,
	siYoutube,
	siSpotify,
	siApplemusic,
	siX,
	siReddit,
	siTwitch,
	siVimeo,
	siThreads,
	siBluesky,
	siSnapchat,
	siPinterest,
	siKick,
	siDailymotion,
	siImgur,
	siSoundcloud,
	siYoutubemusic
} from 'simple-icons';

export interface PlatformIconData {
	label: string;
	path: string;
	/** Custom viewBox if not the standard "0 0 24 24" */
	viewBox?: string;
}

export const PLATFORM_ICONS: Record<string, PlatformIconData> = {
	tiktok: { label: siTiktok.title, path: siTiktok.path },
	instagram: { label: siInstagram.title, path: siInstagram.path },
	facebook: { label: siFacebook.title, path: siFacebook.path },
	youtube: { label: siYoutube.title, path: siYoutube.path },
	twitter: { label: siX.title, path: siX.path },
	reddit: { label: siReddit.title, path: siReddit.path },
	streamable: {
		label: 'Streamable',
		// S-mark extracted from official Streamable brand SVG (viewBox 0 0 666.4 510)
		path: 'M133.5,297.8c-10.6-1.1-19.8-6-27.2-13.6c-8.1-8.4-12-20.6-11.2-32.2c1.1-15,8.6-26.2,21.2-34.2c9.3-5.9,21.6-7.1,32.2-4.5c13.7,3.5,24.7,13.5,29.7,26.7c8.3,22.3-3.1,47.2-25.5,55.4c-0.4,0.2-0.8,0.3-1.2,0.4C145.6,297.8,139.5,298.4,133.5,297.8z M146.9,272.9c7.8,3,16.9-0.6,21.4-7.4c4.6-7,4.7-16.8-1.2-23.1c-4.8-5.1-13.6-8.6-20.1-4.4c-8.5,5.5-15.7,25.3-23.2,26.1c-5.1,0.4-9.7-3.2-10.5-8.3c-0.6-3.5,0.9-6.9,3.8-8.9c4.1-2.6,9.5-1.9,12.8,1.7l4.8-7.3c-6.4-5-16.1-6.5-22.8-1.1c-7.4,5.9-10.2,15.3-5.5,23.9c3.3,5.8,9.3,9.4,15.9,9.6c11.1,0.5,18.2-14.3,23.4-22.3c1.7-2.7,4.6-5.7,8.1-5.7c4.2,0.1,7.8,3.1,8.7,7.2c1.1,4.2-0.6,8.7-4.2,11.1c-3.9,2.4-8.9,1.8-12.2-1.3l-4.8,7.1C142.9,271,144.8,272.1,146.9,272.9z',
		viewBox: '91 210 92 92'
	},
	twitch: { label: siTwitch.title, path: siTwitch.path },
	vimeo: { label: siVimeo.title, path: siVimeo.path },
	threads: { label: siThreads.title, path: siThreads.path },
	bluesky: { label: siBluesky.title, path: siBluesky.path },
	snapchat: { label: siSnapchat.title, path: siSnapchat.path },
	pinterest: { label: siPinterest.title, path: siPinterest.path },
	kick: { label: siKick.title, path: siKick.path },
	dailymotion: { label: siDailymotion.title, path: siDailymotion.path },
	imgur: { label: siImgur.title, path: siImgur.path },
	soundcloud: { label: siSoundcloud.title, path: siSoundcloud.path },
	spotify: { label: siSpotify.title, path: siSpotify.path },
	apple_music: { label: siApplemusic.title, path: siApplemusic.path },
	youtube_music: { label: siYoutubemusic.title, path: siYoutubemusic.path }
};
