-- Braino Code: "make it red" is an edit, not a rebuild.
--
-- Until now every change re-ran the whole pipeline: regenerate the design
-- system (with a web search), then rewrite all 1,100 lines. Minutes, to change
-- one line. Worse, a full rewrite is free to quietly drift on everything the
-- person did not ask about.
--
-- The edit path instead asks for a small set of exact string replacements and
-- applies them to the existing file. It is fast because the output is a handful
-- of strings rather than a whole page, and it is safe because a replacement
-- that does not match exactly once is refused rather than guessed at.
--
-- 'editing' is its own status so the wait screen can keep showing the current
-- site while the change is being made, instead of blanking back to a spinner.

alter table public.code_builds
  drop constraint if exists code_builds_status_check;

alter table public.code_builds
  add constraint code_builds_status_check
  check (status in ('queued','designing','writing','editing','ready','failed'));

-- What changed, in one line, for the person reading it ("Background is now red").
-- Null on a first build, since nothing changed yet.
alter table public.code_builds
  add column if not exists change_summary text;
