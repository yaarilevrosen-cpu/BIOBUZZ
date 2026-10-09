-- BIOBUZZ v73 (אפליקציה 1.14) — פרטיות: מחיקת חשבון בלחיצה, ושמירת דיווחי באגים עד 12 חודשים.
--
-- איך מריצים:
--   1. נכנסים ל-Supabase → הפרויקט → SQL Editor → New query.
--   2. מדביקים את כל הקובץ הזה ולוחצים Run. (צריך שכבר הורצו schema.sql, v63_security.sql ו-v72_security.sql.)
--   3. אפשר להריץ שוב בלי נזק — כל שינוי כאן בודק אם הוא כבר קיים (create or replace / drop if exists).
--   עד שמריצים: הכפתור ״מחיקת החשבון״ באפליקציה מציג הודעה ״עוד לא זמין — כתבו לנו בגיטהאב״, ושום דבר אחר לא נשבר.
--
-- מה משתנה:
--   1. bb_delete_me() — המשתמש המחובר מוחק את עצמו: קבוצה שהוא בעליה עוברת לחבר הוותיק ביותר (כמו ביציאה, v72),
--      או נמחקת אם אין בה אף אחד; ואז נמחקים החברות בקבוצה, המאצ׳ים, הנהגים (עם ההגדרות), דיווחי הבאגים שלו,
--      ניסיונות ההצטרפות והמונה של התקרה — ובסוף החשבון עצמו (auth.users). רק למחוברים (authenticated).
--   2. מחיקה אוטומטית אחרי תקופת השמירה (bb_retention): דיווחי באגים אחרי 12 חודשים, ״טביעת ה-IP״ של דיווח אחרי 24 שעות
--      (צריך אותה רק להגבלת קצב), ומוני ניסיונות קוד שגוי (bb_join_fails) אחרי יום.
--      רץ בכל דיווח חדש ובכל ניסיון קוד שגוי (טריגר, פעם אחת לכל פקודה — זול, עם אינדקסים), ובנוסף פעם ביום עם pg_cron
--      אם ההרחבה זמינה (בסופאבייס היא זמינה; אם לא — נשארים הטריגרים, ושום דבר לא נכשל). וגם ניקוי חד־פעמי כאן.
--   3. טביעת ה-IP בדיווח באג: HMAC-SHA256 עם מפתח סודי שנוצר כאן פעם אחת (bb_secret — אף תפקיד ציבורי לא קורא אותה),
--      במקום md5 עם ״מלח״ קבוע שכתוב בקוד הפתוח. טביעות ישנות (md5) נמחקות.
--   4. bb_my_bugs() — הדיווחים שלי, בשביל ״הורדת הנתונים שלי מהענן״ (את bb_bugs אי אפשר לקרוא דרך ההרשאות).
--   5. חברי קבוצה רואים רק את שדות הסיכום: ההרשאות הרחבות לקריאת bb_profiles / bb_matches של החברים נמחקות,
--      ובמקומן bb_team_profiles() (שם, סמל, צבע) ו-bb_team_matches() (שדות הסיכום בלבד). אפליקציה ישנה (עד 1.13)
--      תראה את הקבוצה בלי נהגים ומאצ׳ים של החברים עד שתתעדכן — זה המחיר של הצמצום.

-- ── 1. מחיקת החשבון ──
create or replace function public.bb_delete_me() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t record; nxt uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  -- הקבוצה שאני חבר בה: יציאה מסודרת (בעלים → החבר הוותיק ביותר; קבוצה ריקה נמחקת) — אותה לוגיקה כמו ב-v72
  perform public.bb_leave_current();
  -- קבוצות שאני עדיין הבעלים שלהן בלי להיות חבר (מלפני v72) — לחבר הוותיק ביותר, ואם אין — נמחקות
  for t in select id from public.bb_teams where owner = me loop
    select uid into nxt from public.bb_team_members where team_id = t.id and uid <> me order by joined_at, uid limit 1;
    if nxt is null then delete from public.bb_teams where id = t.id;
    else update public.bb_teams set owner = nxt where id = t.id; end if;
  end loop;
  delete from public.bb_team_members where uid = me;
  delete from public.bb_matches where owner = me;
  delete from public.bb_profiles where owner = me;
  delete from public.bb_bugs where uid = me;          -- bb_bugs.uid בלי מפתח זר — מוחקים במפורש
  delete from public.bb_join_fails where uid = me;
  delete from public.bb_usage where owner = me;
  delete from auth.users where id = me;               -- כל השאר (cascade) הולך איתו
end $$;
revoke all on function public.bb_delete_me() from public, anon;
grant execute on function public.bb_delete_me() to authenticated;


-- ── 2. מחיקה אוטומטית אחרי תקופת השמירה ──
create or replace function public.bb_retention() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.bb_bugs where created_at < now() - interval '12 months';
  -- טביעת ה-IP נחוצה רק להגבלת הקצב (שעה אחרונה) — אחרי 24 שעות נמחקת
  update public.bb_bugs set ip_hash = null where ip_hash is not null and created_at < now() - interval '24 hours';
  -- מונה ניסיונות קוד שגוי: החלון הוא שעה; אחרי יום אין בו צורך
  delete from public.bb_join_fails where since < now() - interval '1 day';
end $$;
revoke all on function public.bb_retention() from public, anon, authenticated;

-- טריגר (אותו שם כמו בגרסה הקודמת של הקובץ) — פעם אחת לכל פקודה
create or replace function public.bb_bugs_retention() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.bb_retention();
  return null;
end $$;
revoke all on function public.bb_bugs_retention() from public, anon, authenticated;
drop trigger if exists bb_bugs_retention on public.bb_bugs;
create trigger bb_bugs_retention after insert on public.bb_bugs for each statement execute function public.bb_bugs_retention();
drop trigger if exists bb_join_fails_retention on public.bb_join_fails;
create trigger bb_join_fails_retention after insert on public.bb_join_fails for each statement execute function public.bb_bugs_retention();
create index if not exists bb_bugs_recent on public.bb_bugs (created_at);
create index if not exists bb_bugs_iphash_live on public.bb_bugs (created_at) where ip_hash is not null;
create index if not exists bb_join_fails_since on public.bb_join_fails (since);

-- פעם ביום (03:17 UTC) עם pg_cron, אם אפשר. אם ההרחבה לא זמינה — רק הודעה; הטריגרים למעלה ממשיכים לעבוד
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron is not available (%) — retention runs on new rows only', sqlerrm;
    return;
  end;
  begin
    perform cron.schedule('bb_retention', '17 3 * * *', 'select public.bb_retention()');
  exception when others then
    raise notice 'could not schedule bb_retention with pg_cron: %', sqlerrm;
  end;
end $$;

-- ── 3. טביעת ה-IP בדיווח באג: HMAC-SHA256 עם מפתח סודי ──
create table if not exists public.bb_secret (
  k text primary key,
  v bytea not null,
  created_at timestamptz not null default now()
);
alter table public.bb_secret enable row level security;      -- בלי אף policy: רק הבעלים (הפונקציות security definer)
revoke all on public.bb_secret from public, anon, authenticated;
-- 32 בתים אקראיים (משני uuid אקראיים — gen_random_uuid משתמש במחולל האקראי החזק של השרת), נוצר פעם אחת
insert into public.bb_secret (k, v)
  values ('bug_ip', decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex'))
  on conflict (k) do nothing;

-- HMAC-SHA256 (RFC 2104) עם sha256 המובנה — בלי תלות ב-pgcrypto
create or replace function public.bb_hmac(p_key bytea, p_msg bytea) returns text
language plpgsql immutable set search_path = public as $$
declare k bytea := p_key; ki bytea; ko bytea; i int;
begin
  if length(k) > 64 then k := sha256(k); end if;
  k := k || decode(repeat('00', 64 - length(k)), 'hex');
  ki := k; ko := k;
  for i in 0..63 loop
    ki := set_byte(ki, i, get_byte(k, i) # 54);   -- 0x36
    ko := set_byte(ko, i, get_byte(k, i) # 92);   -- 0x5c
  end loop;
  return encode(sha256(ko || sha256(ki || p_msg)), 'hex');
end $$;
revoke all on function public.bb_hmac(bytea, bytea) from public, anon, authenticated;

-- כמו ב-v63_security.sql, רק הטביעה השתנתה
create or replace function public.bb_bugs_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare ip text := ''; h text; n int; sk bytea;
begin
  begin
    ip := trim(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1));
  exception when others then ip := '';
  end;
  if ip <> '' then
    select v into sk from public.bb_secret where k = 'bug_ip';
    if sk is not null then h := public.bb_hmac(sk, convert_to(ip, 'UTF8')); end if;
  end if;
  new.ip_hash := h;
  new.created_at := now();
  if new.uid is not null then
    select count(*) into n from public.bb_bugs where uid = new.uid and created_at > now() - interval '1 hour';
    if n >= 10 then raise exception 'too many bug reports, try again later'; end if;
  end if;
  if h is not null then
    select count(*) into n from public.bb_bugs where ip_hash = h and created_at > now() - interval '1 hour';
    if n >= 10 then raise exception 'too many bug reports, try again later'; end if;
  end if;
  select count(*) into n from public.bb_bugs where created_at > now() - interval '1 hour';
  if n >= 300 then raise exception 'too many bug reports, try again later'; end if;
  if new.shot is not null and (select coalesce(sum(length(shot)), 0) from public.bb_bugs where created_at > now() - interval '1 day') > 50000000 then
    new.shot := null;
  end if;
  return new;
end $$;
drop trigger if exists bb_bugs_guard on public.bb_bugs;
create trigger bb_bugs_guard before insert on public.bb_bugs for each row execute function public.bb_bugs_guard();
-- טביעות md5 ישנות (32 תווים) — כבר לא תואמות, ונמחקות
update public.bb_bugs set ip_hash = null where ip_hash is not null and length(ip_hash) <> 64;

-- ── 4. הדיווחים שלי (להורדת הנתונים) ──
create or replace function public.bb_my_bugs()
returns table (id bigint, created_at timestamptz, ver text, lang text, platform text, what text, steps text, contact text, sys jsonb, errors jsonb, shot text)
language sql stable security definer set search_path = public as $$
  select b.id, b.created_at, b.ver, b.lang, b.platform, b.what, b.steps, b.contact, b.sys, b.errors, b.shot
    from public.bb_bugs b
   where auth.uid() is not null and b.uid = auth.uid()
   order by b.id
$$;
revoke all on function public.bb_my_bugs() from public, anon;
grant execute on function public.bb_my_bugs() to authenticated;

-- ── 5. חברי קבוצה: רק שם, סמל, צבע ושדות הסיכום ──
drop policy if exists bb_profiles_team_read on public.bb_profiles;
drop policy if exists bb_matches_team_read on public.bb_matches;

create or replace function public.bb_team_profiles()
returns table (owner uuid, id text, name text, emoji text, color text, deleted boolean)
language sql stable security definer set search_path = public as $$
  select p.owner, p.id, p.name, p.emoji, p.color, p.deleted
    from public.bb_profiles p
   where p.owner in (select public.bb_teammates()) and p.owner <> auth.uid()
   order by p.owner, p.id
$$;

-- שדות הסיכום (TEAM_FIELDS ב-app/sync.js) — כל אחד כ-jsonb, כמו data->'x'
create or replace function public.bb_team_matches(p_owner uuid, p_since timestamptz default null, p_limit int default 500)
returns table (owner uuid, profile_id text, at bigint, created_at timestamptz,
  win jsonb, my jsonb, shots jsonb, hits jsonb, "avgCycle" jsonb, fouls jsonb, park jsonb, "autoPts" jsonb,
  kind jsonb, skill jsonb, drill jsonb, dv jsonb)
language sql stable security definer set search_path = public as $$
  select m.owner, m.profile_id, m.at, m.created_at,
         m.data->'win', m.data->'my', m.data->'shots', m.data->'hits', m.data->'avgCycle', m.data->'fouls', m.data->'park', m.data->'autoPts',
         m.data->'kind', m.data->'skill', m.data->'drill', m.data->'dv'
    from public.bb_matches m
   where m.owner = p_owner and p_owner <> auth.uid() and p_owner in (select public.bb_teammates())
     and (p_since is null or m.created_at >= p_since)
   order by m.created_at, m.at
   limit least(greatest(coalesce(p_limit, 500), 1), 1000)
$$;
revoke all on function public.bb_team_profiles(), public.bb_team_matches(uuid, timestamptz, int) from public, anon;
grant execute on function public.bb_team_profiles(), public.bb_team_matches(uuid, timestamptz, int) to authenticated;

-- ניקוי חד־פעמי של מה שכבר ישן
select public.bb_retention();
