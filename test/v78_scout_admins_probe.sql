-- v78 מצב סקאוטינג — בדיקה של supabase/v78_scout_admins.sql על Postgres מקומי עם shim של סופאבייס (לא על השרת האמיתי).
-- כל בדיקה שנכשלת זורקת שגיאה. הרצה (מסד ריק):
-- psql -v ON_ERROR_STOP=1 -f shim.sql -f supabase/schema.sql -f supabase/v63_security.sql -f supabase/v72_security.sql \
--      -f supabase/v73_privacy.sql -f supabase/v74_bugs.sql -f supabase/v78_scout_admins.sql -f supabase/v78_scout_admins.sql -f test/v78_scout_admins_probe.sql
-- ה-shim: תפקידים anon/authenticated, auth.users ו-auth.uid() מתוך request.jwt.claim.sub, והרשאות ברירת המחדל של סופאבייס.
-- רק מיילים וחשבונות מומצאים.
\set U1 '''11111111-1111-1111-1111-111111111111'''
\set U2 '''22222222-2222-2222-2222-222222222222'''
\set U3 '''33333333-3333-3333-3333-333333333333'''
create or replace function pg_temp.ok(c boolean, what text) returns void language plpgsql as $$
begin if c is not true then raise exception 'FAIL: %', what; end if; raise notice 'ok: %', what; end $$;
-- מריץ פקודה ומחזיר את הודעת השגיאה ('' = הצליח)
create or replace function pg_temp.err(q text) returns text language plpgsql as $$
begin execute q; return ''; exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.ok(boolean, text), pg_temp.err(text) to anon, authenticated;
delete from public.bb_scout_admins;
insert into auth.users (id, email) values (:U1, 'owner@example.test'), (:U2, 'Second@Example.test'), (:U3, 'third@example.test') on conflict do nothing;

\echo == RLS enabled, grants
select pg_temp.ok((select relrowsecurity from pg_class where oid = 'public.bb_scout_admins'::regclass), 'RLS enabled');
select pg_temp.ok(not has_table_privilege('anon', 'public.bb_scout_admins', 'select'), 'anon cannot read the table');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.bb_scout_admins', 'insert'), 'authenticated cannot insert directly');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.bb_scout_admins', 'delete'), 'authenticated cannot delete directly');
select pg_temp.ok(not has_function_privilege('anon', 'public.bb_scout_is_admin()', 'execute'), 'anon cannot execute bb_scout_is_admin');
select pg_temp.ok(not has_function_privilege('anon', 'public.bb_scout_admin_add(text)', 'execute'), 'anon cannot execute bb_scout_admin_add');
select pg_temp.ok(has_function_privilege('authenticated', 'public.bb_scout_admin_remove(uuid)', 'execute'), 'authenticated can execute bb_scout_admin_remove');

\echo == no admins yet: nobody is admin, nobody can add himself
begin;
  set local role authenticated; select set_config('request.jwt.claim.sub', :U1, true);
  select pg_temp.ok(public.bb_scout_is_admin() = false, 'U1 not admin before bootstrap');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_add(''owner@example.test'')') like '%not_admin%', 'non-admin cannot add (even himself)');
  select pg_temp.ok(pg_temp.err('select * from public.bb_scout_admins_list()') like '%not_admin%', 'non-admin cannot list');
  select pg_temp.ok(pg_temp.err('insert into public.bb_scout_admins (user_id) values (''11111111-1111-1111-1111-111111111111'')') like '%permission denied%', 'direct insert denied');
rollback;
begin;
  set local role anon; select set_config('request.jwt.claim.sub', '', true);
  select pg_temp.ok(pg_temp.err('select public.bb_scout_is_admin()') like '%permission denied%', 'anon: execute denied');
rollback;

\echo == bootstrap (owner runs it in the SQL editor, as postgres)
insert into public.bb_scout_admins (user_id) select id from auth.users where lower(email) = lower('owner@example.test') on conflict do nothing;
insert into public.bb_scout_admins (user_id) select id from auth.users where lower(email) = lower('owner@example.test') on conflict do nothing;
select pg_temp.ok((select count(*) from public.bb_scout_admins) = 1, 'bootstrap: one admin, twice is harmless');

\echo == admin: is_admin, add, list, idempotent, no_account, last_admin
begin;
  set local role authenticated; select set_config('request.jwt.claim.sub', :U1, true);
  select pg_temp.ok(public.bb_scout_is_admin(), 'U1 is admin');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_remove(''11111111-1111-1111-1111-111111111111'')') like '%last_admin%', 'cannot remove the last admin');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_add(''nobody@example.test'')') like '%no_account%', 'unknown email -> no_account');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_add('''')') like '%no_account%', 'empty email -> no_account');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_add(''  second@EXAMPLE.test  '')') = '', 'add by email: trimmed, case-insensitive');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_add(''second@example.test'')') = '', 'add again: no error');
  select pg_temp.ok((select count(*) from public.bb_scout_admins_list()) = 2, 'list: 2 admins');
  select pg_temp.ok((select email from public.bb_scout_admins_list() where user_id = '22222222-2222-2222-2222-222222222222') = 'Second@Example.test', 'list: email from auth.users');
  select pg_temp.ok((select count(*) from public.bb_scout_admins) = 1, 'RLS: a direct select shows only my own row');
rollback;
-- הפעם באמת (בלי rollback): U1 מוסיף את U2
begin;
  set local role authenticated; select set_config('request.jwt.claim.sub', :U1, true);
  select public.bb_scout_admin_add('second@example.test');
commit;
select pg_temp.ok((select added_by from public.bb_scout_admins where user_id = :U2) = :U1, 'added_by = who added');
begin;
  set local role authenticated; select set_config('request.jwt.claim.sub', :U3, true);
  select pg_temp.ok(public.bb_scout_is_admin() = false, 'U3 is not admin');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_remove(''11111111-1111-1111-1111-111111111111'')') like '%not_admin%', 'non-admin cannot remove');
  select pg_temp.ok((select count(*) from public.bb_scout_admins) = 0, 'RLS: non-admin sees no rows');
rollback;
begin;
  set local role authenticated; select set_config('request.jwt.claim.sub', :U2, true);
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_remove(''33333333-3333-3333-3333-333333333333'')') = '', 'remove a non-admin: no error (nothing to do)');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_remove(''11111111-1111-1111-1111-111111111111'')') = '', 'U2 removes U1');
  select pg_temp.ok(pg_temp.err('select public.bb_scout_admin_remove(''22222222-2222-2222-2222-222222222222'')') like '%last_admin%', 'U2 cannot remove himself now (last admin)');
commit;
select pg_temp.ok((select count(*) from public.bb_scout_admins) = 1 and exists (select 1 from public.bb_scout_admins where user_id = :U2), 'one admin left: U2');

\echo == account deleted -> the admin row goes too (cascade); added_by -> null
insert into public.bb_scout_admins (user_id, added_by) values (:U3, :U2);
delete from auth.users where id = :U2;
select pg_temp.ok(not exists (select 1 from public.bb_scout_admins where user_id = :U2), 'deleting the account deletes the admin row');
select pg_temp.ok((select added_by from public.bb_scout_admins where user_id = :U3) is null, 'added_by of a deleted account -> null');
\echo == all v78 probes passed
