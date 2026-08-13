# Braino Embed

**Type:** Feature
**Platform:** Any website (via one script tag) + Supabase edge functions
**Status:** MVP
**Released:** 2026-08-13

## The simple version

Paste one `<script>` tag into any website and the real Braino shows up
there too: same mascot, same Fish Audio voice, same personality. He can
chat about the page he's sitting on immediately. If that site also builds
one small endpoint over its own database, Braino can answer questions
grounded in that site's real data too, an order status, a product's stock,
whatever the site chooses to expose. Braino's voice, memory, and
personality never leave Braino's own backend; every embedded site only ever
gets a client talking to it.

## Why it exists

Itish wants Braino on other people's websites, not just trybraino.com,
without forking him. The constraint that shaped everything: Braino should
never hold a raw database connection to a site he doesn't own. Instead the
target site writes a tiny, scoped, read-only bridge for its own schema, and
Braino calls that. The flexibility comes from a Claude Code agent writing a
few lines of bespoke bridge code per site, not from Braino having a
universal database driver.

## How to use it

1. Provision a site once (`embed-register`, owner-authenticated) — get back
   a `site_id` and a ready `<script>` tag.
2. Hand `skills/braino-embed/SKILL.md` to a Claude Code agent working in the
   target site's own repo. It pastes the snippet, introspects whatever
   database/ORM that site actually uses, and writes one scoped endpoint for
   it.
3. Wire that endpoint's URL back with `embed-configure-bridge` (also
   owner-authenticated) — this hands back a one-time HMAC secret the two
   sides use to trust each other.
4. Done. The mascot bubble shows up on the target site, chats, speaks its
   replies, and (once the bridge is wired) answers from that site's real
   data.

## What Braino knows or does

- Same personality every time: the widget calls the same
  `buildBrainoSystemPrompt` / `BRAINO_TEXT_MODEL` path the rest of Braino
  uses, so "how Braino talks" is identical on trybraino.com and on a
  stranger's site.
- Reads the page it's mounted on (title, URL, visible text) the same way
  the rest of Braino reads a page, no bridge required for that part.
- Speaks every reply aloud in the real Fish Audio voice by default (mute
  toggle in the widget header), and accepts spoken input via the browser's
  native speech recognition where available.
- When a site has wired a Data Bridge, Braino calls it per question, gets
  back plain-text context, and answers grounded in that — and says so
  honestly (`grounded: true`/`false` in the response) when it couldn't get
  anything.
- Never receives a database credential, a schema, or a query language for
  any site. It only ever receives the text a site's own endpoint chose to
  hand back.

## Honest limitations

- The mascot is the real walker (arms, legs, walk cycle, blink, cursor
  gaze, wave-on-click, talking mouth), ported from the homepage's
  `BrainoWalker.tsx` — not a static image. Drag-to-throw and moonwalk
  are not ported yet.
- No memory across visits. Every browser session starts fresh; there's no
  per-visitor Memory Engine yet the way Braino's own product has for Itish.
- No usage metering, rate limiting, or billing gate yet.
  `allowed_origins` is the only access control right now — real protection
  for a high-traffic site needs a rate limit added before launch there.
- Voice is TTS-out + browser STT-in, not the full bidirectional OpenAI
  Realtime session Jarvis/voice mode uses. That needs its own scoped
  session-auth path for anonymous third-party visitors.
- The Data Bridge is one endpoint, one shape (`query` in, `context` out),
  not a full multi-tool MCP protocol. A complex site can still put multiple
  tools' worth of logic inside that one endpoint; it just isn't a
  standardized multi-call contract yet.
- Nothing here has been deployed to production yet — migration and edge
  functions exist in the repo, not yet pushed live.

## Technical shape

- Table: `embedded_sites` (migration `20260813120000_embedded_sites.sql`) —
  `site_id` (public, embedded client-side), `allowed_origins` (the actual
  gate, same trust model as a Stripe publishable key), `bridge_url` +
  `bridge_secret` (service-role only, RLS-protected).
- `embed-register` (owner-authenticated): creates a site, returns `site_id`
  + a ready `<script>` snippet.
- `embed-chat` (public, `verify_jwt = false`): the widget's only backend
  call. Validates `site_id` + `Origin` against `allowed_origins`, optionally
  calls that site's `bridge_url` (HMAC-signed, 5s timeout, failures are
  silently non-fatal), builds the system prompt with
  `buildBrainoSystemPrompt` from `_shared/braino-prompt.ts` (the same
  personality source of truth every other Braino surface uses), and calls
  OpenAI with `BRAINO_TEXT_MODEL`.
- `embed-configure-bridge` (owner-authenticated): wires or rewires a site's
  `bridge_url`, issuing a fresh HMAC secret shown exactly once.
- Widget: `public/embed/braino-embed.js`, one dependency-free file. Reads
  its own `<script data-braino-site>` tag, renders the mascot bubble + chat
  panel, calls `embed-chat` and `fish-audio-tts` directly with the public
  Supabase anon key (the same key already shipped in Braino's own web
  bundle today).

## Product or design decisions

- The bridge returns plain text, not a query language or a multi-tool
  protocol. A generic "run this query against any database" tool was
  explicitly rejected — that's the actual security hazard version of this
  feature. Making each site write its own few lines of lookup code, scoped
  to what it wants exposed, was judged the only version of "flexible for
  anything and everything" that doesn't also mean "trusts Braino with
  everything."
- `site_id` is deliberately public/embeddable, not a secret — treating it
  like one would be false security, since anyone can view-source a public
  widget. `allowed_origins` is the real, honestly-documented gate.
- Provisioning and bridge-wiring are separate, both owner-authenticated
  calls rather than one big function, so a site can go live with chat
  immediately and get data-grounding wired in as a distinct second step.

## What comes next

- Full animated mascot parity with the extension's `content.js` walker.
- Per-visitor memory, scoped per site, so a returning visitor doesn't start
  from zero every time.
- Usage metering + a rate limit per `site_id`, and a real billing gate
  before this goes anywhere near production traffic.
- A scoped realtime-voice session path so embedded Braino can do full
  conversational voice, not just spoken replies.
- A standardized multi-tool bridge contract (search/lookup/list as distinct
  calls) once a real integration needs more than one query shape.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino** (auto-renders from `KNOWLEDGE_ENTRIES`)
- [x] Public copy is simple and human
- [x] Release date and status are accurate
