# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x   | Yes       |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via [GitHub Security Advisories](https://github.com/312-dev/scrolly/security/advisories/new).

You should receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible.

## Security Practices

### Authentication & Sessions
- Session-based authentication with signed cookies
- SMS verification via Twilio for phone-based auth
- CSRF protection via SvelteKit origin checking

### Data Protection
- SQLite database stored in a Docker volume (not exposed)
- Environment secrets never committed to version control
- `.env.example` provided with placeholder values only

### Infrastructure
- Multi-stage Docker builds with minimal runtime image
- Health check endpoint at `/api/health`
- Non-root process execution recommended

### CI/CD Security
- **CodeQL SAST** — Static analysis on every PR and push
- **Gitleaks** — Secret detection across full git history
- **npm audit** — Dependency vulnerability scanning
- **Trivy** — Container image scanning (MEDIUM+ severity)
- **OWASP ZAP** — Dynamic application security testing
- **OpenSSF Scorecard** — Supply chain security assessment
- **Dependabot** — Automated dependency updates

### Self-Hosting Security Checklist
- [ ] Generate a strong `SESSION_SECRET` (32+ random bytes)
- [ ] Use HTTPS in production (reverse proxy recommended)
- [ ] Set `PUBLIC_APP_URL` to your actual domain
- [ ] Restrict Twilio webhook URLs to your domain
- [ ] Keep Docker images updated
- [ ] Monitor container logs for anomalies
