-- בדיקה חיה של supabase/v81_admin.sql על Postgres אמיתי (עם supabase_stub.sql). כל שורת פלט מתחילה ב-ok או ב-FAIL.
\set QUIET 1
\pset format unaligned
\pset tuples_only on
begin;
create schema t81;
create or replace function t81.t(c boolean, m text) returns text language sql as $$ select case when c then 'ok   ' else 'FAIL ' end || m $$;
-- שגיאה צפויה: מריצים פקודה בתור משתמש, ומחזירים את הודעת השגיאה (או '' אם הצליחה)
create or replace function t81.err(p_uid uuid, p_role text, p_sql text) returns text language plpgsql as $$
declare m text := '';
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute format('set local role %I', p_role);
  begin execute p_sql; exception when others then m := sqlerrm; end;
  reset role;
  return m;
end $$;
create or replace function t81.val(p_uid uuid, p_role text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute format('set local role %I', p_role);
  execute p_sql into v;
  reset role;
  return v;
end $$;
create function t81.bmax() returns bigint language sql security definer as 'select max(id) from public.bb_bugs';
create function t81.bmin() returns bigint language sql security definer as 'select min(id) from public.bb_bugs';
grant usage on schema t81 to anon, authenticated;

insert into auth.users (id, email, created_at, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner at test', now() - interval '40 days', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'admin at test', now() - interval '20 days', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000a3', 'user3 at test', now() - interval '3 days', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000a4', 'user4 at test', now() - interval '100 days', now() - interval '90 days');
insert into public.bb_scout_admins (user_id, role, can_invite) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner', true), ('00000000-0000-0000-0000-0000000000a2', 'admin', false);
insert into public.bb_profiles (owner, id, name) values ('00000000-0000-0000-0000-0000000000a3', 'p1', 'נהג'), ('00000000-0000-0000-0000-0000000000a4', 'p1', 'נהג');
insert into public.bb_matches (owner, profile_id, at, data) values
  ('00000000-0000-0000-0000-0000000000a3', 'p1', 1, '{"my":50}'), ('00000000-0000-0000-0000-0000000000a3', 'p1', 2, '{"my":60}'),
  ('00000000-0000-0000-0000-0000000000a4', 'p1', 1, '{"my":10}');
insert into public.bb_teams (id, code, name, num, owner) values ('00000000-0000-0000-0000-0000000000f1', 'ABCDEFGH', 'קבוצת בדיקה', '90001', '00000000-0000-0000-0000-0000000000a4');
insert into public.bb_team_members (team_id, uid) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a4'), ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3');
\set OWN '''00000000-0000-0000-0000-0000000000a1'''
\set ADM '''00000000-0000-0000-0000-0000000000a2'''
\set U3 '''00000000-0000-0000-0000-0000000000a3'''
\set U4 '''00000000-0000-0000-0000-0000000000a4'''

-- דיווחים: אנונימי ומחובר, ומי ששולח לא קובע ״טופל״
select t81.t(t81.err(null, 'anon', $q$insert into public.bb_bugs (what, done, note) values ('באג אנונימי', true, 'שתלתי')$q$) = '', 'אנונימי שולח דיווח');
select t81.t(t81.err(:U3, 'authenticated', $q$insert into public.bb_bugs (what, shot, errors) values ('באג של משתמש 3', 'data:image/jpeg;base64,AAAA', '["e1","e2"]')$q$) = '', 'מחובר שולח דיווח');
select t81.t((select count(*) from public.bb_bugs where done or note is not null) = 0, 'מי ששולח דיווח לא קובע בעצמו ״טופל״ או הערה');
select t81.t(t81.err(:U3, 'authenticated', 'select * from public.bb_bugs') like '%permission denied%', 'bb_bugs נשארת סגורה לקריאה ישירה');
select t81.t(t81.err(:OWN, 'authenticated', 'select * from public.bb_blocked') like '%permission denied%'
  and t81.err(:OWN, 'authenticated', 'select * from public.bb_notices') like '%permission denied%'
  and t81.err(:OWN, 'authenticated', 'select * from public.bb_admin_log') like '%permission denied%', 'הטבלאות החדשות סגורות לגישה ישירה, גם לבעלים');
select t81.t((select bool_and(c.relrowsecurity) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'), 'row level security על כל הטבלאות ב-public');

-- מי אני
select t81.t(t81.val(:OWN, 'authenticated', 'select public.bb_admin_me()::text') like '%"owner" : true%', 'bb_admin_me: בעלים');
select t81.t(t81.val(:ADM, 'authenticated', 'select public.bb_admin_me()::text') like '%"owner" : false%', 'bb_admin_me: מנהל רגיל');
select t81.t(t81.val(:U3, 'authenticated', 'select public.bb_admin_me()::text') is null, 'bb_admin_me: משתמש רגיל — null');
select t81.t(t81.err(null, 'anon', 'select public.bb_admin_me()') like '%permission denied%', 'אנונימי לא מריץ פונקציות מנהל');

-- באגים
select t81.t(t81.err(:U3, 'authenticated', $q$select * from public.bb_admin_bugs('all', null, 50)$q$) = 'not_admin', 'משתמש רגיל לא רואה דיווחים (not_admin)');
select t81.t(t81.val(:ADM, 'authenticated', $q$select count(*)::text || '/' || count(email)::text || '/' || bool_or(has_shot)::text || '/' || max(n_errors)::text from public.bb_admin_bugs('all', null, 50)$q$) = '2/0/true/2', 'מנהל רואה שני דיווחים, בלי מיילים, עם סימון צילום ומספר שגיאות');
select t81.t(t81.val(:OWN, 'authenticated', $q$select string_agg(coalesce(email, '-'), ',' order by id) from public.bb_admin_bugs('all', null, 50)$q$) = '-,user3 at test', 'בעלים רואה את המייל של המדווח המחובר');
select t81.t(t81.val(:ADM, 'authenticated', $q$select (public.bb_admin_bug(t81.bmax()))->>'shot'$q$) like 'data:image%', 'דיווח מלא כולל צילום המסך');
select t81.t(t81.err(:ADM, 'authenticated', $q$select public.bb_admin_bug_set(t81.bmax(), true, 'תוקן ב-1.21')$q$) = '', 'מנהל מסמן ״טופל״ עם הערה');
select t81.t(t81.val(:ADM, 'authenticated', $q$select count(*)::text from public.bb_admin_bugs('open', null, 50)$q$) = '1'
  and t81.val(:ADM, 'authenticated', $q$select max(note) from public.bb_admin_bugs('done', null, 50)$q$) = 'תוקן ב-1.21', 'סינון פתוחים / טופלו');
select t81.t(t81.err(:ADM, 'authenticated', $q$select public.bb_admin_bug_set(t81.bmax(), null, 'הערה אחרת')$q$) = '', 'מנהל משנה הערה');
select t81.t((select done and note = 'הערה אחרת' from public.bb_bugs order by id desc limit 1), 'שינוי הערה בלי לגעת ב״טופל״');
select t81.t(t81.err(:ADM, 'authenticated', $q$select public.bb_admin_bug_set(999999, true, null)$q$) = 'not_found', 'דיווח שלא קיים — not_found');
select t81.t(t81.err(:ADM, 'authenticated', $q$select public.bb_admin_bug_delete(t81.bmin())$q$) = 'not_owner', 'מנהל רגיל לא מוחק דיווח');
select t81.t(t81.err(:U3, 'authenticated', $q$select public.bb_admin_bug_set(1, true, null)$q$) = 'not_admin', 'משתמש רגיל לא מסמן');

-- חשבונות
select t81.t(t81.err(:ADM, 'authenticated', $q$select * from public.bb_admin_users('', 50, 0)$q$) = 'not_owner', 'מנהל רגיל לא רואה את רשימת החשבונות');
select t81.t(t81.val(:OWN, 'authenticated', $q$select count(*)::text || '/' || max(total)::text from public.bb_admin_users('', 50, 0)$q$) = '4/4', 'בעלים רואה את כל ארבעת החשבונות');
select t81.t(t81.val(:OWN, 'authenticated', $q$select n_matches::text || '/' || n_profiles::text || '/' || n_bugs::text || '/' || team_num from public.bb_admin_users('user3', 50, 0)$q$) = '2/1/1/90001', 'חיפוש לפי מייל, עם משחקים, נהגים, דיווחים וקבוצה');
select t81.t(t81.val(:OWN, 'authenticated', $q$select count(*)::text from public.bb_admin_users('90001', 50, 0)$q$) = '2', 'חיפוש לפי מספר קבוצה');
select t81.t(t81.val(:OWN, 'authenticated', $q$select count(*)::text || '/' || max(total)::text from public.bb_admin_users('', 2, 2)$q$) = '2/4', 'דפדוף');

-- חסימה
select t81.t(t81.err(:ADM, 'authenticated', format('select public.bb_admin_block(%L, true, %L)', :U3, 'x')) = 'not_owner', 'מנהל רגיל לא חוסם');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_block(%L, true, %L)', :OWN, 'x')) = 'self', 'אי אפשר לחסום את עצמך');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_block(%L, true, %L)', :ADM, 'x')) = 'is_admin', 'אי אפשר לחסום מנהל');
select t81.t(t81.val(:U3, 'authenticated', 'select count(*)::text from public.bb_matches') = '2' and t81.val(:U3, 'authenticated', 'select public.bb_my_block()::text') is null, 'לפני חסימה: המשתמש רואה את המשחקים שלו');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_block(%L, true, %L)', :U3, 'התנהגות לא הולמת')) = '', 'בעלים חוסם חשבון');
select t81.t(t81.val(:U3, 'authenticated', 'select count(*)::text from public.bb_matches') = '0' and t81.val(:U3, 'authenticated', 'select count(*)::text from public.bb_profiles') = '0', 'חשבון חסום לא קורא נהגים ומשחקים');
select t81.t(t81.err(:U3, 'authenticated', $q$insert into public.bb_matches (profile_id, at, data) values ('p1', 3, '{}')$q$) like '%row-level security%', 'חשבון חסום לא כותב משחקים');
select t81.t(t81.val(:U3, 'authenticated', $q$select public.bb_my_block()->>'reason'$q$) = 'התנהגות לא הולמת', 'החשבון החסום רואה שהוא חסום ולמה');
select t81.t((select banned_until = 'infinity' from auth.users where id = :U3), 'גם הכניסה נחסמת (banned_until)');
select t81.t(t81.val(:U4, 'authenticated', 'select count(*)::text from public.bb_matches') = '1', 'חשבון אחר לא מושפע');
select t81.t(t81.val(:OWN, 'authenticated', $q$select blocked::text || '/' || block_reason from public.bb_admin_users('user3', 50, 0)$q$) = 'true/התנהגות לא הולמת', 'הרשימה מסמנת את החסום');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_block(%L, false, null)', :U3)) = '', 'בעלים משחרר חסימה');
select t81.t(t81.val(:U3, 'authenticated', 'select count(*)::text from public.bb_matches') = '2' and (select banned_until is null from auth.users where id = :U3), 'שחרור חסימה מחזיר הכול');

-- מחיקת חשבון
select t81.t(t81.err(:ADM, 'authenticated', format('select public.bb_admin_delete_user(%L)', :U4)) = 'not_owner', 'מנהל רגיל לא מוחק חשבון');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_delete_user(%L)', :OWN)) = 'self', 'אי אפשר למחוק את עצמך מכאן');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_delete_user(%L)', :ADM)) = 'is_admin', 'אי אפשר למחוק מנהל');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_delete_user(%L)', :U4)) = '', 'בעלים מוחק חשבון');
select t81.t((select count(*) from auth.users where id = :U4) = 0 and (select count(*) from public.bb_matches where owner = :U4) = 0 and (select count(*) from public.bb_profiles where owner = :U4) = 0, 'החשבון, הנהגים והמשחקים נמחקו');
select t81.t((select owner = :U3 from public.bb_teams where id = '00000000-0000-0000-0000-0000000000f1'), 'הקבוצה שלו עברה לחבר הוותיק ביותר');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_delete_user(%L)', :U4)) = 'not_found', 'מחיקה שנייה — not_found');

-- הודעות
select t81.t(t81.err(:ADM, 'authenticated', $q$select public.bb_admin_notice_add('שלום', 'Hello', 7)$q$) = 'not_owner', 'מנהל רגיל לא שולח הודעה לכולם');
select t81.t(t81.err(:OWN, 'authenticated', $q$select public.bb_admin_notice_add(' ', '', 7)$q$) = 'bad_text', 'הודעה ריקה נדחית');
select t81.t(t81.err(:OWN, 'authenticated', $q$select public.bb_admin_notice_add('גרסה חדשה יצאה', 'A new version is out', 7)$q$) = '', 'בעלים שולח הודעה');
select t81.t(t81.val(null, 'anon', 'select text_en from public.bb_notices_active()') = 'A new version is out', 'גם מי שבלי חשבון רואה את ההודעה');
select t81.t(t81.val(:U3, 'authenticated', 'select count(*)::text from public.bb_notices_active()') = '1', 'מחובר רואה את ההודעה');
select t81.t(t81.err(:OWN, 'authenticated', 'select public.bb_admin_notice_off((select max(id) from public.bb_admin_notices()))') = ''
  and t81.val(null, 'anon', 'select count(*)::text from public.bb_notices_active()') = '0'
  and t81.val(:OWN, 'authenticated', 'select count(*)::text || live::text from public.bb_admin_notices() group by live') = '1false', 'כיבוי הודעה');
update public.bb_notices set active = true, until = now() - interval '1 minute';
select t81.t(t81.val(null, 'anon', 'select count(*)::text from public.bb_notices_active()') = '0', 'הודעה שפג תוקפה לא מוצגת');

-- סטטיסטיקה ויומן
select t81.t(t81.err(:U3, 'authenticated', 'select public.bb_admin_stats()') = 'not_admin', 'משתמש רגיל לא רואה סטטיסטיקה');
select t81.t(t81.val(:ADM, 'authenticated', $q$select (s->>'users') || '/' || (s->>'users_7d') || '/' || (s->>'matches') || '/' || (s->>'bugs') || '/' || (s->>'bugs_open') || '/' || json_array_length(s->'days')::text || '/' || (s->'days'->29->>'matches') from public.bb_admin_stats() s$q$) = '3/1/2/2/1/30/2', 'סטטיסטיקה: חשבונות, חדשים, משחקים, דיווחים, 30 ימים');
select t81.t(t81.val(:ADM, 'authenticated', 'select public.bb_admin_stats()::text') not like '%at test%', 'אין מיילים בסטטיסטיקה');
select t81.t(t81.err(:ADM, 'authenticated', 'select * from public.bb_admin_log_list(50)') = 'not_owner', 'מנהל רגיל לא רואה את היומן');
select t81.t(t81.val(:OWN, 'authenticated', $q$select string_agg(action, ',' order by id) from public.bb_admin_log_list(50)$q$) = 'block,unblock,delete_user,notice_add,notice_off', 'היומן רושם כל פעולה לפי הסדר');
select t81.t(t81.err(:OWN, 'authenticated', $q$select public.bb_admin_bug_delete(t81.bmin())$q$) = '', 'בעלים מוחק דיווח');
select t81.t((select count(*) from public.bb_bugs) = 1, 'הדיווח נמחק');
-- העוזרים הפנימיים לא נקראים מבחוץ
select t81.t(t81.err(:OWN, 'authenticated', $q$select public.bb_admin_note('x', 'y', 'z')$q$) like '%permission denied%' and t81.err(:OWN, 'authenticated', 'select public.bb_admin_need(true)') like '%permission denied%', 'העוזרים הפנימיים סגורים');
-- סעיף 7: שלושת התיקונים לרשימת המנהלים
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'inviter at test'), ('00000000-0000-0000-0000-0000000000b2', 'invited at test');
\set INV '''00000000-0000-0000-0000-0000000000b1'''
\set NEW '''00000000-0000-0000-0000-0000000000b2'''
select t81.t(t81.err(:OWN, 'authenticated', $q$select public.bb_scout_admin_add('admin at test')$q$) = 'already_admin', 'הוספה של מי שכבר מנהל — already_admin');
select t81.t(t81.err(:OWN, 'authenticated', $q$select public.bb_scout_admin_add('inviter at test')$q$) = '', 'בעלים מוסיף מנהל');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_scout_admin_set(%L, true, null)', :INV)) = '', 'בעלים נותן הרשאת הוספה');
select t81.t(t81.err(:INV, 'authenticated', $q$select public.bb_scout_admin_add('invited at test')$q$) = '', 'מנהל עם הרשאה מוסיף מנהל');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_scout_admin_set(%L, true, null)', :NEW)) = '', 'בעלים נותן הרשאת הוספה גם לחדש');
select t81.t(t81.err(:INV, 'authenticated', format('select public.bb_scout_admin_remove(%L)', :NEW)) = 'not_allowed_remove', 'מי שהוסיף כבר לא מסיר אותו אחרי שהבעלים נתן לו הרשאה');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_scout_admin_set(%L, false, null)', :NEW)) = '', 'בעלים לוקח את ההרשאה');
select t81.t(t81.err(:INV, 'authenticated', format('select public.bb_scout_admin_remove(%L)', :NEW)) = '', 'בלי ההרשאה — מי שהוסיף שוב יכול להסיר');
select t81.t(t81.err(:ADM, 'authenticated', format('select public.bb_scout_admin_remove(%L)', :INV)) = 'not_allowed', 'מנהל רגיל לא מסיר מנהל אחר');
select t81.t(t81.err(:ADM, 'authenticated', format('select public.bb_scout_admin_remove(%L)', :ADM)) = '', 'מנהל רגיל מסיר את עצמו');
select t81.t((select count(*) from public.bb_scout_admins where user_id = :ADM) = 0, 'הוא ירד מהרשימה');
select t81.t(t81.val(:ADM, 'authenticated', 'select public.bb_admin_me()::text') is null, 'ואין לו יותר לוח מנהל');
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_scout_admin_remove(%L)', :OWN)) = 'last_owner', 'הבעלים האחרון לא מסיר את עצמו');
-- מחיקת החשבון שלי עדיין עובדת, ומנקה גם חסימה
select t81.t(t81.err(:OWN, 'authenticated', format('select public.bb_admin_block(%L, true, %L)', :U3, 'x')) = '', 'חסימה שנייה');
select t81.t(t81.err(:U3, 'authenticated', 'select public.bb_delete_me()') = '', 'חשבון חסום מוחק את עצמו');
select t81.t((select count(*) from public.bb_blocked) = 0 and (select count(*) from auth.users) = 4, 'bb_delete_me של חשבון חסום עובד ומנקה את החסימה');
rollback;
