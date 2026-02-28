# Configuration

## System Requirements

Scrolly is a lightweight monolith — a single Node.js process serving the frontend, API, and running video downloads. It's designed to run comfortably on small VPS instances.

### Minimum

| Resource | Requirement | Notes |
|----------|-------------|-------|
| **CPU** | 1 vCPU | Sufficient for small groups (5–10 users) |
| **RAM** | 512 MB | Node.js (~100 MB) + yt-dlp/FFmpeg spikes during downloads |
| **Disk** | 1 GB + video storage | ~500 MB for the app/dependencies, rest for media |
| **OS** | Linux (x86_64 or arm64) | Ubuntu 22.04+, Debian 12+, or any Docker-capable host |
| **Runtime** | Node.js 20+ | Included in Docker image |
| **Network** | Public IP + HTTPS | Required for Twilio webhooks and push notifications |

### Recommended

| Resource | Requirement | Notes |
|----------|-------------|-------|
| **CPU** | 2 vCPUs | Handles concurrent video downloads without lag |
| **RAM** | 1 GB | Comfortable headroom for FFmpeg transcoding |
| **Disk** | 20–50 GB SSD | Videos average 10–50 MB each; depends on group activity and retention policy |

### Software Dependencies

Included in the Docker image. For manual deployments, install these:

| Dependency | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | Application runtime |
| **yt-dlp** | Latest | Video/audio downloading |
| **FFmpeg** | 4.4+ | Media processing and thumbnail generation |
| **Python 3** | 3.10+ | Required by yt-dlp |

### Storage Considerations

- **Video files** are the primary storage consumer. A typical TikTok clip is 10–50 MB, longer YouTube videos can be 100+ MB.
- Use the **retention policy** (Settings > Storage) to automatically delete old clips and reclaim disk space.
- The **storage cap** setting prevents the group from exceeding a disk budget.
- SQLite database is negligible in size (typically under 10 MB even with thousands of clips).
- Monitor disk usage with `docker system df` or check the group stats in Settings.


## Environment Variables

Scrolly is configured via environment variables. Copy `.env.example` to `.env` and fill in the values.

## Required Variables

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Secret key for signing session cookies. Use a long random string. |
| `TWILIO_ACCOUNT_SID` | Your Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (E.164 format, e.g. `+12025551234`) |

## Push Notifications

Generate VAPID keys with `npx web-push generate-vapid-keys`, then set:

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | Public VAPID key |
| `VAPID_PRIVATE_KEY` | Private VAPID key |
| `VAPID_SUBJECT` | Contact URL or mailto (e.g. `mailto:you@example.com`) |

Push notifications won't work without these. The app will still function, but users won't receive real-time alerts.

## Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `HOST` | `0.0.0.0` | Host to bind to |
| `ORIGIN` | — | Public URL of your instance (e.g. `https://scrolly.example.com`). Required for CORS and cookie settings in production. |

## Twilio Setup

1. Create a [Twilio account](https://www.twilio.com)
2. Get a phone number with SMS capability
3. Set the webhook URL for inbound messages to `https://your-domain.com/api/auth`
4. Add the account SID, auth token, and phone number to your `.env`

Twilio is used for:
- **Phone verification** — SMS codes during onboarding and login
- **Video ingestion** — Users text links to the Scrolly number to add clips

## Data Storage

Scrolly stores all data locally:

- **Database:** SQLite file at `data/scrolly.db`
- **Media:** Videos, audio, and thumbnails in `data/videos/`

In Docker, this is persisted via a named volume. For manual deployments, ensure the `data/` directory exists and is writable.
