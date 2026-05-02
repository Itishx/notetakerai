-- Enable pg_cron (Supabase Pro+; enable via Dashboard > Extensions if this fails)
create extension if not exists pg_cron;

-- Function: check for due posts and insert agent commands
create or replace function dispatch_scheduled_reddit_posts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post record;
  task_text text;
  cmd_id uuid;
begin
  for post in
    select *
    from scheduled_reddit_posts
    where status = 'pending'
      and scheduled_at <= now()
  loop
    task_text :=
      'Post to Reddit. Navigate to https://www.reddit.com/r/' || post.subreddit || '/submit, ' ||
      'click the "Text" post tab, fill the title field with the exact title below, ' ||
      'fill the body/text field with the exact body below, then click the Post button.' || E'\n\n' ||
      'SUBREDDIT: r/' || post.subreddit || E'\n\n' ||
      'TITLE:' || E'\n' || post.title || E'\n\n' ||
      'BODY:' || E'\n' || post.body;

    insert into agent_commands (user_id, task, status, steps)
    values (post.user_id, task_text, 'pending', '[]'::jsonb)
    returning id into cmd_id;

    update scheduled_reddit_posts
    set status = 'triggered', agent_command_id = cmd_id
    where id = post.id;
  end loop;
end;
$$;

-- Run every minute
select cron.schedule(
  'dispatch-reddit-posts',
  '* * * * *',
  'select dispatch_scheduled_reddit_posts()'
);
