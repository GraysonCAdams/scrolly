---
paths:
  - "src/**/*.svelte"
  - "src/**/*.css"
---

# Styling Rules

- Use CSS custom properties for ALL colors — `var(--bg-primary)`, `var(--text-secondary)`, etc.
- NEVER hardcode color values like `#000`, `#fff`, `rgb()`, `rgba()` in component styles
- Exception: `rgba(0,0,0,X)` / `rgba(255,255,255,X)` for overlays on video content only
- Theme switches via `[data-theme]` attribute — styles must work in both light and dark mode
- Mobile-first: base styles target `375px`, use `min-width` media queries to scale up
- Max content width: `520px` centered
- Touch targets: minimum `44px` x `44px`
- Use `100dvh` not `100vh` for viewport height
- Use spacing tokens: `--space-xs` through `--space-3xl`
- Use radius tokens: `--radius-sm` through `--radius-full`
- Full design system reference: docs/design-guidelines.md
