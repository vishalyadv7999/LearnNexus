# LearnNexus Production Guide

## Architecture

- `client/`: React + Vite single-page app with lazy routes, global error boundary, silent auth refresh, offline notice, and API retry on expired access tokens.
- `server/`: Express API with `/api` and `/api/v1` routes, MongoDB via Mongoose pooling, request validation, rate limiting, structured logging, health checks, and graceful shutdown.
- `MongoDB`: persistent user, refresh-token, study-plan, task, progress, channel, playlist, and video verification storage. Refresh tokens are opaque, HMAC-hashed in MongoDB, renewed with a sliding expiry, and cleaned up with a TTL index.
- `Redis`: optional recommendation/search response cache via `REDIS_URL`, with bounded memory fallback for local development.
- `deploy/`: Nginx reverse proxy, uptime check, and backup script.
- `.github/workflows/ci.yml`: install, API tests, syntax checks, and frontend production build.
- `render.yaml` and `vercel.json`: baseline Render API/static-web and Vercel static-client deployment configuration.

## Deployment Steps

1. Copy `server/.env.example` to `server/.env` and set real values for `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, email, and cookie settings.
2. For same-domain production behind Nginx, keep `COOKIE_SAME_SITE=lax`. For different top-level frontend/API domains, use `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`.
3. Run `npm ci`.
4. Run `npm --workspace server run create-indexes` against the production database.
5. Run `npm test` and `npm --workspace client run build`.
6. Start with Docker: `docker compose up -d --build`.
7. Verify `http://your-domain/api/health` returns `status: ok`.
8. Schedule `deploy/backup-mongo.ps1 -MongoUri "<production-mongo-uri>"` daily and retain offsite backups.

## Platform Notes

- Render: deploy `learnnexus-api` with an external MongoDB Atlas `MONGODB_URI`, then deploy `learnnexus-web` with `VITE_API_URL` pointing to `https://your-api.onrender.com/api`.
- Vercel: use it for the static client only. Set `VITE_API_URL` to the deployed API URL ending in `/api`.
- Cross-site frontend/API deployments need `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`, HTTPS on both origins, and `CLIENT_URL` set to the exact frontend origin.

## Security Checklist

- Use a 64+ character random value for `JWT_SECRET`; never regenerate it casually during active sessions.
- Serve only over HTTPS in production.
- Keep refresh tokens in HTTP-only cookies only; access tokens stay in memory.
- Use `EMAIL_USER` and `EMAIL_PASS` for password reset delivery; reset links are built from `CLIENT_URL`.
- Confirm `CLIENT_URL` matches the deployed frontend origin.
- Keep `TRUST_PROXY=true` only behind a trusted reverse proxy.
- Keep MongoDB network access restricted to the API host.
- Rotate SMTP and MongoDB credentials if they are exposed.
- Run `npm audit --omit=dev` during release review and patch vulnerable dependencies.

## Performance Checklist

- Keep Nginx gzip enabled and cache `/assets` immutably.
- Use MongoDB Atlas or a managed MongoDB with monitoring and automated backups.
- Run `create-indexes` after schema/index changes.
- Scale the API horizontally with PM2 cluster or multiple containers.
- Keep video search cached; avoid calling YouTube search on every page render.
- Keep recommendation catalogs verified: a video must match exact channel ID, subject, semester, language, and verified fallback policy before it is shown.
- Use the Vite production build; do not serve the dev server in production.

## Monitoring

- Health: `GET /api/health`.
- Uptime check: `node deploy/uptime-check.js` with `UPTIME_URL=https://your-domain/api/health`.
- Logs: JSON in production via Winston, including service and environment metadata.
- Process recovery: Docker restart policies or `pm2 start ecosystem.config.cjs`.

## Database Safety

- `RefreshToken.expiresAt` has a TTL index for automatic cleanup.
- Progress and study plans have unique `{ user, date }` indexes to prevent duplicate daily records.
- Task/progress lookups are indexed by user, date, study plan, and last update time.
- Password reset revokes all refresh sessions for the account.
