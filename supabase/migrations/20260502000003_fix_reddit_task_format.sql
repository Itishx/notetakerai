-- Replace the dispatcher function with a clearer task format that guides
-- the agent to use markdown mode (plain textarea) instead of the rich editor.
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
      'Create a Reddit text post in r/' || post.subreddit || '. Follow these steps in order:' || E'\n\n' ||
      '1. Navigate to https://www.reddit.com/r/' || post.subreddit || '/submit' || E'\n' ||
      '2. Click the "Text" tab if it is not already selected.' || E'\n' ||
      '3. Click the title input field and type this exact title:' || E'\n' ||
      post.title || E'\n\n' ||
      '4. In the body editor, click the button that says "Switch to Markdown" (it is in the top-right of the body editor toolbar). This switches to a plain text area.' || E'\n' ||
      '5. Click inside the body text area and type this exact body text:' || E'\n' ||
      post.body || E'\n\n' ||
      '6. Click the blue "Post" button to submit the post.';

    insert into agent_commands (user_id, task, status, steps)
    values (post.user_id, task_text, 'pending', '[]'::jsonb)
    returning id into cmd_id;

    update scheduled_reddit_posts
    set status = 'triggered', agent_command_id = cmd_id
    where id = post.id;
  end loop;
end;
$$;
