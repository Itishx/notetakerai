-- X voice depth: length policy, content mix, and a readable activity feed.
--
-- Three gaps this closes:
--
--   1. Length was never a setting, so the generator drifted toward four-word
--      posts. Length is a voice decision, not a limit, and it needs a floor the
--      prompt can state and the code can enforce.
--   2. Pillars answer WHAT a post is about. Nothing answered HOW it is said, so
--      a week of seven posts on seven topics still read as seven opinions.
--      content_mix rotates the shape of the writing across the week.
--   3. x_action_log records what happened but nothing surfaced it, so "what is
--      Braino doing right now" had no answer.

alter table public.x_settings
  add column if not exists length_mode text not null default 'balanced'
    check (length_mode in ('punchy', 'balanced', 'substantial')),
  -- One entry per weekday: which FORMAT that day's post takes. Separate from
  -- pillars on purpose. See _shared/x-voice-prompt.ts X_FORMATS.
  add column if not exists content_mix jsonb not null default '[
    {"day": "Mon", "format": "build-log"},
    {"day": "Tue", "format": "teach"},
    {"day": "Wed", "format": "opinion"},
    {"day": "Thu", "format": "story"},
    {"day": "Fri", "format": "proof"},
    {"day": "Sat", "format": "contrarian"},
    {"day": "Sun", "format": "question"}
  ]'::jsonb,
  -- Set by x-status / the dashboard poll so the surface can say "checked 12
  -- seconds ago" instead of implying a live socket it does not have.
  add column if not exists connection_checked_at timestamptz,
  add column if not exists connection_ok boolean;

comment on column public.x_settings.length_mode is
  'punchy | balanced | substantial. Drives the hard character floor in x-voice-prompt.ts.';
comment on column public.x_settings.content_mix is
  'Weekly rotation of post FORMAT (how it is said), distinct from pillars (what it is about).';

-- ── Readable activity ────────────────────────────────────────────────────
-- x_action_log is written by every agent. This view is what the dashboard reads:
-- newest first, already joined to nothing, cheap to poll.

create or replace view public.x_activity_feed as
  select
    id,
    user_id,
    agent,
    action,
    target,
    reason,
    result,
    created_at
  from public.x_action_log
  order by created_at desc;

-- Views do not inherit RLS from their base table unless they run as the invoker.
alter view public.x_activity_feed set (security_invoker = on);

grant select on public.x_activity_feed to authenticated;
