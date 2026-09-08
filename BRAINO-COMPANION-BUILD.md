# Braino Companion: The Code

Companion file to [BRAINO-COMPANION-PRD.md](BRAINO-COMPANION-PRD.md). That one says what to build. This one says how, with the actual code.

Two kinds of thing are in here:

- **PORTED** means it exists and works in the current repo. The code below is the real thing, trimmed to what matters. Copy it.
- **NEW** means it does not exist yet. The code below is the design, written out. Type it in.

---

## 0. How a turn actually flows

Read this once and the rest of the file makes sense.

```
                        ┌─────────────── the three moments ──────────────┐
                        │  morning cron · stuck watcher · night cron     │
                        └───────────────────────┬────────────────────────┘
                                                │ he speaks first
  user speaks ──► realtime session ──► text ────┤
  (mic, in the      (audio MUTED,     transcript│
   content script)   text only)                 ▼
                                        ┌───────────────┐
                                        │ braino-turn   │  edge function
                                        │               │
                                        │ 1 detectMoment│  moments.ts, no model call
                                        │ 2 buildCore   │  engine.ts, personality
                                        │ 3 + notebook  │  who they are
                                        │ 4 + context   │  page / calendar / today
                                        │ 5 model call  │  gpt-5.6-luna
                                        └───────┬───────┘
                                                │ reply text
                                                ▼
                                        ┌───────────────┐
                                        │ fish-audio-tts│  streamed, mp3
                                        └───────┬───────┘
                                                ▼
                                        notch renders + speaks
```

Two rules that fall out of this diagram and are easy to get wrong:

1. **The Realtime API never speaks.** `output_modalities: ["text"]`. It exists for fast turn-taking and transcription. Fish is the voice. If you let Realtime emit audio you get a generic assistant voice and you have lost the character.
2. **`detectMoment` runs on every turn, including voice.** In the current repo it only runs on text, which is why voice is always emotionally flat. Do not repeat that.

---

## 1. Schema (NEW)

The spine. Everything else reads or writes this.

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- The notebook. One row per user, the whole of who they are, as JSON.
--
-- JSON and not columns on purpose: the yap produces a shape that will change
-- every week for the first month, and a migration per change is how you end up
-- not changing it. The read path is always "the whole notebook", never a query
-- across users, so there is nothing to index inside it.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.notebooks (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  approved_at timestamptz,               -- when they said yes at read-back
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.notebooks enable row level security;
create policy "own notebook" on public.notebooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Check-ins. One row per goal per day, written by the night debrief.
--
-- Separate from the notebook because this is the part that grows forever and is
-- actually queried (streaks, "how did last week go"). The notebook is a
-- document; this is a ledger.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  goal_id    text not null,              -- matches a goal id inside the notebook
  day        date not null,
  value      numeric not null default 0, -- how much they did
  note       text,                       -- their own words, verbatim
  source     text not null default 'debrief',  -- debrief | manual | inferred
  created_at timestamptz not null default now(),
  unique (user_id, goal_id, day)         -- one truth per goal per day
);

alter table public.checkins enable row level security;
create policy "own checkins" on public.checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index checkins_user_day_idx on public.checkins (user_id, day desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Show-up log. Every time he spoke first.
--
-- This is what enforces "exactly three moments". The cooldown check is a read
-- against this table, so a bug that fires a nudge twice is visible rather than
-- merely annoying.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.showups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,              -- morning | stuck | night
  said       text,                       -- what he actually said
  acted      boolean not null default false,  -- did they engage
  created_at timestamptz not null default now()
);

alter table public.showups enable row level security;
create policy "own showups" on public.showups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index showups_user_kind_idx on public.showups (user_id, kind, created_at desc);
```

### The notebook shape

This is the contract every other piece depends on. Change it here and change the summarizer prompt in the same commit.

```ts
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Notebook = {
  startTime: string;              // "08:30", when the morning greet fires
  timezone: string;               // IANA, from Intl

  schedule: Array<{
    id: string;
    label: string;                // "Standup", "Lectures", "Gym"
    days: Weekday[];
    start: string;                // "HH:MM"
    end: string;
    kind: "fixed" | "deep_work" | "flexible";
  }>;

  goals: Array<{
    id: string;
    title: string;                // "Read 20 pages"
    cadence: "daily" | "weekly" | "monthly";
    target: number;               // 20
    unit: string;                 // "pages"
    why?: string;                 // their own reason, in their words
  }>;

  focus: {
    deepWork: Array<{ days: Weekday[]; start: string; end: string }>;
    distractions: string[];       // "youtube", "slack", "the group chat"
    music: { mood?: string; service?: "spotify" | "apple" | "none"; playlist?: string };
  };

  automations: Array<{
    id: string;
    title: string;                // "Triage my inbox"
    trigger: "morning" | "evening" | "weekday" | "manual";
    detail: string;
    status: "wished" | "armed";   // wished = they said it, not built yet
  }>;

  slipping: string[];             // what keeps not happening, their words
};
```

---

## 2. Yap to notebook (NEW, and this is P0 number one)

Everything depends on this. If it does not hit 99% approval, nothing else matters.

The whole trick is that **the model fills a schema, it does not write prose.** Structured output, not a summary.

```ts
// supabase/functions/companion/yap-to-notebook/index.ts

import { BRAINO_TEXT_MODEL } from "../../_shared/openai-models.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

// The five questions, in order. The summarizer is told which answer is which,
// because "what keeps slipping" and "what do you wish just happened" produce
// very similar language and merge into each other without the labels.
const QUESTIONS = [
  "walk me through a normal day",
  "what keeps slipping",
  "when is your deep work, and what pulls you out of it",
  "what do you listen to",
  "what do you wish just happened on its own",
] as const;

const SYSTEM = `You are turning a person's spoken description of their life into a structured notebook.

You are NOT summarizing and you are NOT writing prose. You are filling in a schema from what they said.

Rules that decide whether this works:

1. Use THEIR words. If they said "the group chat eats my afternoon", the distraction is "the group chat", not "social media". A person reads this back and approves it when they recognise themselves in it.

2. Never invent a goal they did not state. If they mentioned reading but named no number, target is 1 and unit is "session". A made-up "20 pages" is the single fastest way to lose the approval.

3. Times: convert everything to 24-hour "HH:MM". "After lunch" is 13:00. "Morning" with no hour is 09:00. "First thing" is their startTime.

4. If they never said when their day starts, set startTime to 08:30 and let them fix it at read-back.

5. Anything they wished for out loud goes in automations with status "wished", even if it sounds impossible. That list is a promise, not a backlog.

6. Empty is better than wrong. An empty array is a question at read-back; a wrong entry is a correction, and corrections are what break the 99%.`;

// The schema is enforced by the API, not by the prompt. A prompt that asks
// politely for JSON gets JSON most of the time, and "most of the time" is a
// crash in the onboarding flow.
const NOTEBOOK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["startTime", "timezone", "schedule", "goals", "focus", "automations", "slipping"],
  properties: {
    startTime: { type: "string", description: "HH:MM, when their day starts" },
    timezone: { type: "string" },
    schedule: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "days", "start", "end", "kind"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          days: { type: "array", items: { enum: ["mon","tue","wed","thu","fri","sat","sun"] } },
          start: { type: "string" },
          end: { type: "string" },
          kind: { enum: ["fixed", "deep_work", "flexible"] },
        },
      },
    },
    goals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "cadence", "target", "unit"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          cadence: { enum: ["daily", "weekly", "monthly"] },
          target: { type: "number" },
          unit: { type: "string" },
          why: { type: "string" },
        },
      },
    },
    focus: {
      type: "object",
      additionalProperties: false,
      required: ["deepWork", "distractions", "music"],
      properties: {
        deepWork: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["days", "start", "end"],
            properties: {
              days: { type: "array", items: { enum: ["mon","tue","wed","thu","fri","sat","sun"] } },
              start: { type: "string" },
              end: { type: "string" },
            },
          },
        },
        distractions: { type: "array", items: { type: "string" } },
        music: {
          type: "object",
          additionalProperties: false,
          required: ["mood", "service", "playlist"],
          properties: {
            mood: { type: "string" },
            service: { enum: ["spotify", "apple", "none"] },
            playlist: { type: "string" },
          },
        },
      },
    },
    automations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "trigger", "detail", "status"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          trigger: { enum: ["morning", "evening", "weekday", "manual"] },
          detail: { type: "string" },
          status: { enum: ["wished", "armed"] },
        },
      },
    },
    slipping: { type: "array", items: { type: "string" } },
  },
} as const;

export async function yapToNotebook(
  answers: string[],          // one transcript per question, in QUESTIONS order
  timezone: string,
): Promise<Notebook> {
  const transcript = QUESTIONS
    .map((q, i) => `Q: ${q}\nA: ${answers[i] ?? "(no answer)"}`)
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: BRAINO_TEXT_MODEL,
      reasoning: { effort: "none" },
      input: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Their timezone is ${timezone}.\n\n${transcript}` },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "notebook",
          strict: true,
          schema: NOTEBOOK_SCHEMA,
        },
      },
    }),
  });

  const data = await response.json();
  const raw = data.output?.find((o: any) => o.type === "message")?.content?.[0]?.text;
  if (!raw) throw new Error("summarizer returned nothing");
  return JSON.parse(raw) as Notebook;
}
```

### The streaming version, for the split screen

The wow shot needs the notebook to build **while** they talk, not after. Run the summarizer on a rolling basis: after each answer, re-run it on everything said so far and patch the panel.

```ts
// Called after each of the five answers lands. Cheap enough to just re-run:
// five short calls with effort "none" is under a second each, and a diff-based
// incremental update is a category of bug you do not need during a demo.
async function onAnswerComplete(index: number, answers: string[], tz: string) {
  const partial = await yapToNotebook(answers, tz);
  renderNotebook(partial);      // right-hand panel, animate what changed
}
```

Animate on **change**, not on render. Diff the incoming notebook against the last one and only flash the rows that actually moved, or the whole panel strobes on every question and the effect is lost.

---

## 3. The morning greet (NEW)

Layer 2 over layer 1. The merge is the product.

```ts
// supabase/functions/companion/morning-greet/index.ts

const SYSTEM = `You are Braino, greeting someone at the start of their day. You speak first; they did not ask for this.

Lead with today. Calendar, then anything in their inbox that genuinely needs them, then what is due. Their goals come LAST and only as one short clause, never as a scorecard. Nobody wants to be marked at 8am.

One or two sentences. Spoken out loud, so no lists, no markdown, no headings.

Reference something from their notebook exactly once, so it is obvious you know them. Not every time, and never as flattery.

Never use an em-dash or an en-dash.

If today is genuinely empty, say so and offer something. An empty day is not a reason to invent work.`;

export async function morningGreet(userId: string) {
  const notebook = await getNotebook(userId);
  const events   = await getTodayEvents(userId);      // Google Calendar
  const inbox    = await getOvernightEmail(userId);   // Gmail, optional
  const goals    = goalsDueToday(notebook);           // pure function, below

  const context = [
    `Their day usually starts at ${notebook.startTime}.`,
    events.length
      ? `Calendar today: ${events.map(e => `${e.start} ${e.title}`).join(", ")}.`
      : "Calendar today: nothing scheduled.",
    inbox.length
      ? `Email that may need them: ${inbox.map(m => `${m.from} about ${m.subject}`).join("; ")}.`
      : "",
    goals.length ? `Goals due today: ${goals.map(g => g.title).join(", ")}.` : "",
    notebook.focus.deepWork.length
      ? `They told me their deep work is ${describeWindows(notebook.focus.deepWork)}.`
      : "",
  ].filter(Boolean).join("\n");

  const said = await brainoSay({ system: SYSTEM, context, medium: "voice" });

  await logShowup(userId, "morning", said);
  return said;
}

// Which goals are actually due today. Pure, testable, and the place where a
// weekly goal quietly becoming a daily nag would show up.
export function goalsDueToday(nb: Notebook, today = new Date()): Notebook["goals"] {
  const dow = (["sun","mon","tue","wed","thu","fri","sat"] as const)[today.getDay()];
  return nb.goals.filter((g) => {
    if (g.cadence === "daily") return true;
    if (g.cadence === "weekly") return dow === "mon";     // surfaced once, at the top of the week
    if (g.cadence === "monthly") return today.getDate() === 1;
    return false;
  });
}
```

**The greet must vary.** The same sentence every morning stops being a person by day three. Pass the last three greets in and tell the model not to reuse their shape:

```ts
const recent = await lastShowups(userId, "morning", 3);
// ...append to context:
recent.length
  ? `You have recently opened with: ${recent.map(r => `"${r.said}"`).join(" / ")}. Do not reuse those shapes.`
  : ""
```

---

## 4. The night debrief (NEW)

Free speech in, notebook deltas out. Same trick as the summarizer: fill a schema, do not write prose.

```ts
// supabase/functions/companion/debrief/index.ts

const DEBRIEF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["updates", "unmentioned", "mood", "reaction"],
  properties: {
    updates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["goalId", "value", "note"],
        properties: {
          goalId: { type: "string" },
          value: { type: "number", description: "how much they did, in the goal's own unit" },
          note: { type: "string", description: "their words, verbatim, short" },
        },
      },
    },
    // Goals they simply did not mention. NOT the same as zero, and conflating
    // the two is how a tracker starts lying to somebody about their own week.
    unmentioned: { type: "array", items: { type: "string" } },
    mood: { enum: ["good", "flat", "rough", "proud", "frustrated"] },
    reaction: { type: "string", description: "One or two sentences, spoken, in Braino's voice." },
  },
} as const;

const SYSTEM = `Someone is telling you how their day went, out loud, in no particular order. Turn it into updates against the goals they set.

Only record what they actually said. If they did not mention a goal, it goes in "unmentioned", never in "updates" with a zero. Not mentioning something is not the same as failing at it, and a tracker that cannot tell the difference is one people delete.

If they were vague ("did a bit of reading"), use the smallest honest number, not the target.

Then react. One or two sentences, out loud, like a person who was there for the day. Hyped if they did well, straight if they did not. Never a lecture, never a summary of what they just told you, and never a suggestion for tomorrow unless they asked.

Never use an em-dash or an en-dash.`;
```

Write the updates as `checkins` rows, then push the deltas to the open notebook panel so the bars fill **while he is still talking**. That is the moment the demo is built around, so wire the socket before you wire the persistence.

---

## 5. The stuck nudge (PORTED)

Already built, in `mac/braino-mac/main.cjs`. A screenshot every 90 seconds, through vision, and either a one-line offer or the literal string `SKIP`.

```js
// The shape of the existing cowork glance. The SKIP gate is the entire design:
// a model that must justify speaking says nothing most of the time, which is
// the only reason this is tolerable to live with.
const prompt = [
  "You are Braino in COWORK MODE: a coworking buddy who has been watching your",
  "human work on this Mac, checking in every minute or two.",
  recentSuggestions.length
    ? `You already offered recently (do NOT repeat or rephrase these): ${recentSuggestions.join(" | ")}`
    : "",
  // For the companion, this line is what turns a generic buddy into an
  // accountable one:
  `This morning they said today was about: ${todaysIntention}.`,
  "If there is nothing genuinely worth saying, reply with exactly: SKIP",
].filter(Boolean).join("\n");
```

Three changes to make it companion-shaped:

1. **Add the intention.** The line above. Without it he is guessing what a distraction even is.
2. **Never speak it.** The current version talks. The companion renders "Braino has a suggestion" in the notch and waits to be opened.
3. **Cooldown floor.** 90 seconds is the *look* interval. The *speak* interval is 30 minutes minimum, enforced against `showups`:

```ts
async function mayNudge(userId: string): Promise<boolean> {
  const last = await lastShowup(userId, "stuck");
  if (!last) return true;
  return Date.now() - new Date(last.created_at).getTime() > 30 * 60 * 1000;
}
```

---

## 6. The character (PORTED)

Copy `_shared/emotional-engine/` whole. Here is what the assembler does, so you can debug it.

```ts
export function buildEmotionalCore(options: BuildEmotionalCoreOptions = {}): string {
  const medium: ResponseMedium = options.medium === "voice" ? "voice" : "text";
  const settings = options.settings || DEFAULT_PERSONALITY_SETTINGS;
  const moment: Moment = options.moment || "neutral";
  const traits = options.traits ?? getClassManifest(options.classId).traits;

  const ordered = orderTraitsForMoment(moment, traits);

  const ctx = { medium, settings, moment };
  const renderedTraits = ordered.map((t) => t.body(ctx).trim()).filter(Boolean);

  const steer = steeringLine(moment, traits, options.intensity ?? 2);
  return (steer ? [steer, ...renderedTraits] : renderedTraits).join("\n\n");
}
```

The steering line is the entire "different situations get different Braino" mechanism, in one sentence:

```ts
export function steeringLine(moment: Moment, traits: Trait[], intensity = 2): string {
  if (moment === "neutral") return "";
  const leadIds = leadIdsForMoment(moment, traits);
  if (leadIds.length === 0) return "";
  const traitById = Object.fromEntries(traits.map((t) => [t.id, t]));
  const traitNames = leadIds
    .map((id) => traitById[id]?.name?.split(/[,]/)[0].trim().toLowerCase())
    .filter(Boolean)
    .join(", ");
  const severity = intensity >= 3
    ? " This is at full strength, so meet it there and do not soften it into something smaller."
    : "";
  return `Right now the user is in ${MOMENT_LABEL[moment]} moment.${severity} Lead with ${traitNames}; let the rest of who you are stay present but recede. Attune to where they actually are before you respond.`;
}
```

### A trait, in full

Every trait is this shape. `body` is a function of medium and settings, so one trait can render differently for voice, or render `""` to opt out entirely.

```ts
import { defineTrait } from "../types.ts";

export default defineTrait({
  id: "diction",
  name: "Directness",
  summary: "How he talks: plain, no filler, no dashes; short for voice, structured for text.",
  alwaysOn: true,
  body: ({ medium, settings }) => {
    const salt = settings.swearing
      ? `\n\nLanguage: salty is allowed. You can swear naturally the way a friend does when it fits, for emphasis or a real reaction. Still read the room: never at the user, never in a heavy moment, and never as a tic in every sentence.`
      : `\n\nLanguage: keep it clean. No profanity, even when mirroring someone who swears.`;

    const base =
`How you talk: Direct. No filler. Plain, conversational language, not robotic, not trying to sound impressive, not corporate. You never open with a hollow "Great question!" or "Absolutely!". You do not repeat yourself, and you do not summarize back what the user just said.${salt}

Length: say only what is needed. Short by default, and short even in big emotional moments. A real reaction does not get wordier because the moment is heavy, it gets realer. Never pad.

Punctuation: never use an em-dash or en-dash. Not one, ever, in any reply. Where you would reach for a dash, use a period, a comma, parentheses, or just start a new sentence.`;

    if (medium === "voice") {
      return `${base}

Voice is only the medium here, you are still Braino. Keep spoken answers short: no walls of text, no bullet lists read aloud, no markdown. Say the useful thing and stop. If you are interrupted, stop immediately and listen.`;
    }
    return `${base}

Use markdown when it genuinely helps clarity, but do not dress up a one-line answer.`;
  },
});
```

### Companion-specific additions

Three new moments the current engine does not have. Add them to `Moment`, `CUES`, and `MOMENT_EMPHASIS`.

| Moment | Fires when | Leads with |
|---|---|---|
| `streak` | they hit a goal several days running | charm, humor, warmth |
| `ghosted` | no debrief for 2 or more days, and they finally show up | humanity, honesty, warmth |
| `slipping` | a goal has missed most of its window | attunement, honesty, boundaries |

`ghosted` is the one that makes him a someone rather than a dashboard. Get it slightly dramatic and never guilt-tripping. He is glad they are back, and he says so.

---

## 7. The voice (PORTED)

### Fish TTS, the real request

```ts
const body: Record<string, unknown> = {
  text: text.slice(0, 2000),
  temperature: 0.7,
  top_p: 0.7,
  prosody: { speed: 1, volume: 0, normalize_loudness: true },
  // Smaller chunks mean Fish emits the first frames sooner, which is what makes
  // streaming playback feel responsive rather than merely fast.
  chunk_length: 100,
  normalize: true,
  format: "mp3",
  sample_rate: 44100,
  mp3_bitrate: 128,
  latency,
  max_new_tokens: 1024,
  repetition_penalty: 1.2,
  min_chunk_length: 20,
  condition_on_previous_chunks: true,
  early_stop_threshold: 1,
};
if (resolvedReferenceId) body.reference_id = resolvedReferenceId;

const fishResponse = await fetch("https://api.fish.audio/v1/tts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
    "Content-Type": "application/json",
    model: FISH_AUDIO_MODEL,          // note: a HEADER, not a body field
  },
  body: JSON.stringify(body),
});
```

`model` goes in the **header**. It is the kind of thing that costs an hour when you assume otherwise.

**Stream the response through. Do not await `arrayBuffer()`.** Bytes flow to the client as Fish generates them, so playback starts on the first chunk instead of after the last one.

Error mapping worth keeping verbatim:

```ts
function normalizeFishErrorStatus(status: number) {
  if (status === 402) return "credits";              // out of credits, fatal
  if (status === 429) return "rate_limit";           // transient, retryable
  if (status === 401) return "invalid_api_key";
  if (status >= 500) return "provider_unavailable";
  return "provider_error";
}
```

Voice reference IDs: Braino `88b183bfbdda44a09ad4474712b967f4`, Brainelle `b67aedfb36d04c53892fd0e96db08180`.

### Realtime session, the real config

```ts
{
  type: "realtime",
  model: realtimeModel,               // gpt-realtime-mini
  output_modalities: ["text"],        // ← THE line. Audio stays off. Fish is the voice.
  audio: {
    input: {
      // Opening default only. The client owns the mic and overrides this via
      // session.update once the data channel opens. "near_field" here told
      // OpenAI the mic was at the user's mouth, so a laptop voice at arm's
      // length got scrubbed as room noise until that update arrived.
      noise_reduction: { type: "far_field" },
      transcription: {
        model: "gpt-4o-transcribe",
        language: "en",               // ← without this he mirrors the wrong language
        prompt: [
          "Transcribe the user's direct command to Braino.",
          "Ignore music, fans, coughs, accidental noises, and unrelated background speech.",
          "Keep names, app names, URLs, file names, and code tokens intact.",
          "If the input is not a clear user command, leave it empty.",
        ].join(" "),
      },
      turn_detection: {
        type: "semantic_vad",
        eagerness: "medium",
        create_response: false,       // we generate the reply ourselves
        interrupt_response: true,     // barge-in
      },
    },
    output: { voice: realtimeVoice },
  },
}
```

Validate the requested model against an allowlist. A client that can name its own model is a bill waiting to happen:

```ts
const ALLOWED_REALTIME_MODELS = new Set([
  "gpt-realtime-2.1", "gpt-realtime-2", "gpt-realtime-1.5",
  "gpt-realtime", "gpt-realtime-mini", "gpt-4o-realtime-preview",
]);
```

### Dictation (Hera), the yap engine

Different session shape: `turn_detection: null`, because dictation has no turns.

```ts
transcription: {
  model: "gpt-4o-transcribe",
  delay: "low",
  languages: ["en", "hi"],
  prompt: [
    "This is direct personal dictation into a Mac text field.",
    "Transcribe every clearly spoken word faithfully in the language used by the speaker.",
    "Keep openings, filler words, repetitions, false starts, slang, and profanity when they are spoken.",
    "Add only punctuation and capitalization that are strongly supported by the speech.",
    "Keep names, brands, acronyms, numbers, URLs, file names, and code tokens exact.",
    "Do not summarize, answer, add ideas, or silently rewrite the meaning.",
    "Ignore music, keyboard noise, fans, coughs, and unrelated background speech.",
  ].join(" "),
  keywords: ["Braino", "Brainohera", "IOMI", "Yap Mode", "Notch", "Itish", "Itish Pande"],
},
turn_detection: null,
```

**Keep the filler words.** The onboarding yap is dictation, and a transcript that has been tidied into corporate English produces a notebook that does not sound like the person. The cleanup pass is for the user's own text, not for the summarizer's input.

### Parallel cleaning, the Wispr fix (NEW)

```ts
// Two tracks, neither blocking the other. The raw stream never waits for a
// cleaner, and the cleaner never touches the stream.
class ParallelDictation {
  private raw: string[] = [];        // every word, as heard
  private cleaned: string[] = [];    // finished chunks
  private pending = 0;               // words waiting to be cleaned
  private inFlight = new Set<Promise<void>>();

  onWords(words: string[]) {
    this.raw.push(...words);
    this.pending += words.length;
    if (this.pending >= 60) this.flush();   // 10 to 100; 60 is a comfortable middle
  }

  private flush() {
    const chunk = this.raw.slice(this.cleaned.length).join(" ");
    this.pending = 0;
    const idx = this.cleaned.length;
    const job = refine(chunk).then((text) => { this.cleaned[idx] = text; });
    this.inFlight.add(job);
    job.finally(() => this.inFlight.delete(job));
  }

  // Option pressed twice. Clean whatever is left, wait for the stragglers, emit.
  async finish(): Promise<string> {
    this.flush();
    await Promise.all(this.inFlight);
    return this.cleaned.join(" ");
  }
}
```

`refine()` is the existing `dictation-refine` function on `gpt-4.1-mini`.

---

## 8. The notch (PORTED)

Take `mac/braino-mac/renderer/braino-mac.css` as the source of truth. The browser version is already a token-for-token port of it.

### State machine

Every show-up is a state transition. Geometry is fixed per state, so the spring animates between known sizes rather than measuring content mid-flight.

| State | Size | Used by |
|---|---|---|
| `idle` | 190×56 (hover 198×58) | resting |
| `listening` / `speaking` | 250×66, r26 | voice |
| `working` | 250×60, r20 | doing a task |
| `input` / `menu` / `short` | 480 | typed input, short answers |
| `thinking` / `long` / `record` | 580 | long answers, recording |
| `greeting` | 610×180 | **the morning greet** |
| `signin` | 430×88 | auth |

Measured heights come through `--sb-answer-short-height` (min 146), `--sb-answer-long-height`, `--sb-record-height`.

### The hold-states guard

Not optional. This is what makes the notch feel stable instead of twitchy.

```js
// short, long, input, menu and signin are states a person is CURRENTLY USING.
// A background update that stomps one of them yanks the UI out from under a
// hand that is mid-sentence. Everything else may be replaced freely.
const HELD = new Set(["short", "long", "input", "menu", "signin"]);

function setNotchState(next, { force = false } = {}) {
  if (!force && HELD.has(current) && next !== current) return;
  current = next;
  applyGeometry(next);
}
```

### Motion

```css
/* the pill: Dynamic Island spring */
--nf-spring: 0.55s cubic-bezier(.32, .72, 0, 1);
/* expanded surfaces: expo-out */
--nf-expo:   1050ms cubic-bezier(.22, 1, .36, 1);
/* answers in / out */
--nf-answer-in:  420ms;
--nf-answer-out: 280ms;
```

### Colour, and the one rule

Coral is **never a fill**. It is his glow, his mouth, the sonar ring stroke, the thinking dot.

```css
.nf { background: #000; color: #fff; }
.nf.speaking { box-shadow: 0 0 34px rgba(232, 120, 110, .5); }
.nf-mouth    { fill: #E8786E; }           /* coral, and only while listening */

/* ink ladder */
.nf-label { font: 650 9px/1 system-ui; text-transform: uppercase; color: rgba(255,255,255,.6); }
.nf-body  { font: 500 17px/1.48 system-ui; color: rgba(255,255,255,.68); }
.nf-short { font: 500 17px/1.38 system-ui; color: #f7f7f5; }

/* white-glass buttons */
.nf-btn         { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); }
.nf-btn.primary { background: rgba(255,255,255,.88); color: #050505; }
```

Fonts are a 64KB subset WOFF2 pair, and the `@font-face` must be injected into the **document**, not the shadow root. Shadow roots cannot declare fonts, and this fails silently by falling back to system UI, which looks almost right.

### The suggestion panel

```
┌──────────────────────────────────┐
│  Braino has a suggestion      →  │   ← collapsed, 250×60, `working` geometry
└──────────────────────────────────┘
             click →
┌──────────────────────────────────┐
│  BRAINO HAS A SUGGESTION         │   ← nf-label
│                                  │
│  You have been in the group      │   ← nf-body
│  chat for twenty minutes and     │
│  the deck is still open.         │
│                                  │
│  Want me to close those and      │
│  put it back at six?             │
│                                  │
│  [ Talk about it ]               │   ← nf-btn
└──────────────────────────────────┘     `long` geometry, 580
```

Once it is opened or dismissed, log the show-up and start the 30-minute cooldown. He does not raise it again.

---

## 9. Design tokens (PORTED)

```css
:root {
  --ap-bg: #fbfbfd;  --ap-surface: #ffffff;
  --ap-ink: #1d1d1f; --ap-ink-soft: #6e6e73;
  --ap-hairline: #d2d2d7; --ap-nav: rgba(251,251,253,.82);

  --ap-coral:  #d9645b; --ap-coral-panel:  #fbeae8;
  --ap-green:  #3a8f5f; --ap-green-panel:  #e8f3ec;
  --ap-blue:   #2f6fed; --ap-blue-panel:   #e9f0fd;
  --ap-amber:  #b8842a; --ap-amber-panel:  #f6efe1;
  --ap-violet: #6b52c4; --ap-violet-panel: #efeafa;

  --ap-radius: 28px;
  --ap-maxw: 1024px;
  --ap-gutter: clamp(20px, 5vw, 40px);
  --ap-section: clamp(72px, 9vw, 132px);

  font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* Dark is a token override and nothing else. Never give a colour its only
   definition inside this block. */
.dark {
  --ap-bg: #0a0a0c;  --ap-surface: #161618;
  --ap-ink: #f5f5f7; --ap-ink-soft: #9a9aa2;
  --ap-hairline: #2a2a2e; --ap-nav: rgba(10,10,12,.72);
  --ap-coral-panel: #241615; --ap-green-panel: #10241a;
  --ap-blue-panel:  #141d33; --ap-amber-panel: #241f12; --ap-violet-panel: #1b1630;
  --ap-coral: #ec7b71; --ap-green: #58c48a; --ap-blue: #5c8dff;
  --ap-amber: #d8a94e; --ap-violet: #9a83e6;
}

.reveal    { opacity: 0; transform: translateY(24px);
             transition: opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1); }
.reveal.in { opacity: 1; transform: none; }
```

### The split screen

```css
/* Questions left, notebook right. The notebook scrolls on its own so a long
   schedule never pushes the question off screen. */
.ob {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: clamp(24px, 4vw, 64px);
  min-height: 100vh;
  align-items: start;
}
.ob-ask  { position: sticky; top: 0; min-height: 100vh; display: grid; align-content: center; }
.ob-book { padding: clamp(32px, 5vw, 72px) 0; }

/* A row that just arrived. Only rows that CHANGED get this, or the whole panel
   strobes on every answer and the effect is gone. */
@keyframes ob-land {
  from { opacity: 0; transform: translateY(8px); background: var(--ap-coral-panel); }
  to   { opacity: 1; transform: none;            background: transparent; }
}
.ob-row.is-new { animation: ob-land .45s cubic-bezier(.22,1,.36,1) both; }

@media (max-width: 860px) {
  .ob { grid-template-columns: minmax(0, 1fr); }
  .ob-ask { position: static; min-height: 0; }
}
```

---

## 10. Repo shape

```
braino-companion/
├─ app/                          # the Mac app (Electron)
│  ├─ main.cjs                   # ← port cowork loop + Shortcuts from mac/braino-mac
│  ├─ preload.cjs
│  └─ renderer/
│     ├─ notch.css               # ← port braino-mac.css whole
│     ├─ notch.js                # state machine + hold guard
│     └─ onboarding.html         # the split screen
├─ web/                          # the notebook, read-back, settings
├─ supabase/
│  ├─ migrations/
│  │  └─ 0001_companion.sql      # section 1
│  └─ functions/
│     ├─ _shared/
│     │  ├─ emotional-engine/    # ← PORT WHOLE
│     │  ├─ memory-engine/       # ← PORT WHOLE
│     │  └─ openai-models.ts     # ← PORT
│     ├─ companion/
│     │  ├─ yap-to-notebook/     # NEW, P0 #1
│     │  ├─ morning-greet/       # NEW, P0 #3
│     │  ├─ debrief/             # NEW, P0 #4
│     │  └─ nudge/               # NEW, P2
│     ├─ voice/
│     │  ├─ fish-audio-tts/      # ← PORT
│     │  └─ dictation-refine/    # ← PORT
│     └─ realtime/
│        └─ openai-realtime-call/# ← PORT
└─ BRAINO-COMPANION-PRD.md
```

---

## 11. How to know it works

Not "does it run". These are the four things that decide whether the product exists.

```ts
// 1. The summarizer. The only test that matters, and it is a human one:
//    ten real yaps, ten notebooks, nine approved with no edits.
//    Keep the transcripts as fixtures the moment you record them.

// 2. Moment routing has to survive the trip to voice.
test("voice turns are not always neutral", () => {
  const m = detectMoment("i just cannot do this anymore");
  expect(m.moment).not.toBe("neutral");
  const core = buildEmotionalCore({ moment: m.moment, medium: "voice" });
  expect(core).toContain("Lead with");        // the steering line survived
});

// 3. Not mentioning a goal is not failing at it.
test("unmentioned goals do not become zeroes", async () => {
  const out = await debrief("read a bit, skipped the gym entirely", notebook);
  expect(out.updates.map(u => u.goalId)).toContain("read");
  expect(out.updates.map(u => u.goalId)).toContain("gym");     // they SAID they skipped it
  expect(out.unmentioned).toContain("journal");                // never came up at all
});

// 4. Three moments means three.
test("the nudge respects its cooldown", async () => {
  await logShowup(u, "stuck", "…");
  expect(await mayNudge(u)).toBe(false);
});
```

And one that is not a test: **the day-7 greet has to be visibly better than the day-1 greet.** If it is not, layer 3 is decoration and you should cut it and say so.
