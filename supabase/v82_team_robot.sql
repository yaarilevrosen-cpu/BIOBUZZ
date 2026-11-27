-- BIOBUZZ v82 (אפליקציה 1.22) — הרובוט האמיתי של הקבוצה: בעל הקבוצה מעלה, כל חברי הקבוצה רואים.
--
-- איך מריצים:
--   1. נכנסים ל-Supabase → הפרויקט → SQL Editor → New query.
--   2. מדביקים את כל הקובץ הזה ולוחצים Run. (צריך שכבר הורצו schema.sql, v63_security.sql, v72_security.sql,
--      v73_privacy.sql, v74_bugs.sql, v78_scout_admins.sql ו-v81_admin.sql.)
--   3. אפשר להריץ שוב בלי נזק — create if not exists / on conflict / create or replace / drop if exists בלבד.
--   האפליקציה לא תלויה בקובץ הזה: לפני ההרצה הכפתור אומר שצריך להריץ אותו, וכל השאר עובד כמו ב-1.21.
--
-- מי רואה מה:
--   • בעל הקבוצה (bb_teams.owner) — מעלה, מחליף ומוחק את הרובוט של הקבוצה. רק הוא.
--   • כל חבר בקבוצה — קורא את הרובוט (הנתונים והמודל). מי שלא בקבוצה — לא רואה כלום, גם לא שיש רובוט.
--   • חשבון חסום (bb_blocked) — לא קורא ולא כותב.
--
-- מה נוסף:
--   1. bb_team_robot — שורה אחת לכל קבוצה: מספר הגרסה של 02, הנתונים (הג׳ייסון, עד 512 ק״ב), הנתיב של המודל, מי העלה ומתי.
--      בלי הרשאה ישירה לאף תפקיד ציבורי — רק דרך הפונקציות.
--   2. דלי פרטי team-robots באחסון (לא ציבורי, עד 12 מ״ב לקובץ, רק glb). הנתיב: <team_id>/robot-v<גרסה>.glb.
--      מדיניות על storage.objects: חבר קורא רק את התיקייה של הקבוצה שלו; רק הבעלים כותב, מחליף ומוחק בה.
--   3. bb_team_robot_get() — חבר בקבוצה: { ver, data, path, size, updated_at, mine } או null.
--      bb_team_robot_set(p_ver, p_data, p_path, p_size) — רק הבעלים.
--      bb_team_robot_clear() — רק הבעלים (מוחק את השורה; את הקובץ מוחקת האפליקציה).
--   השגיאות הן הודעות קבועות באנגלית — האפליקציה מתרגמת אותן:
--      'not signed in', 'blocked', 'no_team', 'not_owner', 'bad_robot' (פורמט, גרסה, גודל או נתיב לא תקינים).
--
-- בלי service_role — רק המפתח הציבורי (anon) הקיים והחשבון המחובר (החלטה 03). בלי נתוני רובוט בקובץ.

-- ── 1. הטבלה ──
create table if not exists public.bb_team_robot (
  team_id uuid primary key references public.bb_teams(id) on delete cascade,
  ver integer not null check (ver between 1 and 100000),
  data jsonb not null,
  path text not null,
  size integer not null check (size between 1 and 12582912),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.bb_team_robot enable row level security;
revoke all on public.bb_team_robot from anon, authenticated;

-- ── 2. הדלי והמדיניות באחסון ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-robots', 'team-robots', false, 12582912, array['model/gltf-binary'])
on conflict (id) do update set public = false, file_size_limit = 12582912, allowed_mime_types = array['model/gltf-binary'];

create or replace function public.bb_team_robot_owner(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bb_teams t where t.id = p_team and t.owner = auth.uid())
     and not exists (select 1 from public.bb_blocked b where b.user_id = auth.uid())
$$;
create or replace function public.bb_team_robot_member(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_team is not null and p_team = public.bb_my_team()
     and not exists (select 1 from public.bb_blocked b where b.user_id = auth.uid())
$$;
revoke all on function public.bb_team_robot_owner(uuid), public.bb_team_robot_member(uuid) from public, anon;
grant execute on function public.bb_team_robot_owner(uuid), public.bb_team_robot_member(uuid) to authenticated;

-- התיקייה הראשונה בנתיב היא מזהה הקבוצה. נתיב שלא מתחיל במזהה תקין — אף אחד לא עובר.
create or replace function public.bb_team_robot_dir(p_name text) returns uuid
language plpgsql immutable as $$
declare d text := split_part(coalesce(p_name, ''), '/', 1);
begin
  if d ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return d::uuid; end if;
  return null;
end $$;
grant execute on function public.bb_team_robot_dir(text) to authenticated;

drop policy if exists bb_team_robot_read on storage.objects;
create policy bb_team_robot_read on storage.objects for select to authenticated
  using (bucket_id = 'team-robots' and public.bb_team_robot_member(public.bb_team_robot_dir(name)));
drop policy if exists bb_team_robot_insert on storage.objects;
create policy bb_team_robot_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'team-robots' and public.bb_team_robot_owner(public.bb_team_robot_dir(name)));
drop policy if exists bb_team_robot_update on storage.objects;
create policy bb_team_robot_update on storage.objects for update to authenticated
  using (bucket_id = 'team-robots' and public.bb_team_robot_owner(public.bb_team_robot_dir(name)))
  with check (bucket_id = 'team-robots' and public.bb_team_robot_owner(public.bb_team_robot_dir(name)));
drop policy if exists bb_team_robot_delete on storage.objects;
create policy bb_team_robot_delete on storage.objects for delete to authenticated
  using (bucket_id = 'team-robots' and public.bb_team_robot_owner(public.bb_team_robot_dir(name)));

-- ── 3. הפונקציות ──
create or replace function public.bb_team_robot_get() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t uuid := public.bb_my_team(); r public.bb_team_robot;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.bb_blocked b where b.user_id = auth.uid()) then raise exception 'blocked'; end if;
  if t is null then return null; end if;
  select * into r from public.bb_team_robot where team_id = t;
  if not found then return jsonb_build_object('team', t, 'mine', public.bb_team_robot_owner(t)); end if;
  return jsonb_build_object('team', t, 'ver', r.ver, 'data', r.data, 'path', r.path, 'size', r.size,
    'updated_at', r.updated_at, 'mine', public.bb_team_robot_owner(t));
end $$;

create or replace function public.bb_team_robot_set(p_ver integer, p_data jsonb, p_path text, p_size integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid := public.bb_my_team();
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.bb_blocked b where b.user_id = auth.uid()) then raise exception 'blocked'; end if;
  if t is null then raise exception 'no_team'; end if;
  if not public.bb_team_robot_owner(t) then raise exception 'not_owner'; end if;
  if p_ver is null or p_ver < 1 or p_ver > 100000 or p_data is null or jsonb_typeof(p_data) <> 'object'
     or p_data->>'format' is distinct from 'apollo9662-robot/1'
     or pg_column_size(p_data) > 524288
     or p_path is distinct from (t::text || '/robot-v' || p_ver || '.glb')
     or p_size is null or p_size < 1 or p_size > 12582912 then raise exception 'bad_robot'; end if;
  insert into public.bb_team_robot (team_id, ver, data, path, size, updated_by, updated_at)
  values (t, p_ver, p_data, p_path, p_size, auth.uid(), now())
  on conflict (team_id) do update set ver = excluded.ver, data = excluded.data, path = excluded.path,
    size = excluded.size, updated_by = excluded.updated_by, updated_at = now();
  return public.bb_team_robot_get();
end $$;

create or replace function public.bb_team_robot_clear() returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := public.bb_my_team();
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if t is null then raise exception 'no_team'; end if;
  if not public.bb_team_robot_owner(t) then raise exception 'not_owner'; end if;
  delete from public.bb_team_robot where team_id = t;
end $$;

revoke all on function public.bb_team_robot_get(), public.bb_team_robot_set(integer, jsonb, text, integer),
  public.bb_team_robot_clear() from public, anon;
grant execute on function public.bb_team_robot_get(), public.bb_team_robot_set(integer, jsonb, text, integer),
  public.bb_team_robot_clear() to authenticated;
