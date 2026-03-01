# Manual Deployment

Deploy Scrolly directly on a VPS without Docker.

## Requirements

- **OS:** Ubuntu 22.04+ (or similar Linux)
- **Node.js:** 24+
- **FFmpeg:** For video/audio processing
- **Python 3:** Required by some download providers
- **Process manager:** PM2 recommended

Download providers (e.g. for video downloading) are installed at runtime by the host from the Settings UI — no manual installation required.

## Setup

```bash
# 1. Install system dependencies
sudo apt update
sudo apt install -y ffmpeg python3

# 2. Install Node.js 24+
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Clone and build
git clone https://github.com/312-dev/scrolly.git
cd scrolly
npm install
npm run build

# 4. Create data directory
mkdir -p data/videos

# 5. Configure environment
cp .env.example .env
nano .env  # see Configuration page

# 6. Generate VAPID keys for push notifications
npx web-push generate-vapid-keys
# Add the keys to your .env file

# 7. Start with PM2
npm install -g pm2
pm2 start build/index.js --name scrolly
pm2 save
pm2 startup  # auto-start on reboot
```

## Reverse Proxy

Set up HTTPS with a reverse proxy. Example with Caddy:

```
scrolly.example.com {
    reverse_proxy localhost:3000
}
```

## Twilio Webhook

Configure your Twilio phone number's webhook URL to point to your server:

```
https://your-domain.com/api/auth
```

This enables SMS-based video ingestion and phone verification.

## Updating

```bash
cd scrolly
git pull
npm install
npm run build
pm2 restart scrolly
```

Migrations run automatically on startup.

## Self-Hosting Responsibilities

By operating a self-hosted instance, you are responsible for:

- All content downloaded, stored, and shared on your instance
- Compliance with data protection laws (GDPR, CCPA, etc.)
- Compliance with telecommunications regulations if using SMS
- Establishing your own terms of service and privacy policy
- Securing your deployment and protecting user data
- **Download providers:** Installing a provider is an explicit opt-in action. By doing so, you accept responsibility for compliance with applicable laws and the provider's own license terms. No download tools are bundled with or automatically installed by Scrolly.

See the [Disclaimer](https://github.com/312-dev/scrolly/blob/main/DISCLAIMER.md) for full details.
