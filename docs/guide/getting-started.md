# Getting Started

## Prerequisites

- Node.js 20+
- npm 10+

## Quick Start

```bash
# Clone and install
git clone https://github.com/312-dev/scrolly.git
cd scrolly
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values (see Configuration for details)

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Production Build

```bash
npm run build
npm run preview  # test the production build locally
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run check` | SvelteKit diagnostics |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2, Svelte 5 (runes) |
| Backend | SvelteKit adapter-node |
| Database | SQLite via Drizzle ORM |
| SMS & Verification | Twilio |
| Notifications | Web Push (VAPID) |
| Music Resolution | Odesli |
| Video Downloads | Pluggable providers (host-installed) + FFmpeg |
| Containerization | Docker |
| Language | TypeScript |

## Next Steps

- [Deploy with Docker](/deployment/docker) for a production setup
- [Configure environment variables](/deployment/configuration) for Twilio, push notifications, etc.
- [Browse the API reference](/reference/api) for endpoint details
