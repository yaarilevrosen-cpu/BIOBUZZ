#!/bin/bash
# v81: מריץ את כל קובצי supabase/ לפי הסדר על Postgres מקומי זמני (עם תחליף מינימלי לסופאבייס), פעמיים,
# ואז את test/sql/v81_admin_test.sql. בלי Postgres מותקן — מדלג (יציאה 0) ומודיע.
cd "$(dirname "$0")"
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
if [ -z "$BIN" ] || [ ! -x "$BIN/initdb" ]; then echo "v81_admin_sql: אין Postgres מקומי — מדלג"; exit 0; fi
D=$(mktemp -d /tmp/bbpg.XXXXXX); PORT=${BB_PG_PORT:-55441}
run(){ if [ "$(id -u)" = 0 ]; then chown -R postgres "$D"; su postgres -c "$1"; else bash -c "$1"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$D"
run "$BIN/initdb -D $D/data -A trust -U postgres >/dev/null" || { echo "initdb נכשל"; exit 1; }
run "$BIN/pg_ctl -D $D/data -o '-p $PORT -k $D -c listen_addresses=' -l $D/log -w start >/dev/null" || { echo "השרת לא עלה"; cat "$D/log"; exit 1; }
trap 'run "$BIN/pg_ctl -D $D/data -m immediate stop >/dev/null 2>&1"; rm -rf "$D"' EXIT
P="psql -h $D -p $PORT -U postgres -X -q -v ON_ERROR_STOP=1"
$P -c "create database bbt" || exit 1
for pass in 1 2; do
  for f in sql/supabase_stub.sql ../supabase/schema.sql ../supabase/v63_security.sql ../supabase/v72_security.sql ../supabase/v73_privacy.sql ../supabase/v74_bugs.sql ../supabase/v78_scout_admins.sql ../supabase/v81_admin.sql; do
    $P -d bbt -f "$f" >/dev/null 2>"$D/err" || { echo "  ✗ $f נכשל (הרצה $pass)"; cat "$D/err"; exit 1; }
  done
  echo "  ✓ כל קובצי supabase/ רצים נקי, הרצה $pass"
done
OUT=$($P -d bbt -f sql/v81_admin_test.sql 2>&1); RC=$?
echo "$OUT" | grep -v '^$' | sed 's/^ok   /  ✓ /; s/^FAIL /  ✗ /'
N=$(echo "$OUT" | grep -c '^ok '); F=$(echo "$OUT" | grep -vc '^ok \|^$')
echo "v81_admin_sql: $N עברו, $F נכשלו"
[ $RC = 0 ] && [ "$F" = 0 ] && [ "$N" -ge 70 ]
