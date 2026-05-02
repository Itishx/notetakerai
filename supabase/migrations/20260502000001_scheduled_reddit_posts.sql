create table if not exists scheduled_reddit_posts (
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

alter table scheduled_reddit_posts enable row level security;

create policy "Users can manage their own scheduled posts"
  on scheduled_reddit_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index scheduled_reddit_posts_user_status_idx
  on scheduled_reddit_posts (user_id, status, scheduled_at);
