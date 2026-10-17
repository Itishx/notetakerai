-- Security hardening (2026-10-11 audit).

-- 1. Users can no longer grant themselves premium. Only the service role
--    (polar-webhook) and session-less triggers (access_grants) may change it.
create or replace function public.protect_profile_privileged() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and coalesce(new.is_premium, false) then
      raise exception 'is_premium is read-only';
    elsif tg_op = 'UPDATE' and new.is_premium is distinct from old.is_premium then
      raise exception 'is_premium is read-only';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_privileged on public.profiles;
create trigger protect_profile_privileged before insert or update on public.profiles
for each row execute function public.protect_profile_privileged();

-- 2 & 3. Remove "backward compat" policies that exposed every user's OAuth tokens.
drop policy if exists "Allow access by user_identifier match" on public.notion_connections;
drop policy if exists "Allow access by user_identifier match on google_drive_connections" on public.google_drive_connections;

-- 4. "Service role" policy had no TO clause, so it applied to anon too.
drop policy if exists "Service role can manage post analytics" on public.x_post_analytics;

-- 5. Anonymous uploads into a public bucket. Only sync-to-notion uploads, via service role.
drop policy if exists "Allow public upload to note-images" on storage.objects;
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
 where id = 'note-images';

-- 6. Users could read any other user's daily X reply count.
create or replace function public.xauto_sent_today(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer
  from public.x_auto_reply_logs
  where user_id = p_user
    and p_user = auth.uid()
    and outcome = 'sent'
    and replied_at >= date_trunc('day', now());
$$;
