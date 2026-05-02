create table if not exists public.scheduled_reddit_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subreddit text not null,
  title text not null,
  body text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'triggered', 'cancelled')),
  agent_command_id uuid,
  created_at timestamptz default now()
);

alter table public.scheduled_reddit_posts enable row level security;

create policy "Users can manage their own scheduled posts"
  on public.scheduled_reddit_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists scheduled_reddit_posts_user_status_idx
  on public.scheduled_reddit_posts (user_id, status, scheduled_at);

create extension if not exists pg_cron;

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
      'Post to Reddit. Navigate to https://www.reddit.com/r/' || post.subreddit || '/submit, ' ||
      'click the "Text" post tab, fill the title field with the exact title below, ' ||
      'fill the body/text field with the exact body below, then click the Post button.' || E'\n\n' ||
      'SUBREDDIT: r/' || post.subreddit || E'\n\n' ||
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

select cron.schedule(
  'dispatch-reddit-posts',
  '* * * * *',
  'select public.dispatch_scheduled_reddit_posts()'
);