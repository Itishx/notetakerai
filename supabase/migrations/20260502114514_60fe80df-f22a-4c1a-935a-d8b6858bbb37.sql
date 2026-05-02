create or replace function public.dispatch_scheduled_reddit_posts()
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
    from public.scheduled_reddit_posts
    where status = 'pending'
      and scheduled_at <= now()
  loop
    task_text :=
      'Post to Reddit r/' || post.subreddit || E'\n\n' ||
      'TITLE:' || E'\n' || post.title || E'\n\n' ||
      'BODY:' || E'\n' || post.body;

    insert into public.agent_commands (user_id, task, status, steps)
    values (post.user_id, task_text, 'pending', '[]'::jsonb)
    returning id into cmd_id;

    update public.scheduled_reddit_posts
    set status = 'triggered', agent_command_id = cmd_id
    where id = post.id;
  end loop;
end;
$$;