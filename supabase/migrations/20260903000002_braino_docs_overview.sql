-- The overview: two or three sentences at the top saying what the document
-- found, for someone deciding whether to read the rest of it. Written by the
-- same pass that writes the body, so it reflects the document rather than being
-- a summary of a summary.
alter table public.braino_docs add column if not exists overview text;

-- Counted once at write time rather than in every reader, so the number on the
-- page and the number anywhere else cannot disagree.
alter table public.braino_docs add column if not exists word_count integer not null default 0;
