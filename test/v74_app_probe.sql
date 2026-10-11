-- v74 app (P10) — בדיקה על Postgres מקומי עם ה-shim של Supabase (לא על השרת האמיתי). כל בדיקה שנכשלת זורקת שגיאה.
-- psql -v ON_ERROR_STOP=1 -f shim.sql -f supabase/schema.sql -f supabase/v63_security.sql -f supabase/v72_security.sql \
--      -f supabase/v73_privacy.sql -f supabase/v74_bugs.sql -f supabase/v74_bugs.sql -f test/v74_app_probe.sql
\set U1 '11111111-1111-1111-1111-111111111111'
create or replace function pg_temp.ok(c boolean, what text) returns void language plpgsql as $$
begin if c is not true then raise exception 'FAIL: %', what; end if; raise notice 'ok: %', what; end $$;
-- דיווח אנונימי עם כותרות בקשה נתונות; מחזיר true אם נכנס
create or replace function pg_temp.anon_bug(hdr text) returns boolean language plpgsql as $$
begin
  perform set_config('request.headers', hdr, true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin insert into public.bb_bugs (what) values ('anon report'); return true;
  exception when others then if sqlerrm like '%too many bug reports%' then return false; end if; raise; end;
end $$;
grant execute on function pg_temp.anon_bug(text) to anon, authenticated;
delete from bb_bugs;

\echo == client IP: cf-connecting-ip, else the LAST x-forwarded-for hop (set by the proxy), not the first (set by the client)
begin;
  select set_config('request.headers', '{"x-forwarded-for":"6.6.6.6, 10.0.0.1, 203.0.113.7"}', true);
  select pg_temp.ok(bb_client_ip() = '203.0.113.7', 'x-forwarded-for: last hop');
  select set_config('request.headers', '{"x-forwarded-for":"6.6.6.6, 203.0.113.7","cf-connecting-ip":"198.51.100.4"}', true);
  select pg_temp.ok(bb_client_ip() = '198.51.100.4', 'cf-connecting-ip wins');
  select set_config('request.headers', '{"x-forwarded-for":" 203.0.113.9 "}', true);
  select pg_temp.ok(bb_client_ip() = '203.0.113.9', 'single hop, trimmed');
  select set_config('request.headers', '{}', true);
  select pg_temp.ok(bb_client_ip() = '', 'no headers -> empty');
  select set_config('request.headers', 'not json', true);
  select pg_temp.ok(bb_client_ip() = '', 'broken headers -> empty (no error)');
rollback;
select pg_temp.ok(not has_function_privilege('anon', 'public.bb_client_ip()', 'execute'), 'bb_client_ip: not callable by anon');

\echo == spoofing the first x-forwarded-for hop no longer escapes the per-IP cap (10/hour)
set role anon;
select pg_temp.ok((select count(*) from generate_series(1, 12) g
  where pg_temp.anon_bug('{"x-forwarded-for":"9.9.9.' || g || ', 203.0.113.50"}')) = 10, 'same proxy-set address, different spoofed first hop: only 10 of 12 accepted');
reset role;

\echo == anonymous cap 150/hour (separate), signed-in users can still report
delete from bb_bugs;
set role anon;
select pg_temp.ok((select count(*) from generate_series(1, 160) g
  where pg_temp.anon_bug('{"x-forwarded-for":"203.0.' || (g / 200) || '.' || (g % 200) || '"}')) = 150, 'anonymous reports from 160 addresses: 150 accepted');
reset role;
select pg_temp.ok((select count(*) from bb_bugs where uid is null) = 150, '150 anonymous rows');
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'U1', true);
  select set_config('request.headers', '{"x-forwarded-for":"192.0.2.1"}', true);
  insert into bb_bugs (what) values ('signed-in report still works');
commit;
select pg_temp.ok((select count(*) from bb_bugs where uid = :'U1') = 1, 'signed-in report accepted while anonymous cap is full');

\echo == the global cap (300/hour) still applies
-- pretend 150 signed-in reports already happened this hour
alter table bb_bugs disable trigger bb_bugs_guard;
insert into bb_bugs (uid, what, created_at) select :'U1', 'old', now() from generate_series(1, 149);
alter table bb_bugs enable trigger bb_bugs_guard;
select pg_temp.ok((select count(*) from bb_bugs where created_at > now() - interval '1 hour') = 300, '300 reports this hour');
begin; set local role authenticated; select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select set_config('request.headers', '{"x-forwarded-for":"192.0.2.2"}', true);
  do $$ begin insert into public.bb_bugs (what) values ('over global cap'); raise exception 'FAIL: global cap not enforced';
    exception when others then if sqlerrm not like '%too many bug reports%' then raise; end if; raise notice 'ok: global cap 300/hour still enforced'; end $$;
rollback;
select pg_temp.ok((select count(*) from pg_trigger where tgname = 'bb_bugs_guard') = 1, 'one bb_bugs_guard trigger (re-run safe)');
delete from bb_bugs;
\echo == all v74 app probes passed
