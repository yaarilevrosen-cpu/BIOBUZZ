-- BIOBUZZ v81 (אפליקציה 1.21) — לוח מנהל: דיווחי באגים, חשבונות רשומים, חסימה ומחיקה, הודעה לכל המשתמשים, סטטיסטיקה.
--
-- איך מריצים:
--   1. נכנסים ל-Supabase → הפרויקט → SQL Editor → New query.
--   2. מדביקים את כל הקובץ הזה ולוחצים Run. (צריך שכבר הורצו schema.sql, v63_security.sql, v72_security.sql,
--      v73_privacy.sql, v74_bugs.sql ו-v78_scout_admins.sql.)
--   3. אפשר להריץ שוב בלי נזק — create if not exists / add column if not exists / create or replace / drop if exists בלבד.
--   האפליקציה לא תלויה בקובץ הזה: לפני ההרצה לוח המנהל אומר שצריך להריץ אותו, וכל השאר עובד כמו ב-1.20.
--
-- מי רואה מה (אותה רשימת מנהלים של מצב הסקאוטינג — bb_scout_admins):
--   • כל מנהל   — דיווחי הבאגים (בלי המייל של המדווח), סימון ״טופל״ והערה, והסטטיסטיקה (מספרים בלבד).
--   • רק בעלים  — רשימת החשבונות (כולל מיילים), המייל של מי שדיווח על באג, חסימה ושחרור, מחיקת חשבון,
--                 מחיקת דיווח, הודעה לכל המשתמשים, ויומן הפעולות.
--   הכול דרך פונקציות security definer שבודקות את הדרגה בכל קריאה. אין הרשאת קריאה או כתיבה ישירה על הטבלאות החדשות,
--   והטבלה bb_bugs נשארת סגורה לקריאה כמו קודם.
--
-- מה נוסף:
--   1. bb_bugs — עמודות done / done_by / done_at / note (סימון ״טופל״ והערת מנהל).
--   2. bb_blocked — חשבונות חסומים. חשבון חסום לא קורא ולא כותב נהגים ומשחקים (מדיניות מגבילה על bb_profiles ועל
--      bb_matches), ולא מתחבר מחדש (auth.users.banned_until). bb_my_block() — החשבון המחובר שואל אם הוא חסום ולמה.
--   3. bb_notices — הודעות לכל המשתמשים (עברית ואנגלית, עם תאריך סיום). bb_notices_active() — קריאה לכולם, גם בלי חשבון.
--   4. bb_admin_log — יומן פעולות המנהלים (מי, מתי, מה, על מי). נמחק אחרי 12 חודשים.
--   5. הפונקציות bb_admin_*: me, bugs, bug, bug_set, bug_delete, users, block, delete_user, notices, notice_add,
--      notice_off, stats, log.
--   השגיאות הן הודעות קבועות באנגלית — האפליקציה מתרגמת אותן:
--      'not signed in', 'not_admin', 'not_owner', 'not_found', 'self' (אי אפשר על עצמך), 'is_admin' (קודם להסיר מהמנהלים),
--      'bad_text' (הודעה ריקה או ארוכה מדי).
--
-- בלי service_role — רק המפתח הציבורי (anon) הקיים והחשבון המחובר (החלטה 03). בלי כתובת מייל בקובץ.

-- ── 1. דיווחי באגים: סימון ״טופל״ ──
alter table public.bb_bugs add column if not exists done boolean not null default false;
alter table public.bb_bugs add column if not exists done_by uuid;
alter table public.bb_bugs add column if not exists done_at timestamptz;
alter table public.bb_bugs add column if not exists note text;
create index if not exists bb_bugs_open on public.bb_bugs (id) where not done;
-- מי ששולח דיווח לא קובע בעצמו ״טופל״ או הערת מנהל (ההרשאה להוסיף היא על כל השורה)
create or replace function public.bb_bugs_fresh() returns trigger
language plpgsql set search_path = public as $$
begin new.done := false; new.done_by := null; new.done_at := null; new.note := null; return new; end $$;
revoke all on function public.bb_bugs_fresh() from public, anon, authenticated;
drop trigger if exists bb_bugs_fresh on public.bb_bugs;
create trigger bb_bugs_fresh before insert on public.bb_bugs for each row execute function public.bb_bugs_fresh();

-- ── 2. הטבלאות החדשות (row level security מופעל כאן, בלי שום מדיניות — אף תפקיד ציבורי לא ניגש ישירות) ──
create table if not exists public.bb_blocked (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text not null default '',
  blocked_by uuid references auth.users(id) on delete set null,
  blocked_at timestamptz not null default now()
);
alter table public.bb_blocked enable row level security;
revoke all on public.bb_blocked from public, anon, authenticated;

create table if not exists public.bb_notices (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  text_he    text not null,
  text_en    text not null default '',
  until      timestamptz not null,
  active     boolean not null default true
);
alter table public.bb_notices enable row level security;
revoke all on public.bb_notices from public, anon, authenticated;
revoke all on sequence public.bb_notices_id_seq from public, anon, authenticated;

create table if not exists public.bb_admin_log (
  id     bigserial primary key,
  at     timestamptz not null default now(),
  by     uuid,
  action text not null,
  target text,
  detail text
);
alter table public.bb_admin_log enable row level security;
revoke all on public.bb_admin_log from public, anon, authenticated;
revoke all on sequence public.bb_admin_log_id_seq from public, anon, authenticated;
create index if not exists bb_admin_log_at on public.bb_admin_log (at);

-- ── 3. עזרים פנימיים (לא נקראים מבחוץ) ──
create or replace function public.bb_admin_role() returns text
language sql stable security definer set search_path = public as $$
  select a.role from public.bb_scout_admins a where auth.uid() is not null and a.user_id = auth.uid();
$$;
revoke all on function public.bb_admin_role() from public, anon, authenticated;

-- בודק את הדרגה ומחזיר אותה; p_owner = true — רק בעלים
create or replace function public.bb_admin_need(p_owner boolean) returns text
language plpgsql stable security definer set search_path = public as $$
declare r text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  r := public.bb_admin_role();
  if r is null then raise exception 'not_admin'; end if;
  if p_owner and r <> 'owner' then raise exception 'not_owner'; end if;
  return r;
end $$;
revoke all on function public.bb_admin_need(boolean) from public, anon, authenticated;

create or replace function public.bb_admin_note(p_action text, p_target text, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.bb_admin_log (by, action, target, detail) values (auth.uid(), left(p_action, 40), left(p_target, 80), left(p_detail, 400));
  delete from public.bb_admin_log where at < now() - interval '12 months';
end $$;
revoke all on function public.bb_admin_note(text, text, text) from public, anon, authenticated;

-- ── 4. חסימה: מדיניות מגבילה על הנתונים, ושאלה ״האם אני חסום״ ──
create or replace function public.bb_is_blocked() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.bb_blocked b where b.user_id = auth.uid());
$$;
revoke all on function public.bb_is_blocked() from public, anon;
grant execute on function public.bb_is_blocked() to authenticated;

-- מדיניות מגבילה (restrictive) מתווספת למדיניות הקיימת ב-AND — לא משנה אותה
drop policy if exists bb_profiles_not_blocked on public.bb_profiles;
create policy bb_profiles_not_blocked on public.bb_profiles as restrictive for all to authenticated
  using (not public.bb_is_blocked()) with check (not public.bb_is_blocked());
drop policy if exists bb_matches_not_blocked on public.bb_matches;
create policy bb_matches_not_blocked on public.bb_matches as restrictive for all to authenticated
  using (not public.bb_is_blocked()) with check (not public.bb_is_blocked());

create or replace function public.bb_my_block() returns json
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null
    else (select json_build_object('blocked', true, 'reason', b.reason, 'at', b.blocked_at) from public.bb_blocked b where b.user_id = auth.uid()) end;
$$;
revoke all on function public.bb_my_block() from public, anon;
grant execute on function public.bb_my_block() to authenticated;

-- ── 5. הודעות לכל המשתמשים — קריאה לכולם, גם בלי חשבון ──
create or replace function public.bb_notices_active()
returns table (id bigint, created_at timestamptz, text_he text, text_en text, until timestamptz)
language sql stable security definer set search_path = public as $$
  select n.id, n.created_at, n.text_he, n.text_en, n.until
    from public.bb_notices n
   where n.active and n.until > now()
   order by n.id desc
   limit 5;
$$;
revoke all on function public.bb_notices_active() from public;
grant execute on function public.bb_notices_active() to anon, authenticated;

-- ── 6. לוח המנהל ──
-- מי אני: null = לא מנהל
create or replace function public.bb_admin_me() returns json
language plpgsql stable security definer set search_path = public as $$
declare r text;
begin
  if auth.uid() is null then return null; end if;
  r := public.bb_admin_role();
  if r is null then return null; end if;
  return json_build_object('role', r, 'owner', r = 'owner');
end $$;

-- רשימת הדיווחים, בלי צילום המסך ובלי פרטי המערכת (אלה ב-bb_admin_bug). p_state: 'open' / 'done' / כל דבר אחר = הכול.
-- p_before — מזהה שממנו ממשיכים אחורה (דפדוף). המייל של המדווח — רק לבעלים.
drop function if exists public.bb_admin_bugs(text, bigint, int);
create or replace function public.bb_admin_bugs(p_state text, p_before bigint, p_limit int)
returns table (id bigint, created_at timestamptz, ver text, lang text, platform text, what text, steps text, contact text,
               has_shot boolean, n_errors int, signed_in boolean, email text, done boolean, done_at timestamptz, note text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare r text;
begin
  r := public.bb_admin_need(false);
  return query
    select b.id, b.created_at, b.ver, b.lang, b.platform, b.what, b.steps, b.contact,
           b.shot is not null, case when jsonb_typeof(b.errors) = 'array' then jsonb_array_length(b.errors) else 0 end,
           b.uid is not null, case when r = 'owner' then u.email::text else null end, b.done, b.done_at, b.note
      from public.bb_bugs b
      left join auth.users u on u.id = b.uid
     where (p_before is null or b.id < p_before)
       and (case coalesce(p_state, '') when 'open' then not b.done when 'done' then b.done else true end)
     order by b.id desc
     limit greatest(1, least(coalesce(p_limit, 50), 200));
end $$;

-- דיווח אחד במלואו, כולל צילום המסך
create or replace function public.bb_admin_bug(p_id bigint) returns json
language plpgsql stable security definer set search_path = public as $$
declare r text; o json;
begin
  r := public.bb_admin_need(false);
  select json_build_object('id', b.id, 'created_at', b.created_at, 'ver', b.ver, 'lang', b.lang, 'platform', b.platform,
           'what', b.what, 'steps', b.steps, 'contact', b.contact, 'sys', b.sys, 'errors', b.errors, 'shot', b.shot,
           'signed_in', b.uid is not null, 'email', case when r = 'owner' then u.email::text else null end,
           'done', b.done, 'done_at', b.done_at, 'note', b.note)
    into o
    from public.bb_bugs b left join auth.users u on u.id = b.uid
   where b.id = p_id;
  if o is null then raise exception 'not_found'; end if;
  return o;
end $$;

-- סימון ״טופל״ והערה. null = בלי שינוי בשדה הזה
create or replace function public.bb_admin_bug_set(p_id bigint, p_done boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.bb_admin_need(false);
  update public.bb_bugs b set
    done = coalesce(p_done, b.done),
    done_by = case when p_done is null then b.done_by when p_done then auth.uid() else null end,
    done_at = case when p_done is null then b.done_at when p_done then now() else null end,
    note = case when p_note is null then b.note else nullif(left(p_note, 1000), '') end
  where b.id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.bb_admin_bug_delete(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.bb_admin_need(true);
  delete from public.bb_bugs b where b.id = p_id;
  if not found then raise exception 'not_found'; end if;
  perform public.bb_admin_note('bug_delete', p_id::text, null);
end $$;

-- כל החשבונות הרשומים — רק לבעלים. p_q — חיפוש במייל או בשם ובמספר הקבוצה
drop function if exists public.bb_admin_users(text, int, int);
create or replace function public.bb_admin_users(p_q text, p_limit int, p_offset int)
returns table (user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, team_name text, team_num text,
               n_profiles int, n_matches int, last_match timestamptz, n_bugs int, blocked boolean, block_reason text, admin_role text, total bigint)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare q text := lower(trim(coalesce(p_q, '')));
begin
  perform public.bb_admin_need(true);
  return query
    with base as (
      select u.id, u.email::text as email, u.created_at, u.last_sign_in_at, t.name as team_name, t.num as team_num
        from auth.users u
        left join public.bb_team_members m on m.uid = u.id
        left join public.bb_teams t on t.id = m.team_id
       where q = '' or position(q in lower(coalesce(u.email::text, ''))) > 0
          or position(q in lower(coalesce(t.name, ''))) > 0 or position(q in coalesce(t.num, '')) > 0
    )
    select b.id, b.email, b.created_at, b.last_sign_in_at, b.team_name, b.team_num,
           (select count(*)::int from public.bb_profiles p where p.owner = b.id and not p.deleted),
           (select count(*)::int from public.bb_matches x where x.owner = b.id),
           (select max(x.created_at) from public.bb_matches x where x.owner = b.id),
           (select count(*)::int from public.bb_bugs g where g.uid = b.id),
           k.user_id is not null, k.reason, a.role,
           (select count(*) from base)
      from base b
      left join public.bb_blocked k on k.user_id = b.id
      left join public.bb_scout_admins a on a.user_id = b.id
     order by b.created_at desc nulls last, b.id
     limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(0, coalesce(p_offset, 0));
end $$;

-- חסימה ושחרור — רק בעלים. אי אפשר לחסום את עצמך, ולא מנהל (קודם מסירים אותו מרשימת המנהלים)
create or replace function public.bb_admin_block(p_user uuid, p_block boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.bb_admin_need(true);
  if p_user = auth.uid() then raise exception 'self'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then raise exception 'not_found'; end if;
  if coalesce(p_block, true) then
    if exists (select 1 from public.bb_scout_admins a where a.user_id = p_user) then raise exception 'is_admin'; end if;
    insert into public.bb_blocked (user_id, reason, blocked_by) values (p_user, left(coalesce(p_reason, ''), 300), auth.uid())
      on conflict (user_id) do update set reason = excluded.reason, blocked_by = excluded.blocked_by, blocked_at = now();
    -- בנוסף למדיניות על הנתונים: בלי כניסה ובלי חידוש חיבור. אם אין הרשאה לעדכן את auth.users — החסימה על הנתונים נשארת
    begin update auth.users set banned_until = 'infinity' where id = p_user; exception when others then null; end;
    perform public.bb_admin_note('block', p_user::text, p_reason);
  else
    delete from public.bb_blocked b where b.user_id = p_user;
    begin update auth.users set banned_until = null where id = p_user; exception when others then null; end;
    perform public.bb_admin_note('unblock', p_user::text, null);
  end if;
end $$;

-- מחיקת חשבון של מישהו אחר — רק בעלים. אותו סדר כמו bb_delete_me (v73): קבוצה שהוא בעליה עוברת לחבר הוותיק ביותר
create or replace function public.bb_admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t record; nxt uuid;
begin
  perform public.bb_admin_need(true);
  if p_user = auth.uid() then raise exception 'self'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then raise exception 'not_found'; end if;
  if exists (select 1 from public.bb_scout_admins a where a.user_id = p_user) then raise exception 'is_admin'; end if;
  delete from public.bb_team_members where uid = p_user;
  for t in select id from public.bb_teams where owner = p_user loop
    select uid into nxt from public.bb_team_members where team_id = t.id order by joined_at, uid limit 1;
    if nxt is null then delete from public.bb_teams where id = t.id;
    else update public.bb_teams set owner = nxt where id = t.id; end if;
  end loop;
  delete from public.bb_matches where owner = p_user;
  delete from public.bb_profiles where owner = p_user;
  delete from public.bb_bugs where uid = p_user;
  delete from public.bb_join_fails where uid = p_user;
  delete from public.bb_usage where owner = p_user;
  delete from auth.users where id = p_user;
  -- ביומן נשאר רק המזהה — בלי המייל של מי שנמחק
  perform public.bb_admin_note('delete_user', p_user::text, null);
end $$;

-- הודעות: רשימה (כולל כבויות ושפג תוקפן), הוספה וכיבוי — רק בעלים
create or replace function public.bb_admin_notices()
returns table (id bigint, created_at timestamptz, text_he text, text_en text, until timestamptz, active boolean, live boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform public.bb_admin_need(true);
  return query select n.id, n.created_at, n.text_he, n.text_en, n.until, n.active, (n.active and n.until > now())
    from public.bb_notices n order by n.id desc limit 30;
end $$;

create or replace function public.bb_admin_notice_add(p_he text, p_en text, p_days int) returns bigint
language plpgsql security definer set search_path = public as $$
declare he text := trim(coalesce(p_he, '')); en text := trim(coalesce(p_en, '')); v bigint;
begin
  perform public.bb_admin_need(true);
  if length(he) < 2 or length(he) > 400 or length(en) > 400 then raise exception 'bad_text'; end if;
  insert into public.bb_notices (created_by, text_he, text_en, until)
    values (auth.uid(), he, en, now() + make_interval(days => greatest(1, least(coalesce(p_days, 7), 60))))
    returning id into v;
  perform public.bb_admin_note('notice_add', v::text, he);
  return v;
end $$;

create or replace function public.bb_admin_notice_off(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.bb_admin_need(true);
  update public.bb_notices n set active = false where n.id = p_id;
  if not found then raise exception 'not_found'; end if;
  perform public.bb_admin_note('notice_off', p_id::text, null);
end $$;

-- סטטיסטיקה: מספרים בלבד, בלי שום פרט מזהה — לכל מנהל
create or replace function public.bb_admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare o json;
begin
  perform public.bb_admin_need(false);
  select json_build_object(
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users u where u.created_at > now() - interval '7 days'),
    'users_30d', (select count(*) from auth.users u where u.created_at > now() - interval '30 days'),
    'active_1d', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '1 day'
                    or exists (select 1 from public.bb_matches x where x.owner = u.id and x.created_at > now() - interval '1 day')),
    'active_7d', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '7 days'
                    or exists (select 1 from public.bb_matches x where x.owner = u.id and x.created_at > now() - interval '7 days')),
    'active_30d', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '30 days'
                    or exists (select 1 from public.bb_matches x where x.owner = u.id and x.created_at > now() - interval '30 days')),
    'blocked', (select count(*) from public.bb_blocked),
    'teams', (select count(*) from public.bb_teams),
    'profiles', (select count(*) from public.bb_profiles p where not p.deleted),
    'matches', (select count(*) from public.bb_matches),
    'matches_7d', (select count(*) from public.bb_matches x where x.created_at > now() - interval '7 days'),
    'bugs', (select count(*) from public.bb_bugs),
    'bugs_open', (select count(*) from public.bb_bugs b where not b.done),
    'bugs_7d', (select count(*) from public.bb_bugs b where b.created_at > now() - interval '7 days'),
    -- 30 הימים האחרונים, יום אחרי יום: משחקים, שחקנים שונים, חשבונות חדשים ודיווחים
    'days', (select coalesce(json_agg(json_build_object('d', d.day, 'matches', d.m, 'players', d.p, 'users', d.u, 'bugs', d.b) order by d.day), '[]'::json)
               from (select g::date as day,
                       (select count(*) from public.bb_matches x where x.created_at >= g and x.created_at < g + interval '1 day') as m,
                       (select count(distinct x.owner) from public.bb_matches x where x.created_at >= g and x.created_at < g + interval '1 day') as p,
                       (select count(*) from auth.users u where u.created_at >= g and u.created_at < g + interval '1 day') as u,
                       (select count(*) from public.bb_bugs b where b.created_at >= g and b.created_at < g + interval '1 day') as b
                     from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') g) d),
    -- מאיזו גרסה מגיעים הדיווחים (30 יום)
    'bug_vers', (select coalesce(json_agg(json_build_object('ver', v.ver, 'n', v.n) order by v.n desc), '[]'::json)
                   from (select coalesce(nullif(b.ver, ''), '?') as ver, count(*) as n from public.bb_bugs b
                          where b.created_at > now() - interval '30 days' group by 1 order by 2 desc limit 8) v)
  ) into o;
  return o;
end $$;

-- יומן הפעולות — רק בעלים
create or replace function public.bb_admin_log_list(p_limit int)
returns table (id bigint, at timestamptz, by_email text, action text, target text, detail text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform public.bb_admin_need(true);
  return query select l.id, l.at, u.email::text, l.action, l.target, l.detail
    from public.bb_admin_log l left join auth.users u on u.id = l.by
    order by l.id desc limit greatest(1, least(coalesce(p_limit, 50), 200));
end $$;

-- רק מחוברים. לא לכולם (public) ולא לאנונימיים (anon)
revoke all on function public.bb_admin_me(), public.bb_admin_bugs(text, bigint, int), public.bb_admin_bug(bigint),
  public.bb_admin_bug_set(bigint, boolean, text), public.bb_admin_bug_delete(bigint), public.bb_admin_users(text, int, int),
  public.bb_admin_block(uuid, boolean, text), public.bb_admin_delete_user(uuid), public.bb_admin_notices(),
  public.bb_admin_notice_add(text, text, int), public.bb_admin_notice_off(bigint), public.bb_admin_stats(),
  public.bb_admin_log_list(int) from public, anon;
grant execute on function public.bb_admin_me(), public.bb_admin_bugs(text, bigint, int), public.bb_admin_bug(bigint),
  public.bb_admin_bug_set(bigint, boolean, text), public.bb_admin_bug_delete(bigint), public.bb_admin_users(text, int, int),
  public.bb_admin_block(uuid, boolean, text), public.bb_admin_delete_user(uuid), public.bb_admin_notices(),
  public.bb_admin_notice_add(text, text, int), public.bb_admin_notice_off(bigint), public.bb_admin_stats(),
  public.bb_admin_log_list(int) to authenticated;

-- מחיקת החשבון שלי (bb_delete_me) מוחקת גם את החסימה (cascade). ההודעות שכתבתי נשארות בלי שם הכותב (set null).
