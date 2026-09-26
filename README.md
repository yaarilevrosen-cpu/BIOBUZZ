# 🐝 BIOBUZZ — הסימולטור של אפולו 9662

סימולטור תלת־ממדי של זירת FTC BIOBUZZ: נהיגה, אוטונומי, בוטים, מאץ׳ מלא עם שופט, מסך מפוצל, משחק ברשת וסטטיסטיקות.
רץ **בדפדפן** (קובץ HTML אחד) וגם **כאפליקציה ל-Windows** — עם נהגים, ארכיון מאצ׳ים וטבלת קבוצה.

## להוריד ולשחק
- **אפליקציה:** בלשונית **Releases** — `BIOBUZZ-Setup-x.y.z.exe` (מתקין) או `BIOBUZZ-x.y.z-portable.exe` (בלי התקנה, הנתונים נשמרים ליד הקובץ — טוב לדיסק און קי).
  בהפעלה הראשונה Windows עשוי להציג ״Windows הגן על המחשב״ → **מידע נוסף** → **הפעל בכל זאת** (האפליקציה לא חתומה).
- **דפדפן:** `dist/BIOBUZZ-lab.html` אחרי בנייה (ראו למטה) — פותחים בכרום.

## מבנה
| תיקייה | מה יש שם |
|---|---|
| `biobuzz-sim.html` | **כל הסימולטור** — קובץ המקור היחיד |
| `build.py`, `build_standalone.py`, `build/` | בנייה לקובץ בודד בלי רשת (ספריות, גופנים ו-CAD מוטמעים) |
| `cad/` | המודל הרשמי של הזירה |
| `app/` | האפליקציה (Electron): `main.js` חלון ונתונים, `store.js` נהגים וארכיון, `preload.js` הגשר |
| `pad/` | גשר השלט והטלפון (`start.bat`) |
| `test/` | בדיקות אוטומטיות (Playwright) |
| `docs/` | תכנון, החלטות והיסטוריה |

## בנייה
```bash
python build.py                       # dist/BIOBUZZ-lab.html + dist/BIOBUZZ-lab-lite.html
cp dist/BIOBUZZ-lab.html app/sim/index.html
cd app && npm ci && npm start         # להריץ את האפליקציה
npx electron-builder --win --x64      # EXE (ב-Windows; בלינוקס צריך wine)
```

## בדיקות
```bash
cd test && npm install && npx playwright install chromium && ./mk.sh
python3 -m http.server 8899 &          # מתוך test/
node smoke.mjs && node v52_test.mjs    # וכל *_test.mjs
xvfb-run -a node app_test.mjs          # האפליקציה עצמה (בלינוקס)
```

## בנייה אוטומטית (GitHub Actions)
- כל דחיפה ל-`main` — מריצה את הבדיקות ובונה EXE (להורדה מ-Actions ← Artifacts).
- תגית `v*` (למשל `v1.0.0`) — יוצרת **Release** עם שני קובצי ה-EXE.

---
אפולו #9662 · FTC
