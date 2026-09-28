# Where's Waldo

A full-stack photo-tagging game built for The Odin Project. Players choose a
map, click a possible character location, validate the selection through the
Express/Prisma API, and submit a server-timed score.

## Run locally

Install dependencies in both folders, then seed the SQLite database:

```bash
cd server
npm install
cp .env.example .env
node src/prepareDatabase.js
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The client uses `VITE_API_BASE` for the API URL. Copy
`client/.env.example` to `client/.env` when the API is not running at the
local default.

## Checks

```bash
cd client
npm run lint
npm run build
```

The picker offers three existing Waldo scenes, each with three verified targets.
See [the image sources](client/public/images/ATTRIBUTION.md).

## How a round works

The image load event starts an anonymous server session. Correct tags are stored
as unique session/character pairs. The final correct tag freezes the server end
time; the name form saves that existing time once. Repeating a submission returns
the existing score. The running timer is a browser display; the final result is
authoritative server time.

Correct final-tag retries also return the original completion result, so a lost
response cannot force the player to restart a completed round.

The leaderboard shows the ten fastest verified rounds for each map. Older scores
without a session link remain in SQLite but are excluded because their original
times were calculated at name submission. Coordinate updates preserve map IDs,
character IDs, sessions, and existing scores. Start a fresh round after updating
targets.

## Repeatable verification

From the project root, with both sets of dependencies installed:

```bash
node scripts/verify-build.mjs
node scripts/verify-api.mjs
node scripts/verify-browser.mjs
```

The API checks use temporary databases, including an upgrade fixture with an
existing score. They require the SQLite command-line tool (`sqlite3`). Browser
checks use the Playwright CLI through npm, require Chrome, and save screenshots
under `output/playwright/`. Both checks stop their own servers and remove their
temporary databases without modifying your local game data.

Prisma's configuration dependency is pinned to the patched `deepmerge-ts` 8.0.0
through an npm override. Keep this override until Prisma includes the fix.

## Deploy on Render (free demo)

This repository includes `render.yaml`, which creates one free web service
in Singapore. Express serves both the compiled React site and the API.

1. Push the deployment files to GitHub.
2. In Render, choose **New > Blueprint**, connect this repository, and select
   the `main` branch. Review the free service and deploy it.
3. Open the service's `onrender.com` URL when the deploy is live.

For **New > Web Service** instead of a Blueprint, use these values:

| Setting | Value |
| --- | --- |
| Repository | `DannyRidz/Project-Where-Is-Waldo` |
| Branch | `main` |
| Root Directory | Leave empty |
| Runtime | Node |
| Region | Singapore |
| Instance Type | Free |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| `NODE_VERSION` | `22.16.0` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `file:/tmp/waldo-render.db` |

The startup command applies migrations and fills missing maps. No separate
frontend service or `VITE_API_BASE` setting is needed. Free Render services
use temporary storage, so scores can reset after a restart, redeploy, or
idle shutdown. The maps are restored automatically on startup.
