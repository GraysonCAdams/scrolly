# API Endpoints

All API routes are SvelteKit `+server.ts` files under `src/routes/api/`. Authenticated endpoints require a valid session cookie.

## Auth & Access

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/join` | Validate invite code, create or resume session |
| POST | `/api/auth/onboard` | Set username + phone number. Sends VCF via SMS. |
| GET | `/api/auth/me` | Current user info + group info |

### POST /api/auth/join
```
Request:  { "invite_code": "abc123" }
Response: { "user_id": "...", "group": { ... }, "needs_onboarding": true }
```
Sets a signed httpOnly session cookie. If the user already has a session, resumes it.

### POST /api/auth/onboard
```
Request:  { "username": "grayson", "phone": "+1234567890" }
Response: { "user": { ... }, "vcf_sent": true }
```
Requires active session from `/join`. Sends an MMS with VCF attachment to the provided phone number.

### GET /api/auth/me
```
Response: { "user": { "id", "username", "phone", "group_id" }, "group": { "id", "name", ... } }
```

## Clips

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clips` | List clips for the user's group |
| POST | `/api/clips` | Submit a URL to download (fallback to SMS) |
| GET | `/api/clips/[id]` | Single clip detail |
| DELETE | `/api/clips/[id]` | Remove clip (host or clip owner only) |

### GET /api/clips
```
Query params: ?filter=unwatched|watched|favorites&page=1&limit=20
Response: { "clips": [ { "id", "original_url", "title", "added_by": { "username" }, "status", "duration_seconds", "platform", "created_at", "watched": bool, "favorited": bool, "reaction_counts": { "😂": 3 }, "comment_count": 5 } ] }
```

### POST /api/clips
```
Request:  { "url": "https://tiktok.com/...", "title": "optional caption" }
Response: { "clip": { "id", "status": "downloading" } }
```
Triggers the yt-dlp download pipeline. Returns immediately with status `downloading`.

## Interactions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/clips/[id]/watched` | Mark clip as watched |
| DELETE | `/api/clips/[id]/watched` | Mark clip as unwatched |
| POST | `/api/clips/[id]/favorite` | Toggle favorite |
| GET | `/api/clips/[id]/comments` | List comments |
| POST | `/api/clips/[id]/comments` | Add a comment |
| POST | `/api/clips/[id]/reactions` | Add a reaction |
| DELETE | `/api/clips/[id]/reactions/[emoji]` | Remove a reaction |

### POST /api/clips/[id]/comments
```
Request:  { "text": "lmao" }
Response: { "comment": { "id", "text", "user": { "username" }, "created_at" } }
```

### POST /api/clips/[id]/reactions
```
Request:  { "emoji": "🔥" }
Response: { "reaction": { "id", "emoji", "user_id" } }
```

## SMS Inbound

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sms/inbound` | Twilio webhook — receives incoming text messages |

### POST /api/sms/inbound
Called by Twilio when a user texts the Scrolly number. Not called by the frontend.

```
Twilio POST body includes: From, Body, NumMedia, MediaUrl0, etc.
```

**Processing logic:**
1. Look up user by `From` phone number
2. Extract URL(s) from `Body`
3. Non-URL text in `Body` becomes the video caption
4. Create clip record + trigger download for each URL
5. Reply via TwiML: "Got it! Your video is being added to the feed."
6. If phone not found: "This number isn't registered with Scrolly."

**Security:** Validate that the request is actually from Twilio using request signature verification.

## Push Notifications

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/push/subscribe` | Register a push subscription |
| DELETE | `/api/push/subscribe` | Unregister |
| PUT | `/api/push/preferences` | Update notification preferences |

### POST /api/push/subscribe
```
Request:  { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
Response: { "subscribed": true }
```

### PUT /api/push/preferences
```
Request:  { "new_adds": true, "reactions": true, "comments": false, "daily_reminder": false }
Response: { "preferences": { ... } }
```

## Video Serving

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/videos/[filename]` | Serve video file with range request support |
| GET | `/api/thumbnails/[filename]` | Serve thumbnail image |

Range requests (`Accept-Ranges: bytes`) are required for HTML5 `<video>` seeking to work correctly. The server must handle `Range` headers and return `206 Partial Content`.
