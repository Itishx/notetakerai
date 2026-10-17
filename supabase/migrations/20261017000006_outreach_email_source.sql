-- Where an email came from (2026-10-17): their site, the web, the company's pattern, a company inbox, Hunter.
alter table public.outreach_leads add column if not exists email_source text not null default '';
