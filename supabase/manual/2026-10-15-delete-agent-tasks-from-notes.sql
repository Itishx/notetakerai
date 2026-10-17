-- Agent tasks were saved into `notes` by the Chrome extension (bgSaveAgentTask,
-- use_case = 'agent') until 2026-10-15. They are not notes. Stopped at the source;
-- this removes the old rows. NOT run automatically. Run step 1, read it, then step 2.

-- 1. Preview: how many, and a sample, per user.
select user_id, count(*) as agent_rows, min(created_at) as first_at, max(created_at) as last_at
from public.notes
where use_case = 'agent'
group by user_id
order by agent_rows desc;

select id, created_at, left(title, 80) as title
from public.notes
where use_case = 'agent'
order by created_at desc
limit 50;

-- 2. Delete (inside a transaction, so you can check the count before committing).
begin;
delete from public.notes where use_case = 'agent';
-- check the "DELETE n" count matches step 1, then:
commit;
-- or: rollback;
