alter table public.braino_contacts
  add column if not exists nickname text,
  add column if not exists nickname_key text;

update public.braino_contacts
set
  nickname = nullif(trim(nickname), ''),
  nickname_key = nullif(
    trim(
      regexp_replace(
        regexp_replace(lower(coalesce(nickname, '')), '[^a-z0-9]+', ' ', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  )
where nickname is not null;

create index if not exists braino_contacts_user_nickname_idx
  on public.braino_contacts (user_id, nickname_key);

create unique index if not exists braino_contacts_user_nickname_key_unique
  on public.braino_contacts (user_id, nickname_key)
  where nickname_key is not null;
