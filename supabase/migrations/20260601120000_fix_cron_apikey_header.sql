-- Fix: cron jobs were missing the apikey header required by Supabase API Gateway.
-- Reschedule all three x-auto cron jobs with the anon key in headers.

do $$
declare
  job record;
begin
  for job in
    select jobid from cron.job
    where jobname in ('x-auto-generate', 'x-auto-engage', 'x-auto-stats-sync')
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
      url := 'https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/x-auto-generate',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YXBhY2ZyemRkbmhyd3ZrYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc4NTUsImV4cCI6MjA5MDUyMzg1NX0.WZV4fy1XqMS3TTyR09TneueaLl-729tp-Pi4HkfzURo"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

select cron.schedule(
  'x-auto-engage',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/x-auto-engage',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YXBhY2ZyemRkbmhyd3ZrYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc4NTUsImV4cCI6MjA5MDUyMzg1NX0.WZV4fy1XqMS3TTyR09TneueaLl-729tp-Pi4HkfzURo"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

select cron.schedule(
  'x-auto-stats-sync',
  '0 * * * *',
  $$
    select net.http_post(
      url := 'https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/x-auto-stats-sync',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YXBhY2ZyemRkbmhyd3ZrYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc4NTUsImV4cCI6MjA5MDUyMzg1NX0.WZV4fy1XqMS3TTyR09TneueaLl-729tp-Pi4HkfzURo"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
