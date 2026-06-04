-- Daily cron: snapshot every connected X account's follower count so the
-- Delegate router can speak a real "gained +N in the last 7 days" delta.
-- Mirrors the net.http_post pattern used by the other x-auto-* cron jobs.

do $$
declare
  job record;
begin
  for job in
    select jobid from cron.job where jobname = 'x-follower-snapshot'
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end
$$;

select cron.schedule(
  'x-follower-snapshot',
  '0 6 * * *',
  $$
    select net.http_post(
      url := 'https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/x-follower-snapshot',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);
