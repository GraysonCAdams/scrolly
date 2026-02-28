# API Endpoints

All API routes are SvelteKit `+server.ts` files under `src/routes/api/`. Authenticated endpoints require a valid session cookie. Errors return JSON `{ error: string }` with an appropriate HTTP status.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth` | Current user info + group info |
| POST | `/api/auth` | Join, login, verify phone, or onboard |

### GET /api/auth
```
Response: { user: { id, username, phone, groupId, themePreference, autoScroll, mutedByDefault, avatarPath }, group: { id, name, inviteCode, accentColor, retentionDays, ... } }
```

### POST /api/auth
Dispatches by `action` field in the request body:

**Join a group:**
```
Request:  { "action": "join", "inviteCode": "abc123" }
Response: { "userId": "...", "group": { ... }, "needsOnboarding": true }
```
Sets a signed httpOnly session cookie. Resumes existing session if one exists.

**Send login code:**
```
Request:  { "action": "login-send-code", "phone": "+1234567890" }
Response: { "sent": true }
```

**Verify login code:**
```
Request:  { "action": "login-verify-code", "phone": "+1234567890", "code": "123456" }
Response: { "userId": "...", "group": { ... } }
```

**Send verification code (during onboarding):**
```
Request:  { "action": "send-code", "phone": "+1234567890" }
Response: { "sent": true }
```

**Verify code (during onboarding):**
```
Request:  { "action": "verify-code", "phone": "+1234567890", "code": "123456" }
Response: { "verified": true }
```

**Complete onboarding:**
```
Request:  { "action": "onboard", "username": "jane", "phone": "+1234567890" }
Response: { "user": { ... }, "group": { ... } }
```

## Clips

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clips` | List clips for the user's group |
| POST | `/api/clips` | Submit a URL to download |
| GET | `/api/clips/[id]` | Single clip detail |
| PATCH | `/api/clips/[id]` | Update clip title |
| DELETE | `/api/clips/[id]` | Remove clip |
| GET | `/api/clips/unwatched-count` | Count of unwatched clips |

### GET /api/clips
```
Query params: ?filter=unwatched|watched|favorites&limit=20&offset=0
Response: { "clips": [...], "hasMore": true }
```
Each clip includes: id, originalUrl, title, addedBy (username, avatarPath), status, durationSeconds, platform, contentType, createdAt, watched, favorited, reactionCounts, commentCount.

### POST /api/clips
```
Request:  { "url": "https://tiktok.com/...", "title": "optional caption" }
Response: { "clip": { "id", "status": "downloading" } }
```
Triggers the yt-dlp download pipeline. Returns immediately with status `downloading`.

### PATCH /api/clips/[id]
```
Request:  { "title": "new caption" }
Response: { "clip": { ... } }
```
Only allowed if no one else has watched the clip.

### DELETE /api/clips/[id]
Only allowed if no one else has watched the clip. Host can always delete.

### GET /api/clips/unwatched-count
```
Response: { "count": 5 }
```

## Interactions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/clips/[id]/watched` | Mark clip as watched |
| DELETE | `/api/clips/[id]/watched` | Mark clip as unwatched |
| POST | `/api/clips/[id]/favorite` | Toggle favorite |
| GET | `/api/clips/[id]/views` | List who has viewed |
| GET | `/api/clips/[id]/comments` | List comments |
| POST | `/api/clips/[id]/comments` | Add a comment |
| DELETE | `/api/clips/[id]/comments` | Delete a comment |
| POST | `/api/clips/[id]/comments/[commentId]/heart` | Toggle heart on comment |
| POST | `/api/clips/[id]/comments/viewed` | Mark comments as viewed |
| GET | `/api/clips/[id]/reactions` | List reactions |
| POST | `/api/clips/[id]/reactions` | Toggle a reaction |
| POST | `/api/clips/[id]/retry` | Retry failed download |

### POST /api/clips/[id]/watched
```
Request:  { "watchPercent": 85 }   (optional, 0–100)
Response: { "ok": true }
```

### POST /api/clips/[id]/favorite
Toggles favorite on/off.
```
Response: { "favorited": true }
```

### GET /api/clips/[id]/views
```
Response: { "views": [{ "userId", "username", "avatarPath", "watchPercent", "status", "watchedAt" }] }
```

### GET /api/clips/[id]/comments
Returns threaded comments with nested replies, heart counts, and user avatars.
```
Response: { "comments": [{ "id", "text", "user": { "username", "avatarPath" }, "parentId", "heartCount", "hearted", "replies": [...], "createdAt" }] }
```

### POST /api/clips/[id]/comments
```
Request:  { "text": "lmao", "parentId": "optional-comment-id" }
Response: { "comment": { "id", "text", "user": { ... }, "createdAt" } }
```

### POST /api/clips/[id]/comments/[commentId]/heart
Toggles heart on/off.
```
Response: { "heartCount": 3, "hearted": true }
```

### POST /api/clips/[id]/reactions
```
Request:  { "emoji": "🔥" }
Response: { "reactions": { "🔥": { "count": 2, "reacted": true } } }
```
Allowed emojis: ❤️ 👍 👎 😂 ‼️ ❓

### POST /api/clips/[id]/retry
Retries a failed download. Only available for clips with `status: 'failed'`.
```
Response: { "status": "downloading" }
```

## Group Management

Host-only endpoints (unless noted). Requires `createdBy === currentUser`.

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/group/name` | Rename group |
| PATCH | `/api/group/accent` | Change accent color |
| PATCH | `/api/group/retention` | Set retention policy |
| POST | `/api/group/invite-code/regenerate` | Generate new invite code |
| GET | `/api/group/members` | List group members |
| DELETE | `/api/group/members/[userId]` | Remove a member |
| GET | `/api/group/clips` | List clips with storage info |
| DELETE | `/api/group/clips` | Batch delete clips |
| GET | `/api/group/stats` | Group statistics |

### PATCH /api/group/name
```
Request:  { "name": "The Squad" }   (1–50 chars)
```

### PATCH /api/group/accent
```
Request:  { "accentColor": "coral" }
Response: { "accentColor": "coral" }
```

### PATCH /api/group/retention
```
Request:  { "retentionDays": 30 }   (null, 7, 14, 30, 60, or 90)
Response: { "retentionDays": 30 }
```

### POST /api/group/invite-code/regenerate
```
Response: { "inviteCode": "new-code-here" }
```

### GET /api/group/members
```
Response: [{ "id", "username", "avatarPath", "createdAt", "isHost" }]
```

### DELETE /api/group/members/[userId]
Soft-deletes the member (sets `removedAt`).

### GET /api/group/clips
```
Query params: ?sort=newest|largest&limit=20&offset=0
Response: { "clips": [...], "totalClips": 42, "totalSizeMb": 1200, "hasMore": true }
```

### DELETE /api/group/clips
```
Request:  { "clipIds": ["id1", "id2"] }
```

### GET /api/group/stats
```
Response: { "clipCount": 42, "memberCount": 8, "storageMb": 1200, "maxStorageMb": 5000 }
```

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | Paginated notification feed |
| POST | `/api/notifications/mark-read` | Mark notifications as read |
| GET | `/api/notifications/unread-count` | Unread notification count |
| GET | `/api/notifications/preferences` | Fetch notification preferences |
| PATCH | `/api/notifications/preferences` | Update notification preferences |

### GET /api/notifications
```
Query params: ?limit=20&offset=0
Response: { "notifications": [{ "id", "type", "clip", "actor", "emoji", "commentPreview", "readAt", "createdAt" }], "hasMore": true }
```

### POST /api/notifications/mark-read
```
Request:  { "all": true }             — mark all as read
Request:  { "clipId": "...", "type": "comment" }  — mark specific
```

### GET /api/notifications/unread-count
```
Response: { "count": 3 }
```

### PATCH /api/notifications/preferences
```
Request:  { "newAdds": true, "reactions": true, "comments": false, "dailyReminder": false }
Response: { "preferences": { ... } }
```

## Profile

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/profile/preferences` | Update user preferences |

### POST /api/profile/preferences
```
Request:  { "themePreference": "dark", "autoScroll": true, "mutedByDefault": false }
Response: { "themePreference": "dark", "autoScroll": true, "mutedByDefault": false }
```
All fields optional — only provided fields are updated.

## Push Notifications

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/push/subscribe` | Register a push subscription |
| DELETE | `/api/push/subscribe` | Unregister |

### POST /api/push/subscribe
```
Request:  { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
Response: { "id": "subscription-id" }   (201 Created)
```

## Media

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/videos/[filename]` | Serve video with range request support |
| GET | `/api/thumbnails/[filename]` | Serve thumbnail image |

Range requests (`Accept-Ranges: bytes`) are required for HTML5 `<video>` seeking. The server handles `Range` headers and returns `206 Partial Content`.

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |

```
Response: { "status": "ok", "version": "1.0.0", "uptime": 12345 }
```
