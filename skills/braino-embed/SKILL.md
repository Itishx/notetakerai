---
name: braino-embed
description: Use this skill when asked to integrate Braino into a website that is not trybraino.com itself — add the Braino mascot/voice/chat widget to a site, connect Braino to a site's own data so it can answer questions grounded in that site's database, or otherwise make "Braino" available as an embedded assistant on someone else's domain. Works regardless of that site's stack or database — the skill introspects whatever is actually there.
---

# Braino Embed

## What this is

A way to put the real Braino — the same mascot, the same Fish Audio voice,
the same personality — on a website that isn't trybraino.com, with him able
to answer questions grounded in *that site's own data*.

The trick that makes "works on anything" actually safe: Braino never gets a
database connection string. The personality, voice, and memory infrastructure
all stay on Braino's own Supabase backend, untouched, shared across every
site he's embedded on. What each target site gets is a thin client (one
script tag) plus one small, scoped, read-only endpoint that *site* writes for
*its own* schema. Braino calls that endpoint, gets back plain text, and
answers with it. Nothing generic touches a raw database anywhere.

Two phases, two different people run them:

- **Phase 1 — Provision.** Done once by whoever owns the Braino account
  (Itish), against Braino's own Supabase project. Produces a `site_id` and a
  ready `<script>` tag.
- **Phase 2 — Install.** Done by a Claude Code agent working *inside the
  target website's own repo*. Pastes the snippet, then builds the Data
  Bridge for that site's actual stack.

If you were just handed this document, you are almost certainly doing Phase
2, in a different repo than the one this file lives in. `site_id` should
already exist — ask for it rather than trying to provision one yourself,
since Phase 1 requires Itish's own Supabase credentials.

## Phase 1 — Provision a site (run once, by the Braino account owner)

```bash
curl -X POST "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/embed-register" \
  -H "Authorization: Bearer <YOUR_BRAINO_SUPABASE_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Furniture Store",
    "allowed_origins": ["https://acmefurniture.com", "https://www.acmefurniture.com"]
  }'
```

Returns:

```json
{
  "site": { "site_id": "8f2c...", "name": "Acme Furniture Store", ... },
  "snippet": "<script src=\"https://trybraino.com/embed/braino-embed.js\" data-braino-site=\"8f2c...\" async></script>"
}
```

Hand the `snippet` (and the `site_id` inside it) to whoever — or whatever
agent — is working on the target site. `site_id` is public by design (like a
Stripe publishable key or an Intercom app ID); the real gate is
`allowed_origins`, so get that list right.

## Phase 2 — Install on the target site

### Step 1 — Paste the snippet

Add the `<script>` tag from Phase 1 to whatever renders on every page: a
root layout, a base template, a shared header/footer component. One line,
works the same in a static site, Next.js, Rails, WordPress, anything —
it's a plain `<script>` tag, no build step, no package to install.

### Step 2 — Look at what this site actually has

Before writing anything, check the target repo for what kind of
database/ORM it's already using. Look for, in rough order:

- An ORM config: `prisma/schema.prisma`, `drizzle.config.ts`,
  `sequelize` models, `mongoose` schemas.
- A `DATABASE_URL` / `SUPABASE_URL` / similar env var already in use.
- An existing internal API (REST or GraphQL) the site's own frontend calls —
  often the fastest path, since you can wrap it instead of touching the DB
  layer directly.
- If there is genuinely no database yet, or the site is static/content-only,
  skip straight to "No database yet" below.

This determines what Step 3 actually queries. There is no universal driver
here on purpose — you write the few lines that make sense for what's
actually in this repo.

### Step 3 — Build the Data Bridge (one endpoint)

Add exactly one new route to the target site, e.g. `POST /api/braino-bridge`
(Next.js API route, Express route, Rails controller action — whatever this
repo already uses for its other API endpoints). The contract is intentionally
tiny:

**Request** (from Braino's backend):
```json
{ "query": "what's the status of order 4821?", "page_url": "https://acmefurniture.com/account/orders" }
```

**Response**:
```json
{ "context": "Order 4821 (placed Aug 10): Oak dining table, shipped Aug 12, arriving Aug 15 via UPS." }
```

`context` is plain text (or lightly structured text) — whatever this site's
own code decides is relevant, built however makes sense for its actual
schema: a Prisma query, a raw SQL SELECT, a call to an existing internal API.
It should always be **read-only**. Return `{ "context": "" }` (or just
nothing relevant) rather than guessing when a query doesn't map to anything.

Verify every request came from Braino before touching the database — the
route must check the `X-Braino-Signature` header, an HMAC-SHA256 of the raw
request body using a shared secret from Phase 4 below. Node/Next.js example:

```ts
import crypto from "crypto";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-braino-signature") || "";
  const expected = crypto
    .createHmac("sha256", process.env.BRAINO_BRIDGE_SECRET!)
    .update(raw)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return Response.json({ error: "bad signature" }, { status: 401 });
  }

  const { query } = JSON.parse(raw);
  // ...look up whatever is relevant in THIS site's own database/ORM...
  const context = await lookUpRelevantStuff(query);

  return Response.json({ context });
}
```

**No database yet / static or content-only site:** skip Step 3 entirely.
The widget still works — Braino answers from the page content he can see
and general help, and says so honestly when a question needs data the site
doesn't expose yet. Add the bridge later; nothing else changes.

**Scoping the bridge (judgment call, make it explicit in what you build):**
expose only what a support/assistant surface should reasonably see. A
storefront might expose product search and public order-status lookup by
order number, not a full customer table dump. If the site has per-visitor
auth, thread the visitor's own session/identity into the bridge call so it
only ever returns data that visitor could already see themselves — don't
build a bridge that answers any query about any customer.

### Step 4 — Register the bridge with Braino's backend

Run once the endpoint from Step 3 is deployed and has a real HTTPS URL
(the Braino account owner runs this, same auth as Phase 1):

```bash
curl -X POST "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/embed-configure-bridge" \
  -H "Authorization: Bearer <YOUR_BRAINO_SUPABASE_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "8f2c...",
    "bridge_url": "https://acmefurniture.com/api/braino-bridge"
  }'
```

Returns `bridge_secret` **once** — put it in the target site's own
environment as `BRAINO_BRIDGE_SECRET` (the exact env var name Step 3's
example code reads). Braino's backend now signs every bridge call with it.

### Step 5 — Verify end to end

1. Load the live site, confirm the mascot bubble appears in the configured
   corner and opens a chat panel on click.
2. Ask something answerable from the page alone; confirm a real reply comes
   back (proves the widget → `embed-chat` → OpenAI round trip works).
3. Ask something that only the site's own data would know (an order status,
   a specific product's stock); confirm the reply is actually grounded —
   `grounded: true` in the network response confirms the bridge was called
   and returned something.
4. Send a request to the bridge URL with a wrong/missing signature directly
   (`curl` it) and confirm it returns 401, not data.
5. Click the mute icon, confirm spoken replies stop; confirm the mic button
   is hidden gracefully in browsers without `SpeechRecognition` (Safari,
   most mobile browsers) instead of erroring.

## Honest limitations (v1)

- The widget is a real, working chat + spoken-reply UI, not yet a full port
  of the extension's animated walking mascot — it's a static mascot image
  that swaps between an idle and a talking frame. Full walking/physics
  animation on someone else's DOM is future work.
- No memory across visits yet. Each browser session starts fresh; there's no
  per-visitor Memory Engine the way Braino's own product has for Itish.
- No usage metering or billing gate yet — `allowed_origins` is the only
  access control. Don't wire this into a high-traffic site as-is without
  adding a rate limit first.
- Voice is spoken *output* only (real Fish Audio TTS on every reply) plus
  browser-native speech-to-text for *input*. It is not the full bidirectional
  OpenAI Realtime session Braino's own Jarvis/voice mode uses — that needs
  its own scoped auth path for anonymous third-party visitors and hasn't
  been built yet.
- The bridge contract is one endpoint, one shape (`query` in, `context`
  out), not a multi-tool MCP protocol. That's deliberate for v1 simplicity;
  a site complex enough to need separate search/lookup/list tools can still
  implement all of that logic *inside* that one endpoint.

## Where the actual code lives (this repo, notetakerai)

- Widget: `public/embed/braino-embed.js`
- Provisioning: `supabase/functions/embed/embed-register`
- Chat: `supabase/functions/embed/embed-chat`
- Bridge wiring: `supabase/functions/embed/embed-configure-bridge`
- Table: `embedded_sites` (migration `20260813120000_embedded_sites.sql`)
- Product doc: `Braino Knowledge Base/features/braino-embed.md`
