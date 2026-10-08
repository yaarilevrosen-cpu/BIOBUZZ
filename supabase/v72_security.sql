-- BIOBUZZ v72 (אפליקציה 1.13.0) — עדכון אבטחה ואחסון לענן.
--
-- איך מריצים:
--   1. נכנסים ל-Supabase → הפרויקט → SQL Editor → New query.
--   2. מדביקים את כל הקובץ הזה ולוחצים Run. (צריך שכבר הורצו schema.sql ו-v63_security.sql.)
--   3. אפשר להריץ שוב בלי נזק — כל שינוי כאן בודק אם הוא כבר קיים.
--   גרסאות ישנות של האפליקציה ממשיכות לעבוד: אותן פונקציות, אותם שמות ואותם פרמטרים.
--
-- מה משתנה:
--   1. קבוצה: בעלים שיוצא (או נכנס לקבוצה אחרת / פותח קבוצה חדשה) מעביר את הבעלות לחבר הוותיק ביותר;
--      קבוצה שנשארה בלי חברים נמחקת. קבוצות ״יתומות״ שכבר קיימות מתוקנות כאן פעם אחת.
--      הוצאת חבר מחליפה גם את קוד ההצטרפות — מי שהוצא לא חוזר עם הקוד הישן.
--   2. תקרת אחסון לכל חשבון: מאצ׳ים — עד 20,000 שורות ו-30 מ״ב, ובכל יום עד 1,500 שורות ו-10 מ״ב;
--      הגדרות (kv) — עד 1.5 מ״ב לנהג ו-8 מ״ב לכל הנהגים ביחד. השגיאה מתחילה ב-"bb quota" (האפליקציה מזהה ועוצרת).
--   3. תקרת 300 הנהגים סופרת רק נהגים חיים (מחיקות לא ״אוכלות״ מקום), ועד 2,000 שורות בסך הכול.
--   4. זמן היצירה של מאץ׳ (created_at) נקבע בשרת — אי אפשר לשלוח 2099 ולשבש את הדפדוף של הקבוצה.
--
-- "not valid" = הכלל חל על כל שורה חדשה או שמשתנה; שורות קיימות לא נבדקות.

-- ── 1. קבוצות ──
-- יציאה מהקבוצה הנוכחית (פנימי — נקרא מתוך הפונקציות של הקבוצה)
create or replace function public.bb_leave_current() returns void
language plpgsql security definer set search_path = public as $$
declare tid uuid; nxt uuid;
begin
  if auth.uid() is null then return; end if;
  select team_id into tid from public.bb_team_members where uid = auth.uid();
  if tid is null then return; end if;
  delete from public.bb_team_members where uid = auth.uid();
  if exists (select 1 from public.bb_teams where id = tid and owner = auth.uid()) then
    select uid into nxt from public.bb_team_members where team_id = tid order by joined_at, uid limit 1;
    if nxt is null then
      delete from public.bb_teams where id = tid;
    else
      update public.bb_teams set owner = nxt where id = tid;
    end if;
  end if;
end $$;
revoke all on function public.bb_leave_current() from public, anon, authenticated;

create or replace function public.bb_team_leave() returns void
language plpgsql security definer set search_path = public as $$
begin perform public.bb_leave_current(); end $$;

create or replace function public.bb_team_create(p_name text, p_num text, p_label text) returns public.bb_teams
language plpgsql security definer set search_path = public as $$
declare t public.bb_teams;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform public.bb_leave_current();
  insert into public.bb_teams (code, name, num, owner) values (public.bb_code(), left(coalesce(p_name, ''), 40),
    left(regexp_replace(coalesce(p_num, ''), '[^0-9]', '', 'g'), 6), auth.uid()) returning * into t;
  insert into public.bb_team_members (team_id, uid, label) values (t.id, auth.uid(), left(coalesce(p_label, ''), 40));
  return t;
end $$;

-- כמו ב-v63 (קוד שגוי מחזיר NULL ונספר), ובנוסף: יציאה מסודרת מהקבוצה הקודמת, והצטרפות לאותה קבוצה לא מוציאה את הבעלים
create or replace function public.bb_team_join(p_code text, p_label text) returns public.bb_teams
language plpgsql security definer set search_path = public as $$
declare t public.bb_teams; f public.bb_join_fails;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into f from public.bb_join_fails where uid = auth.uid();
  if found and f.since > now() - interval '1 hour' and f.n >= 10 then
    raise exception 'too many attempts, try again in an hour';
  end if;
  select * into t from public.bb_teams where code = upper(trim(coalesce(p_code, '')));
  if not found then
    insert into public.bb_join_fails as j (uid, n, since) values (auth.uid(), 1, now())
      on conflict (uid) do update set
        n = case when j.since > now() - interval '1 hour' then j.n + 1 else 1 end,
        since = case when j.since > now() - interval '1 hour' then j.since else now() end;
    return null;
  end if;
  delete from public.bb_join_fails where uid = auth.uid();
  if exists (select 1 from public.bb_team_members where uid = auth.uid() and team_id = t.id) then
    update public.bb_team_members set label = left(coalesce(p_label, ''), 40) where uid = auth.uid();
    return t;
  end if;
  perform public.bb_leave_current();
  insert into public.bb_team_members (team_id, uid, label) values (t.id, auth.uid(), left(coalesce(p_label, ''), 40));
  return t;
end $$;

-- הוצאת חבר = גם קוד הצטרפות חדש (החברים שנשארו לא צריכים אותו; הבעלים רואה אותו בסנכרון הבא)
create or replace function public.bb_team_kick(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.bb_teams where id = public.bb_my_team() and owner = auth.uid()) then
    raise exception 'only the team owner can remove members';
  end if;
  if p_uid = auth.uid() then raise exception 'the owner cannot remove themselves'; end if;
  delete from public.bb_team_members where uid = p_uid and team_id = public.bb_my_team();
  if found then
    update public.bb_teams set code = public.bb_code() where id = public.bb_my_team();
  end if;
end $$;

revoke all on function public.bb_team_leave(), public.bb_team_create(text, text, text), public.bb_team_join(text, text),
  public.bb_team_kick(uuid) from public, anon;
grant execute on function public.bb_team_leave(), public.bb_team_create(text, text, text), public.bb_team_join(text, text),
  public.bb_team_kick(uuid) to authenticated;

-- תיקון חד־פעמי: קבוצה שהבעלים שלה כבר לא חבר בה — לחבר הוותיק ביותר; קבוצה בלי חברים — נמחקת
update public.bb_teams t set owner = (select m.uid from public.bb_team_members m where m.team_id = t.id order by m.joined_at, m.uid limit 1)
 where not exists (select 1 from public.bb_team_members m where m.team_id = t.id and m.uid = t.owner)
   and exists (select 1 from public.bb_team_members m where m.team_id = t.id);
delete from public.bb_teams t where not exists (select 1 from public.bb_team_members m where m.team_id = t.id);

-- ── 2 + 4. מאצ׳ים: תקרה לכל חשבון, ו-created_at מהשרת ──
create table if not exists public.bb_usage (
  owner   uuid primary key references auth.users(id) on delete cascade,
  m_rows  int    not null default 0,
  m_bytes bigint not null default 0,
  day     date   not null default current_date,
  d_rows  int    not null default 0,
  d_bytes bigint not null default 0
);
alter table public.bb_usage enable row level security;
revoke all on public.bb_usage from anon, authenticated;

create or replace function public.bb_matches_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare u public.bb_usage; sz bigint; d_old bigint := 0;
begin
  if tg_op = 'DELETE' then
    update public.bb_usage set m_rows = greatest(0, m_rows - 1), m_bytes = greatest(0, m_bytes - pg_column_size(old.data)) where owner = old.owner;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;            -- זמן היצירה לא משתנה
    new.owner := old.owner;
    d_old := pg_column_size(old.data);
  else
    new.created_at := now();                     -- 4: מהשרת, לא מהלקוח
    -- שורה שכבר קיימת (upsert עם ignore-duplicates) — לא תיכנס, ולא נספרת
    if exists (select 1 from public.bb_matches where owner = new.owner and profile_id = new.profile_id and at = new.at) then
      return new;
    end if;
  end if;
  sz := pg_column_size(new.data);
  select * into u from public.bb_usage where owner = new.owner for update;
  if not found then
    insert into public.bb_usage (owner, m_rows, m_bytes)
      select new.owner, count(*), coalesce(sum(pg_column_size(data)), 0) from public.bb_matches where owner = new.owner
      on conflict (owner) do nothing;
    select * into u from public.bb_usage where owner = new.owner for update;
  end if;
  if u.day <> current_date then u.day := current_date; u.d_rows := 0; u.d_bytes := 0; end if;
  if tg_op = 'INSERT' then
    if u.m_rows + 1 > 20000 then raise exception 'bb quota: too many matches for this account'; end if;
    if u.d_rows + 1 > 1500 then raise exception 'bb quota: too many matches today'; end if;
    u.m_rows := u.m_rows + 1; u.d_rows := u.d_rows + 1;
  end if;
  if sz > d_old and u.m_bytes + sz - d_old > 30000000 then raise exception 'bb quota: match storage full for this account'; end if;
  if sz > d_old and u.d_bytes + sz - d_old > 10000000 then raise exception 'bb quota: too much match data today'; end if;
  u.m_bytes := greatest(0, u.m_bytes + sz - d_old); u.d_bytes := u.d_bytes + greatest(0, sz - d_old);
  update public.bb_usage set m_rows = u.m_rows, m_bytes = u.m_bytes, day = u.day, d_rows = u.d_rows, d_bytes = u.d_bytes where owner = new.owner;
  return new;
end $$;
drop trigger if exists bb_matches_guard on public.bb_matches;
create trigger bb_matches_guard before insert or update on public.bb_matches for each row execute function public.bb_matches_guard();
drop trigger if exists bb_matches_guard_del on public.bb_matches;
create trigger bb_matches_guard_del after delete on public.bb_matches for each row execute function public.bb_matches_guard();

-- ── 2 + 3. נהגים: הגדרות עד 1.5 מ״ב לנהג ו-8 מ״ב לחשבון; 300 נהגים חיים, 2,000 שורות בסך הכול ──
alter table public.bb_profiles drop constraint if exists bb_profiles_size_ok;
alter table public.bb_profiles add constraint bb_profiles_size_ok check (
  pg_column_size(kv) <= 1500000
  and length(name) <= 60
  and coalesce(length(emoji), 0) <= 16
  and coalesce(length(color), 0) <= 16
) not valid;

create or replace function public.bb_profiles_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare tot bigint;
begin
  if tg_op = 'INSERT' and not exists (select 1 from public.bb_profiles where owner = new.owner and id = new.id) then
    if not new.deleted and (select count(*) from public.bb_profiles where owner = new.owner and not deleted) >= 300 then
      raise exception 'too many drivers';
    end if;
    if (select count(*) from public.bb_profiles where owner = new.owner) >= 2000 then
      raise exception 'too many drivers';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.deleted and not new.deleted
     and (select count(*) from public.bb_profiles where owner = new.owner and not deleted) >= 300 then
    raise exception 'too many drivers';
  end if;
  if tg_op = 'UPDATE' and pg_column_size(new.kv) <= pg_column_size(old.kv) then
    return new;                                   -- לא גדל — לא בודקים את הסכום
  end if;
  select coalesce(sum(pg_column_size(kv)), 0) into tot from public.bb_profiles where owner = new.owner and id <> new.id;
  if tot + pg_column_size(new.kv) > 8000000 then
    raise exception 'bb quota: settings storage full for this account';
  end if;
  return new;
end $$;
drop trigger if exists bb_profiles_limit on public.bb_profiles;
create trigger bb_profiles_limit before insert or update on public.bb_profiles for each row execute function public.bb_profiles_limit();
