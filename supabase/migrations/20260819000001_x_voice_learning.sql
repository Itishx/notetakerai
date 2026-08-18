-- X voice learning (Distra.md section 7.1, BrainoX.md sections 7 and 9).
--
-- Two halves of one voice, deliberately kept in separate columns:
--
--   voice_learned  what Braino worked out by reading the user's own posts.
--                  Rewritten wholesale every time x-voice-learn runs.
--   voice_manual   what the user told Braino about themselves. Never
--                  overwritten by learning, and it wins on conflict, because
--                  the user knows things about their voice that 200 posts
--                  cannot show (what they are trying to become, not only what
--                  they have been).
--
-- The pre-existing voice_profile column stays as the merged, generation-time
-- view so nothing that already reads it breaks.

alter table public.x_settings
  add column if not exists voice_learned jsonb,
  add column if not exists voice_manual jsonb,
  add column if not exists voice_learned_at timestamptz,
  add column if not exists voice_posts_read integer not null default 0;

comment on column public.x_settings.voice_learned is
  'Read from the user''s own X history by x-voice-learn. Machine written.';
comment on column public.x_settings.voice_manual is
  'Told to Braino by the user. Human written. Wins on conflict.';

-- ── The posts he learned from ────────────────────────────────────────────
-- Kept rather than discarded for three reasons: the user can star the ones
-- that are most "them" (which is stronger training than any adjective), the
-- generator can quote real examples instead of describing a style, and a
-- re-learn can diff against what it thought last time.

create table if not exists public.x_voice_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  x_post_id text not null,
  text text not null,
  posted_at timestamptz,
  likes integer not null default 0,
  replies integer not null default 0,
  reposts integer not null default 0,
  quotes integer not null default 0,
  impressions integer,
  -- Engagement per impression where impressions are available, otherwise raw
  -- engagement. Used to rank which posts are worth imitating.
  engagement_score double precision not null default 0,
  -- The user pointing at a post and saying "this one is exactly me". Worth
  -- more than any slider.
  starred boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, x_post_id)
);

alter table public.x_voice_samples enable row level security;

drop policy if exists "Users can manage their own voice samples" on public.x_voice_samples;
create policy "Users can manage their own voice samples"
  on public.x_voice_samples for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists x_voice_samples_user_score_idx
  on public.x_voice_samples (user_id, engagement_score desc);
create index if not exists x_voice_samples_user_starred_idx
  on public.x_voice_samples (user_id, starred) where starred;

-- ── Setup progress ───────────────────────────────────────────────────────
-- So /x can send a first-time user to /x/setup and a returning user straight
-- to the dashboard, and so a half-finished setup resumes where it stopped.

alter table public.x_settings
  add column if not exists setup_completed_at timestamptz,
  add column if not exists setup_step text;
