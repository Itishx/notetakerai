-- Voice Commands: user-configured "say this, open that" shortcuts.
-- Organized into Modes (a named, voice-activatable state with its own notch color).
-- Only one mode is active per user at a time; while active, only that mode's commands
-- match against spoken phrases. Each command can carry multiple URLs — on trigger,
-- Braino opens a random subset of them (1..N), not always all.

CREATE TABLE IF NOT EXISTS public.voice_modes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notch_color text not null default '#0A84FF',
  is_active boolean not null default false,
  is_hidden boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.voice_commands (
  id uuid primary key default gen_random_uuid(),
  mode_id uuid not null references public.voice_modes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase text not null,
  open_mode text not null default 'tab',       -- tab | incognito
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.voice_command_urls (
  id uuid primary key default gen_random_uuid(),
  command_id uuid not null references public.voice_commands(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Extension/Mac app cache reads: all modes for a user, and the currently active one.
CREATE INDEX IF NOT EXISTS voice_modes_user_idx ON public.voice_modes (user_id, position);
CREATE INDEX IF NOT EXISTS voice_modes_user_active_idx ON public.voice_modes (user_id, is_active);

CREATE INDEX IF NOT EXISTS voice_commands_mode_idx ON public.voice_commands (mode_id, position);
CREATE INDEX IF NOT EXISTS voice_commands_user_idx ON public.voice_commands (user_id);

CREATE INDEX IF NOT EXISTS voice_command_urls_command_idx ON public.voice_command_urls (command_id, position);

ALTER TABLE public.voice_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_command_urls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own voice modes" ON public.voice_modes;
CREATE POLICY "Users manage their own voice modes"
  ON public.voice_modes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own voice commands" ON public.voice_commands;
CREATE POLICY "Users manage their own voice commands"
  ON public.voice_commands
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- voice_command_urls has no user_id of its own; gate through the parent command's ownership.
DROP POLICY IF EXISTS "Users manage their own voice command urls" ON public.voice_command_urls;
CREATE POLICY "Users manage their own voice command urls"
  ON public.voice_command_urls
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.voice_commands vc
    WHERE vc.id = voice_command_urls.command_id AND vc.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.voice_commands vc
    WHERE vc.id = voice_command_urls.command_id AND vc.user_id = auth.uid()
  ));

-- Only one active mode per user at a time.
CREATE UNIQUE INDEX IF NOT EXISTS voice_modes_one_active_per_user
  ON public.voice_modes (user_id)
  WHERE is_active;

COMMENT ON TABLE public.voice_modes IS
  'Voice Commands feature: user-defined modes, each with a notch color and a set of voice-triggered open-URL commands. Voice-activated via "start/stop <mode name>".';
COMMENT ON TABLE public.voice_commands IS
  'A phrase that, when spoken while its mode is active, opens one or more configured URLs (voice_command_urls) in a tab or incognito window.';
COMMENT ON TABLE public.voice_command_urls IS
  'URLs attached to a voice command. On trigger, a random subset (1..N) is opened, not always all.';
