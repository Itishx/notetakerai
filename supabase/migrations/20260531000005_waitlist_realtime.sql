-- Enable Realtime for the waitlist table so the admin page gets live insert events
alter publication supabase_realtime add table public.waitlist;
