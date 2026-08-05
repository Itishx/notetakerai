-- Wake Braino every 6 hours to write his journal from the latest commits.
-- Uses pg_cron + pg_net to POST the generate-journal edge function. The anon
-- key is intentionally public (it also ships in the web client); the function
-- only drafts a PENDING article that still needs the founder's approval.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('braino-writes-journal')
  where exists (select 1 from cron.job where jobname = 'braino-writes-journal');

select cron.schedule(
  'braino-writes-journal',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/generate-journal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o'
    ),
    body := '{}'::jsonb
  );
  $$
);
