# Sign Me Out — architecture sequence diagrams

Sign Me Out is a paid, shareable infinite canvas: a host opens a board for ₦1,000, friends
sign it with strokes, notes, photos and voice messages, and everything syncs live. These
diagrams trace the six structures that hold the app together, each drawn from the actual
server functions and client stores.

- [1 · The data model](#1--the-data-model)
- [2 · Identity: signers and hosts are different things](#2--identity-signers-and-hosts-are-different-things)
- [3 · Opening a space: pay first, insert after](#3--opening-a-space-pay-first-insert-after)
- [4 · Loading a board, and how a time capsule opens itself](#4--loading-a-board-and-how-a-time-capsule-opens-itself)
- [5 · Signing the board: optimistic writes, live fan-out](#5--signing-the-board-optimistic-writes-live-fan-out)
- [6 · Who may change what](#6--who-may-change-what)

## 1 · The data model

> `src/db/schema.ts`

Six tables, all behind RLS with **no client policies** — every write goes through a
TanStack Start server function using the service connection. `sign_spaces` is the hub;
`marks` is a single table covering all four kinds of canvas object; `payments` holds paid
rows only (a checkout that never completes leaves no trace).

```mermaid
erDiagram
  SIGN_SPACES ||--o{ MARKS : "cascade delete"
  SIGN_SPACES ||--o{ PAYMENTS : "consumes"
  PROFILES ||--o{ MARKS : "authors"
  SIGN_SPACES {
    uuid id PK
    text slug "public URL handle"
    text title
    text university "required for new spaces - per-university sign-out counts"
    text board_color
    text gift_bank_fields "3 columns, all set or all null"
    uuid host_token "secret - cookie-only hosts, never sent to client"
    uuid owner_id "signed-in creator, null for anonymous hosts"
    text status "open or locked"
    timestamptz reveal_at "capsule seal, null if not a capsule"
    timestamptz revealed_at "stamped once - claims the email blast"
  }
  MARKS {
    uuid id PK "client-generated, dedupes realtime echo"
    uuid space_id FK
    uuid author_id "Supabase auth user"
    text kind "stroke, text, photo or voice"
    real x_y_rotation_scale_z "world transform"
    jsonb points "stroke path, relative to x-y"
    text media_url "voice notes live in a private bucket"
    text status "visible or hidden - soft delete enables undo"
  }
  PAYMENTS {
    uuid id PK
    text reference UK "smo_ prefix, single-use"
    integer amount "kobo, must equal 100000"
    text status "pending, success or failed"
    uuid space_id FK "set when consumed by a space"
  }
  PROFILES {
    uuid id PK "mirrored from auth.users by trigger"
    text full_name
    text avatar_url
  }
```

Also: `merch_orders` (Paystack-paid merchandise, fulfilment by email) and `feedback`
(the floating pill, anonymous allowed) hang off the same server-only pattern but
reference nothing.

## 2 · Identity: signers and hosts are different things

> `src/features/auth/actions.ts` · `src/server/auth.ts`

Signers authenticate with Google through Supabase. Hosts are identified by a separate
**signed `smo_host` cookie**, minted when they create their first space — so a host works
across spaces even before signing in, and an owner works across devices after.

```mermaid
sequenceDiagram
  autonumber
  actor U as Guest
  participant B as Browser
  participant SB as Supabase Auth
  participant G as Google
  participant S as Server fn

  U->>B: Continue with Google
  B->>B: sessionStorage.smo_next = current path
  B->>SB: signInWithOAuth(google, redirectTo /auth/callback)
  SB->>G: OAuth consent screen
  G-->>SB: authorization code
  SB-->>B: redirect to /auth/callback, session established
  B->>B: sb-*-auth-token cookies set, navigate back to smo_next
  Note over SB: trigger mirrors auth.users into public.profiles

  Note over B,S: from now on, every server fn resolves identity per request
  B->>S: any server fn call (cookies ride along)
  S->>SB: auth.getUser() - validates the JWT
  SB-->>S: SessionUser or null
  S->>S: isSpaceHost = smo_host cookie matches host_token OR user owns the space
```

## 3 · Opening a space: pay first, insert after

> `src/routes/_app/create.tsx` · `src/server/payments-core.ts` · `src/server/spaces.ts`

The DB write is **deferred until Paystack confirms the money landed**: no row exists for a
cancelled checkout, and the payment reference is single-use — creating the space stamps it
with the `space_id` it bought.

```mermaid
sequenceDiagram
  autonumber
  actor H as Host (signed in)
  participant F as /create form
  participant S as Server fns
  participant P as Paystack
  participant DB as Postgres

  H->>F: pick occasion, name, university, colour, gift, reveal date
  F->>S: initSpacePayment()
  S->>P: POST /transaction/initialize (N1,000, ref smo_xxx, metadata userId)
  P-->>S: access_code
  S-->>F: accessCode + reference
  F->>P: PaystackPop popup resumes the transaction
  alt payment cancelled or fails
    P-->>F: onCancel / onError
    F->>F: show error - no space, no DB row
  else payment succeeds
    P-->>F: onSuccess
    F->>S: createSpace(title, note, boardColor, university, gift, revealAt, reference)
    S->>P: GET /transaction/verify/reference
    P-->>S: success, amount, metadata
    S->>S: re-check amount = 100000 kobo and metadata.userId = caller
    S->>DB: insert payments row (idempotent on unique reference)
    S->>S: ensureHostToken() - mints smo_host cookie if absent
    S->>DB: INSERT sign_spaces (slug = slugified title + nanoid)
    S->>DB: UPDATE payments SET space_id - reference consumed
    S-->>F: slug
    F->>F: navigate to /s/slug with the welcome tour
  end
```

## 4 · Loading a board, and how a time capsule opens itself

> `src/server/spaces.ts` (`getSpace`) · `src/server/reveal-core.ts`

There is **no scheduled job**. A capsule opens because reads compare `reveal_at` to now;
the only thing that must happen exactly once — the "it's open!" email blast — is claimed
atomically by the first read that flips `revealed_at` from `NULL`.

```mermaid
sequenceDiagram
  autonumber
  actor V as Visitor
  participant R as /s/$spaceId route
  participant S as getSpace
  participant DB as Postgres
  participant M as Resend

  R->>S: getSpace(slug)
  S->>DB: SELECT space by slug
  S->>S: getSessionUser() + isSpaceHost()
  opt reveal time has arrived and revealed_at is NULL
    S->>DB: UPDATE ... SET revealed_at WHERE revealed_at IS NULL (atomic claim)
    alt this request won the claim
      S->>DB: distinct signer emails (marks joined to auth.users)
      S->>M: email every signer (idempotency key per space + email)
    else another request already claimed it
      S->>S: skip - blast already sent
    end
  end
  alt sealed: reveal_at in the future and caller is not the host
    S-->>R: space (host_token stripped), marks [], sealed true
    R->>R: countdown UI - signing still works, board stays hidden
  else open, revealed, or caller is the host
    S->>DB: SELECT marks WHERE visible ORDER BY z, created_at
    S-->>R: space + marks + isHost
    R->>R: render Konva canvas, subscribe to realtime
  end
```

## 5 · Signing the board: optimistic writes, live fan-out

> `src/server/marks.ts` (`addMark`) · `src/features/canvas/use-realtime-marks.ts` · `marks-store.ts`

Mark ids are **generated client-side**, so when Supabase Realtime echoes your own INSERT
back, the store's upsert dedupes it silently. UPDATE echoes can be partial — Postgres omits
unchanged TOASTed columns like a long stroke's `points` — so they merge as patches, never
as full replacements.

```mermaid
sequenceDiagram
  autonumber
  actor G as Signer
  participant C as Canvas + marks-store
  participant S as addMark
  participant DB as Postgres
  participant RT as Supabase Realtime
  participant O as Everyone else viewing

  Note over G,C: unauthenticated? picking pen or text opens the sign-in dialog
  G->>C: draw a stroke / place a note
  C->>C: optimistic insert with client-generated uuid
  C->>S: addMark(id, spaceId, kind, transform, payload)
  S->>S: getSessionUser() - required
  S->>DB: space.status must be open
  S->>DB: INSERT marks (author stamped server-side)
  DB-)RT: WAL change, filter space_id=eq.spaceId
  RT-)C: INSERT echo - same id, upsert dedupes
  RT-)O: INSERT - the mark appears live
  Note over C,O: moves arrive as partial UPDATE patches, removals flip status to hidden
```

## 6 · Who may change what

> `src/server/marks.ts` (`assertCanEdit`) · `src/server/spaces.ts`

`assertCanEdit` is the single server-side gate for mutating a mark: the author or the host,
nobody else — UI gating is never trusted. Host-only space actions (lock, recolour, gift,
delete) run the same `isSpaceHost` check; deleting a space drops its payment rows **inside
the same transaction** so the single-use reference can't be recycled into a free space.

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant S as updateMark / removeMark / restoreMark
  participant DB as Postgres
  participant RT as Supabase Realtime

  C->>S: mutate mark(id)
  S->>DB: load mark author_id + space_id
  alt caller is the mark's author
    S->>S: allowed
  else caller is the space host (smo_host cookie or owner account)
    S->>S: allowed
  else anyone else
    S-->>C: error - only the host or the creator can do that
  end
  S->>DB: UPDATE - moves persist x/y/rotation/scale, removal sets status hidden
  DB-)RT: change fans out to every subscribed viewer
  Note over S,DB: voice playback is gated the same way - getVoiceUrl mints a 5-minute signed URL from the private bucket for the author or host only
```

---

*Drawn from the code at commit `a05c380` — server functions in `src/server/`, canvas
client in `src/features/canvas/` (July 2026).*
