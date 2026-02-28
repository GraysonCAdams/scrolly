---
paths:
  - "src/routes/api/**/*.ts"
  - "src/lib/server/**/*.ts"
---

# Security Rules

- Never hardcode secrets, API keys, or tokens — always use environment variables
- Validate and sanitize all user input at API boundaries
- Use parameterized queries only (Drizzle handles this — never bypass with raw SQL)
- Error responses must not leak stack traces, file paths, or internal state
- Twilio webhook endpoints must validate request signatures
- Auth cookies: httpOnly, secure, sameSite=strict
