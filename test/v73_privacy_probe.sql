-- v73 privacy — בדיקה על Postgres מקומי עם ה-shim של Supabase (לא על השרת האמיתי).
-- psql -v ON_ERROR_STOP=1 -f shim.sql -f supabase/schema.sql -f supabase/v63_security.sql -f supabase/v72_security.sql -f supabase/v73_privacy.sql -f supabase/v73_privacy.sql -f test/v73_privacy_probe.sql
\set U1 '11111111-1111-1111-1111-111111111111'
\set U2 '22222222-2222-2222-2222-222222222222'
\set U3 '33333333-3333-3333-3333-333333333333'
\echo == setup: U1 owns a team, U2 and U3 join; everyone has drivers, matches, bug reports
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true);
  select code as c1 from bb_team_create('Apollo','9662','u1') \gset
  insert into bb_profiles (id, name) values ('d1','Maya'); insert into bb_matches (profile_id, at, data) values ('d1', 1, '{"my":1}'), ('d1', 2, '{"my":2}');
  insert into bb_bugs (what) values ('u1 bug report');
commit;
select pg_sleep(1.1);
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true); select (bb_team_join(:'c1','u2')).name;
  insert into bb_profiles (id, name) values ('d2','Noa'); insert into bb_matches (profile_id, at, data) values ('d2', 1, '{"my":3}');
  insert into bb_bugs (what) values ('u2 bug report'); commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true); select (bb_team_join(:'c1','u3')).name; commit;
\echo == anon cannot call bb_delete_me
\set ON_ERROR_STOP 0
begin; set local role anon; select bb_delete_me(); rollback;
\set ON_ERROR_STOP 1
select has_function_privilege('anon','public.bb_delete_me()','execute') as anon_can, has_function_privilege('authenticated','public.bb_delete_me()','execute') as auth_can;
\echo == U1 deletes the account
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true); select bb_delete_me(); commit;
select (select count(*) from auth.users where id = :'U1') as u1_user,
       (select count(*) from bb_profiles where owner = :'U1') as u1_profiles,
       (select count(*) from bb_matches where owner = :'U1') as u1_matches,
       (select count(*) from bb_team_members where uid = :'U1') as u1_member,
       (select count(*) from bb_bugs where uid = :'U1') as u1_bugs,
       (select count(*) from bb_usage where owner = :'U1') as u1_usage;
select name, owner = :'U2' as owner_is_u2_oldest, (select count(*) from bb_team_members m where m.team_id = t.id) as members from bb_teams t;
select (select count(*) from bb_profiles where owner = :'U2') as u2_profiles, (select count(*) from bb_matches where owner = :'U2') as u2_matches,
       (select count(*) from bb_bugs where uid = :'U2') as u2_bugs;
\echo == U3 leaves, makes a team alone, deletes the account -> the empty team is deleted
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true); select (bb_team_create('Solo','1','u3')).name; select bb_delete_me(); commit;
select count(*) as solo_teams from bb_teams where name = 'Solo';
select count(*) as users_left from auth.users;
\echo == not signed in -> error
\set ON_ERROR_STOP 0
begin; set local role authenticated; select set_config('request.jwt.claim.sub','',true); select bb_delete_me(); rollback;
\set ON_ERROR_STOP 1
\echo == bug retention: older than 12 months is purged on the next insert
update bb_bugs set created_at = now() - interval '13 months' where what = 'u2 bug report';
insert into bb_bugs (what) values ('another, keeps the recent ones');
select what from bb_bugs order by id;
