# Manual Deployment

Deploy Scrolly directly on a VPS without Docker.

## Requirements

- **OS:** Ubuntu 22.04+ (or similar Linux)
- **Node.js:** 20+
- **yt-dlp:** For video downloads (`pip install yt-dlp` or via apt)
- **FFmpeg:** For video/audio processing
- **Process manager:** PM2 recommended

## Setup

```bash
# 1. Install system dependencies
sudo apt update
sudo apt install -y ffmpeg python3-pip
pip install yt-dlp

# 2. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
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
