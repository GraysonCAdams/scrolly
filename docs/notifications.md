# Notifications

Scrolly has two notification systems: an **in-app activity feed** and **web push notifications**.

## In-App Activity Feed

The activity page (`/activity`) shows a chronological feed of notifications. Users see:
- New clips added to the group
- Reactions on their clips
- Comments on their clips

Notifications are stored in the `notifications` table with read/unread tracking. The bottom navigation shows an unread badge count.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | Paginated notification feed |
| POST | `/api/notifications/mark-read` | Mark notifications as read (all or by clip/type) |
| GET | `/api/notifications/unread-count` | Unread badge count |
| GET | `/api/notifications/preferences` | Fetch notification preferences |
| PATCH | `/api/notifications/preferences` | Update notification preferences |

## Push Notifications

Real-time push notifications via the Web Push Protocol (VAPID).

### Notification Types

| Event | Who gets notified | Preference key |
|-------|-------------------|----------------|
| New clip added (web or SMS) | All group members except poster | `newAdds` |
| Reaction on a clip | Clip owner only | `reactions` |
| Comment on a clip | Clip owner only | `comments` |
| Daily reminder | Per-user opt-in | `dailyReminder` (not yet scheduled) |

### Customization

Users can toggle each notification type on/off in Settings. Preferences are stored in the `notification_preferences` table (created automatically on onboarding).

### Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| Android PWA | Full | Images, actions, badges |
| Desktop (Chrome, Edge, Firefox) | Full | Standard web push |
| iOS PWA (16.4+) | Limited | Text-only, no images. Must be added to Home Screen. |
| iOS Safari | None | Push only works from installed PWA, not browser. |

**iOS-specific requirements:**
- PWA must be installed to the Home Screen (Add to Home Screen from Safari share sheet)
- Push only works on iOS 16.4+
- No silent/background push
- Badge API (`navigator.setAppBadge`) available for unread count on Home Screen icon

### Setup

**1. Generate VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

**2. Add keys to `.env`:**
```env
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:you@example.com
```

**3. Enable in the app:**
1. Open Settings
2. Toggle **Enable notifications** on
3. Allow the browser notification permission prompt
4. Choose which categories to receive

### Architecture

| Layer | File | Role |
|-------|------|------|
| Server push utility | `src/lib/server/push.ts` | VAPID init, `sendNotification()`, `sendGroupNotification()` |
| Subscribe API | `src/routes/api/push/subscribe/+server.ts` | POST/DELETE push subscriptions |
| Notifications API | `src/routes/api/notifications/+server.ts` | GET notification feed |
| Mark-read API | `src/routes/api/notifications/mark-read/+server.ts` | POST mark as read |
| Unread-count API | `src/routes/api/notifications/unread-count/+server.ts` | GET unread badge count |
| Preferences API | `src/routes/api/notifications/preferences/+server.ts` | GET/PATCH preferences |
| Service worker | `src/service-worker.ts` | `push` and `notificationclick` event handlers |
| Client helpers | `src/lib/push.ts` | Permission request, subscribe/unsubscribe |
| Notification store | `src/lib/stores/notifications.ts` | Client-side polling and unread count |
| Settings UI | `src/routes/(app)/settings/+page.svelte` | Push toggle and preference controls |
| Activity page | `src/routes/(app)/activity/+page.svelte` | In-app notification feed |

### Database Tables

- `notifications` — stores each notification with type, actor, clip reference, read status, and optional emoji/comment preview. Indexed on `(user_id, created_at)`.
- `push_subscriptions` — stores each device's push endpoint and encryption keys per user.
- `notification_preferences` — per-user boolean toggles for each notification category (created automatically on onboarding).
