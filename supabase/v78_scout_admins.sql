-- BIOBUZZ v78 (אפליקציה 1.19) — מצב ״סקאוטינג״ רק למנהלים.
--
-- איך מריצים:
--   1. נכנסים ל-Supabase → הפרויקט → SQL Editor → New query.
--   2. מדביקים את כל הקובץ הזה ולוחצים Run. (צריך שכבר הורצו schema.sql, v63_security.sql, v72_security.sql, v73_privacy.sql ו-v74_bugs.sql.)
--   3. אפשר להריץ שוב בלי נזק — create if not exists / create or replace / drop if exists בלבד.
--   4. המנהל הראשון — שורה אחת שמריצים פעם אחת ביד (התבנית ב-docs/v78-mode.md; בלי מייל אמיתי במאגר).
--   האפליקציה לא תלויה בקובץ הזה: לפני ההרצה אף אחד לא רואה את מצב הסקאוטינג, וחלונית המנהלים אומרת שצריך להריץ אותו.
--
-- מה נוסף:
--   1. טבלה bb_scout_admins — מי מנהל סקאוטינג. שורה = חשבון אחד. מחיקת החשבון (bb_delete_me) מוחקת גם את השורה (cascade).
--      row level security מופעל כאן, באותו קובץ (החלטה 03). מחובר רואה רק את השורה של עצמו; אין הרשאת כתיבה ישירה לאף אחד —
--      הוספה והסרה רק דרך הפונקציות למטה.
--   2. ארבע פונקציות (security definer, search_path קבוע, רק למחוברים — לא לאנונימיים):
--      bb_scout_is_admin()          — האם החשבון המחובר מנהל.
--      bb_scout_admins_list()       — רשימת המנהלים (מזהה, מייל, מתי נוסף). רק למנהל.
--      bb_scout_admin_add(p_email)  — מוסיף מנהל לפי המייל של החשבון שלו. רק למנהל. בלי חשבון כזה — 'no_account'. פעמיים — בלי שגיאה.
--      bb_scout_admin_remove(p_user)— מסיר מנהל. רק למנהל. את המנהל האחרון אי אפשר להסיר — 'last_admin'.
--   השגיאות הן הודעות קבועות באנגלית ('not signed in', 'not_admin', 'no_account', 'last_admin') — האפליקציה מתרגמת אותן.
--   בכוונה בלי errcode מיוחד: P0001 (ברירת המחדל) חוזר מהשרת כ-400. קוד אחר (למשל P0002) חוזר כ-404,
--   והאפליקציה הייתה חושבת שהפונקציה חסרה בשרת.
--
-- מה לא משתנה: שום טבלה או מדיניות קיימת. בלי service_role — רק המפתח הציבורי (anon) הקיים והחשבון המחובר (החלטה 03).
-- גבול האבטחה: הטבלה קובעת מי רואה את מצב הסקאוטינג באפליקציה. הנתונים עצמם (של 04) מוגנים בחשבון הקריאה של 04,
-- שרק מנהלים מקבלים — הסימולטור הוא קובץ פתוח, ולכן ההסתרה בו היא גבול של גישה ונוחות, לא הצפנה.

-- ── 1. הטבלה ──
create table if not exists public.bb_scout_admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  -- מי הוסיף. חשבון שנמחק — נשאר ריק (לא מזהה של חשבון שכבר לא קיים)
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now()
);
alter table public.bb_scout_admins enable row level security;
-- סופאבייס נותן כברירת מחדל את כל ההרשאות על טבלה חדשה ל-anon ול-authenticated — לוקחים הכול, ומחזירים רק קריאה למחוברים
revoke all on public.bb_scout_admins from public, anon, authenticated;
grant select on public.bb_scout_admins to authenticated;
drop policy if exists bb_scout_admins_self on public.bb_scout_admins;
create policy bb_scout_admins_self on public.bb_scout_admins for select to authenticated using (user_id = auth.uid());

-- ── 2. הפונקציות ──
create or replace function public.bb_scout_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.bb_scout_admins a where a.user_id = auth.uid());
$$;

create or replace function public.bb_scout_admins_list()
returns table (user_id uuid, email text, added_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.bb_scout_is_admin() then raise exception 'not_admin'; end if;
  return query
    select a.user_id, u.email::text, a.added_at
    from public.bb_scout_admins a join auth.users u on u.id = a.user_id
    order by a.added_at, a.user_id;
end $$;

create or replace function public.bb_scout_admin_add(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid; em text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.bb_scout_is_admin() then raise exception 'not_admin'; end if;
  if em = '' or length(em) > 320 then raise exception 'no_account'; end if;
  select u.id into v from auth.users u where lower(u.email) = em limit 1;
  if v is null then raise exception 'no_account'; end if;
  -- כבר מנהל — בלי שגיאה ובלי לשנות מי הוסיף ומתי
  insert into public.bb_scout_admins (user_id, added_by) values (v, auth.uid()) on conflict (user_id) do nothing;
end $$;

create or replace function public.bb_scout_admin_remove(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.bb_scout_is_admin() then raise exception 'not_admin'; end if;
  -- נעילה: שני מנהלים שמסירים זה את זה באותו רגע לא משאירים טבלה ריקה
  lock table public.bb_scout_admins in share row exclusive mode;
  if not exists (select 1 from public.bb_scout_admins a where a.user_id = p_user) then return; end if;
  if (select count(*) from public.bb_scout_admins) <= 1 then raise exception 'last_admin'; end if;
  delete from public.bb_scout_admins a where a.user_id = p_user;
end $$;

-- רק מחוברים. לא לכולם (public) ולא לאנונימיים (anon)
revoke all on function public.bb_scout_is_admin(), public.bb_scout_admins_list(), public.bb_scout_admin_add(text),
  public.bb_scout_admin_remove(uuid) from public, anon;
grant execute on function public.bb_scout_is_admin(), public.bb_scout_admins_list(), public.bb_scout_admin_add(text),
  public.bb_scout_admin_remove(uuid) to authenticated;
