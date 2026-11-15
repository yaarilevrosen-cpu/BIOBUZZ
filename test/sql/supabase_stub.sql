-- תחליף מקומי מינימלי לסופאבייס, רק לבדיקות: התפקידים anon ו-authenticated, הסכמה auth, auth.users ו-auth.uid().
-- auth.uid() קורא את request.jwt.claim.sub, כמו בסופאבייס.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists extensions;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now(),
  last_sign_in_at timestamptz,
  banned_until timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- כמו בסופאבייס: טבלאות ופונקציות חדשות ב-public פתוחות כברירת מחדל ל-anon ול-authenticated
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
