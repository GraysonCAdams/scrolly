# Architecture

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | SvelteKit (PWA) | Compiled to vanilla JS, small bundle, built-in service worker support |
| Backend | SvelteKit adapter-node | Monolithic — API routes + frontend in one Node.js process |
| Database | SQLite via Drizzle ORM | Single file, no separate server, type-safe queries |
| Video downloads | yt-dlp (subprocess) | Supports TikTok, Instagram, Facebook |
| Video storage | Local filesystem | `data/videos/` on VPS |
| SMS | Twilio | Inbound webhook for video ingestion, outbound MMS for VCF delivery |
| Push notifications | web-push (Node.js) | VAPID-based Web Push Protocol |
| Reverse proxy | Caddy | Automatic HTTPS via Let's Encrypt |
| Process manager | PM2 or systemd | Auto-restart on crash |

## Overview

```
┌─────────────────────────────────────┐
│            Caddy (HTTPS)            │
├─────────────────────────────────────┤
│     SvelteKit (adapter-node)        │
│  ┌──────────┐  ┌─────────────────┐  │
│  │ Frontend  │  │  API Routes     │  │
│  │ (Svelte)  │  │  (+server.ts)   │  │
│  └──────────┘  └─────────────────┘  │
│         │              │            │
│    Service Worker   ┌──┴──┐        │
│    (PWA offline)    │     │        │
│                  SQLite  Filesystem │
│                  (Drizzle) (videos) │
├─────────────────────────────────────┤
│  yt-dlp (subprocess)                │
│  Twilio (SMS inbound/outbound)      │
│  web-push (notifications)           │
└─────────────────────────────────────┘
```

## Why Monolithic SvelteKit

For 5-20 users, a single Node.js process handles everything. No microservices overhead, single deploy, simple ops. API routes live in `src/routes/api/` as `+server.ts` files alongside the frontend routes.

## Directory Structure

```
scrolly/
├── docs/                        # Planning & design docs
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       # Drizzle schema definitions
│   │   │   │   ├── index.ts        # DB connection (better-sqlite3)
│   │   │   │   └── migrations/     # Drizzle migrations
│   │   │   ├── video/
│   │   │   │   ├── download.ts     # yt-dlp wrapper
│   │   │   │   ├── metadata.ts     # Extract metadata/thumbnails
│   │   │   │   └── cleanup.ts      # Retention policy enforcement
│   │   │   ├── sms/
│   │   │   │   ├── client.ts       # Twilio SDK wrapper
│   │   │   │   ├── inbound.ts      # Parse incoming SMS, extract URL + caption
│   │   │   │   └── vcard.ts        # Generate VCF for Scrolly contact
│   │   │   ├── push.ts             # web-push wrapper
│   │   │   └── auth.ts             # Invite code validation, session management
│   │   ├── components/
│   │   │   ├── VideoFeed.svelte     # TikTok-style scrolling feed
│   │   │   ├── VideoCard.svelte     # Individual video player card
│   │   │   ├── Comments.svelte
│   │   │   ├── Reactions.svelte
│   │   │   └── AddVideo.svelte      # Paste/submit URL form (fallback)
│   │   └── stores/
│   │       ├── user.ts              # User session store
│   │       └── feed.ts              # Feed state, filters
│   ├── routes/
│   │   ├── +layout.svelte           # App shell, nav
│   │   ├── +page.svelte             # Landing / redirect
│   │   ├── join/+page.svelte        # Invite code entry
│   │   ├── onboard/+page.svelte     # Username + phone number
│   │   ├── api/
│   │   │   ├── auth/+server.ts
│   │   │   ├── clips/+server.ts
│   │   │   ├── clips/[id]/comments/+server.ts
│   │   │   ├── clips/[id]/reactions/+server.ts
│   │   │   ├── clips/[id]/watched/+server.ts
│   │   │   ├── sms/inbound/+server.ts
│   │   │   ├── push/subscribe/+server.ts
│   │   │   ├── videos/[filename]/+server.ts
│   │   │   └── thumbnails/[filename]/+server.ts
│   │   └── (app)/                   # Authenticated route group
│   │       ├── +page.svelte         # Feed
│   │       ├── favorites/+page.svelte
│   │       └── settings/+page.svelte
│   ├── service-worker.ts            # PWA caching, offline support
│   └── app.html
├── static/
│   ├── manifest.json                # PWA manifest
│   └── icons/                       # App icons (192x192, 512x512)
├── data/                            # Gitignored runtime data
│   ├── scrolly.db                   # SQLite database file
│   └── videos/                      # Downloaded video + thumbnail files
├── drizzle.config.ts
├── svelte.config.js
├── package.json
└── Caddyfile
```

## Deployment

```
VPS (Ubuntu, e.g., DigitalOcean or Hetzner)
├── Caddy         → reverse proxy, automatic HTTPS
├── Node.js 20+   → runs SvelteKit build
├── yt-dlp        → installed via pip or apt
├── data/         → SQLite DB + video files
└── PM2           → process management, auto-restart
```

### Setup Steps

1. Provision VPS (Ubuntu 22.04+), install Node.js 20+, yt-dlp, Caddy
2. Clone repo, `npm install`, `npm run build`
3. Create `data/videos/` directory
4. Configure Caddyfile: `scrolly.example.com { reverse_proxy localhost:3000 }`
5. Start app: `pm2 start build/index.js --name scrolly`
6. Generate VAPID keys: `npx web-push generate-vapid-keys`
7. Configure Twilio webhook URL: `https://scrolly.example.com/api/sms/inbound`

## PWA Configuration

**manifest.json:**
- `display: "standalone"`
- `share_target` (Android — receives shared URLs via share sheet)
- `start_url: "/"`
- Standard icon sizes (192x192, 512x512)

**Service Worker:**
- Cache app shell (HTML, CSS, JS) for offline access
- Cache video thumbnails
- Network-first strategy for API calls
- Offline fallback page
