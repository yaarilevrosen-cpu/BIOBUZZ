-- v72 netapp — בדיקה ידנית של supabase/v72_security.sql על Postgres מקומי (לא Supabase אמיתי).
-- הרצה (מסד ריק): psql -f <shim.sql של הסוקר> ; schema.sql ; v63_security.sql ; [נתונים ישנים] ; v72_security.sql ; הקובץ הזה
-- כל שורה ״ok_…״ צריכה להיות t.
\set U1 '11111111-1111-1111-1111-111111111111'
\set U2 '22222222-2222-2222-2222-222222222222'
\set U3 '33333333-3333-3333-3333-333333333333'
\set ON_ERROR_STOP 0
delete from bb_matches; delete from bb_profiles; delete from bb_team_members; delete from bb_teams; delete from bb_usage; delete from bb_join_fails;

\echo == P3 בעלים יוצא → הבעלות עוברת לחבר; בעלים לבד יוצא → הקבוצה נמחקת
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true) \g /dev/null
  select code as c1 from bb_team_create('Apollo','9662','owner') \gset
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  select (bb_team_join(:'c1','member')).name \g /dev/null
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true) \g /dev/null
  select bb_team_leave() \g /dev/null
commit;
select (select owner from bb_teams) = :'U2'::uuid as ok_owner_moved_to_member;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  select bb_team_leave() \g /dev/null
commit;
select (select count(*) from bb_teams) = 0 as ok_empty_team_deleted;

\echo == P3 בעלים פותח קבוצה חדשה / מצטרף לאחרת → הקבוצה הישנה לא יתומה
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true) \g /dev/null
  select code as c2 from bb_team_create('A','1','o') \gset
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  select (bb_team_join(:'c2','m')).name \g /dev/null
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true) \g /dev/null
  select (bb_team_create('B','2','o')).name \g /dev/null
commit;
select not exists (select 1 from bb_teams t where not exists (select 1 from bb_team_members m where m.team_id=t.id and m.uid=t.owner)) as ok_no_orphans;
select (select owner from bb_teams where name='A') = :'U2'::uuid as ok_A_owner_is_U2;
\echo == בעלים מצטרף שוב לקבוצה שלו עם הקוד — נשאר בעלים
select code as cb from bb_teams where name='B' \gset
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true) \g /dev/null
  select (bb_team_join(:'cb','o2')).name \g /dev/null
commit;
select (select owner from bb_teams where name='B') = :'U1'::uuid and (select count(*) from bb_team_members m join bb_teams t on t.id=m.team_id where t.name='B') = 1 as ok_rejoin_own_team;

\echo == P3 הוצאת חבר מחליפה קוד — מי שהוצא לא חוזר
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true) \g /dev/null
  select (bb_team_join(:'cb','x')).name \g /dev/null
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true) \g /dev/null
  select bb_team_kick(:'U3') \g /dev/null
commit;
select (select code from bb_teams where name='B') <> :'cb' as ok_code_rotated_on_kick;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true) \g /dev/null
  select (bb_team_join(:'cb','again')).id is null as ok_kicked_cannot_rejoin;
commit;

\echo == P6 300 נהגים חיים — מחיקות לא נספרות
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true) \g /dev/null
  insert into bb_profiles (id, deleted) select 'old'||g, true from generate_series(1,300) g;
  insert into bb_profiles (id) values ('brandnew');
  select count(*) = 1 as ok_new_driver_after_300_tombstones from bb_profiles where id='brandnew';
rollback;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true) \g /dev/null
  insert into bb_profiles (id) select 'live'||g from generate_series(1,300) g;
  savepoint a;
  insert into bb_profiles (id) values ('one-too-many');
rollback to a;
  select count(*) = 300 as ok_301st_live_driver_refused from bb_profiles where owner=:'U1';
rollback;

\echo == P11 created_at מהשרת
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true) \g /dev/null
  insert into bb_matches (profile_id, at, data, created_at) values ('p', 999999, '{}', '2099-01-01');
  update bb_matches set created_at = '2099-01-01' where at = 999999;
commit;
select created_at < '2090-01-01' as ok_created_at_server from bb_matches where at=999999;

\echo == P4 תקרה יומית (שורות) + upsert כפול לא נספר + מחיקה מורידה
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true) \g /dev/null
  insert into bb_matches (profile_id, at, data) select 'p', g, '{"my":1}' from generate_series(1,1499) g;
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true) \g /dev/null
  insert into bb_matches (profile_id, at, data) values ('p', 5, '{}') on conflict do nothing;
commit;
select d_rows = 1500 as ok_dup_not_counted from bb_usage where owner=:'U3';
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true) \g /dev/null
  insert into bb_matches (profile_id, at, data) values ('p', 2000000, '{}');
rollback;
select count(*) = 1500 as ok_daily_row_cap from bb_matches where owner=:'U3';
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true) \g /dev/null
  delete from bb_matches where at <= 10;
commit;
select m_rows = 1490 as ok_delete_decrements from bb_usage where owner=:'U3';

\echo == P4 תקרה יומית (נפח): 300 שורות של ~230 ק״ב
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  insert into bb_matches (profile_id, at, data) select 'p', g, jsonb_build_object('pad', (select string_agg(md5(random()::text||g||i), '') from generate_series(1,7000) i)) from generate_series(1,300) g;
rollback;
select coalesce((select m_bytes from bb_usage where owner=:'U2'), 0) = 0 as ok_bulk_refused_whole;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  insert into bb_matches (profile_id, at, data) select 'p', g, jsonb_build_object('pad', (select string_agg(md5(random()::text||g||i), '') from generate_series(1,7000) i)) from generate_series(1,30) g;
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  insert into bb_matches (profile_id, at, data) select 'p', 100+g, jsonb_build_object('pad', (select string_agg(md5(random()::text||g||i), '') from generate_series(1,7000) i)) from generate_series(1,30) g;
commit;
select (select count(*) from bb_matches where owner=:'U2') between 30 and 45 as ok_daily_bytes_cap, (select d_bytes from bb_usage where owner=:'U2') <= 10000000 as ok_usage_under_cap;

\echo == P4 הגדרות: עד 8 מ״ב לחשבון (כל נהג ~1.28 מ״ב)
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  insert into bb_profiles (id, kv) select 'k'||g, jsonb_build_object('bbX', (select string_agg(md5(random()::text||g||i), '') from generate_series(1,40000) i)) from generate_series(1,6) g;
commit;
select (select count(*) from bb_profiles where owner=:'U2') = 6 as ok_kv_total_cap_allows_6;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  insert into bb_profiles (id, kv) values ('k7', jsonb_build_object('bbX', (select string_agg(md5(random()::text||i), '') from generate_series(1,40000) i)));
commit;
select (select count(*) from bb_profiles where owner=:'U2') = 6 as ok_kv_total_cap_refuses_7th;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  update bb_profiles set name='renamed' where id='k1';
commit;
select (select name from bb_profiles where id='k1' and owner=:'U2') = 'renamed' as ok_meta_update_at_cap;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true) \g /dev/null
  update bb_profiles set kv = jsonb_build_object('bbX', (select string_agg(md5(random()::text||i), '') from generate_series(1,60000) i)) where id='k1';
commit;
select (select pg_column_size(kv) from bb_profiles where id='k1' and owner=:'U2') < 1500000 as ok_kv_row_cap;
