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
--   2. דיווחי באגים נשמרים עד 12 חודשים: בכל דיווח חדש נמחקים דיווחים ישנים מ-12 חודשים
--      (טריגר על הוספה, פעם אחת לכל פקודה — זול, בעזרת האינדקס bb_bugs_recent על created_at). וגם ניקוי חד־פעמי כאן.

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

-- ── 2. דיווחי באגים: עד 12 חודשים ──
create or replace function public.bb_bugs_retention() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.bb_bugs where created_at < now() - interval '12 months';
  return null;
end $$;
revoke all on function public.bb_bugs_retention() from public, anon, authenticated;
drop trigger if exists bb_bugs_retention on public.bb_bugs;
create trigger bb_bugs_retention after insert on public.bb_bugs for each statement execute function public.bb_bugs_retention();
create index if not exists bb_bugs_recent on public.bb_bugs (created_at);

-- ניקוי חד־פעמי של מה שכבר ישן
delete from public.bb_bugs where created_at < now() - interval '12 months';
