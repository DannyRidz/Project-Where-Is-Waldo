# Where's Waldo

A full-stack photo-tagging game built for The Odin Project. Players choose a
map, click a possible character location, validate the selection through the
Express/Prisma API, and submit a server-timed score.

## Run locally

Install dependencies in both folders, then seed the SQLite database:

```bash
cd server
npm install
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

The second map is an existing Waldo puzzle image from the Hey Waldo dataset;
see [the image attribution](client/public/images/ATTRIBUTION.md).

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
