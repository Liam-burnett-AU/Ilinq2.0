# iLINQ 2.0

A faster, mobile-first front end for **Sheldon College's iLINQ** portal.
iLINQ runs on [Schoolbox](https://schoolbox.education) (26.1.x); this app talks
to the same Schoolbox API at `https://ilinq.sheldoncollege.com`, so there is
nothing to migrate and no second login. Classic iLINQ keeps working alongside it.

| | |
|---|---|
| **Stack** | Vite 5 · React 18 · TypeScript · Tailwind CSS · react-router · date-fns |
| **Data** | Schoolbox REST API (session cookie or scoped JWT), through a same-origin proxy (Node server or Cloudflare Worker) |
| **Design** | Dark mode only, Sheldon College palette (`#00295c` / `#a3c1e7` / `#fbd708` sparingly), designated logo slot |
| **Offline dev** | Built-in demo mode with fixtures in the exact API response shapes |

## What's better than classic iLINQ

- **Today view that answers "what's next?"** Current/next class with minutes remaining, due work sorted into overdue / today / this week, today's events, latest unread news, all on one screen.
- **Real timetable grid** built from the calendar feed, with a live "now" line, due-work chips on each day, and a day-picker list on phones.
- **Due work tracker** grouped by urgency with completion state, instead of hunting through class pages.
- **News that remembers** unread markers, topic filters and save-for-later, with a clean reading view and attachments.
- **Feedback & achievements timeline** (due work marks, learning moments, badges) in one place.
- **Parents switch between children** from the header; every page follows the selected child.
- **⌘K / Ctrl+K search** across news, class pages, files, people and assessments.
- **Fast and installable**: ~90 KB gzipped, PWA manifest, bottom tab bar on phones, keyboard and screen-reader friendly.
- **Token sign-in**: generate a scoped Schoolbox API token from the profile page and sign in without a password on another device.

## Run it

```bash
npm install
cp .env.example .env     # optional: defaults already point at ilinq.sheldoncollege.com
npm run dev              # http://localhost:5173
```

Sign in with your College credentials (they go straight to iLINQ through the
proxy) or click **Student** / **Parent** on the login page to explore demo data.

Production:

```bash
npm run build
npm start                # serves dist/ and proxies /sb -> ilinq.sheldoncollege.com on :8080
```

or `docker build -t ilinq2 . && docker run -p 8080:8080 ilinq2`.

### Cloudflare Workers

The repo ships a Worker (`worker/index.ts` + `wrangler.jsonc`) that serves
`dist/` as static assets and proxies `/sb/*` to iLINQ, so Workers Builds just
needs **build command** `npm run build` and **deploy command** `npx wrangler deploy`
(or run `npm run cf:deploy` locally). `SCHOOLBOX_ORIGIN` and `API_BASE` are
plain vars in `wrangler.jsonc`; override them in the dashboard if needed.
`npm run cf:dev` runs the same Worker locally on http://localhost:8787.

### Why a proxy?

Schoolbox authenticates browser calls with its `PHPSESSID` cookie. Serving the
app from a different origin and calling the API directly would be blocked by
CORS and third-party cookie rules. Both `vite dev` and `server/proxy.mjs`
forward `/sb/*` to the Schoolbox origin and rewrite the cookie so the browser
treats it as first-party. If the College ever hosts this app on an
`*.sheldoncollege.com` subdomain, set `VITE_API_BASE=https://ilinq.sheldoncollege.com`
and the proxy becomes unnecessary (CORS permitting).

Bearer-token mode (profile → *API token*) sends `Authorization: Bearer <jwt>`
instead of a cookie and works through the same proxy.

To get a token without signing in with a password first, sign in to classic
iLINQ, open the browser console and paste `scripts/get-token.js`. It creates a
scoped token and copies it to your clipboard.

## Project layout

```
src/
  api/        Schoolbox client, typed endpoints, adapters, demo fixtures
  auth/       AuthContext: session, user profile, parent "view as child"
  components/ Shell (sidebar / bottom tabs), command palette, UI primitives, LogoSlot
  hooks/      useAsync (tiny SWR cache), useCalendar, useNow
  pages/      Today, Timetable, Calendar, Due work, News, Article, Feedback, Classes, Search, Profile, Login
  lib/        config, HTML sanitiser
  test/       vitest unit tests (adapters, client)
server/proxy.mjs   zero-dependency static + reverse proxy server (Node hosting)
worker/index.ts    the same proxy as a Cloudflare Worker (wrangler.jsonc)
docs/              API mapping and design notes
```

Scripts: `npm run dev`, `npm run build`, `npm test`, `npm run lint` (tsc), `npm start`.

## Branding

Drop the official logo at `public/sheldon-logo.svg` (or `.png` and update
`LogoSlot.tsx`). The `LogoSlot` component reserves the space on the login page,
sidebar and mobile header; until the file exists a neutral monogram is shown.

## Known limits

- Timetable and due work come from `/calendar/ajax/full`; classification of
  items (class vs due work vs event) is heuristic (see `src/api/adapters.ts`)
  because Schoolbox only hints at type through CSS class names and metadata.
  If Sheldon's instance uses different event type names, adjust the regexes
  there; the unit tests document the expected behaviour.
- Submitting due work, commenting and messaging open classic iLINQ in a new
  tab. The public API has no endpoints for those as a student.
- The assessment list API is staff/superuser only on Schoolbox, so students'
  marks come from the evidence feed (due work feedback) instead.
- This is an independent project and not affiliated with Schoolbox or an
  official Sheldon College product.
