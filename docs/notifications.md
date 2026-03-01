# Notifications & AI Titles

## Notification Types
- New adds
- Reactions (to own clip / others)
- Comments (to own clip / others)
- Daily reminders to watch

## Customization
- Users can select which notifications to receive.

## Platform Support
- Android PWAs & native: Full support, including images/thumbnails.
- iOS native: Full support.
- iOS PWAs (16.4+): Text-only, no images/rich media. Requires PWA to be **added to Home Screen** specifically (not just visited in Safari). Push reach is significantly lower than Android due to multi-step install-then-permit flow. Silent push and background wake are not supported.
- iOS PWAs (16.4+): Badge API (`navigator.setAppBadge`) available for unread count on Home Screen icon.

## AI Titles & Thumbnails
- Use LLMs for concise titles (minimal token usage).
- Cache results for efficiency.
- Thumbnails: Attach to notifications where supported.

## Summary
- Customizable notifications, AI-generated titles, thumbnails where possible.

---

## Push Notification Setup

### 1. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

This outputs a public key and a private key.

### 2. Add keys to `.env`

```env
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:you@example.com
```

Replace `VAPID_SUBJECT` with a contact email or URL for your app.

### 3. Enable notifications in the app

1. Open the app and go to **Settings**
2. Toggle **Enable notifications** on
3. The browser will prompt for notification permission — allow it
4. Choose which notification categories to receive (new clips, reactions, comments, daily reminder)

### 4. iOS-specific requirements

- The PWA **must be installed to the Home Screen** (Add to Home Screen from Safari share sheet)
- Push only works on **iOS 16.4+**
- Notifications will not work from Safari directly — only from the installed PWA
- There is no support for silent/background push on iOS

### Architecture

| Layer | File | Role |
|-------|------|------|
| Server push utility | `src/lib/server/push.ts` | VAPID init, `sendNotification()`, `sendGroupNotification()` |
| Subscribe API | `src/routes/api/push/subscribe/+server.ts` | POST/DELETE push subscriptions |
| Preferences API | `src/routes/api/notifications/preferences/+server.ts` | GET/PATCH notification preferences |
| Service worker | `src/service-worker.ts` | `push` and `notificationclick` event handlers |
| Client helpers | `src/lib/push.ts` | Permission request, subscribe/unsubscribe |
| Settings UI | `src/routes/(app)/settings/+page.svelte` | Push toggle and preference controls |

### Notification triggers

| Event | Who gets notified | Preference key |
|-------|-------------------|----------------|
| New clip added (web or SMS) | All group members except poster | `newAdds` |
| Reaction on a clip | Clip owner only | `reactions` |
| Comment on a clip | Clip owner only | `comments` |
| Daily reminder | Per-user opt-in | `dailyReminder` (not yet scheduled) |

### Database tables

- `push_subscriptions` — stores each device's push endpoint and encryption keys per user
- `notification_preferences` — per-user boolean toggles for each notification category (created automatically on onboarding)