#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/maps}
REPO_URL=${REPO_URL:-https://github.com/maddix123/maps.git}

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
npm install

cat > .env <<ENV
PORT=3000
SESSION_SECRET=$(openssl rand -hex 32)
ENV

if command -v pm2 >/dev/null 2>&1; then
  pm2 start server.js --name passport-photo-generator || pm2 restart passport-photo-generator
  pm2 save
else
  nohup npm start >/var/log/passport-photo-generator.log 2>&1 &
fi

echo "App installed and running. Visit http://<your-vps-ip>:3000"
