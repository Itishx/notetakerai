-- Fix all cron jobs to use new Supabase project URL and anon key

do $$
declare
  job record;
begin
  for job in
    select jobid from cron.job
    where jobname in (
      'x-auto-generate',
      'x-auto-engage',
      'x-auto-stats-sync',
      'dispatch-scheduled-x-posts'
    )
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end
$$;

select cron.schedule(
  'x-auto-generate',
  '0 14 * * *',
  $$
    select net.http_post(
      url := 'https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/x-auto-generate',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

select cron.schedule(
  'x-auto-engage',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/x-auto-engage',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

select cron.schedule(
  'x-auto-stats-sync',
  '0 * * * *',
  $$
    select net.http_post(
      url := 'https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/x-auto-stats-sync',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

select cron.schedule(
  'dispatch-scheduled-x-posts',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/dispatch-scheduled-x-posts',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
