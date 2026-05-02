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
      '@@REDDIT_POST@@' || E'\n' ||
      'sub:' || post.subreddit || E'\n' ||
      'ttl:' || post.title || E'\n' ||
      'bdy:' || E'\n' || post.body;

    insert into public.agent_commands (user_id, task, status, steps)
    values (post.user_id, task_text, 'pending', '[]'::jsonb)
    returning id into cmd_id;

    update public.scheduled_reddit_posts
    set status = 'triggered', agent_command_id = cmd_id
    where id = post.id;
  end loop;
end;
$$;