# Docker Deployment

The recommended way to run Scrolly in production. A single container includes Node.js, FFmpeg, and Python 3. Download providers are installed at runtime by the host from the Settings UI.

## Install

```bash
# Download compose file and env template
curl -LO https://raw.githubusercontent.com/312-dev/scrolly/main/docker-compose.yml
curl -LO https://raw.githubusercontent.com/312-dev/scrolly/main/.env.example
cp .env.example .env

# Configure (see Configuration page for details)
nano .env

# Start
docker compose up -d
```

The app will be available at `http://localhost:3000`. Database migrations run automatically on every startup.

## Upgrade

```bash
docker compose pull        # Pull the latest image
docker compose up -d       # Restart with new version
```

Migrations run automatically — no manual steps needed.

## Version Pinning

Edit `docker-compose.yml` to control which version you run:

```yaml
image: ghcr.io/312-dev/scrolly:1.0.0   # Exact version
image: ghcr.io/312-dev/scrolly:1.0      # Latest patch in 1.0.x
image: ghcr.io/312-dev/scrolly:latest   # Always newest
```

All versions are listed on the [Releases](https://github.com/312-dev/scrolly/releases) page.

## Auto-Updates

Uncomment the Watchtower service in `docker-compose.yml` to automatically pull new images daily.

## Backup

```bash
docker run --rm \
  -v scrolly_scrolly-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/scrolly-backup-$(date +%Y%m%d).tar.gz -C / data
```

## Reverse Proxy

Scrolly should sit behind a reverse proxy for HTTPS. Example with Caddy:

```
scrolly.example.com {
    reverse_proxy localhost:3000
}
```

Nginx and Traefik work equally well.

## Self-Hosting Responsibilities

By operating a self-hosted instance, you are responsible for:

- All content downloaded, stored, and shared on your instance
- Compliance with data protection laws (GDPR, CCPA, etc.)
- Compliance with telecommunications regulations if using SMS
- Establishing your own terms of service and privacy policy
- Securing your deployment and protecting user data

See the [Disclaimer](https://github.com/312-dev/scrolly/blob/main/DISCLAIMER.md) for full details.
