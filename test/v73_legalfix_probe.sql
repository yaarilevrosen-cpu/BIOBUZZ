-- v73 legalfix — בדיקה על Postgres מקומי עם ה-shim של Supabase (לא על השרת האמיתי). כל בדיקה שנכשלת זורקת שגיאה.
-- psql -v ON_ERROR_STOP=1 -f shim.sql -f supabase/schema.sql -f supabase/v63_security.sql -f supabase/v72_security.sql \
--      -f supabase/v73_privacy.sql -f supabase/v73_privacy.sql -f test/v73_legalfix_probe.sql
\set U1 '11111111-1111-1111-1111-111111111111'
\set U2 '22222222-2222-2222-2222-222222222222'
\set U3 '33333333-3333-3333-3333-333333333333'
create or replace function pg_temp.ok(c boolean, what text) returns void language plpgsql as $$
begin if c is not true then raise exception 'FAIL: %', what; end if; raise notice 'ok: %', what; end $$;

\echo == setup: U1 owns a team, U2 joins; U3 is outside
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true);
  select code as c1 from bb_team_create('Apollo','9662','u1') \gset
  insert into bb_profiles (id, name, emoji, color, kv) values ('d1','Maya','🚀','#ffb020','{"bbKeyBind1":"secret settings"}');
  insert into bb_matches (profile_id, at, data) values ('d1', 1, '{"my":1,"win":true,"kind":"full","sh":[[1,2,3]],"bl":[1]}'), ('d1', 2, '{"my":2,"avgCycle":7.5,"autoPts":12}');
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true); select (bb_team_join(:'c1','u2')).name;
  insert into bb_profiles (id, name) values ('d2','Noa'); insert into bb_matches (profile_id, at, data) values ('d2', 1, '{"my":3}'); commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true);
  insert into bb_profiles (id, name) values ('d3','Out'); insert into bb_matches (profile_id, at, data) values ('d3', 1, '{"my":9}'); commit;

\echo == req 9: teammates read only names and summary fields
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true);
  select pg_temp.ok((select count(*) from bb_profiles) = 1, 'U2 reads only its own bb_profiles rows (no team-read policy)');
  select pg_temp.ok((select count(*) from bb_matches) = 1, 'U2 reads only its own bb_matches rows');
  select pg_temp.ok((select count(*) from bb_team_profiles()) = 1 and (select name from bb_team_profiles()) = 'Maya'
    and (select emoji from bb_team_profiles()) = '🚀', 'bb_team_profiles(): teammate drivers with name/emoji/colour, not my own');
  select pg_temp.ok((select count(*) from bb_team_matches(:'U1', null, 500)) = 2, 'bb_team_matches(U1): both matches');
  select pg_temp.ok((select (my)::text from bb_team_matches(:'U1', null, 500) where at = 1) = '1'
    and (select (win)::text from bb_team_matches(:'U1', null, 500) where at = 1) = 'true'
    and (select (kind)::text from bb_team_matches(:'U1', null, 500) where at = 1) = '"full"'
    and (select ("avgCycle")::text from bb_team_matches(:'U1', null, 500) where at = 2) = '7.5', 'summary fields come back as jsonb values');
  select pg_temp.ok((select count(*) from bb_team_matches(:'U1', null, 1)) = 1, 'p_limit works');
  select pg_temp.ok((select count(*) from bb_team_matches(:'U1', now() + interval '1 day', 500)) = 0, 'p_since works');
  select pg_temp.ok((select count(*) from bb_team_matches(:'U3', null, 500)) = 0, 'not a teammate -> nothing');
  select pg_temp.ok((select count(*) from bb_team_matches(:'U2', null, 500)) = 0, 'my own matches are not returned by the team function');
rollback;
select pg_temp.ok(not has_function_privilege('anon', 'public.bb_team_profiles()', 'execute')
  and not has_function_privilege('anon', 'public.bb_team_matches(uuid,timestamptz,int)', 'execute')
  and has_function_privilege('authenticated', 'public.bb_team_matches(uuid,timestamptz,int)', 'execute'), 'team functions: authenticated only');
select pg_temp.ok((select count(*) from pg_policies where policyname in ('bb_profiles_team_read','bb_matches_team_read')) = 0, 'broad team-read policies are gone');

\echo == req 2: bb_my_bugs
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true);
  select set_config('request.headers','{"x-forwarded-for":"203.0.113.7, 10.0.0.1"}',true);
  insert into bb_bugs (what, contact) values ('u1 bug report', 'maya@example.com');
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U2',true); insert into bb_bugs (what) values ('u2 bug report'); commit;
begin; set local role anon; select set_config('request.jwt.claim.sub','',true); insert into bb_bugs (what) values ('anon bug report'); commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true);
  select pg_temp.ok((select count(*) from bb_my_bugs()) = 1 and (select what from bb_my_bugs()) = 'u1 bug report'
    and (select contact from bb_my_bugs()) = 'maya@example.com', 'bb_my_bugs(): only my report, with its fields');
rollback;
begin; set local role authenticated; select set_config('request.jwt.claim.sub','',true);
  select pg_temp.ok((select count(*) from bb_my_bugs()) = 0, 'not signed in -> no rows');
rollback;
select pg_temp.ok(not has_function_privilege('anon', 'public.bb_my_bugs()', 'execute'), 'anon cannot call bb_my_bugs');

\echo == req 7: HMAC with a server-side secret, ip hash erased after 24 h, retention
select pg_temp.ok((select length(v) from bb_secret where k = 'bug_ip') = 32, 'secret: 32 bytes, created once');
select pg_temp.ok(not has_table_privilege('anon', 'public.bb_secret', 'select') and not has_table_privilege('authenticated', 'public.bb_secret', 'select'), 'nobody public can read the secret');
select pg_temp.ok(not has_function_privilege('anon', 'public.bb_hmac(bytea,bytea)', 'execute') and not has_function_privilege('authenticated', 'public.bb_retention()', 'execute'), 'helpers are not callable from the API');
-- RFC 4231 test case 2: key "Jefe", data "what do ya want for nothing?"
select pg_temp.ok(bb_hmac(convert_to('Jefe','UTF8'), convert_to('what do ya want for nothing?','UTF8')) = '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843', 'bb_hmac matches RFC 4231 test vector');
select pg_temp.ok((select ip_hash from bb_bugs where what = 'u1 bug report') = bb_hmac((select v from bb_secret where k = 'bug_ip'), convert_to('203.0.113.7','UTF8'))
  and (select ip_hash from bb_bugs where what = 'u1 bug report') <> md5('biobuzz-bug:203.0.113.7'), 'ip hash = HMAC(secret, first forwarded ip), not the old md5');
select pg_temp.ok((select ip_hash from bb_bugs where what = 'u2 bug report') is null, 'no forwarded ip -> no hash');
update bb_bugs set created_at = now() - interval '25 hours' where what = 'u1 bug report';
update bb_bugs set created_at = now() - interval '13 months' where what = 'u2 bug report';
insert into bb_join_fails (uid, n, since) values (:'U3', 4, now() - interval '2 days');
begin; set local role anon; insert into bb_bugs (what) values ('next report triggers the purge'); commit;
select pg_temp.ok((select ip_hash from bb_bugs where what = 'u1 bug report') is null, 'ip hash erased after 24 h (report kept)');
select pg_temp.ok(not exists (select 1 from bb_bugs where what = 'u2 bug report'), 'report older than 12 months deleted');
select pg_temp.ok(not exists (select 1 from bb_join_fails where uid = :'U3'), 'old join-fail counter deleted');
-- a wrong team code inserts a fresh counter (and purges old ones)
insert into bb_join_fails (uid, n, since) values (:'U1', 4, now() - interval '3 days');
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U3',true); select bb_team_join('WRONGCODE','x'); commit;
select pg_temp.ok(exists (select 1 from bb_join_fails where uid = :'U3' and n = 1) and not exists (select 1 from bb_join_fails where uid = :'U1'), 'join_fails trigger purges old counters, keeps the new one');
-- rate limit still works with the HMAC hash
begin; set local role anon; select set_config('request.headers','{"x-forwarded-for":"198.51.100.9"}',true);
  insert into bb_bugs (what) select 'spam ' || g from generate_series(1, 10) g; commit;
\set ON_ERROR_STOP 0
begin; set local role anon; select set_config('request.headers','{"x-forwarded-for":"198.51.100.9"}',true); insert into bb_bugs (what) values ('spam 11'); commit;
\set ON_ERROR_STOP 1
select pg_temp.ok(not exists (select 1 from bb_bugs where what = 'spam 11'), 'per-IP rate limit (10/hour) still enforced');

\echo == req 1: delete me removes my bug reports and hands the team over
begin; set local role authenticated; select set_config('request.jwt.claim.sub',:'U1',true); select bb_delete_me(); commit;
select pg_temp.ok(not exists (select 1 from bb_bugs where uid = :'U1') and not exists (select 1 from auth.users where id = :'U1'), 'U1 gone with its bug reports');
select pg_temp.ok((select owner from bb_teams where name = 'Apollo') = :'U2', 'team handed to U2');
\echo == ALL OK
