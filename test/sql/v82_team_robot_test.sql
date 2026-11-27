-- בדיקה חיה של supabase/v82_team_robot.sql על Postgres אמיתי (עם supabase_stub.sql). כל שורת פלט מתחילה ב-ok או ב-FAIL.
-- בלי נתוני רובוט אמיתיים: ג׳ייסון מינימלי ומזהים דמיוניים בלבד.
\set QUIET 1
\pset format unaligned
\pset tuples_only on
begin;
create schema t82;
create or replace function t82.t(c boolean, m text) returns text language sql as $$ select case when coalesce(c, false) then 'ok   ' else 'FAIL ' end || m $$;
create or replace function t82.err(p_uid uuid, p_role text, p_sql text) returns text language plpgsql as $$
declare m text := '';
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute format('set local role %I', p_role);
  begin execute p_sql; exception when others then m := sqlerrm; end;
  reset role;
  return m;
end $$;
create or replace function t82.val(p_uid uuid, p_role text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute format('set local role %I', p_role);
  execute p_sql into v;
  reset role;
  return v;
end $$;
grant usage on schema t82 to anon, authenticated;

-- o1 בעל קבוצה א, m1 ו-b1 חברים בה (b1 חסום), x1 בעל קבוצה ב, n1 בלי קבוצה
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'o1 at test'), ('00000000-0000-0000-0000-0000000000c2', 'm1 at test'),
  ('00000000-0000-0000-0000-0000000000c3', 'x1 at test'), ('00000000-0000-0000-0000-0000000000c4', 'n1 at test'),
  ('00000000-0000-0000-0000-0000000000c5', 'b1 at test');
insert into public.bb_teams (id, code, name, num, owner) values
  ('00000000-0000-0000-0000-00000000aa01', 'TSTA01', 'א', '90001', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-00000000aa02', 'TSTB02', 'ב', '90002', '00000000-0000-0000-0000-0000000000c3');
insert into public.bb_team_members (team_id, uid, label) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c1', 'o'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c2', 'm'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c5', 'b'),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000c3', 'x');
insert into public.bb_blocked (user_id, reason) values ('00000000-0000-0000-0000-0000000000c5', 'test');

\set O '\'00000000-0000-0000-0000-0000000000c1\''
\set M '\'00000000-0000-0000-0000-0000000000c2\''
\set X '\'00000000-0000-0000-0000-0000000000c3\''
\set N '\'00000000-0000-0000-0000-0000000000c4\''
\set B '\'00000000-0000-0000-0000-0000000000c5\''
\set GOOD '\'select public.bb_team_robot_set(1, \'\'{"format":"apollo9662-robot/1","version":1}\'\'::jsonb, \'\'00000000-0000-0000-0000-00000000aa01/robot-v1.glb\'\', 4096)\''

-- הדלי
select t82.t((select not public from storage.buckets where id = 'team-robots'), 'הדלי team-robots פרטי');
select t82.t((select file_size_limit = 12582912 from storage.buckets where id = 'team-robots'), 'מגבלת גודל 12 מ״ב');
select t82.t((select relrowsecurity from pg_class where oid = 'public.bb_team_robot'::regclass), 'bb_team_robot עם הרשאות ברמת השורה');

-- מי שלא מחובר, או בלי קבוצה
select t82.t(t82.err(null, 'anon', 'select public.bb_team_robot_get()') ~ 'permission denied', 'בלי חשבון: אין גישה לפונקציה');
select t82.t(t82.err(null, 'anon', 'select * from public.bb_team_robot') ~ 'permission denied', 'בלי חשבון: אין גישה לטבלה');
select t82.t(t82.val(:N::uuid, 'authenticated', 'select public.bb_team_robot_get()::text') is null, 'בלי קבוצה: אין רובוט');
select t82.t(t82.err(:N::uuid, 'authenticated', :GOOD) ~ 'no_team', 'בלי קבוצה: אי אפשר להעלות');

-- העלאה: רק הבעלים, ורק במבנה הנכון
select t82.t(t82.err(:M::uuid, 'authenticated', :GOOD) ~ 'not_owner', 'חבר רגיל לא מעלה');
select t82.t(t82.err(:O::uuid, 'authenticated', 'select public.bb_team_robot_set(1, ''{"format":"other"}''::jsonb, ''00000000-0000-0000-0000-00000000aa01/robot-v1.glb'', 10)') ~ 'bad_robot', 'פורמט אחר נדחה');
select t82.t(t82.err(:O::uuid, 'authenticated', 'select public.bb_team_robot_set(1, ''{"format":"apollo9662-robot/1"}''::jsonb, ''00000000-0000-0000-0000-00000000aa02/robot-v1.glb'', 10)') ~ 'bad_robot', 'נתיב של קבוצה אחרת נדחה');
select t82.t(t82.err(:O::uuid, 'authenticated', 'select public.bb_team_robot_set(2, ''{"format":"apollo9662-robot/1"}''::jsonb, ''00000000-0000-0000-0000-00000000aa01/robot-v1.glb'', 10)') ~ 'bad_robot', 'נתיב שלא מתאים לגרסה נדחה');
select t82.t(t82.err(:O::uuid, 'authenticated', 'select public.bb_team_robot_set(1, ''{"format":"apollo9662-robot/1"}''::jsonb, ''00000000-0000-0000-0000-00000000aa01/robot-v1.glb'', 99999999)') ~ 'bad_robot', 'קובץ גדול מדי נדחה');
select t82.t(t82.err(:O::uuid, 'authenticated', :GOOD) = '', 'הבעלים מעלה');
select t82.t(t82.err(:O::uuid, 'authenticated', 'insert into public.bb_team_robot (team_id, ver, data, path, size) values (''00000000-0000-0000-0000-00000000aa01'', 9, ''{}'', ''x'', 1)') ~ 'permission denied', 'גם הבעלים לא כותב ישירות לטבלה');

-- קריאה
select t82.t(t82.val(:M::uuid, 'authenticated', 'select (public.bb_team_robot_get()->>''ver'')') = '1', 'חבר בקבוצה רואה את גרסה 1');
select t82.t(t82.val(:M::uuid, 'authenticated', 'select (public.bb_team_robot_get()->>''mine'')') = 'false', 'חבר רגיל: לא שלו');
select t82.t(t82.val(:O::uuid, 'authenticated', 'select (public.bb_team_robot_get()->>''mine'')') = 'true', 'הבעלים: שלו');
select t82.t(t82.val(:X::uuid, 'authenticated', 'select (public.bb_team_robot_get()->>''ver'')') is null, 'קבוצה אחרת לא רואה את הרובוט');
select t82.t(t82.err(:B::uuid, 'authenticated', 'select public.bb_team_robot_get()') ~ 'blocked', 'חשבון חסום לא קורא');
select t82.t(t82.err(:M::uuid, 'authenticated', 'select * from public.bb_team_robot') ~ 'permission denied', 'חבר לא קורא ישירות מהטבלה');

-- האחסון
select t82.t(t82.err(:O::uuid, 'authenticated', 'insert into storage.objects (bucket_id, name) values (''team-robots'', ''00000000-0000-0000-0000-00000000aa01/robot-v1.glb'')') = '', 'הבעלים שומר את המודל');
select t82.t(t82.err(:M::uuid, 'authenticated', 'insert into storage.objects (bucket_id, name) values (''team-robots'', ''00000000-0000-0000-0000-00000000aa01/robot-v9.glb'')') ~ 'row-level security', 'חבר רגיל לא שומר מודל');
select t82.t(t82.err(:X::uuid, 'authenticated', 'insert into storage.objects (bucket_id, name) values (''team-robots'', ''00000000-0000-0000-0000-00000000aa01/robot-v9.glb'')') ~ 'row-level security', 'בעלים של קבוצה אחרת לא שומר אצלנו');
select t82.t(t82.err(:O::uuid, 'authenticated', 'insert into storage.objects (bucket_id, name) values (''team-robots'', ''robot.glb'')') ~ 'row-level security', 'נתיב בלי מזהה קבוצה נדחה');
select t82.t(t82.err(null, 'anon', 'insert into storage.objects (bucket_id, name) values (''team-robots'', ''00000000-0000-0000-0000-00000000aa01/robot-v9.glb'')') ~ 'row-level security', 'בלי חשבון לא שומר');
select t82.t(t82.val(:M::uuid, 'authenticated', 'select count(*) from storage.objects where bucket_id = ''team-robots''') = '1', 'חבר בקבוצה רואה את המודל');
select t82.t(t82.val(:X::uuid, 'authenticated', 'select count(*) from storage.objects where bucket_id = ''team-robots''') = '0', 'קבוצה אחרת לא רואה את המודל');
select t82.t(t82.val(:N::uuid, 'authenticated', 'select count(*) from storage.objects where bucket_id = ''team-robots''') = '0', 'בלי קבוצה לא רואה את המודל');
select t82.t(t82.val(null, 'anon', 'select count(*) from storage.objects where bucket_id = ''team-robots''') = '0', 'בלי חשבון לא רואה את המודל');
select t82.t(t82.val(:B::uuid, 'authenticated', 'select count(*) from storage.objects where bucket_id = ''team-robots''') = '0', 'חשבון חסום לא רואה את המודל');
select t82.t(t82.val(:M::uuid, 'authenticated', 'with d as (delete from storage.objects where bucket_id = ''team-robots'' returning 1) select count(*) from d') = '0', 'חבר רגיל לא מוחק את המודל');
select t82.t(t82.val(:M::uuid, 'authenticated', 'with d as (update storage.objects set name = name where bucket_id = ''team-robots'' returning 1) select count(*) from d') = '0', 'חבר רגיל לא מחליף את המודל');

-- מי שיצא מהקבוצה כבר לא רואה
delete from public.bb_team_members where uid = :M::uuid;
select t82.t(t82.val(:M::uuid, 'authenticated', 'select public.bb_team_robot_get()::text') is null, 'אחרי יציאה מהקבוצה: אין רובוט');
select t82.t(t82.val(:M::uuid, 'authenticated', 'select count(*) from storage.objects where bucket_id = ''team-robots''') = '0', 'אחרי יציאה מהקבוצה: אין מודל');
insert into public.bb_team_members (team_id, uid, label) values ('00000000-0000-0000-0000-00000000aa01', :M::uuid, 'm');

-- מחיקה
select t82.t(t82.err(:M::uuid, 'authenticated', 'select public.bb_team_robot_clear()') ~ 'not_owner', 'חבר רגיל לא מוחק את הרובוט');
select t82.t(t82.val(:O::uuid, 'authenticated', 'with d as (delete from storage.objects where bucket_id = ''team-robots'' returning 1) select count(*) from d') = '1', 'הבעלים מוחק את המודל');
select t82.t(t82.err(:O::uuid, 'authenticated', 'select public.bb_team_robot_clear()') = '', 'הבעלים מוחק את הרובוט');
select t82.t(t82.val(:M::uuid, 'authenticated', 'select (public.bb_team_robot_get()->>''ver'')') is null, 'אחרי מחיקה: אין גרסה');

-- כל הטבלאות ב-public עם הרשאות ברמת השורה (החלטה 03)
select t82.t((select bool_and(relrowsecurity) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'), 'כל הטבלאות ב-public עם הרשאות ברמת השורה');
rollback;
