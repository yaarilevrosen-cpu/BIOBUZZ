-- BIOBUZZ — מסד הנתונים לסנכרון בין מחשבים (Supabase / Postgres)
-- כל חשבון (auth.users) רואה רק את השורות שלו (RLS).
-- אפשר להריץ שוב בבטחה.

create table if not exists public.bb_profiles (
  owner     uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  id        text   not null,                 -- מזהה הנהג (זהה בכל המחשבים)
  name      text   not null default '',
  emoji     text,
  color     text,
  created   bigint,
  meta_at   bigint not null default 0,       -- מתי השתנו שם/סמל/צבע (מילישניות)
  kv        jsonb  not null default '{}'::jsonb, -- כל ההגדרות של הנהג (מפתחות bb…/biobuzz…)
  kv_at     bigint not null default 0,       -- מתי השתנו ההגדרות
  deleted   boolean not null default false,  -- מחיקה מסונכרנת (מצבה)
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);

create table if not exists public.bb_matches (
  owner      uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id text   not null,
  at         bigint not null,                -- מתי המאץ׳ נגמר (מילישניות) — מזהה ייחודי לנהג
  data       jsonb  not null,
  created_at timestamptz not null default now(),
  primary key (owner, profile_id, at)
);
create index if not exists bb_matches_profile on public.bb_matches (owner, profile_id);

alter table public.bb_profiles enable row level security;
alter table public.bb_matches  enable row level security;

drop policy if exists bb_profiles_own on public.bb_profiles;
create policy bb_profiles_own on public.bb_profiles for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists bb_matches_own on public.bb_matches;
create policy bb_matches_own on public.bb_matches for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

grant select, insert, update, delete on public.bb_profiles, public.bb_matches to authenticated;
revoke all on public.bb_profiles, public.bb_matches from anon;

create or replace function public.bb_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists bb_profiles_touch on public.bb_profiles;
create trigger bb_profiles_touch before update on public.bb_profiles for each row execute function public.bb_touch();

-- v56: דיווחי באגים מהאפליקציה — מותר רק להוסיף, אף אחד לא קורא דרך המפתח הציבורי
create table if not exists public.bb_bugs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  uid uuid default auth.uid(),
  ver text, lang text, platform text,
  what text not null, steps text, contact text,
  sys jsonb, errors jsonb, shot text
);
alter table public.bb_bugs enable row level security;
drop policy if exists bb_bugs_insert on public.bb_bugs;
create policy bb_bugs_insert on public.bb_bugs for insert to anon, authenticated with check (
  length(what) between 3 and 4000
  and coalesce(length(steps),0) <= 4000
  and coalesce(length(contact),0) <= 200
  and coalesce(length(ver),0) <= 40 and coalesce(length(lang),0) <= 8 and coalesce(length(platform),0) <= 200
  and coalesce(length(shot),0) <= 700000
  and coalesce(pg_column_size(sys),0) <= 20000
  and coalesce(pg_column_size(errors),0) <= 40000
  and (uid is null or uid = auth.uid())
);
revoke all on public.bb_bugs from anon, authenticated;
grant insert on public.bb_bugs to anon, authenticated;
grant usage on sequence public.bb_bugs_id_seq to anon, authenticated;

-- v57: חשבון אחד לכל אדם + קבוצה שמצטרפים אליה בקוד. חברי קבוצה רואים (קריאה בלבד) את הנהגים והמאצ׳ים של כולם.
create table if not exists public.bb_teams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null default '',
  num text not null default '',
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.bb_team_members (
  team_id uuid not null references public.bb_teams(id) on delete cascade,
  uid uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null default '',
  joined_at timestamptz not null default now(),
  primary key (team_id, uid),
  unique (uid)
);
alter table public.bb_teams enable row level security;
alter table public.bb_team_members enable row level security;

create or replace function public.bb_my_team() returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.bb_team_members where uid = auth.uid() limit 1
$$;
create or replace function public.bb_teammates() returns setof uuid language sql stable security definer set search_path = public as $$
  select m.uid from public.bb_team_members m where m.team_id = public.bb_my_team()
$$;

drop policy if exists bb_teams_read on public.bb_teams;
create policy bb_teams_read on public.bb_teams for select to authenticated using (id = public.bb_my_team());
drop policy if exists bb_members_read on public.bb_team_members;
create policy bb_members_read on public.bb_team_members for select to authenticated using (team_id = public.bb_my_team());
revoke all on public.bb_teams, public.bb_team_members from anon, authenticated;
grant select on public.bb_teams, public.bb_team_members to authenticated;

drop policy if exists bb_profiles_team_read on public.bb_profiles;
create policy bb_profiles_team_read on public.bb_profiles for select to authenticated using (owner in (select public.bb_teammates()));
drop policy if exists bb_matches_team_read on public.bb_matches;
create policy bb_matches_team_read on public.bb_matches for select to authenticated using (owner in (select public.bb_teammates()));

create or replace function public.bb_code() returns text language plpgsql as $$
declare c text; a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
    exit when not exists (select 1 from public.bb_teams where code = c);
  end loop;
  return c;
end $$;

create or replace function public.bb_team_create(p_name text, p_num text, p_label text) returns public.bb_teams
language plpgsql security definer set search_path = public as $$
declare t public.bb_teams;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.bb_team_members where uid = auth.uid();
  insert into public.bb_teams (code, name, num, owner) values (public.bb_code(), left(coalesce(p_name,''),40), left(regexp_replace(coalesce(p_num,''),'[^0-9]','','g'),6), auth.uid()) returning * into t;
  insert into public.bb_team_members (team_id, uid, label) values (t.id, auth.uid(), left(coalesce(p_label,''),40));
  return t;
end $$;

create or replace function public.bb_team_join(p_code text, p_label text) returns public.bb_teams
language plpgsql security definer set search_path = public as $$
declare t public.bb_teams;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into t from public.bb_teams where code = upper(trim(p_code));
  if not found then raise exception 'team code not found'; end if;
  delete from public.bb_team_members where uid = auth.uid();
  insert into public.bb_team_members (team_id, uid, label) values (t.id, auth.uid(), left(coalesce(p_label,''),40));
  return t;
end $$;

create or replace function public.bb_team_leave() returns void
language plpgsql security definer set search_path = public as $$
begin delete from public.bb_team_members where uid = auth.uid(); end $$;

create or replace function public.bb_team_update(p_name text, p_num text) returns public.bb_teams
language plpgsql security definer set search_path = public as $$
declare t public.bb_teams;
begin
  update public.bb_teams set name = left(coalesce(p_name,''),40), num = left(regexp_replace(coalesce(p_num,''),'[^0-9]','','g'),6)
   where id = public.bb_my_team() returning * into t;
  return t;
end $$;

revoke all on function public.bb_team_create(text,text,text), public.bb_team_join(text,text), public.bb_team_leave(), public.bb_team_update(text,text), public.bb_code() from public, anon;
grant execute on function public.bb_team_create(text,text,text), public.bb_team_join(text,text), public.bb_team_leave(), public.bb_team_update(text,text), public.bb_my_team(), public.bb_teammates() to authenticated;
