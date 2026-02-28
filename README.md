<p align="center">
  <img src="static/icons/icon-192x192.png" alt="Scrolly" width="100" />
</p>

<h1 align="center">Scrolly</h1>

<p align="center">
  Private video-sharing PWA for friend groups.
</p>

<p align="center">
  <a href="https://github.com/312-dev/scrolly/actions/workflows/ci.yml"><img src="https://github.com/312-dev/scrolly/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/312-dev/scrolly/actions/workflows/security.yml"><img src="https://github.com/312-dev/scrolly/actions/workflows/security.yml/badge.svg" alt="Security"></a>
  <a href="https://api.scorecard.dev/projects/github.com/312-dev/scrolly"><img src="https://api.scorecard.dev/projects/github.com/312-dev/scrolly/badge" alt="OpenSSF Scorecard"></a>
  <a href="https://github.com/312-dev/scrolly/releases/latest"><img src="https://img.shields.io/github/v/release/312-dev/scrolly?label=release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/312-dev/scrolly" alt="License"></a>
</p>

---

Share video clips and music links with your close friends through private groups. Built as an installable PWA with a native mobile feel.

## Features

- **TikTok-Style Feed** — Full-screen vertical reel with swipe navigation and inline playback
- **Video Sharing** — Share links via SMS (Twilio) or paste in-app; videos downloaded and re-hosted via yt-dlp
- **Music Sharing** — Cross-platform streaming link resolution via Odesli (Spotify, Apple Music, YouTube Music)
- **Android Share Target** — Share directly from any app's share sheet to Scrolly
- **Private Groups** — Invite-only access with customizable accent colors and group names
- **Comments & Reactions** — Threaded comments with hearts, emoji reactions with animated effects
- **Activity Feed** — In-app notifications for new clips, reactions, and comments
- **Push Notifications** — Real-time alerts via Web Push API (Android, desktop, iOS 16.4+ PWA)
- **View Tracking** — See who watched each clip and how far they got
- **Favorites** — Save clips and filter your feed
- **Phone Verification** — SMS-based login and onboarding via Twilio
- **Host Controls** — Manage members, retention policy, storage, invite codes
- **Themes** — Dark, light, and system-based switching with per-user preference
- **PWA** — Installable on mobile and desktop with offline support

## Important: Legal Responsibilities

Scrolly uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) to download media from third-party platforms. **You are responsible for ensuring your use complies with applicable laws and platform terms of service.** This software is intended for personal, private use among small friend groups. See [DISCLAIMER.md](DISCLAIMER.md) for full details.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2, Svelte 5 (runes) |
| Backend | SvelteKit adapter-node |
| Database | SQLite via Drizzle ORM |
| SMS & Verification | Twilio |
| Notifications | Web Push (VAPID) |
| Music Resolution | Odesli |
| Video Downloads | [yt-dlp](https://github.com/yt-dlp/yt-dlp) + FFmpeg |
| Containerization | Docker |
| Language | TypeScript |

## Quick Start

**Prerequisites:** Node.js 20+, npm 10+

```bash
# Clone and install
git clone https://github.com/312-dev/scrolly.git
cd scrolly
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values (see comments in file)

# Development
npm run dev
```

## Self-Hosting with Docker

### Install

```bash
# 1. Download the compose file and env template
curl -LO https://raw.githubusercontent.com/312-dev/scrolly/main/docker-compose.yml
curl -LO https://raw.githubusercontent.com/312-dev/scrolly/main/.env.example
cp .env.example .env

# 2. Configure (edit .env — see comments for guidance)
nano .env

# 3. Start
docker compose up -d
```

The app will be available at `http://localhost:3000`. Database migrations run automatically on every startup — no manual steps needed.

### Upgrade

```bash
docker compose pull        # Pull the latest image
docker compose up -d       # Restart with new version (migrations run automatically)
```

### Version Pinning

Edit `docker-compose.yml` to control which version you run:

```yaml
image: ghcr.io/312-dev/scrolly:1.0.0   # Exact version
image: ghcr.io/312-dev/scrolly:1.0      # Latest patch in 1.0.x
image: ghcr.io/312-dev/scrolly:latest   # Always newest
```

All versions are listed on the [Releases](https://github.com/312-dev/scrolly/releases) page.

### Auto-Updates (optional)

Uncomment the Watchtower service in `docker-compose.yml` to automatically pull new images daily.

### Backup

```bash
docker run --rm -v scrolly_scrolly-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/scrolly-backup-$(date +%Y%m%d).tar.gz -C / data
```

### Self-Hosting Responsibilities

By operating a self-hosted instance, you assume full responsibility for:

- All content downloaded, stored, and shared on your instance
- Compliance with data protection laws (GDPR, CCPA, etc.) applicable to your users
- Compliance with telecommunications regulations if using SMS features
- Establishing your own terms of service and privacy policy for your users
- Securing your deployment and protecting user data

The Scrolly maintainers accept no responsibility for third-party deployments. See [DISCLAIMER.md](DISCLAIMER.md).

## Documentation

Full docs at **[312-dev.github.io/scrolly](https://312-dev.github.io/scrolly/)** — deployment guides, configuration reference, and API docs.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run lint:strict` | Lint with zero warnings |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run check` | SvelteKit diagnostics |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and PR guidelines.

## Security

See [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

## Legal

[MIT](LICENSE) — Created by [@312-dev](https://github.com/312-dev)

See [DISCLAIMER.md](DISCLAIMER.md) for content and liability disclaimers, and [NOTICE](NOTICE) for third-party attributions.
