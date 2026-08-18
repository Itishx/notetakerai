-- xAuto, rebuilt as assisted.
--
-- The old xAuto walked the timeline and replied to every post in sequence. That
-- is the exact pattern X's February 2026 API change blocked and the March 2026
-- enforcement wave suspended accounts for: scripted replies to strangers, no
-- selectivity, machine cadence. The rule everyone landed on is "automate
-- creation and scheduling, never engagement."
--
-- So the shape changes rather than the ambition. Braino reads the timeline,
-- SCORES it, drafts only for the few worth answering, and the founder presses
-- send. The human is the pacing, which is the one thing no detector can
-- pattern-match. These columns exist to make that auditable.

alter table public.x_auto_reply_logs
  -- Why this post was worth answering at all. Shown in the dashboard so the
  -- selection is reviewable, not just the reply.
  add column if not exists opportunity_score integer,
  add column if not exists opportunity_reason text,
  -- 'sent' means it went out. 'skipped' means Braino drafted and the founder
  -- said no, which is the most useful training signal on the whole surface.
  -- 'suggested' means drafted and not yet acted on.
  add column if not exists outcome text not null default 'sent'
    check (outcome in ('suggested', 'sent', 'skipped')),
  add column if not exists surface text not null default 'browser'
    check (surface in ('browser', 'mac')),
  add column if not exists session_id uuid;

create index if not exists x_auto_reply_logs_user_outcome_idx
  on public.x_auto_reply_logs (user_id, outcome, replied_at desc);

-- ── Daily ceiling ────────────────────────────────────────────────────────
-- X's real limits are a 2,400/day cap and a rolling ~50 per 30 minutes, and it
-- is the 30 minute window that catches people during a reply session. Our cap
-- sits an order of magnitude below both, because the goal is not to squeeze
-- under a threshold, it is to look like a person having a normal day.

alter table public.x_settings
  add column if not exists xauto_daily_cap integer not null default 20,
  add column if not exists xauto_enabled boolean not null default true,
  -- Offer to start when the founder lands on X, rather than requiring them to
  -- remember a button exists.
  add column if not exists xauto_offer_on_visit boolean not null default true,
  -- Level 3 here would mean sending without asking. Off, and it stays a
  -- deliberate choice rather than a default.
  add column if not exists xauto_autosend boolean not null default false;

-- How many replies have actually gone out today, so the extension can be told
-- "you have 6 left" instead of finding out by being throttled.
create or replace function public.xauto_sent_today(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.x_auto_reply_logs
  where user_id = p_user
    and outcome = 'sent'
    and replied_at >= date_trunc('day', now());
$$;

grant execute on function public.xauto_sent_today(uuid) to authenticated;
