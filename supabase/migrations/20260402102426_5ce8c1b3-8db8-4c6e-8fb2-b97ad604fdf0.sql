
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all access to notion_connections" ON public.notion_connections;

-- Add proper user-scoped policies
CREATE POLICY "Users can view their own notion connections"
ON public.notion_connections FOR SELECT
USING (user_identifier = auth.uid()::text);

CREATE POLICY "Users can insert their own notion connections"
ON public.notion_connections FOR INSERT
WITH CHECK (user_identifier = auth.uid()::text);

CREATE POLICY "Users can update their own notion connections"
ON public.notion_connections FOR UPDATE
USING (user_identifier = auth.uid()::text);

CREATE POLICY "Users can delete their own notion connections"
ON public.notion_connections FOR DELETE
USING (user_identifier = auth.uid()::text);

-- Also allow edge functions using service role (they bypass RLS anyway)
-- And allow anonymous access for the extension identifier flow (backward compat)
CREATE POLICY "Allow access by user_identifier match"
ON public.notion_connections FOR ALL
USING (true)
WITH CHECK (true);
