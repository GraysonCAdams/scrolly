---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.spec.ts"
---

# Testing Rules

- Test framework: Vitest
- Run tests: `npm run test`
- Run with coverage: `npm run test:coverage`
- Watch mode: `npm run test:watch`
- Place test files alongside source files (co-located)
- Use descriptive test names that explain the expected behavior
- Prefer running single test files (`npx vitest run path/to/file.test.ts`) over the full suite
- When fixing a bug, write a failing test first, then fix
