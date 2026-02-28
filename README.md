<p align="center">
  <img src="static/icons/icon-192x192.png" alt="Scrolly" width="100" />
</p>

<h1 align="center">Scrolly</h1>

<p align="center">
  Private video-sharing PWA for friend groups.
</p>

<p align="center">
  <a href="https://github.com/graysoncadams/scrolly/actions/workflows/ci.yml"><img src="https://github.com/graysoncadams/scrolly/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/graysoncadams/scrolly/actions/workflows/security.yml"><img src="https://github.com/graysoncadams/scrolly/actions/workflows/security.yml/badge.svg" alt="Security"></a>
  <a href="https://api.scorecard.dev/projects/github.com/graysoncadams/scrolly"><img src="https://api.scorecard.dev/projects/github.com/graysoncadams/scrolly/badge" alt="OpenSSF Scorecard"></a>
  <a href="https://github.com/graysoncadams/scrolly/releases/latest"><img src="https://img.shields.io/github/v/release/graysoncadams/scrolly?label=release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/graysoncadams/scrolly" alt="License"></a>
</p>

---

Share video clips and music links with your close friends through private groups. Built as an installable PWA with a native mobile feel.

## Features

- **Video Feed** — SMS-based clip sharing via Twilio with inline playback
- **Music Sharing** — Cross-platform link resolution via Odesli
- **Groups** — Invite codes, customizable accent colors, member management
- **Push Notifications** — Real-time alerts via Web Push API
- **Favorites & Reactions** — Save and react to shared content
- **Comments** — Threaded discussions on posts
- **Themes** — Dark, light, and system-based theme switching
- **PWA** — Installable on mobile and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2, Svelte 5 (runes) |
| Backend | SvelteKit adapter-node |
| Database | SQLite via Drizzle ORM |
| Messaging | Twilio SMS |
| Notifications | Web Push (VAPID) |
| Styling | Scoped CSS, custom properties |
| Language | TypeScript |

## Quick Start

```bash
# Clone and install
git clone https://github.com/graysoncadams/scrolly.git
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
curl -LO https://raw.githubusercontent.com/GraysonCAdams/scrolly/main/docker-compose.yml
curl -LO https://raw.githubusercontent.com/GraysonCAdams/scrolly/main/.env.example
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
image: ghcr.io/graysoncadams/scrolly:1.0.0   # Exact version
image: ghcr.io/graysoncadams/scrolly:1.0      # Latest patch in 1.0.x
image: ghcr.io/graysoncadams/scrolly:latest   # Always newest
```

All versions are listed on the [Releases](https://github.com/GraysonCAdams/scrolly/releases) page.

### Auto-Updates (optional)

Uncomment the Watchtower service in `docker-compose.yml` to automatically pull new images daily.

### Backup

```bash
docker run --rm -v scrolly_scrolly-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/scrolly-backup-$(date +%Y%m%d).tar.gz -C / data
```

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

## License

[MIT](LICENSE) — Created by [@GraysonCAdams](https://github.com/GraysonCAdams)
