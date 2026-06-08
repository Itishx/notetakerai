create table if not exists public.realtime_voice_turn_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid references public.realtime_voice_sessions(id) on delete set null,
  turn_id text not null,
  turn_index integer not null default 0,
  started_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  user_transcript text not null default '',
  assistant_messages jsonb not null default '[]'::jsonb,
  route_intent text,
  route_mode text,
  connector text,
  realtime_model text,
  transcription_model text,
  voice_provider text,
  voice_id text,
  voice_name text,
  realtime_input_text_tokens integer not null default 0,
  realtime_input_audio_tokens integer not null default 0,
  realtime_output_text_tokens integer not null default 0,
  realtime_output_audio_tokens integer not null default 0,
  realtime_cached_text_tokens integer not null default 0,
  realtime_cached_audio_tokens integer not null default 0,
  transcription_input_text_tokens integer not null default 0,
  transcription_input_audio_tokens integer not null default 0,
  transcription_output_text_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_openai_realtime_cost_usd numeric(12, 6) not null default 0,
  estimated_transcription_cost_usd numeric(12, 6) not null default 0,
  estimated_tts_cost_usd numeric(12, 6) not null default 0,
  estimated_total_cost_usd numeric(12, 6) not null default 0,
  cost_confidence text not null default 'unknown'
    check (cost_confidence in ('token_exact', 'duration_estimate', 'unknown', 'mixed')),
  raw_realtime_usage jsonb not null default '{}'::jsonb,
  raw_transcription_usage jsonb not null default '{}'::jsonb,
  raw_tts_usage jsonb not null default '{}'::jsonb,
  raw_client_payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint realtime_voice_turn_logs_unique_turn unique (user_id, turn_id)
);

create index if not exists realtime_voice_turn_logs_user_started_idx
  on public.realtime_voice_turn_logs (user_id, started_at desc);

create index if not exists realtime_voice_turn_logs_session_turn_idx
  on public.realtime_voice_turn_logs (session_id, turn_index);

create index if not exists realtime_voice_turn_logs_completed_idx
  on public.realtime_voice_turn_logs (completed_at desc);

alter table public.realtime_voice_turn_logs enable row level security;

drop trigger if exists update_realtime_voice_turn_logs_updated_at on public.realtime_voice_turn_logs;
create trigger update_realtime_voice_turn_logs_updated_at
before update on public.realtime_voice_turn_logs
for each row execute function public.update_updated_at_column();

grant all on public.realtime_voice_turn_logs to service_role;
