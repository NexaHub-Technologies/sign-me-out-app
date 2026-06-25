# Sign Me Out

A web app for the Nigerian **sign-out day** tradition. Graduating students open an
infinite **sign-out space** and share the link; friends drop by to leave signatures,
doodles, well-wishes, and voice notes on the canvas — a keepsake you can revisit,
download, or print on wear and souvenirs. Opening a space is a one-time **₦1,000**
(via Paystack); signing one is always free.

## Stack

- **[TanStack Start](https://tanstack.com/start)** (React 19 + SSR, Nitro, file-based routing, server functions)
- **[Konva](https://konvajs.org/) / react-konva** + **[perfect-freehand](https://github.com/steveruizok/perfect-freehand)** for the infinite canvas and marker-style strokes
- **[Supabase](https://supabase.com/)** — Postgres, Auth (Google OAuth + email/password), Realtime, Storage
- **[Drizzle ORM](https://orm.drizzle.team/)** for schema + server-side writes
- **[Paystack](https://paystack.com/)** for the one-time space-creation charge
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
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — signed URLs for private voice notes | Supabase → Project Settings → API → `service_role` secret |
| `PAYSTACK_SECRET_KEY` | Server only — start & verify the space-creation charge | Paystack → Settings → API Keys & Webhooks (use `sk_test_…` in dev) |
| `VITE_PAYSTACK_PUBLIC_KEY` | Browser client (optional — the access-code popup flow doesn't require it) | Paystack → Settings → API Keys & Webhooks (`pk_test_…`) |

> `.env.local` is git-ignored — never commit secrets.

### Supabase setup (one-time, dashboard)

1. Enable the **Google** auth provider and add redirect URLs:
   `http://localhost:3000/auth/callback` (and your production URL).
2. Apply the database schema: `npm run db:generate && npm run db:migrate`.
3. Run `scripts/init-policies.sql` in the Supabase SQL editor — it sets up RLS read
   policies, adds `marks` to the `supabase_realtime` publication, creates the
   `space-media` (public) and `space-voice` (private) storage buckets, enables RLS on
   the server-only `payments` table, and wires the `auth.users → profiles` trigger.

### Payments setup (Paystack)

Creating a space is gated on a one-time ₦1,000 Paystack charge. Add your **test**
`PAYSTACK_SECRET_KEY` to `.env.local`, then on `/create`, sign in and pay with the
Paystack test card `4084 0840 8408 4081` (any future expiry/CVV, OTP `123456`). The
charge is verified server-side before the space is created.

## How it works

- **Viewing is public** — anyone with the link sees the board. **Leaving a mark requires
  sign-in** (Google or email/password).
- **Opening a space is paid** — a one-time ₦1,000 via Paystack, verified server-side
  (status + exact amount, single-use reference) before the space is created. Creating
  requires a signed-in account; signing a board is always free.
- **Writes** go through TanStack Start **server functions** (`src/server/*`) on the Drizzle
  service connection; **reads** load via the route loader and stay live via **Supabase
  Realtime**; **voice notes** upload to a private Storage bucket and play back via
  server-minted signed URLs.
- A single **`marks`** table backs every canvas element — `stroke` (signatures & doodles),
  `text` (well-wishes), and `voice` — each with a world transform (position, rotation,
  scale) so elements can be moved, scaled, and rotated. (A `photo` kind exists in the
  schema but is currently disabled in the UI.)
- **Hosts** are identified by a signed `host_token` cookie; paid spaces are also tied to
  the signed-in **owner**. The host can **lock** a board and **recolour** it from a palette
  of 11 board colours, live.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing page |
| `/how-it-works`, `/wear` | Marketing |
| `/login`, `/signup` | Auth (email/password + Google) |
| `/auth/callback` | OAuth redirect handler |
| `/create` | Create a new sign-out space (sign-in + ₦1,000 Paystack) |
| `/dashboard` | Your spaces |
| `/customize` | Customise & order wear and souvenirs (emails the order) |
| `/s/$spaceId` | The infinite sign-out canvas |

## Project layout

```
src/
  routes/            file-based routes (_marketing, _auth, _app, s.$spaceId)
  features/
    auth/            Google button, sign-in helpers, session hook
    canvas/          Konva canvas, mark rendering, realtime, media upload
  components/        shared UI — logo, site header/footer, account menu, ui/
  server/            server functions: auth, session, spaces, marks, payments, storage
  db/                Drizzle schema + relations
  lib/               Supabase browser client, board colours, utils
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
3. In **Variables**, add `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `PAYSTACK_SECRET_KEY` (plus `VITE_PAYSTACK_PUBLIC_KEY`
   if you use it).
4. Add your production URL to the Supabase Google redirect allowlist, and use your
   **live** Paystack keys in production.
