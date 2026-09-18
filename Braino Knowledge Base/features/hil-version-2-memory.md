# HIL Version 2: He Remembers

**Type:** Technical
**Platform:** Human Intelligence Layer (Braino for Mac, the Chrome extension, the website)
**Status:** MVP
**Released:** 2026-09-18

## The simple version

Braino used to start every morning brand new. He remembered every wall he had ever walked into, and not one door he had ever found. Book the tickets on Tuesday, get it exactly right, and on Wednesday he works the whole thing out again from nothing.

Now he keeps what worked. When a job finishes, he keeps the route he took, and the next time someone asks for the same kind of job on the same site he is handed it instead of rediscovering it. He also remembers his own history with you, so "do that again" and "the same as last time" mean something. And the documents that say how a capability is supposed to behave, which ten of them exist and only people could read, he can now read too.

## Why it exists

`braino_lessons` shipped first and it is genuinely good: when he gives up, he writes down what stopped him, it goes live on its second independent run, and every Braino learns it. But it only ever stored failure.

The asymmetry is the whole thing. A wall gets written down when he gives up, and giving up is rare. A door is found on every run that works, which is most of them, and none of it was kept. He had been getting steadily better at failing and no better at succeeding.

The trigger was a system architecture document that named it: procedural memory, the library of how things get done. Almost everything else in that document already existed here under different names. This did not.

## How to use it

Nothing to turn on. It is on the thinking path, so it applies to any job that goes to the loop.

For the people building him:

- `npm run test:all` runs everything. `npm run test:hil` runs the layer's own suite.
- `npm run hil:score` prints this week against last week: finished, gave up, needed Astra, steps to finish, thinking per run.
- `npm run hil:harvest` fills the route memory from runs he has already done. Dry run by default; `--apply` writes.
- `npm run skills:build` regenerates the skill registry after editing any `skills/<name>/SKILL.md`.

## What Braino knows or does

- Keeps the route that finished a job, derived from what he actually did rather than asked for afterwards, with the failed steps left out
- Hands that route back on a later run asking for the same kind of job on the same site, as a head start and never as a script
- Treats a different film, a different person and a different date as the same job, so routes actually accumulate instead of splitting into one row per detail
- Replaces a stored route when a later run finishes the same job in fewer steps, so the library gets faster rather than only bigger
- Retires a route that stops working, by itself, and lets it earn its way back
- Remembers his own history with you, both the jobs that finished and the ones that did not, so "the same as last time" resolves
- Reads the written contract for a capability when the command is plainly about it, at most two, and usually none
- Says out loud, in every one of those blocks, that none of them grants him anything: the confirmation gate is exactly where it was

## Honest limitations

- **Not verified on hardware.** Every round here is source-level: tests, type checks and stubbed-network exercises. None of it has yet run in a real session on a real Mac.
- **The migration is not applied.** `braino_procedures` exists as a file, not as a table, until someone runs `supabase db push`.
- **The harvest has never been run against the real table.** The first useful number, how many finished runs are actually in there, is unknown and is the first thing worth writing down afterwards.
- **A route is only as good as the site staying still.** The retire rule handles a site that changed, but it costs a run or two to notice.
- **The scope comes from the screen, and on the harvest from the first address he navigated to.** A run that never navigated has no scope and is skipped rather than filed under a guess.
- **Skill rules are extracted, not authored.** They come from the sections an author already headed Rules, Boundaries, Safety Rules and so on. A skill whose document has no such section contributes only its trigger line.

## Technical shape

- `supabase/migrations/20260918000001_braino_procedures.sql` — the table. Shaped like `braino_lessons` on purpose: scoped, fingerprinted, promoted at two independent hits, RLS on with no policies so only the service role writes. One column lessons does not need: `misses`, because a door can close.
- `supabase/functions/_shared/human-intelligence/procedures.ts` — recall, record, retire, and `routeFromSteps`. `goalOverlap` is the single definition of "the same job" and is used by recall, by recording, by the harvest and by history.
- `supabase/functions/_shared/human-intelligence/history.ts` — his history with one person. Read as the user so RLS decides whose rows come back; written with the service role because `braino_interactions` has no insert policy. Anything private is never written down at all.
- `supabase/functions/_shared/human-intelligence/skills.ts` and `skill-registry.ts` — the skill contracts. The registry is generated from `skills/<name>/SKILL.md` by `scripts/build-skill-registry.mjs` and checked in, because an edge function bundles what it imports and cannot see this repo's folders.
- `supabase/functions/reasoning/hil-loop/index.ts` — the three recalls ride in one `Promise.all`, so lessons, routes and history together cost what the single lessons read cost before. Skill matching is in process: no network, no model call.
- `hil-loop-prompt.ts` rule 13a, `HIL_LOOP_VERSION` 2.12.0.
- `scripts/hil-scoreboard.mjs`, `scripts/hil-harvest-routes.mjs`, `scripts/lib/hil-pure.mjs`.
- `docs/HIL-CHANGELOG.md` rounds 011 to 015 carry the evidence for each change.

## Product or design decisions

- **The route is derived, never asked for.** It comes out of the run's own step record, which the client already sends every turn. It costs no output tokens, cannot be hallucinated, and says what he did rather than what he would later claim he did.
- **Advisory, always.** A route, a lesson, a history line and a skill contract are all read by a brain that still has to look at the screen and still stops before anything irreversible. The gate is code and does not read any of these tables. Every block says so in its own words, so it does not depend on a rule having been read.
- **It has to narrow.** The tool catalog is already around 2,400 tokens on every command. Skills surface at most two and usually none; routes at most three; history at most four, and only when something connects it to now.
- **Nothing on the reflex path.** `hil-router` answers "play a song" in under a second and has never heard of any of this. A test says so.
- **Two independent runs before anyone else sees it**, for routes exactly as for lessons, including when the evidence comes from history rather than from the future.
- **The changelog's rule was enforced on itself.** Three of the five rounds were first written up with test counts that had been assumed rather than read. The real numbers are 313, 331, 341, 353, 364, and the entries and commit messages were corrected before anything was pushed.

## What comes next

Apply the migration, run the harvest against the real table and write down what it finds, then get a real session on hardware and read the scoreboard a week later. The numbers to watch are steps-to-finish and the share of runs that need Astra: if remembering works, both should fall, and if they do not, the honest answer is that this bought less than it cost.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
