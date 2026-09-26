#!/bin/bash
# עוטף את קובץ המקור ל-sim.html עם ספריות מקומיות (בלי רשת)
cd "$(dirname "$0")"
python3 - <<'PY'
import re
s=open('../biobuzz-sim.html',encoding='utf8').read()
s=re.sub(r'<script src="https://[^"]*/([A-Za-z_.]+\.js)"></script>',lambda m:'<script src="lib/%s"></script>'%m.group(1),s)
s=re.sub(r'<link rel="(preconnect|stylesheet)" href="https://fonts[^>]*>\n?','',s)
open('sim.html','w',encoding='utf8').write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+s+'\n</body></html>')
PY
echo "sim.html ready"
