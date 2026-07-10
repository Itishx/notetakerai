# Publishing Braino to the Chrome Web Store — End-to-End Guide

This is the runbook for the day we list Braino publicly. It's written for *this* extension
(its real `manifest.json`), so most of the hard parts (permission justifications, data
disclosures, single-purpose statement) are already filled in below — on the day, you mostly
copy-paste. Ask Claude to "walk me through the Chrome Web Store guide" and we go section by section.

> **Mental model:** publishing = (1) upload a `.zip` of the extension + (2) fill in a web form
> on Google's **Developer Dashboard** + (3) wait for review. The form is where approval is won
> or lost — not the code. "Paste into the dashboard" just means copying the text below into the
> matching box on that website. Claude writes the text; you do the pasting (it's your Google
> account, Claude can't log in for you).

---

## 0. Day-of checklist (the short version)
- [ ] Developer account exists + $5 fee paid (one-time) → §1
- [ ] `npm run build:extension` run; `braino-extension.zip` is current → §2
- [ ] Manifest version bumped since last upload → §2
- [ ] `braino-eight.vercel.app` removed from `externally_connectable` for prod → §2
- [ ] Listing copy ready (name, short + long description) → §4
- [ ] 1–5 screenshots (1280×800) + 128px icon ready → §4
- [ ] Privacy policy URL live (`https://trybraino.com/privacy`) → §6
- [ ] Permission justifications pasted → §5
- [ ] Data-handling disclosures + 3 certification checkboxes done → §6
- [ ] Distribution set (start **Unlisted** or **Trusted testers**) → §7
- [ ] Submit → expect days-to-weeks review → §8

---

## 1. Prerequisites (one-time)
1. Go to the **Chrome Web Store Developer Dashboard**: https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account that should *own* the extension long-term (not a throwaway —
   transferring ownership later is painful). For Braino this is likely the same identity behind
   the brand/account.
3. Pay the **one-time $5 USD** registration fee. (Per account, not per extension.)
4. (Recommended) Set up a **publisher display name** and verify a contact email — required before
   you can publish publicly.

---

## 2. Build the package (the `.zip`)
We already have a script that produces the upload artifact:

```bash
npm run build:extension
```

This regenerates `braino-extension.zip` at the repo root (and mirrors). That zip is what you
upload. Notes:
- The **manifest must be at the zip root** — our build already does this.
- **Every upload needs a higher `version`** than the last published one. Bump
  `extension/manifest.json` `"version"` (then re-run `build:extension`). Chrome rejects re-uploads
  of the same version.
- **Before the production upload**, edit `extension/manifest.json` → `externally_connectable.matches`
  and remove the dev preview domain `https://braino-eight.vercel.app/*` (keep only
  `https://trybraino.com/*`). Reviewers flag stray dev domains. Re-run `build:extension` after.
- Good news on the **remote-code policy**: our CSP is `script-src 'self'` and all JS is bundled in
  `content.js` / `background.js`. We call the backend (trybraino.com / Supabase) only for *data*,
  never to download/execute code — which is what the store requires. Keep it that way (no `eval`,
  no remote `<script>` injection).

---

## 3. Create the listing in the dashboard
1. In the dashboard, click **"Add new item."**
2. Upload `braino-extension.zip`. Google unpacks it and reads the manifest.
3. You'll land on a multi-tab form: **Store listing**, **Privacy practices**, **Distribution**.
   You must complete all required fields in each before the **Submit for review** button enables.

---

## 4. Store listing content (copy-paste ready)

**Item name** (≤ 50 chars):
```
Braino — AI Browser Companion
```

**Short / summary description** (≤ 132 chars):
```
An AI companion that lives in your browser — chat about any page, record lectures & meetings, search, and talk hands-free.
```

**Detailed description** (longer; edit to taste):
```
Braino is a little AI who lives on your browser bar.

• Chat about any page — ask questions about whatever you're reading and get a straight answer.
• Record lectures, meetings, and calls — Braino transcribes them into clean, structured notes.
• Search the web without leaving the page.
• Talk to him hands-free — Braino answers in his own voice (Braino Pro).
• Ask him to do things — with Braino Pro he can open tabs, search, and work the page for you.

Free to start. Braino Pro unlocks unlimited voice and the full browser agent.
```

**Assets you need to upload:**
- **Icon:** 128×128 PNG (we have `icon128.png`).
- **Screenshots:** at least 1, up to 5 — **1280×800** (or 640×400). Show the bar + chat,
  a recording, and the point-at-the-page trick. This is the single biggest conversion lever on
  the listing.
- **Small promo tile** (optional, 440×280) — only needed if you want to be eligible for featuring.
- **Category:** Productivity.
- **Language:** English.

---

## 5. Privacy practices → permission justifications (copy-paste ready)

Google reads our manifest and shows a text box per permission asking *"why do you need this?"*.
Paste the matching line into each box. These are written honestly and benefit-framed (weak
justifications are the #1 rejection reason for an extension this broad).

**Single purpose statement:**
```
Braino is an AI browser companion that helps the user understand and act on the web page they're
on — reading and summarizing the current page, answering questions about it, recording and
transcribing lectures/meetings into notes, and (on request) carrying out tasks in the browser by
voice or text.
```

**`host_permissions` — `<all_urls>`:**
```
Braino works on whatever site the user is on. It reads the current page's text only when the user
asks it to (to chat about the page, summarize it, or point at an on-screen element) and injects
its on-page companion UI. It does not read or transmit page content in the background.
```

**`activeTab`:**
```
Lets Braino act on the tab the user is currently viewing when they invoke it — read the page,
capture audio, or run a requested task — without persistent background access to other tabs.
```

**`tabs`:**
```
Braino needs the active tab's context, needs to move its companion to a normal tab when the user
is on a restricted page (e.g. chrome:// pages where extensions can't run), and opens results in
new tabs when the user asks it to search or perform a task.
```

**`tabCapture`:**
```
Used only when the user starts a recording — Braino captures the active tab's audio to transcribe
lectures, meetings, and calls into notes.
```

**`offscreen`:**
```
Hosts Braino's real-time voice session (microphone input and audio playback) in an offscreen
document, the supported Manifest V3 way to maintain a live audio connection while the user talks.
```

**`scripting`:**
```
Injects Braino's companion interface and reads page structure on demand so it can answer questions
about the page and point at elements the user asks about.
```

**`storage`:**
```
Stores the user's settings, sign-in session, and local preferences/notes on their own device so
Braino remembers state between sessions.
```

**`alarms`:**
```
Schedules lightweight periodic tasks (e.g. refreshing the user's session and checking for queued
actions) without keeping the service worker alive unnecessarily.
```

**Remote code use** (there's a question for this):
```
No remote code. All executable code ships inside the package and the extension's content security
policy is script-src 'self'. The extension contacts Braino's backend only to exchange data (AI
responses, transcription, the user's account) — never to download or run code.
```

---

## 6. Data-handling disclosures
Because Braino captures audio and reads page content, you must complete the **Privacy practices**
data section truthfully and consistently with `https://trybraino.com/privacy`.

Declare that Braino **collects**:
- **Audio** — when the user records or uses voice.
- **Website content** — the current page's text, when the user chats about a page.
- **Authentication information** — account/session so the user stays signed in.
- **User activity** — which features are used (for the product to function).

Purposes: **App functionality** and **Account management**. Then tick the three certifications:
- I do **not** sell user data to third parties.
- I do **not** use/transfer data for purposes unrelated to the item's single purpose.
- I do **not** use/transfer data to determine creditworthiness or for lending.

Provide the **privacy policy URL**: `https://trybraino.com/privacy` (must be live and must match
the disclosures above, or it's a hard rejection).

---

## 7. Distribution / launch strategy
On the **Distribution** tab you choose visibility. Recommendation for Braino's first listing:

- **Start "Unlisted"** (or **"Trusted testers"**). Same review process, but only people with the
  link can install while you shake out review feedback and real-world bugs. The install link still
  works for your launch audience.
- Flip to **Public** once it's stable and you've cleared review cleanly.
- "Private (Trusted testers)" requires adding tester Google accounts/group; "Unlisted" needs no
  allowlist and is usually the easier soft-launch.

---

## 8. Submit + what review feels like
- Hit **Submit for review**.
- Because Braino requests `<all_urls>` + `tabCapture` + content scripts on every page, expect
  **heavier scrutiny and a longer review — days, sometimes up to ~2–3 weeks** — and a real chance
  of a clarification request or a first-pass rejection. That's normal for this permission profile.
- If rejected, Google emails the specific policy/section. Fix, bump version, re-zip, re-submit.
  Budget for **one round of back-and-forth**.

---

## 9. After approval
- **Extension ID:** the published extension gets a permanent ID (different from the local unpacked
  ID). Braino's auth flow uses `chrome.runtime.id` dynamically
  (`trybraino.com/auth/extension?ext=${id}`), so login keeps working — nothing to change. (Just
  never hardcode an extension ID anywhere.)
- **`externally_connectable`** must list `https://trybraino.com/*` so the site can talk to the
  published extension — confirm it's there (and the dev domain is removed).
- **Updates:** to ship a new version — bump `extension/manifest.json` version →
  `npm run build:extension` → upload the new zip in the dashboard → submit. Updates also go through
  review (usually faster than the first one). Installed users auto-update within a few hours.

---

## 10. Common rejection reasons to pre-empt (Braino-specific)
- **Vague/lazy permission justifications** → use §5 verbatim.
- **Single-purpose sprawl** ("does too many unrelated things") → lead with the §5 single-purpose
  line and make every feature ladder up to "understand and act on the page you're on."
- **Privacy policy mismatch** → the disclosures in §6 must match what `/privacy` actually says.
- **Requesting more than you use** → every manifest permission must map to a real, user-visible
  feature. If we ever drop a feature, drop its permission.
- **Stray dev domains / debug code** → remove `braino-eight.vercel.app`; no `console`-spam or test
  scaffolding in the shipped bundle.

---

## Appendix — where everything lives in this repo
- Manifest: `extension/manifest.json` (name, version, permissions, `externally_connectable`).
- Build/zip script: `npm run build:extension` → `scripts/build-extension.mjs` → `braino-extension.zip`.
- Icons: `extension/icon128.png`, `extension/icon48.png`.
- Privacy policy page: `src/pages/Privacy.tsx` → live at `https://trybraino.com/privacy`.
- Dist-sync notes: see the `feedback_dist_sync` memory (build → mirrors + zips, `git add -f`).
```
