---
paths:
  - "src/lib/server/**/*.ts"
---

# Server Module Rules

- Server-only code lives in `src/lib/server/` — SvelteKit enforces this boundary
- Database access: use Drizzle ORM schema from `src/lib/server/db/schema.ts`
- Video downloads: yt-dlp subprocess via `src/lib/server/video/`
- SMS: Twilio SDK wrapper in `src/lib/server/sms/`
- Push: web-push with VAPID keys via `src/lib/server/push.ts`
- Auth: session management via signed httpOnly cookies
- Never expose server modules to client code
