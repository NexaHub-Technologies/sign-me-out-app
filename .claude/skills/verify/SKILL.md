---
name: verify
description: How to run and drive this app to verify changes end-to-end, including the Konva sign canvas without touching the shared database.
---

# Verifying sign-me-out-app changes

## Launch
- `npm run dev` → vite on http://localhost:3000. Supabase realtime keeps a
  websocket open, so Playwright `waitUntil: "networkidle"` never fires — use
  `"domcontentloaded"` plus an app-specific `waitForFunction`.

## Constraints
- `DATABASE_URL` / Supabase in `.env` point at a **shared remote project** —
  never query it directly or create rows for testing.
- The canvas route `/s/$spaceId` needs a real DB row. To drive the canvas
  without one, create a temporary route (delete before committing) that mounts
  `SignCanvas` from `#/features/canvas/sign-canvas.tsx` with a stub space
  (`{ id: <uuid>, slug, status: "active", revealAt: null }`, `initialMarks: []`)
  and exposes `window.__devGetStage = () => handle.getStage()` for assertions.
- Unauthenticated users cannot select Pen/Text (dock opens the sign-in dialog).
  A client-side-only session unlocks the UI: set cookie
  `sb-<projectref>-auth-token` = `"base64-" + base64url(JSON session)` with a
  syntactically valid (unsigned) JWT and future `expires_at`. Server functions
  still reject it, so avoid flows that persist marks (don't finish strokes,
  don't commit non-empty text).

## Driving
- No Playwright in the repo; install `playwright-core` in the scratchpad and
  launch `executablePath: "/usr/bin/google-chrome-stable"`, headless.
- Touch/pinch: mobile context (`hasTouch`, 390x844) + CDP
  `Input.dispatchTouchEvent`. `touchEnd`'s `touchPoints` are the points being
  released; `touchEnd` with `[]` releases all remaining.
- Read viewport state via `window.__devGetStage().scaleX()/x()/y()`; count
  draft strokes with `stage.find("Line").length`.

## Driving realtime without DB writes
- To exercise the Supabase `postgres_changes` path, wrap `window.WebSocket`
  in `page.addInitScript` (collect instances + incoming frames), let the real
  channel join happen, read the binding id from the `phx_reply` frame, then
  call the socket's `onmessage` with a synthetic frame. Wire format is the
  Phoenix **array** serializer: `[join_ref, ref, topic, event, payload]`,
  topic `realtime:marks:<spaceId>`, payload
  `{ ids: [bindId], data: { type, schema, table, commit_timestamp, columns,
  record, old_record, errors } }`. The client's transformer maps only keys
  present in `record` — omitting a column faithfully simulates Postgres
  dropping unchanged TOASTed columns from UPDATE echoes.

## Gotchas
- The text-entry `<textarea>` is ALWAYS mounted (parked at `left: -9999px`).
  "Text box open" = `parseFloat(textarea.style.left) > -5000`, not existence.
- Konva suppresses stage events during a stage drag unless
  `Konva.hitOnDragEnabled = true` (set in sign-canvas.tsx) — relevant when
  testing pinch during a one-finger pan.
- Log non-GET requests during runs to prove no server writes escaped.
