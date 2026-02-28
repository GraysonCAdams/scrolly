# Roadmap

## Phase 1 — Core Feed (MVP)

Get a working app that a group can use to share and watch videos.

1. **Project scaffolding** — SvelteKit + adapter-node, Drizzle + SQLite, Caddy config
2. **Auth flow** — Invite code entry, username + phone number onboarding, session cookies
3. **SMS setup** — Twilio number provisioned, inbound webhook, VCF generation + delivery on signup
4. **Video ingestion** — SMS inbound (primary) + paste URL form (fallback). yt-dlp download pipeline. SMS message text becomes video caption.
5. **Feed UI** — TikTok-style vertical scroll, video playback (HTML5 `<video>`), show who added it + caption + original URL
6. **Watched tracking** — Auto-mark on view, tabs for Unwatched/Watched
7. **PWA setup** — manifest.json, service worker, installable on Home Screen
8. **Deploy** — VPS setup, Caddy HTTPS, PM2 or systemd for process management

**Done when:** A user can join via invite code, enter their phone number, receive the Scrolly contact via SMS, text a TikTok link with a caption, and see it appear in a scrollable feed.

## Phase 2 — Social Features

Make it engaging for the group.

1. **Comments** — Comment thread per clip
2. **Reactions** — Emoji reactions on clips
3. **Favorites** — Favorite tab, toggle favorite
4. **Push notifications** — web-push for new clips, comments, reactions (Android + iOS Home Screen PWA)

**Done when:** Users can comment, react, favorite, and receive push notifications when someone adds a new clip.

## Phase 3 — Polish & Platform Features

1. **Share sheet** — `share_target` in manifest for direct sharing from other apps
2. **Retention policies** — Host controls for auto-delete by age, storage limits
3. **Playback preferences** — Mute on load (default), playback speed, gesture controls
4. **Volume normalization** — Web Audio API gain nodes for consistent volume across clips
5. **Badge API** — Unread clip count on Home Screen icon
6. **Notification preferences** — Per-user toggle for each notification type
7. **Daily reminder** — Optional "you have unwatched clips" push notification
