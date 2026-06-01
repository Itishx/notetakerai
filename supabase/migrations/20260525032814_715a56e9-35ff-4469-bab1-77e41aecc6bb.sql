CREATE TABLE IF NOT EXISTS public.google_drive_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  google_email TEXT,
  google_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;

drop policy if exists "Users can view their own google drive connections" on public.google_drive_connections;
CREATE POLICY "Users can view their own google drive connections"
ON public.google_drive_connections FOR SELECT
USING (user_identifier = (auth.uid())::text);

drop policy if exists "Users can insert their own google drive connections" on public.google_drive_connections;
CREATE POLICY "Users can insert their own google drive connections"
ON public.google_drive_connections FOR INSERT
WITH CHECK (user_identifier = (auth.uid())::text);

drop policy if exists "Users can update their own google drive connections" on public.google_drive_connections;
CREATE POLICY "Users can update their own google drive connections"
ON public.google_drive_connections FOR UPDATE
USING (user_identifier = (auth.uid())::text);

drop policy if exists "Users can delete their own google drive connections" on public.google_drive_connections;
CREATE POLICY "Users can delete their own google drive connections"
ON public.google_drive_connections FOR DELETE
USING (user_identifier = (auth.uid())::text);

drop trigger if exists update_google_drive_connections_updated_at on public.google_drive_connections;
CREATE TRIGGER update_google_drive_connections_updated_at
BEFORE UPDATE ON public.google_drive_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();