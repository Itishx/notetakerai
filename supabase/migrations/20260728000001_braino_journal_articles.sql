-- Braino's autonomous journal: articles Braino writes about himself from the git
-- history. The generate-journal edge function (woken by a cron) drafts them as
-- 'pending'; the founder approves (status -> 'published'); the website renders
-- published ones. Published rows are world-readable; drafts are service-role only.
-- See supabase/functions/github/generate-journal/index.ts.

CREATE TABLE IF NOT EXISTS public.braino_journal_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  excerpt text,
  body text not null,                    -- paragraphs, \n\n separated
  source_commit text,                    -- the commit(s) this was written from
  author text not null default 'braino',
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  written_at timestamptz not null default now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS braino_journal_articles_status_idx
  ON public.braino_journal_articles (status, written_at desc);

ALTER TABLE public.braino_journal_articles ENABLE ROW LEVEL SECURITY;

-- Anyone may read PUBLISHED articles — that's the public blog.
DROP POLICY IF EXISTS "published articles are public" ON public.braino_journal_articles;
CREATE POLICY "published articles are public"
  ON public.braino_journal_articles FOR SELECT
  USING (status = 'published');

-- Everything else (pending drafts, inserts, approvals) is service-role only,
-- which the edge functions and the founder's dashboard (server-side) use.

COMMENT ON TABLE public.braino_journal_articles IS
  'Braino''s autonomous journal. The generate-journal cron drafts pending articles from git history; the founder approves to publish. Published rows are public; drafts are service-role only.';
