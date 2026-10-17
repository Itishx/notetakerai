-- A person's public profile photo, as the search result gave it (a link, not a copy).
alter table public.outreach_leads add column if not exists photo_url text not null default '';
