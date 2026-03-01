---
paths:
  - "src/routes/api/**/*.ts"
---

# API Route Rules

- All API routes are `+server.ts` files returning JSON
- Authenticated endpoints validate session cookie — return 401 if missing/invalid
- Use Drizzle ORM for all queries — never raw SQL strings
- IDs are UUIDs (text type), timestamps are Unix epoch integers
- Follow existing patterns in the codebase for error responses
- SMS inbound endpoint (`/api/sms/inbound`) must validate Twilio request signatures
- Video serving endpoints must support Range headers (206 Partial Content)
- Reference: docs/api.md for full endpoint documentation
- Reference: docs/data-model.md for schema and relationships
