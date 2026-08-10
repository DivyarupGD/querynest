-- Run once in Supabase SQL Editor. Create/invite the two user accounts in Authentication.
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, created_at timestamptz not null default now());
create table public.domains (id bigint generated always as identity primary key, slug text not null unique, name text not null, description text, created_at timestamptz not null default now());
create table public.datasets (id bigint generated always as identity primary key, domain_id bigint not null references public.domains(id) on delete cascade, name text not null, schema_sql text not null, seed_sql text not null, diagram jsonb not null default '{"tables":[],"relationships":[]}'::jsonb, unique(domain_id,name));
create table public.problems (id bigint generated always as identity primary key, code text not null unique, domain_id bigint references public.domains(id) on delete set null, dataset_id bigint references public.datasets(id) on delete set null, title text not null, prompt text not null, difficulty text not null check (difficulty in ('Easy','Medium','Hard')), tags text[] not null default '{}', starter_sql text not null default '', hint text, is_published boolean not null default false, created_at timestamptz not null default now());
create table public.problem_test_cases (id bigint generated always as identity primary key, problem_id bigint not null references public.problems(id) on delete cascade, setup_sql text not null, expected_result jsonb not null, sort_order smallint not null default 0);
create table public.user_progress (user_id uuid not null references public.profiles(id) on delete cascade, problem_code text not null, status text not null default 'not_started' check (status in ('not_started','attempted','solved')), attempts integer not null default 0, last_query text, solved_at timestamptz, updated_at timestamptz not null default now(), primary key(user_id,problem_code));
create table public.saved_queries (id bigint generated always as identity primary key, user_id uuid not null references public.profiles(id) on delete cascade, problem_code text not null, name text not null default 'Draft', query text not null, updated_at timestamptz not null default now());

alter table public.profiles enable row level security; alter table public.domains enable row level security; alter table public.datasets enable row level security; alter table public.problems enable row level security; alter table public.problem_test_cases enable row level security; alter table public.user_progress enable row level security; alter table public.saved_queries enable row level security;
create policy "Profile owner read" on public.profiles for select to authenticated using (auth.uid()=id);
create policy "Profile owner insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "Profile owner update" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);
create policy "Users read domains" on public.domains for select to authenticated using (true);
create policy "Users read datasets" on public.datasets for select to authenticated using (true);
create policy "Users read published problems" on public.problems for select to authenticated using (is_published=true);
create policy "Users read test cases" on public.problem_test_cases for select to authenticated using (true);
create policy "Users own progress" on public.user_progress for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Users own saved queries" on public.saved_queries for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.record_attempt(p_problem_code text, p_query text) returns void language plpgsql security invoker set search_path = public as $$ begin
  insert into public.user_progress(user_id,problem_code,status,attempts,last_query,updated_at)
  values(auth.uid(),p_problem_code,'attempted',1,p_query,now())
  on conflict(user_id,problem_code) do update set attempts=public.user_progress.attempts+1,last_query=excluded.last_query,updated_at=now(),status=case when public.user_progress.status='solved' then 'solved' else 'attempted' end;
end; $$;

create or replace function public.create_profile_for_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,display_name) values (new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1))) on conflict(id) do nothing; return new; end; $$;
create trigger create_profile_after_auth_user after insert on auth.users for each row execute procedure public.create_profile_for_new_user();
