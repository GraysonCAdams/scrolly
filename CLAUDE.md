# Scrolly

Private video-sharing PWA for friend groups. SvelteKit + SQLite + Twilio.

## Build & Run

- Dev: `npm run dev`
- Build: `npm run build`
- Tests: `npm run test`
- Lint: `npm run lint`
- Type check: `npm run check`
- Format: `npm run format`

## Tech Stack

- **Frontend:** SvelteKit 2, Svelte 5 (runes), TypeScript
- **Backend:** SvelteKit adapter-node (monolith)
- **Database:** SQLite via Drizzle ORM
- **Styling:** Scoped `<style>` blocks (no CSS framework)
- **SMS:** Twilio for phone verification (auth codes)
- **Push:** web-push with VAPID keys

## Code Conventions

- IMPORTANT: Use Svelte 5 runes (`$state`, `$props`, `$effect`, `$derived`) — NOT legacy `let`/`export let`
- IMPORTANT: Use CSS custom properties for ALL colors — NEVER hardcode hex values
- Scoped CSS per component — no global stylesheets beyond body resets
- Mobile-first: design for `375px` base, `520px` max content width
- All API routes return JSON via `+server.ts` files
- Use Drizzle ORM for all database queries — never raw SQL
- IDs are UUIDs (text), timestamps are Unix epoch integers
- After making code changes, run `npm run check` to verify no type errors were introduced

## Design System

**All UI work MUST follow @docs/design-guidelines.md** — the single source of truth for colors, typography, spacing, components, and layout. Reference material in `docs/inspo/`.

## Project Structure

- `src/routes/(app)/` — Authenticated routes (feed, favorites, settings)
- `src/routes/api/` — REST API endpoints (`+server.ts`)
- `src/lib/components/` — Reusable Svelte components
- `src/lib/server/` — Server-only code (db, sms, video, auth, push)
- `src/lib/stores/` — Svelte stores for client state
- `docs/` — Planning & design docs

## Key Reference Docs

- @docs/design-guidelines.md — Colors, typography, spacing, components
- @docs/data-model.md — SQLite schema and relationships
- @docs/api.md — API endpoint reference
- @docs/architecture.md — Stack overview and deployment
- @docs/notifications.md — Push notification setup and triggers

## Git Workflow

- Commit early and often — small, focused commits as work progresses
- Conventional prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`
- Imperative mood, lowercase, no period (e.g., `feat: add comment count badge`)
- Never bundle unrelated changes into a single commit
- Commit working states only
