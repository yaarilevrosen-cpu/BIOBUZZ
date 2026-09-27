# 🐝 BIOBUZZ — סימולטור שדה ל-FTC

סימולטור תלת־ממדי של זירת FTC BIOBUZZ: נהיגה, אוטונומי, בוטים, מאץ׳ מלא עם שופט, מסך מפוצל, משחק ברשת וסטטיסטיקות.
רץ **בדפדפן** (קובץ HTML אחד) וגם **כאפליקציה ל-Windows, מק ולינוקס** — עם נהגים, ארכיון מאצ׳ים וטבלת קבוצה.

**דף הורדה:** https://yaarilevrosen-cpu.github.io/BIOBUZZ/ — בוחר לבד את הקובץ המתאים למחשב.

## להוריד ולשחק
- **אפליקציה:** בלשונית **Releases** — `BIOBUZZ-Setup-x.y.z.exe` (מתקין) או `BIOBUZZ-x.y.z-portable.exe` (בלי התקנה, הנתונים נשמרים ליד הקובץ — טוב לדיסק און קי).
  בהפעלה הראשונה Windows עשוי להציג ״Windows הגן על המחשב״ → **מידע נוסף** → **הפעל בכל זאת** (האפליקציה לא חתומה).
- **מק:** `BIOBUZZ-x.y.z-mac-arm64.dmg` (שבב של אפל, M1 ומעלה) או `…-mac-x64.dmg` (אינטל). גוררים ל-Applications.
  בפעם הראשונה מק חוסם (לא חתום אצל אפל): **הגדרות המערכת ← פרטיות ואבטחה ← ״פתח בכל זאת״**. אם כתוב שהקובץ ״פגום״ — פעם אחת בטרמינל: `xattr -dr com.apple.quarantine /Applications/BIOBUZZ.app`
- **לינוקס:** `BIOBUZZ-x.y.z-linux-amd64.deb` (`sudo apt install ./BIOBUZZ-*.deb`) או `…-linux-x86_64.AppImage` (`chmod +x` ומריצים; באובונטו 24.04 ומעלה אם לא עולה — להוסיף `--no-sandbox`).
- **עדכונים:** ב-Windows וב-AppImage — מתעדכן לבד. במק וב-deb — האפליקציה מודיעה ומקשרת להורדה.
- **איפה הנתונים:** Windows `%APPDATA%\BIOBUZZ\data` · מק `~/Library/Application Support/BIOBUZZ/data` · לינוקס `~/.config/BIOBUZZ/data`
- **דפדפן:** `dist/BIOBUZZ-lab.html` אחרי בנייה (ראו למטה) — פותחים בכרום.

## מבנה
| תיקייה | מה יש שם |
|---|---|
| `biobuzz-sim.html` | **כל הסימולטור** — קובץ המקור היחיד |
| `build.py`, `build_standalone.py`, `build/` | בנייה לקובץ בודד בלי רשת (ספריות, גופנים ו-CAD מוטמעים) |
| `cad/` | המודל הרשמי של הזירה |
| `app/` | האפליקציה (Electron): `main.js` חלון ונתונים, `store.js` נהגים וארכיון, `sync.js` סנכרון בענן, `bridge.js` גשר מובנה (טלפון ורשת), `preload.js` הגשר לדף |
| `supabase/` | מבנה מסד הנתונים לסנכרון (Supabase) |
| `pad/` | גשר השלט והטלפון (`start.bat`) |
| `test/` | בדיקות אוטומטיות (Playwright) |
| `docs/` | תכנון, החלטות והיסטוריה |

## בנייה
```bash
python build.py                       # dist/BIOBUZZ-lab.html + dist/BIOBUZZ-lab-lite.html
cp dist/BIOBUZZ-lab.html app/sim/index.html
cd app && npm ci && npm start         # להריץ את האפליקציה
npm run dist:win                      # EXE (ב-Windows; בלינוקס צריך wine)
npm run dist:mac                      # DMG (רק על מק)
npm run dist:linux                    # AppImage + deb (בלינוקס)
```

## בדיקות
```bash
cd test && npm install && npx playwright install chromium && ./mk.sh
python3 -m http.server 8899 &          # מתוך test/
node smoke.mjs && node v52_test.mjs    # וכל *_test.mjs
xvfb-run -a node app_test.mjs          # האפליקציה עצמה (בלינוקס)
```

## גרסה חדשה
```bash
git tag v1.2.0 && git push origin v1.2.0
```
גיטהאב בונה, מפרסם ב-Releases — והאפליקציות המותקנות מורידות ומציעות ״התקן והפעל מחדש״ לבד.

## בנייה אוטומטית (GitHub Actions)
- כל דחיפה ל-`main` — מריצה את הבדיקות ובונה ל-Windows, מק ולינוקס (להורדה מ-Actions ← Artifacts). בלינוקס — גם בדיקה שהאפליקציה הארוזה עולה; במק — שהיא נפתחת ולא קורסת.
- תגית `v*` (למשל `v1.6.0`) — יוצרת **Release** אחד עם כל הקבצים: שני EXE, שני DMG, AppImage ו-deb.

## דיווח על באגים
באפליקציה ובדפדפן: כפתור 🐞 בכותרת (או בהגדרות). הדיווח נשלח עם צילום מסך ופרטי מערכת. אפשר גם לפתוח דיווח כאן בגיטהאב.

## שפה
כפתור EN / עב בכותרת מחליף בין עברית לאנגלית. הזהות של הקבוצה (שם ומספר) נקבעת במסך הפתיחה או בהגדרות.

---
BIOBUZZ · FTC · עברית / English
