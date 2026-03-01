# Contributing to Scrolly

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- **Node.js** 24+
- **Docker** (optional, for container testing)

## Development Setup

```bash
# Clone the repo
git clone https://github.com/312-dev/scrolly.git
cd scrolly

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your values

# Start dev server
npm run dev
```

## Code Quality

### Linting & Formatting

We use **ESLint** for linting and **Prettier** for formatting. Both run automatically on staged files via Husky pre-commit hooks.

```bash
npm run lint          # Run ESLint
npm run lint:strict   # Lint with zero warnings allowed
npm run format        # Format with Prettier
npm run format:check  # Check formatting without writing
```

### Type Checking

```bash
npm run type-check    # Run svelte-check + TypeScript
```

### Testing

```bash
npm run test          # Run unit tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Pre-commit Hooks

Husky runs automatically:
- **Pre-commit**: `lint-staged` (ESLint fix + Prettier on staged `.ts`/`.svelte`/`.css` files)
- **Pre-push**: Type check + production build

## Branching & Commits

### Branch Naming

Use descriptive prefixes:
- `feature/*` — New features
- `update/*` — Enhancements, refactors, dependency updates
- `fix/*` — Bug fixes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding/updating tests |
| `chore` | Build, CI, tooling |
| `deps` | Dependency updates |

Example: `feat: add comment threading to video posts`

## Pull Request Process

1. Create a branch from `main` using the naming convention above
2. Make your changes and ensure all checks pass locally:
   ```bash
   npm run lint:strict
   npm run format:check
   npm run type-check
   npm run test
   npm run build
   ```
3. Push your branch and open a PR against `main`
4. Fill out the PR template completely
5. Wait for CI and security checks to pass
6. Squash merge after approval

### Required Checks

All PRs must pass:
- **CI** — Lint, format, type check, tests, build
- **Security** — CodeQL, Gitleaks, npm audit, Trivy, OWASP ZAP

## Code Style

### TypeScript
- Strict mode enabled
- No `any` types (warn level — work toward eliminating)
- Use `$state`, `$props`, `$effect`, `$derived` (Svelte 5 runes)
- Avoid legacy `let`/`export let` patterns

### Svelte Components
- Scoped `<style>` blocks — no global CSS beyond body resets
- Use CSS custom properties from `docs/design-guidelines.md`
- Mobile-first: design for 375px, scale up
- Max 500 lines per file (warning threshold)

### API Routes
- All endpoints return JSON
- Use Drizzle ORM for all database queries
- Place server-only code in `src/lib/server/`

## Project Structure

```
src/
├── routes/           # SvelteKit file-based routing
│   ├── (app)/        # Authenticated route group
│   └── api/          # REST API endpoints
├── lib/
│   ├── components/   # Reusable Svelte components
│   ├── server/       # Server-only code (db, sms, auth)
│   └── stores/       # Client state stores
docs/                 # Design & planning docs
static/               # PWA manifest, icons
data/                 # Runtime SQLite + videos (gitignored)
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
