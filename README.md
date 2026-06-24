# Sign Me Out

A web app for the Nigerian **sign-out day** tradition. Graduating students create an
infinite **sign-out space** and share the link; friends drop by to leave signatures,
doodles, well-wishes, photos, and voice notes on the canvas — a keepsake you can revisit,
print, or wear.

## Stack

- **[TanStack Start](https://tanstack.com/start)** (React 19 + SSR, Nitro, file-based routing, server functions)
- **[Konva](https://konvajs.org/) / react-konva** + **[perfect-freehand](https://github.com/steveruizok/perfect-freehand)** for the infinite canvas and marker-style strokes
- **[Supabase](https://supabase.com/)** — Postgres, Auth (Google OAuth + email/password), Realtime, Storage
- **[Drizzle ORM](https://orm.drizzle.team/)** for schema + server-side writes
- **[Tailwind CSS v4](https://tailwindcss.com/)** + **[shadcn/ui](https://ui.shadcn.com/)** (new-york / zinc)
- **[Biome](https://biomejs.dev/)** for lint + format

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment

Create `.env.local` with:

| Variable | Used by | Where to find it |
| --- | --- | --- |
| `DATABASE_URL` | Drizzle (server writes & migrations) | Supabase → Project Settings → Database → Connection string (transaction pooler, port 6543) |
| `VITE_SUPABASE_URL` | Browser client (auth, realtime, storage) | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Browser client | Supabase → Project Settings → API |

> `.env.local` is git-ignored — never commit secrets.

### Supabase setup (one-time, dashboard)

1. Enable the **Google** auth provider and add redirect URLs:
   `http://localhost:3000/auth/callback` (and your production URL).
2. Apply the database schema: `npm run db:generate && npm run db:migrate`.
3. Run `scripts/init-policies.sql` in the Supabase SQL editor — it sets up RLS read
   policies, adds `marks` to the `supabase_realtime` publication, creates the
   `space-media` storage bucket, and wires the `auth.users → profiles` trigger.

## How it works

- **Viewing is public** — anyone with the link sees the board. **Leaving a mark requires
  sign-in** (Google or email/password).
- **Writes** go through TanStack Start **server functions** (`src/server/*`) on the Drizzle
  service connection; **reads** load via the route loader and stay live via **Supabase
  Realtime**; **media** (photos / voice) uploads directly to Supabase Storage.
- A single **`marks`** table backs every canvas element — `stroke` (signatures & doodles),
  `text` (well-wishes), `photo`, and `voice` — each with a world transform (position,
  rotation, scale) so elements can be moved, scaled, and rotated.
- **Hosts** are cookie-only (a signed `host_token`); no account needed to own a board.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing page |
| `/how-it-works`, `/wear` | Marketing |
| `/login`, `/signup` | Auth (email/password + Google) |
| `/auth/callback` | OAuth redirect handler |
| `/create` | Create a new sign-out space |
| `/dashboard` | Your spaces |
| `/s/$spaceId` | The infinite sign-out canvas |

## Project layout

```
src/
  routes/            file-based routes (_marketing, _auth, _app, s.$spaceId)
  features/
    auth/            Google button, sign-in helpers, session hook
    canvas/          Konva canvas, mark rendering, realtime, media upload
  server/            server functions: auth, spaces, marks
  db/                Drizzle schema + relations
  lib/               Supabase browser client
scripts/             SQL: init-policies.sql, reset-schema.sql
```

## Scripts

```bash
npm run dev          # dev server on :3000
npm run build        # production build
npm run start        # serve the production build
npm run check        # Biome lint + format check
npm run db:generate  # generate a migration from schema.ts
npm run db:migrate   # apply migrations
npm run db:studio    # Drizzle Studio
```

## Deploy to Railway

This repo ships with `nixpacks.toml` so Railway detects the build automatically:

1. Push the repo to GitHub.
2. Create a project from the repo at https://railway.com/new.
3. In **Variables**, add `DATABASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
4. Add your production URL to the Supabase Google redirect allowlist.
