DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'google_drive_connections'
      AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE public.google_drive_connections ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
