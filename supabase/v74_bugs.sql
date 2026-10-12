-- BIOBUZZ v74 (אפליקציה 1.15) — דיווחי באגים: אי אפשר יותר לחסום את הדיווח לכולם.
--
-- איך מריצים:
--   1. נכנסים ל-Supabase → הפרויקט → SQL Editor → New query.
--   2. מדביקים את כל הקובץ הזה ולוחצים Run. (צריך שכבר הורצו schema.sql, v63_security.sql, v72_security.sql ו-v73_privacy.sql.)
--   3. אפשר להריץ שוב בלי נזק — create or replace / drop if exists בלבד, בלי שינוי בטבלאות.
--   האפליקציה לא תלויה בקובץ הזה: לפני ההרצה הכול עובד כמו ב-1.14.
--
-- מה משתנה (רק הפונקציה bb_bugs_guard):
--   1. הכתובת שממנה נלקחת ״טביעת ה-IP״: cf-connecting-ip אם קיים (Cloudflare קובע אותו ודורס מה שהלקוח שלח),
--      אחרת האיבר האחרון ב-x-forwarded-for — זה שהפרוקסי של השרת הוסיף. עד עכשיו נלקח האיבר הראשון, שהלקוח קובע בעצמו,
--      כך שאפשר היה לעקוף את התקרה לכל כתובת.
--   2. תקרה נפרדת לדיווחים אנונימיים (בלי חשבון): 150 בשעה לכל האנונימיים יחד. התקרה הכללית (300 בשעה) נשארת,
--      אבל דיווחים אנונימיים לבד כבר לא יכולים למלא אותה — מי שמחובר תמיד יכול לדווח (עד 10 בשעה לחשבון, כמו קודם).
--   התקרות לחשבון (10 בשעה) ולכתובת (10 בשעה), ההגבלה על צילומי מסך והטביעה עם HMAC (v73) — בלי שינוי.

create or replace function public.bb_client_ip() returns text
language plpgsql stable set search_path = public as $$
declare hd json; cf text; xff text; ip text := ''; n int;
begin
  begin hd := current_setting('request.headers', true)::json; exception when others then hd := null; end;
  if hd is null then return ''; end if;
  cf := trim(coalesce(hd->>'cf-connecting-ip', ''));
  if cf <> '' then return left(cf, 64); end if;
  xff := coalesce(hd->>'x-forwarded-for', '');
  if xff = '' then return ''; end if;
  -- האיבר האחרון בשרשרת (מה שהפרוקסי הוסיף), לא הראשון (מה שהלקוח שלח)
  n := array_length(string_to_array(xff, ','), 1);
  if n is not null then ip := trim(split_part(xff, ',', n)); end if;
  return left(coalesce(ip, ''), 64);
end $$;
revoke all on function public.bb_client_ip() from public, anon, authenticated;

create or replace function public.bb_bugs_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare ip text := ''; h text; n int; sk bytea;
begin
  begin ip := public.bb_client_ip(); exception when others then ip := ''; end;
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
  -- v74: תקרה נפרדת לאנונימיים — הם לא יכולים לבד למלא את התקרה הכללית
  if new.uid is null then
    select count(*) into n from public.bb_bugs where uid is null and created_at > now() - interval '1 hour';
    if n >= 150 then raise exception 'too many bug reports, try again later'; end if;
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
-- אינדקס לספירת האנונימיים (אם אין)
create index if not exists bb_bugs_anon_created on public.bb_bugs (created_at) where uid is null;
