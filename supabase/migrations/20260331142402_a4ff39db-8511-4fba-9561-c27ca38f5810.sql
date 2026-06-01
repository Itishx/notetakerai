
CREATE TABLE IF NOT EXISTS public.notion_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier text NOT NULL UNIQUE,
  access_token text NOT NULL,
  workspace_name text,
  workspace_id text,
  bot_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notion_connections ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (extension doesn't have auth, uses user_identifier)
drop policy if exists "Allow all access to notion_connections" on public.notion_connections;
CREATE POLICY "Allow all access to notion_connections"
ON public.notion_connections
FOR ALL
USING (true)
WITH CHECK (true);
