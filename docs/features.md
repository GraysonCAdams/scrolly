# Scrolly Feature Breakdown

## 1. Video Ingestion
- **Goal:** Allow users to share TikTok/Instagram/YouTube/Facebook links to the app. Videos are downloaded and re-hosted via a pluggable download provider.
- **Web app:** Paste URL into the add-video modal.
- **Android share target:** PWA registers as a share target via the Web Share Target API for direct share sheet integration.
- **iOS Shortcut:** Share via iOS Shortcut integration (PWAs cannot be share targets on iOS).
- **Users can optionally provide a caption** when submitting a link.
- **Notes:** Videos are downloaded server-side via the active download provider and stored on the VPS filesystem. The host installs a provider from the Settings UI. Failed downloads can be retried from the UI.

## 2. Music Sharing
- **Goal:** Share music links across streaming platforms.
- **How it works:** When a user shares a Spotify, Apple Music, or YouTube Music link, the app resolves it via Odesli to provide cross-platform links. Audio is downloaded and served with album art.
- **Content type:** Music clips are distinguished from video clips via the `contentType` field. The feed renders a dedicated music player with spinning album art and streaming service links.

## 3. User Identity
- **Goal:** Simple, passwordless onboarding with phone verification.
- **Flow:** Invite code → username → phone number → SMS verification code.
- **Phone verification:** 6-digit SMS codes via Twilio with expiry and attempt limits.
- **Session:** Signed httpOnly cookie. Users can log back in via phone number + verification code.
- **Profile:** Avatar upload (circular crop, client-side canvas processing), theme preference, playback preferences.

## 4. Feed & Interaction
- **Goal:** TikTok-style full-screen vertical feed with rich interactions.
- **Feed:** Scrollable reel with inline video/music playback, filterable (all, unwatched, watched, favorites).
- **Comments:** Threaded replies with hearts. Comment view tracking (new comment badges).
- **Reactions:** Emoji reactions (❤️ 👍 👎 😂 ‼️ ❓) with animated emoji shower effect.
- **Watched tracking:** Automatic with watch percentage. View count and viewer list per clip.
- **Favorites:** Toggle favorite on any clip.
- **Captions:** Editable by the poster (before others watch).

## 5. Notifications
- **In-app:** Activity feed page with grouped notifications (new clips, reactions, comments). Unread badges on the activity tab.
- **Push notifications:** Web Push (VAPID) for new clips, reactions, and comments. Per-user preference toggles.
- **Platform support:** Full support on Android/desktop. iOS 16.4+ PWA-only (text-only, Home Screen required).
- **See:** [notifications.md](notifications.md) for setup and architecture.

## 6. Group Management (Host Controls)
- **Naming:** Host can rename the group.
- **Accent color:** Host can change the group's accent/brand color.
- **Retention policy:** Configurable auto-delete after N days (7, 14, 30, 60, 90, or off).
- **Invite code:** Host can regenerate the invite code to invalidate old links.
- **Members:** Host can view member list and remove members (soft-delete).
- **Storage:** Host can view storage stats and batch-delete clips.

## 7. Access Control
- **Private access:** Groups are invite-only via unique codes.
- **No public listing:** Groups are not discoverable.
- **Session-based:** All API endpoints require a valid session cookie.

## 8. PWA & Mobile
- **Installable:** Full PWA with manifest, service worker, and offline fallback page.
- **Share target (Android):** Receives shared URLs directly from the share sheet.
- **Install banner:** Prompts users to install the PWA.
- **Service worker updates:** Toast prompt when a new version is available.

---

## Summary Table

| Feature | Status | Notes |
|---------|--------|-------|
| iOS Shortcut sharing | Done | Share links via iOS Shortcut integration |
| Web URL submission | Done | Paste URL via add-video modal |
| Android share target | Done | Web Share Target API |
| Music sharing | Done | Odesli cross-platform resolution |
| Video download & re-host | Done | Pluggable provider, local filesystem |
| Phone verification | Done | SMS codes via Twilio |
| Username + avatar onboarding | Done | Circular crop, canvas processing |
| Private access (invite code) | Done | Host can regenerate |
| TikTok-style reel feed | Done | Full-screen vertical scroll |
| Threaded comments + hearts | Done | Nested replies, heart toggle |
| Emoji reactions | Done | 6 emoji types, animated shower |
| Watched/view tracking | Done | Watch percent, viewer list |
| Favorites | Done | Toggle, filterable in feed |
| In-app notifications | Done | Activity feed, unread badges |
| Push notifications | Done | Android/desktop full, iOS 16.4+ limited |
| Group management | Done | Name, accent, retention, members, storage |
| Theme switching | Done | System/light/dark, stored per user |
| Playback preferences | Done | Mute default, auto-scroll, playback speed |
| PWA install + updates | Done | Install banner, SW update toast |
| Retention auto-delete | Done | Scheduled cleanup |
| Daily reminder push | Planned | Preference exists, scheduling not yet implemented |
