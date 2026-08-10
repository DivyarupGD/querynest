-- Run once in Supabase SQL Editor after schema.sql.
create or replace function public.record_result(p_problem_code text, p_query text, p_is_solved boolean)
returns void language plpgsql security invoker set search_path = public as $$
begin
  insert into public.user_progress(user_id,problem_code,status,attempts,last_query,solved_at,updated_at)
  values(auth.uid(),p_problem_code,case when p_is_solved then 'solved' else 'attempted' end,1,p_query,case when p_is_solved then now() else null end,now())
  on conflict(user_id,problem_code) do update set attempts=public.user_progress.attempts+1,last_query=excluded.last_query,updated_at=now(),status=case when public.user_progress.status='solved' or p_is_solved then 'solved' else 'attempted' end,solved_at=case when public.user_progress.solved_at is not null then public.user_progress.solved_at when p_is_solved then now() else null end;
end;
$$;
