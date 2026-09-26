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
