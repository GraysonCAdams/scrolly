# Scrolly

Private video-sharing PWA for friend groups. SvelteKit + SQLite + Twilio.

## Tech Stack

- **Frontend:** SvelteKit 2 with Svelte 5 (runes: `$state`, `$props`, `$effect`)
- **Backend:** SvelteKit adapter-node (monolith)
- **Database:** SQLite via Drizzle ORM
- **Styling:** Scoped `<style>` blocks in Svelte components (no CSS framework)
- **Language:** TypeScript

## Design System

**All UI work MUST follow the design guidelines in `docs/design-guidelines.md`.** This is the single source of truth for colors, typography, spacing, components, and layout patterns. Reference material lives in `docs/inspo/`.

Key principles:
- Dark-first, immersive, mobile-native feel
- Bold oversized typography, strong hierarchy
- Coral (`#FF6B35`) default accent for primary CTAs (host-configurable per group)
- Magenta (`#FF2D78`) for badges/notifications/favorites
- Card-based layouts with generous rounded corners
- Sora font for display/headings (`--font-display`) via Google Fonts, system fonts for body (`--font-body`)
- Mobile-first responsive (`375px` base, `520px` max content width)
- Support system-based light/dark mode AND manual toggle in user profile settings (System / Light / Dark)
- Use CSS custom properties for ALL colors — never hardcode color values
- Theme set via `[data-theme]` attribute on `<html>`, preference stored in user DB record + cookie
- Profile pictures: circular crop upload, canvas-based client-side processing

## Project Structure

- `src/routes/` — SvelteKit file-based routing
- `src/routes/(app)/` — Authenticated route group (feed, favorites, settings)
- `src/routes/api/` — REST API endpoints (`+server.ts`)
- `src/lib/components/` — Reusable Svelte components
- `src/lib/server/` — Server-only code (db, sms, video, auth)
- `src/lib/stores/` — Svelte stores for client state
- `docs/` — Planning & design documentation
- `static/` — PWA manifest, icons
- `data/` — Runtime SQLite DB + downloaded videos (gitignored)

## Conventions

- Use Svelte 5 runes (`$state`, `$props`, `$effect`, `$derived`) not legacy `let`/`export let`
- Scoped CSS in each component — no global stylesheets beyond body resets
- Use CSS custom properties (variables) defined in `docs/design-guidelines.md` for all colors, spacing, and radii
- Mobile-first: design for `375px` first, scale up
- All API routes return JSON
- Use Drizzle ORM for all database queries
