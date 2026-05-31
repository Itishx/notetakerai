alter table public.profiles
add column if not exists overall_memory text not null default '';