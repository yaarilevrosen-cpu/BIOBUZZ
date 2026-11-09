-- v78 מצב סקאוטינג — בדיקה של supabase/v78_scout_admins.sql על Postgres מקומי עם shim של סופאבייס (לא על השרת האמיתי).
-- כל בדיקה שנכשלת זורקת שגיאה. הרצה (מסד ריק):
-- psql -v ON_ERROR_STOP=1 -f shim.sql -f supabase/schema.sql -f supabase/v63_security.sql -f supabase/v72_security.sql \
--      -f supabase/v73_privacy.sql -f supabase/v74_bugs.sql -f supabase/v78_scout_admins.sql -f supabase/v78_scout_admins.sql -f test/v78_scout_admins_probe.sql
-- ה-shim: תפקידים anon/authenticated, auth.users ו-auth.uid() מתוך request.jwt.claim.sub, והרשאות ברירת המחדל של סופאבייס.
-- רק מיילים וחשבונות מומצאים. U1 = בעלים, U2 = מנהל עם can_invite, U3 = מנהל ש-U2 הוסיף, U4 = מנהל רגיל, U5 = חשבון בלי הרשאה.
\set U1 '''11111111-1111-1111-1111-111111111111'''
\set U2 '''22222222-2222-2222-2222-222222222222'''
\set U3 '''33333333-3333-3333-3333-333333333333'''
\set U4 '''44444444-4444-4444-4444-444444444444'''
\set U5 '''55555555-5555-5555-5555-555555555555'''
create or replace function pg_temp.ok(c boolean, what text) returns void language plpgsql as $$
begin if c is not true then raise exception 'FAIL: %', what; end if; raise notice 'ok: %', what; end $$;
-- מריץ פקודה בשם חשבון (role authenticated) ומחזיר את הודעת השגיאה ('' = הצליח). השינוי נשאר (אין rollback)
create or replace function pg_temp.as_err(who uuid, q text) returns text language plpgsql as $$
declare m text := '';
begin
  perform set_config('request.jwt.claim.sub', coalesce(who::text, ''), true);
  execute 'set local role authenticated';
  begin execute q; exception when others then m := sqlerrm; end;
  execute 'reset role';
  return m;
end $$;
delete from public.bb_scout_admins;
delete from auth.users where email like '%@example.test' or email like '%@EXAMPLE.test' or email like '%@Example.test';
insert into auth.users (id, email) values (:U1, 'owner@example.test'), (:U2, 'Inviter@Example.test'), (:U3, 'invitee@example.test'),
  (:U4, 'plain@example.test'), (:U5, 'nobody@example.test');

\echo == RLS enabled, grants
select pg_temp.ok((select relrowsecurity from pg_class where oid = 'public.bb_scout_admins'::regclass), 'RLS enabled');
select pg_temp.ok(not has_table_privilege('anon', 'public.bb_scout_admins', 'select'), 'anon cannot read the table');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.bb_scout_admins', 'insert'), 'authenticated cannot insert directly');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.bb_scout_admins', 'update'), 'authenticated cannot update directly');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.bb_scout_admins', 'delete'), 'authenticated cannot delete directly');
select pg_temp.ok(not has_function_privilege('anon', 'public.bb_scout_is_admin()', 'execute'), 'anon cannot execute bb_scout_is_admin');
select pg_temp.ok(not has_function_privilege('anon', 'public.bb_scout_admin_set(uuid, boolean, boolean)', 'execute'), 'anon cannot execute bb_scout_admin_set');
select pg_temp.ok(has_function_privilege('authenticated', 'public.bb_scout_admin_remove(uuid)', 'execute'), 'authenticated can execute bb_scout_admin_remove');

\echo == before the bootstrap: nobody is admin, nobody can add himself
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_add(''owner@example.test'')') like '%not_admin%', 'non-admin cannot add (even himself)');
select pg_temp.ok(pg_temp.as_err(:U1, 'select * from public.bb_scout_admins_list()') like '%not_admin%', 'non-admin cannot list');
select pg_temp.ok(pg_temp.as_err(:U1, 'insert into public.bb_scout_admins (user_id, role) values (''11111111-1111-1111-1111-111111111111'', ''owner'')') like '%permission denied%', 'direct insert denied');
select pg_temp.ok(pg_temp.as_err(null, 'select public.bb_scout_admin_add(''x@example.test'')') like '%not signed in%', 'not signed in');

\echo == bootstrap (the template from docs/v78-mode.md, run as postgres)
insert into public.bb_scout_admins (user_id, role, can_invite) select id, 'owner', true from auth.users where lower(email) = lower('owner@example.test')
  on conflict (user_id) do update set role = 'owner', can_invite = true;
insert into public.bb_scout_admins (user_id, role, can_invite) select id, 'owner', true from auth.users where lower(email) = lower('owner@example.test')
  on conflict (user_id) do update set role = 'owner', can_invite = true;
select pg_temp.ok((select count(*) from public.bb_scout_admins) = 1 and (select role from public.bb_scout_admins where user_id = :U1) = 'owner', 'bootstrap: one owner, twice is harmless');

\echo == owner: add, list, last owner protected
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_remove(''11111111-1111-1111-1111-111111111111'')') like '%last_owner%', 'the last owner cannot be removed');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_set(''11111111-1111-1111-1111-111111111111'', null, false)') like '%last_owner%', 'the last owner cannot be demoted');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_add(''nobody@nowhere.test'')') like '%no_account%', 'unknown email -> no_account');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_add(''  inviter@EXAMPLE.test '')') = '', 'owner adds by email (trimmed, any case)');
select pg_temp.ok((select role = 'admin' and not can_invite and added_by = :U1 from public.bb_scout_admins where user_id = :U2), 'a new admin is always admin without can_invite');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_add(''inviter@example.test'')') = '', 'add again: no error');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_set(''22222222-2222-2222-2222-222222222222'', true, null)') = '', 'owner grants can_invite');
select pg_temp.ok((select can_invite and role = 'admin' from public.bb_scout_admins where user_id = :U2), 'U2: admin with can_invite');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_add(''plain@example.test'')') = '', 'owner adds U4 (plain)');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_set(''55555555-5555-5555-5555-555555555555'', true, null)') like '%not_found%', 'set on a non-admin -> not_found');

\echo == admin with can_invite: adds plain admins only, removes only his own invitees, cannot change permissions
select pg_temp.ok(pg_temp.as_err(:U2, 'select public.bb_scout_admin_add(''invitee@example.test'')') = '', 'inviter adds U3');
select pg_temp.ok((select role = 'admin' and not can_invite and added_by = :U2 from public.bb_scout_admins where user_id = :U3), 'the invitee is a plain admin (permission not transferable)');
select pg_temp.ok(pg_temp.as_err(:U2, 'select public.bb_scout_admin_set(''33333333-3333-3333-3333-333333333333'', true, null)') like '%not_owner%', 'inviter cannot grant can_invite');
select pg_temp.ok(pg_temp.as_err(:U2, 'select public.bb_scout_admin_set(''22222222-2222-2222-2222-222222222222'', null, true)') like '%not_owner%', 'inviter cannot make himself owner');
select pg_temp.ok(pg_temp.as_err(:U2, 'select public.bb_scout_admin_remove(''44444444-4444-4444-4444-444444444444'')') like '%not_allowed_remove%', 'inviter cannot remove an admin someone else added');
select pg_temp.ok(pg_temp.as_err(:U2, 'select public.bb_scout_admin_remove(''11111111-1111-1111-1111-111111111111'')') like '%not_allowed_remove%', 'inviter cannot remove the owner');
select pg_temp.ok(pg_temp.as_err(:U2, 'select public.bb_scout_admin_add(''plain@example.test'')') = '' and (select added_by from public.bb_scout_admins where user_id = :U4) = :U1, 'inviter re-adding an existing admin changes nothing (not "his" now)');

\echo == plain admin: list read-only, no add/remove/set
select pg_temp.ok(pg_temp.as_err(:U4, 'select count(*) from public.bb_scout_admins_list()') = '', 'plain admin can read the list');
select pg_temp.ok(pg_temp.as_err(:U4, 'select public.bb_scout_admin_add(''nobody@example.test'')') like '%not_allowed%', 'plain admin cannot add');
select pg_temp.ok(pg_temp.as_err(:U4, 'select public.bb_scout_admin_remove(''33333333-3333-3333-3333-333333333333'')') like '%not_allowed%', 'plain admin cannot remove');
select pg_temp.ok(pg_temp.as_err(:U4, 'select public.bb_scout_admin_set(''44444444-4444-4444-4444-444444444444'', true, null)') like '%not_owner%', 'plain admin cannot give himself can_invite');
select pg_temp.ok(pg_temp.as_err(:U3, 'select public.bb_scout_admin_add(''nobody@example.test'')') like '%not_allowed%', 'the invitee (plain) cannot add');
select pg_temp.ok(pg_temp.as_err(:U5, 'select public.bb_scout_admin_set(''55555555-5555-5555-5555-555555555555'', true, true)') like '%not_admin%', 'a non-admin cannot use set');

\echo == the list: role, can_invite, added_by email; RLS shows only my own row directly
begin;
  select set_config('request.jwt.claim.sub', :U4, true); set local role authenticated;
  select pg_temp.ok((select count(*) from public.bb_scout_admins_list()) = 4, 'list: 4 admins');
  select pg_temp.ok((select role from public.bb_scout_admins_list() limit 1) = 'owner', 'list: owner first');
  select pg_temp.ok((select added_by_email from public.bb_scout_admins_list() where user_id = '33333333-3333-3333-3333-333333333333') = 'Inviter@Example.test', 'list: added_by email');
  select pg_temp.ok((select can_invite from public.bb_scout_admins_list() where user_id = '22222222-2222-2222-2222-222222222222'), 'list: can_invite');
  select pg_temp.ok((select count(*) from public.bb_scout_admins) = 1, 'RLS: a direct select shows only my own row');
rollback;

\echo == inviter removes his own invitee; owner revokes can_invite; owners
select pg_temp.ok(pg_temp.as_err(:U2, 'select public.bb_scout_admin_remove(''33333333-3333-3333-3333-333333333333'')') = '', 'inviter removes his own invitee');
select pg_temp.ok(not exists (select 1 from public.bb_scout_admins where user_id = :U3), 'U3 gone');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_set(''22222222-2222-2222-2222-222222222222'', false, null)') = '', 'owner revokes can_invite');
select pg_temp.ok(pg_temp.as_err(:U2, 'select public.bb_scout_admin_add(''invitee@example.test'')') like '%not_allowed%', 'after revoking: cannot add');
select pg_temp.ok(pg_temp.as_err(:U1, 'select public.bb_scout_admin_set(''44444444-4444-4444-4444-444444444444'', null, true)') = '', 'owner makes U4 an owner');
select pg_temp.ok((select role = 'owner' and can_invite from public.bb_scout_admins where user_id = :U4), 'U4: owner (can_invite = true)');
select pg_temp.ok(pg_temp.as_err(:U4, 'select public.bb_scout_admin_set(''11111111-1111-1111-1111-111111111111'', null, false)') = '', 'two owners: one can demote the other');
select pg_temp.ok((select role = 'admin' and not can_invite from public.bb_scout_admins where user_id = :U1), 'U1: demoted to admin, without can_invite');
select pg_temp.ok(pg_temp.as_err(:U4, 'select public.bb_scout_admin_remove(''44444444-4444-4444-4444-444444444444'')') like '%last_owner%', 'the last owner cannot remove himself');
select pg_temp.ok(pg_temp.as_err(:U4, 'select public.bb_scout_admin_remove(''55555555-5555-5555-5555-555555555555'')') = '', 'removing a non-admin: no error (nothing to do)');
select pg_temp.ok(pg_temp.as_err(:U4, 'select public.bb_scout_admin_remove(''11111111-1111-1111-1111-111111111111'')') = '', 'owner removes any admin');

\echo == account deleted -> the admin row goes too (cascade); added_by -> null
insert into public.bb_scout_admins (user_id, role, added_by) values (:U3, 'admin', :U2);
delete from auth.users where id = :U2;
select pg_temp.ok(not exists (select 1 from public.bb_scout_admins where user_id = :U2), 'deleting the account deletes the admin row');
select pg_temp.ok((select added_by from public.bb_scout_admins where user_id = :U3) is null, 'added_by of a deleted account -> null');
\echo == all v78 probes passed
