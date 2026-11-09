-- BIOBUZZ v78 (אפליקציה 1.19) — מצב ״סקאוטינג״ רק למנהלים, בשלוש דרגות.
--
-- איך מריצים:
--   1. נכנסים ל-Supabase → הפרויקט → SQL Editor → New query.
--   2. מדביקים את כל הקובץ הזה ולוחצים Run. (צריך שכבר הורצו schema.sql, v63_security.sql, v72_security.sql, v73_privacy.sql ו-v74_bugs.sql.)
--   3. אפשר להריץ שוב בלי נזק — create if not exists / add column if not exists / create or replace / drop if exists בלבד.
--   4. הבעלים הראשון — שורה אחת שמריצים פעם אחת ביד (התבנית ב-docs/v78-mode.md; בלי מייל אמיתי במאגר).
--   האפליקציה לא תלויה בקובץ הזה: לפני ההרצה אף אחד לא רואה את מצב הסקאוטינג, וחלונית המנהלים אומרת שצריך להריץ אותו.
--
-- הדרגות (טבלה bb_scout_admins, שורה = חשבון אחד):
--   • בעלים (role='owner') — מוסיף ומסיר כל מנהל, נותן ולוקח את ״יכול להוסיף מנהלים״ (can_invite), ורק הוא יכול
--     להפוך מנהל לבעלים (bb_scout_admin_set). את הבעלים האחרון אי אפשר להסיר ולא להוריד לדרגת מנהל.
--   • מנהל עם can_invite — מוסיף מנהלים (תמיד role='admin', can_invite=false — את ההרשאה אי אפשר להעביר הלאה),
--     ומסיר רק את מי שהוא עצמו הוסיף (added_by = הוא). לא משנה can_invite של אף אחד.
--   • מנהל בלי can_invite — רק מצב הסקאוטינג ורשימת המנהלים לקריאה. בלי הוספה והסרה.
--
-- מה נוסף:
--   1. הטבלה bb_scout_admins — row level security מופעל כאן, באותו קובץ (החלטה 03). מחובר רואה רק את השורה של עצמו;
--      אין הרשאת כתיבה ישירה לאף אחד — הכול דרך הפונקציות. מחיקת החשבון (bb_delete_me) מוחקת גם את השורה (cascade).
--   2. חמש פונקציות (security definer, search_path קבוע, רק למחוברים — לא לאנונימיים):
--      bb_scout_is_admin()                              — האם החשבון המחובר מנהל (כל דרגה).
--      bb_scout_admins_list()                           — כל המנהלים: מייל, דרגה, can_invite, מתי ומי הוסיף. לכל מנהל (לקריאה).
--      bb_scout_admin_add(p_email)                      — בעלים או מנהל עם can_invite. מוסיף role='admin', can_invite=false.
--      bb_scout_admin_remove(p_user)                    — בעלים: כל אחד (חוץ מהבעלים האחרון); מנהל עם can_invite: רק מי שהוא הוסיף.
--      bb_scout_admin_set(p_user, p_can_invite, p_owner)— רק בעלים. p_can_invite / p_owner = null — בלי שינוי בשדה הזה.
--   השגיאות הן הודעות קבועות באנגלית — האפליקציה מתרגמת אותן:
--      'not signed in', 'not_admin' (לא מנהל), 'not_allowed' (אין הרשאה להוסיף), 'not_allowed_remove' (לא מי שהוספת),
--      'not_owner' (רק בעלים), 'no_account' (אין חשבון עם המייל), 'not_found' (לא מנהל), 'last_owner', 'last_admin'.
--   בכוונה בלי errcode מיוחד: P0001 (ברירת המחדל) חוזר מהשרת כ-400. קוד אחר (למשל P0002) חוזר כ-404,
--   והאפליקציה הייתה חושבת שהפונקציה חסרה בשרת.
--
-- מה לא משתנה: שום טבלה או מדיניות קיימת. בלי service_role — רק המפתח הציבורי (anon) הקיים והחשבון המחובר (החלטה 03).
-- גבול האבטחה: הטבלה קובעת מי רואה את מצב הסקאוטינג באפליקציה. הנתונים עצמם (של 04) מוגנים בחשבון הקריאה של 04,
-- שרק מנהלים מקבלים — הסימולטור הוא קובץ פתוח, ולכן ההסתרה בו היא גבול של גישה ונוחות, לא הצפנה.

-- ── 1. הטבלה ──
create table if not exists public.bb_scout_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('owner', 'admin')),
  can_invite boolean not null default false,
  -- מי הוסיף. חשבון שנמחק — נשאר ריק (לא מזהה של חשבון שכבר לא קיים)
  added_by   uuid references auth.users(id) on delete set null,
  added_at   timestamptz not null default now()
);
-- הרצה שנייה על טבלה מגרסת טיוטה בלי הדרגות
alter table public.bb_scout_admins add column if not exists role text not null default 'admin';
alter table public.bb_scout_admins add column if not exists can_invite boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bb_scout_admins_role_ok') then
    alter table public.bb_scout_admins add constraint bb_scout_admins_role_ok check (role in ('owner', 'admin'));
  end if;
end $$;
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

-- מחיקה ויצירה מחדש: אם הוחלפו העמודות שהיא מחזירה, create or replace לבד נכשל (ההרשאות ניתנות שוב למטה)
drop function if exists public.bb_scout_admins_list();
create or replace function public.bb_scout_admins_list()
returns table (user_id uuid, email text, role text, can_invite boolean, added_at timestamptz, added_by uuid, added_by_email text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.bb_scout_is_admin() then raise exception 'not_admin'; end if;
  return query
    select a.user_id, u.email::text, a.role, a.can_invite, a.added_at, a.added_by, b.email::text
    from public.bb_scout_admins a
    join auth.users u on u.id = a.user_id
    left join auth.users b on b.id = a.added_by
    order by (a.role = 'owner') desc, a.added_at, a.user_id;
end $$;

create or replace function public.bb_scout_admin_add(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.bb_scout_admins; v uuid; em text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into me from public.bb_scout_admins a where a.user_id = auth.uid();
  if not found then raise exception 'not_admin'; end if;
  if me.role <> 'owner' and not me.can_invite then raise exception 'not_allowed'; end if;
  if em = '' or length(em) > 320 then raise exception 'no_account'; end if;
  select u.id into v from auth.users u where lower(u.email) = em limit 1;
  if v is null then raise exception 'no_account'; end if;
  -- מנהל חדש תמיד ״מנהל״ בלי can_invite — גם כשבעלים מוסיף (את ההרשאה נותנים אחר כך, ב-bb_scout_admin_set).
  -- כבר מנהל — בלי שגיאה ובלי לשנות את הדרגה, ההרשאה, מי הוסיף ומתי
  insert into public.bb_scout_admins (user_id, role, can_invite, added_by) values (v, 'admin', false, auth.uid())
    on conflict (user_id) do nothing;
end $$;

create or replace function public.bb_scout_admin_remove(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me public.bb_scout_admins; t public.bb_scout_admins;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  -- נעילה: שתי הסרות באותו רגע לא משאירות טבלה בלי בעלים
  lock table public.bb_scout_admins in share row exclusive mode;
  select * into me from public.bb_scout_admins a where a.user_id = auth.uid();
  if not found then raise exception 'not_admin'; end if;
  select * into t from public.bb_scout_admins a where a.user_id = p_user;
  if not found then return; end if;
  if me.role <> 'owner' then
    if not me.can_invite then raise exception 'not_allowed'; end if;
    -- מנהל עם can_invite: רק מי שהוא עצמו הוסיף, ורק בדרגת מנהל
    if t.added_by is distinct from auth.uid() or t.role <> 'admin' then raise exception 'not_allowed_remove'; end if;
  end if;
  if t.role = 'owner' and (select count(*) from public.bb_scout_admins a where a.role = 'owner') <= 1 then raise exception 'last_owner'; end if;
  if (select count(*) from public.bb_scout_admins) <= 1 then raise exception 'last_admin'; end if;
  delete from public.bb_scout_admins a where a.user_id = p_user;
end $$;

create or replace function public.bb_scout_admin_set(p_user uuid, p_can_invite boolean, p_owner boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me public.bb_scout_admins; t public.bb_scout_admins; r text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  lock table public.bb_scout_admins in share row exclusive mode;
  select * into me from public.bb_scout_admins a where a.user_id = auth.uid();
  if not found then raise exception 'not_admin'; end if;
  if me.role <> 'owner' then raise exception 'not_owner'; end if;
  select * into t from public.bb_scout_admins a where a.user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  r := case p_owner when true then 'owner' when false then 'admin' else t.role end;
  if t.role = 'owner' and r = 'admin' and (select count(*) from public.bb_scout_admins a where a.role = 'owner') <= 1 then raise exception 'last_owner'; end if;
  -- בעלים תמיד יכול להוסיף; מנהל — מה שנבחר (null = בלי שינוי; מבעלים למנהל בלי בחירה — בלי הרשאה)
  update public.bb_scout_admins a set role = r,
    can_invite = case when r = 'owner' then true when t.role = 'owner' then coalesce(p_can_invite, false) else coalesce(p_can_invite, t.can_invite) end
  where a.user_id = p_user;
end $$;

-- רק מחוברים. לא לכולם (public) ולא לאנונימיים (anon)
revoke all on function public.bb_scout_is_admin(), public.bb_scout_admins_list(), public.bb_scout_admin_add(text),
  public.bb_scout_admin_remove(uuid), public.bb_scout_admin_set(uuid, boolean, boolean) from public, anon;
grant execute on function public.bb_scout_is_admin(), public.bb_scout_admins_list(), public.bb_scout_admin_add(text),
  public.bb_scout_admin_remove(uuid), public.bb_scout_admin_set(uuid, boolean, boolean) to authenticated;
