# Koyeb deployment notes

## Overview

This backend is a TypeScript Express app. On Koyeb it must:

1. Build with `tsc` (`npm run build`)
2. Start with `npm start` (`node dist/server.js`)
3. Listen on `process.env.PORT` (bound to `0.0.0.0`)
4. Receive required secrets via Koyeb environment variables (never commit `.env`)

Scheduler jobs (`node-schedule`) start once during boot via `restoreScheduledJobs()`.

## Option A — Git-based build (no Dockerfile)

1. Create a new Koyeb **Web Service** from this GitHub repo.
2. Set **Root directory** to `backend` if the repo contains more than this folder.
3. Build command:

```bash
npm install && npm run build
```

4. Run command:

```bash
npm start
```

5. Instance type: at least a small web instance that stays running (scheduler needs a always-on process).
6. Expose the default HTTP port (Koyeb sets `PORT` automatically).
7. Health check path: `/health`

## Option B — Dockerfile

1. Create a Koyeb service using the `Dockerfile` in this folder.
2. Docker context / build directory: `backend` (or repo root if only backend is pushed).
3. Koyeb will run `CMD ["npm", "start"]`.
4. Health check path: `/health`

## Environment variables (required)

Set these in the Koyeb service **Environment** tab:

| Variable | Example / notes |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | Leave to Koyeb (auto) unless you override |
| `BASE_URL` | `https://YOUR_SERVICE.koyeb.app` (your public HTTPS URL, no trailing slash) |
| `AI_API_URL` | e.g. `https://api.groq.com/openai/v1` |
| `AI_API_KEY` | Your AI provider key |
| `AI_MODEL` | e.g. `llama-3.3-70b-versatile` |
| `TELEGRAM_BOT_TOKEN` | From `@BotFather` |
| `TELEGRAM_WEBHOOK_SECRET` | Long random string |
| `DEFAULT_TIMEZONE` | e.g. `Asia/Kolkata` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | e.g. `RemindMeAI` |
| `JWT_SECRET` | Long random secret (16+ chars) |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |

Optional: mirror values from `.env.example`.

## After deploy

1. Confirm health:

```bash
curl https://YOUR_SERVICE.koyeb.app/health
```

2. Set Telegram webhook to:

```text
https://YOUR_SERVICE.koyeb.app/telegram/webhook
```

Use your bot token and send header / secret as configured by this app (`TELEGRAM_WEBHOOK_SECRET`).

3. Ensure MongoDB Atlas Network Access allows Koyeb egress (or `0.0.0.0/0` if you accept that risk).

## Notes

- Do not hardcode ports; the app reads `process.env.PORT` via config.
- SIGTERM/SIGINT close the HTTP server and MongoDB connection for clean deploys/restarts.
- Free/sleeping instances will pause scheduled reminders while asleep — use an always-on plan for production reminders.
- Never commit `.env`. Rotate any key that was previously pushed to GitHub.
