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
