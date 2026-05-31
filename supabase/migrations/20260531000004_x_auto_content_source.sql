-- Add content_source field to x_auto_persona for autonomous pipeline context
alter table public.x_auto_persona
  add column if not exists content_source text;
