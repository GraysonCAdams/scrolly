# Scrolly Feature Breakdown

## 1. Video Ingestion
- **Goal:** Allow users to share TikTok/Instagram/Facebook links to the app. Videos are downloaded and re-hosted via yt-dlp.
- **Primary method:** SMS. Users text links to the Scrolly phone number (Twilio). Any non-URL text in the message becomes the video's **caption**. On signup, users receive a VCF contact card via MMS.
- **Fallback:** Paste URL into the web app's input field.
- **Android bonus (Phase 3):** PWA can register as a share target via the Web Share Target API for direct share sheet integration.
- **iOS limitation:** PWAs cannot be share targets. SMS fully solves this.
- **Notes:** Videos are downloaded server-side via yt-dlp and stored on the VPS filesystem. See [sms-integration.md](sms-integration.md) for full SMS flow.

## 2. User Identity
- **Goal:** Prompt for username and phone number. No password; access via private invite code.
- **Doable:** Yes. Simple onboarding flow: invite code → username → phone number (required). Phone is used to match inbound SMS to the user. Session via signed httpOnly cookie.

## 3. Feed & Interaction
- **Goal:** Scrollable TikTok-style feed, track who added what, allow comments/reactions, show original link, track watched status, tabs for "Unwatched", "Watched", "Favorites".
- **Doable:** Yes. All features are standard for web apps. UI built with SvelteKit. Watched/favorite tracking via SQLite backend.

## 4. Notifications
- **Goal:** Push notifications for new videos.
- **Doable:** Partially. Web push is supported for PWAs on Android and desktop. iOS supports web push as of iOS 16.4+, but **only** for PWAs added to the Home Screen; notifications are text-only (no images or rich media), and reach is significantly lower due to the multi-step install-then-permit flow. Requires backend for notification delivery.

## 5. Access Control
- **Goal:** Private access only (invite link/code).
- **Doable:** Yes. Can implement invite codes or private links. No public listing.

## 6. Host Controls
- **Goal:** Set retention policy (max days/storage), auto-delete, keep original URL for deleted videos.
- **Doable:** Yes. Backend can enforce retention and storage limits. Keeping original URL for deleted videos is straightforward.

---

## Summary Table
| Feature | Doable | Notes |
|---------|--------|-------|
| SMS video ingestion | Yes | Primary method. Text links + captions to Scrolly number. |
| Share sheet (Android) | Phase 3 | Web Share Target API — bonus, not required |
| Video download & re-host | Yes | yt-dlp on VPS, local filesystem storage |
| Username + phone onboarding | Yes | No password. Phone required for SMS matching. |
| Private access | Yes | Invite code |
| TikTok-style feed | Yes | SvelteKit PWA |
| Comments/reactions | Yes | Phase 2 |
| Watched/favorites tracking | Yes | SQLite backend |
| Push notifications | Partial | Android/desktop: Yes; iOS: 16.4+ Home Screen PWA only, text-only, lower reach |
| Retention controls | Yes | Backend logic |
| Keep original URL | Yes | Simple |
