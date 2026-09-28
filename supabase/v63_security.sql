-- BIOBUZZ v63 (app 1.9.0) — security migration.
-- Run ONCE in the Supabase SQL editor, after schema.sql. Safe to run again.
-- Old app versions keep working (same RPC names and arguments).
--
--  1. Driver ids may only contain A–Z a–z 0–9 _ -  (they become folder names on every computer).
--  2. Size caps for driver settings (kv), match data and bug reports.
--  3. Bug reports: at most 10 per hour per account / per network address, 300 per hour in total,
--     and screenshots are dropped after 50 MB per day.
--  4. Teams: only the owner renames the team, removes members and makes a new join code;
--     new codes have 8 characters; a wrong join code is counted — 10 wrong codes per hour per account.
--
-- "not valid" = the rule applies to every new or changed row; rows that already exist are not checked.

-- ── 1 + 2. drivers and matches ──
alter table public.bb_profiles drop constraint if exists bb_profiles_id_ok;
alter table public.bb_profiles add constraint bb_profiles_id_ok check (id ~ '^[A-Za-z0-9_-]{1,64}$') not valid;
alter table public.bb_matches drop constraint if exists bb_matches_pid_ok;
alter table public.bb_matches add constraint bb_matches_pid_ok check (profile_id ~ '^[A-Za-z0-9_-]{1,64}$') not valid;

alter table public.bb_profiles drop constraint if exists bb_profiles_size_ok;
alter table public.bb_profiles add constraint bb_profiles_size_ok check (
  pg_column_size(kv) <= 2000000
  and length(name) <= 60
  and coalesce(length(emoji), 0) <= 16
  and coalesce(length(color), 0) <= 16
) not valid;
alter table public.bb_matches drop constraint if exists bb_matches_size_ok;
alter table public.bb_matches add constraint bb_matches_size_ok check (pg_column_size(data) <= 262144) not valid;

-- at most 300 drivers per account
create or replace function public.bb_profiles_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.bb_profiles where owner = new.owner and id = new.id)
     and (select count(*) from public.bb_profiles where owner = new.owner) >= 300 then
    raise exception 'too many drivers';
  end if;
  return new;
end $$;
drop trigger if exists bb_profiles_limit on public.bb_profiles;
create trigger bb_profiles_limit before insert on public.bb_profiles for each row execute function public.bb_profiles_limit();

-- ── 3. bug reports ──
alter table public.bb_bugs add column if not exists ip_hash text;
alter table public.bb_bugs drop constraint if exists bb_bugs_size_ok;
alter table public.bb_bugs add constraint bb_bugs_size_ok check (
  length(what) between 3 and 4000
  and coalesce(length(steps), 0) <= 4000
  and coalesce(length(contact), 0) <= 200
  and coalesce(length(ver), 0) <= 40 and coalesce(length(lang), 0) <= 8 and coalesce(length(platform), 0) <= 200
  and coalesce(length(shot), 0) <= 700000
  and coalesce(pg_column_size(sys), 0) <= 20000
  and coalesce(pg_column_size(errors), 0) <= 40000
) not valid;
create index if not exists bb_bugs_recent on public.bb_bugs (created_at);
create index if not exists bb_bugs_uid on public.bb_bugs (uid, created_at);
create index if not exists bb_bugs_ip on public.bb_bugs (ip_hash, created_at);

create or replace function public.bb_bugs_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare ip text := ''; h text; n int;
begin
  begin
    ip := trim(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1));
  exception when others then ip := '';
  end;
  h := case when ip <> '' then md5('biobuzz-bug:' || ip) else null end;
  new.ip_hash := h;
  new.created_at := now();
  if new.uid is not null then
    select count(*) into n from public.bb_bugs where uid = new.uid and created_at > now() - interval '1 hour';
    if n >= 10 then raise exception 'too many bug reports, try again later'; end if;
  end if;
  if h is not null then
    select count(*) into n from public.bb_bugs where ip_hash = h and created_at > now() - interval '1 hour';
    if n >= 10 then raise exception 'too many bug reports, try again later'; end if;
  end if;
  select count(*) into n from public.bb_bugs where created_at > now() - interval '1 hour';
  if n >= 300 then raise exception 'too many bug reports, try again later'; end if;
  if new.shot is not null and (select coalesce(sum(length(shot)), 0) from public.bb_bugs where created_at > now() - interval '1 day') > 50000000 then
    new.shot := null;
  end if;
  return new;
end $$;
drop trigger if exists bb_bugs_guard on public.bb_bugs;
create trigger bb_bugs_guard before insert on public.bb_bugs for each row execute function public.bb_bugs_guard();

-- ── 4. teams ──
-- 8-character codes (40 random bits) for new teams and new codes. Existing 6-character codes keep working.
create or replace function public.bb_code() returns text
language plpgsql set search_path = public as $$
declare c text; a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; i int;
begin
  loop
    b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    c := '';
    foreach i in array array[0, 1, 2, 3, 4, 5, 7, 9] loop   -- skip the fixed uuid version byte
      c := c || substr(a, 1 + (get_byte(b, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.bb_teams where code = c);
  end loop;
  return c;
end $$;

create table if not exists public.bb_join_fails (
  uid uuid primary key references auth.users(id) on delete cascade,
  n int not null default 0,
  since timestamptz not null default now()
);
alter table public.bb_join_fails enable row level security;
revoke all on public.bb_join_fails from anon, authenticated;

-- a wrong code returns NULL instead of an error (an error would undo the counting). The v63 app shows "code not found".
create or replace function public.bb_team_join(p_code text, p_label text) returns public.bb_teams
language plpgsql security definer set search_path = public as $$
declare t public.bb_teams; f public.bb_join_fails;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into f from public.bb_join_fails where uid = auth.uid();
  if found and f.since > now() - interval '1 hour' and f.n >= 10 then
    raise exception 'too many attempts, try again in an hour';
  end if;
  select * into t from public.bb_teams where code = upper(trim(coalesce(p_code, '')));
  if not found then
    insert into public.bb_join_fails as j (uid, n, since) values (auth.uid(), 1, now())
      on conflict (uid) do update set
        n = case when j.since > now() - interval '1 hour' then j.n + 1 else 1 end,
        since = case when j.since > now() - interval '1 hour' then j.since else now() end;
    return null;
  end if;
  delete from public.bb_join_fails where uid = auth.uid();
  delete from public.bb_team_members where uid = auth.uid();
  insert into public.bb_team_members (team_id, uid, label) values (t.id, auth.uid(), left(coalesce(p_label, ''), 40));
  return t;
end $$;

create or replace function public.bb_team_update(p_name text, p_num text) returns public.bb_teams
language plpgsql security definer set search_path = public as $$
declare t public.bb_teams;
begin
  update public.bb_teams set name = left(coalesce(p_name, ''), 40), num = left(regexp_replace(coalesce(p_num, ''), '[^0-9]', '', 'g'), 6)
   where id = public.bb_my_team() and owner = auth.uid() returning * into t;
  if not found then raise exception 'only the team owner can change the team'; end if;
  return t;
end $$;

create or replace function public.bb_team_kick(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.bb_teams where id = public.bb_my_team() and owner = auth.uid()) then
    raise exception 'only the team owner can remove members';
  end if;
  if p_uid = auth.uid() then raise exception 'the owner cannot remove themselves'; end if;
  delete from public.bb_team_members where uid = p_uid and team_id = public.bb_my_team();
end $$;

create or replace function public.bb_team_rotate_code() returns public.bb_teams
language plpgsql security definer set search_path = public as $$
declare t public.bb_teams;
begin
  update public.bb_teams set code = public.bb_code() where id = public.bb_my_team() and owner = auth.uid() returning * into t;
  if not found then raise exception 'only the team owner can make a new code'; end if;
  return t;
end $$;

revoke all on function public.bb_code(), public.bb_team_join(text, text), public.bb_team_update(text, text),
  public.bb_team_kick(uuid), public.bb_team_rotate_code() from public, anon;
grant execute on function public.bb_team_join(text, text), public.bb_team_update(text, text),
  public.bb_team_kick(uuid), public.bb_team_rotate_code() to authenticated;
