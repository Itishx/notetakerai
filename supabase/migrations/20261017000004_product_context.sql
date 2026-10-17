-- Product context (2026-10-17): what the founder sells, down to the detail.
-- One record per product, read from their website, their notes and documents,
-- and their answers to Braino's questions. Outreach reads it today; Distra's
-- posts read the same record later, so it is not named after outreach.
create table if not exists public.product_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  website text not null default '',
  notes text not null default '',            -- pasted by the founder
  docs jsonb not null default '[]'::jsonb,   -- [{name, text}] uploaded text documents
  answers jsonb not null default '[]'::jsonb, -- [{q, a}]
  report jsonb not null default '{}'::jsonb,  -- the detailed product report
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft',       -- draft | reading | ready | failed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_contexts_user_idx on public.product_contexts (user_id, updated_at desc);
alter table public.product_contexts enable row level security;
drop policy if exists "own products" on public.product_contexts;
create policy "own products" on public.product_contexts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.outreach_briefs add column if not exists product_id uuid references public.product_contexts(id) on delete set null;
