-- Contacts read from the company's own website (2026-10-17): emails, phones, WhatsApp, Instagram.
alter table public.outreach_leads add column if not exists contacts jsonb not null default '{}'::jsonb;
