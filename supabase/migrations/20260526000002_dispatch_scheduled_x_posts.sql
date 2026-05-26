create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'dispatch-scheduled-x-posts',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/dispatch-scheduled-x-posts',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 10000
    );
  $$
);
