# Passport Photo Generator

A complete web-based Passport Photo Generator with:
- JPG/PNG upload
- drag/zoom/reposition crop interface
- country passport size presets with automatic aspect ratio
- live preview
- printable A4 PDF output with multiple copies at 300 DPI
- signup/login and database-backed save feature for logged-in users (guests can still download)

## One-line VPS install

```bash
curl -fsSL https://raw.githubusercontent.com/maddix123/maps/main/install.sh | sudo bash
```

## Local setup

```bash
npm install
npm start
```

Open: `http://localhost:8000`

## Stack
- Node.js + Express
- SQLite (`better-sqlite3`) auto-created on first run at `data/app.db`
- Vanilla HTML/CSS/JS frontend
