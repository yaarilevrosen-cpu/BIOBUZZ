# מוכנות משפטית להשקה ציבורית — BIOBUZZ 1.14.0 (v73)

**תאריך:** 9 באוקטובר 2026 · **גרסת המסמכים:** 2026-10-09 (legal/VERSION)

**חשוב:** את המסמכים כתבנו בלי עורך דין. הם מנסים להיות כנים, ברורים ומדויקים לגבי מה שהקוד באמת עושה, אבל הם **לא עברו בדיקה משפטית**. לפני השקה ציבורית צריך שמבוגר אחראי ועורך דין (או הגורם המשפטי של בית הספר או של העמותה שמפעילה את הקבוצה) יעברו עליהם — ראו סעיף א׳ ברשימת הפתוחים.

---

## מה נעשה

- **מסמכים בעברית ובאנגלית** בתיקייה legal: מדיניות פרטיות, תנאי שימוש, הודעה על בינה מלאכותית, מדיניות אבטחה, הצהרת נגישות; והודעות על תוכנות צד שלישי באנגלית עם הטקסט המלא של כל רישיון.
- **קובצי הפניה בשורש המאגר:** PRIVACY.md‏, TERMS.md‏, SECURITY.md‏, THIRD_PARTY_NOTICES.md.
- **בדיקת עובדות מול הקוד:** עברנו על app/*.js‏, biobuzz-sim.html‏, supabase/*.sql‏, pad‏, build.py ו־build_standalone.py‏, site/index.html ותלויות האפליקציה. מה שהקוד אומר אחרת מהתדריך — בסעיף הבא.
- **בדיקת מקורות חיצוניים:** תנאי ממשק ג׳מיני, מדיניות הקניין הרוחני של FIRST, הסכם עיבוד הנתונים וספקי המשנה של סופאבייס, פרטיות בדפי גיטהאב, תיקון 13, חוק הפרטיות של ילדים בארצות הברית, נגישות, חתימת קוד. המקורות בסוף.

## מה הקוד אומר אחרת מהתדריך (תיקונים)

- **הבינה המלאכותית שולחת שמות.** התדריך אומר ״רק מספרים״. בפועל: המאמן לנהג אחד שולח את שם הנהג; ״נתח את הקבוצה״ שולח את שמות כל הנהגים של חברי הקבוצה ואת שם הקבוצה (מקוצרים ל־24 תווים ומנוקים, ai.js‏ cleanSummary); והעוזר החכם הוא צ׳אט חופשי — כל מה שהמשתמש מקליד (עד 12 הודעות של עד 2,000 תווים) נשלח לגוגל. רק ההסבר של המתכנן שולח מספרים בלבד. המסמכים מתארים את המצב האמיתי; מומלץ לתקן בקוד (דרישה 10) ואז לפשט את הנוסח.
- **חברי קבוצה יכולים לקרוא הכול, לא רק סיכום.** ההרשאות bb_profiles_team_read ו־bb_matches_team_read ב־schema.sql מתירות לחבר קבוצה לקרוא את כל השורה — כולל kv (מקשים, פרמטרים, מסלולים) ו־data המלא של המשחק (עקבות sh/bl). האפליקציה מורידה רק סיכום (sync.js‏, TEAM_FIELDS), אבל כל חבר יכול לקרוא את השאר ישירות דרך הממשק. המסמכים אומרים את זה בגלוי; מומלץ לתקן (דרישה 9).
- **מחיקת נהג לא מוחקת את המשחקים שלו בענן.** sync.js כותב רק ״מצבה״ (deleted=true, kv ריק, שם ריק) ואין בשום מקום פקודת DELETE ל־bb_matches. המסמכים מבטיחים שהמשחקים נמחקים — צריך לממש (דרישה 8).
- **דיווחי באגים לא נמחקים יחד עם החשבון.** לעמודה bb_bugs.uid אין מפתח זר עם on delete cascade, לכן מחיקת משתמש ב־auth.users משאירה את הדיווחים שלו. צריך למחוק אותם במפורש (דרישה 1).
- **דיווחי באגים שומרים קוד מעורבל של כתובת ה־IP** (md5 עם מלח קבוע, v63_security.sql) — לא כתובת גולמית. זה פרט שלא היה בתדריך ונכנס למדיניות. שימו לב: md5 של כתובת IPv4 עם מלח ידוע ניתן לפיצוח בקלות, אז בפועל זה מידע אישי (מוצפן חלש). מומלץ להחליף למלח סודי בצד השרת או לגיבוב עם מפתח.
- **״אפס הכול״ לא מוחק הכול.** לפני איפוס נשמר גיבוי לבד (בדפדפן עד 6 ב־bbBackups1; באפליקציה backups/). בנוסף באפליקציה: גיבוי יומי שנשמר 14 יום, ועד 10 גיבויים לפני פעולות מסוכנות (store.js). הסרת התקנה לא מוחקת את תיקיית הנתונים (deleteAppDataOnUninstall: false). המסמכים מסבירים איך מוחקים לגמרי; מומלץ להוסיף כפתור ״מחק הכול כולל גיבויים״ (דרישה 11).
- **גופנים וספריות:** קובץ המקור biobuzz-sim.html טוען ספריות מ־cdnjs ומ־jsDelivr וגופנים מגוגל. אבל כל מה שמופץ (dist/BIOBUZZ-lab.html והאפליקציה) מטמיע את כולם ואת מודל הזירה, ולא פונה לשום שרת חיצוני (build_standalone.py). לכן גוגל לא מקבלת מידע בגלל גופנים. אם יום אחד יפרסמו את קובץ המקור כמו שהוא — צריך להוסיף את זה למדיניות.
- **רכיבים נוספים שלא היו בתדריך:** מחולל קודי QR (קזוהיקו אראסה, רישיון MIT) בתוך הסימולטור; בתלויות של האפליקציה יש גם רישיונות ISC‏ (semver‏, graceful-fs), ‏Blue Oak‏ (sax) ו־Python‏ (argparse) — כולם נכנסו להודעות.
- **מודל הזירה עבר המרה:** הוא מגיע מאונשייפ (״am-5850 BIOBUZZ״), הומר ל־glTF דחוס (glTF-Transform ו־meshopt) וחולק לשלושה חלקים. התכנון לא השתנה, אבל זו לא העתקה ״כמו שהיא״ — ומדיניות FIRST אוסרת שימוש בחומרים שלה ״בצורה משונה״. לכן השאלה ל־FIRST חשובה (סעיף ב׳).
- **BIOBUZZ הוא שם המשחק של העונה, וגם שם האפליקציה.** זה מעבר לשימוש בשם בתיאור — האפליקציה כולה נקראת על שם סימן מסחרי של FIRST. נכלל בשאלה ל־FIRST.
- **בדיקת עדכונים קורית לבד** 8 שניות אחרי הפתיחה (main.js), ואין הגדרה לכבות אותה. המסמכים אומרים את זה.
- **משחק ברשת:** אין שום שרת ממסר בענן — רק הגשר המקומי (HTTP ו־WebSocket לא מוצפנים בתוך הרשת המקומית, עם מפתח חדר של 32 סיביות וקוד סודי). אומת.
- **אין כלי ניתוח או מעקב.** המילה ״טלמטריה״ בקוד מתייחסת רק לנתוני הרובוט. אומת.
- **חשבונות ובינה מלאכותית קיימים רק באפליקציה.** בגרסת הדפדפן אין התחברות; יש רק דיווח באגים אנונימי.

## מה המסמכים מבטיחים — רשימה למי שמממש את האפליקציה

כל סעיף כאן הוא הבטחה שכתובה במסמכים. **מצב (ענף feat/legalfix, 9.10.2026): כל 12 הדרישות ההכרחיות מומשו, ונוסח המסמכים יושר להתנהגות בפועל.**
כדי שזה יעבוד בשרת צריך להריץ ב־SQL Editor של סופאבייס, לפי הסדר: `supabase/v72_security.sql` ואז `supabase/v73_privacy.sql` (אפשר להריץ שוב בלי נזק).
עד שמריצים: מחיקת חשבון מציגה ״עוד לא זמין — כתבו לנו״, ההורדה יוצאת בלי הדיווחים (עם הערה), והקבוצה ממשיכה בשאילתות הישנות.
נבדק על Postgres 16 מקומי עם ה־shim: `test/v73_privacy_probe.sql` ו־`test/v73_legalfix_probe.sql` (הרצה כפולה של הקובץ). בדיקות: `v73_legalfix_app_test` (node, שרתים מדומים) ו־`v73_legalfix_test` (דפדפן).

- **1. מחיקת חשבון — ✅** `bb_delete_me()` (v73_privacy.sql): יציאה מהקבוצה דרך `bb_leave_current` (בעלות לחבר הוותיק ביותר, קבוצה ריקה נמחקת), גם קבוצות ״יתומות״ שבבעלותי, מחיקת `bb_bugs` לפי uid ואז `auth.users`. בחלונית החשבון: שני אישורים, ואחרי המחיקה התנתקות והצעה למחוק גם מהמחשב (`store.wipeOwner`).
- **2. הורדת הנתונים — ✅** ⬇ ״הורדת הנתונים שלי מהענן״ (`sync.exportMine`): פרטי החשבון (מייל, שם, תאריך יצירה, כניסה אחרונה, טווח גיל, הסכמת הורה, גרסת התנאים ומועד האישור, וכל user_metadata), כל bb_profiles עם kv, כל bb_matches, החברות והקבוצה, ו־`bug_reports` דרך הפונקציה החדשה `bb_my_bugs()` (security definer, רק authenticated). בלי הפונקציה בשרת — `bug_reports: null` והערה.
- **3. בדיקת גיל בהרשמה — ✅** מתחת ל־13 / 13–17 (עם הסכמת הורה) / 18+, בלי תאריך לידה, נשמר ב־user_metadata (`age_bracket`, `guardian_ok`, `tos_v`, `tos_at`). חשבון ותיק בלי טווח גיל עונה עליו פעם אחת, יחד עם אישור המסמכים המעודכנים (מתחת ל־13 — אין אישור, ומוצע למחוק את החשבון).
- **4. הסכמה לתנאים — ✅** בהרשמה: תיבה לא מסומנת עם קישורים. כש־`legal/VERSION` משתנה: התהליך הראשי קורא את הגרסה (`resources/legal/VERSION`), וחשבון שלא אישר אותה — **הסנכרון ופעולות הקבוצה מושהים** (הודעה אחת + בקשה בולטת בחלונית החשבון, role=alert); השימוש המקומי, ההורדה והמחיקה ממשיכים. האישור נשמר כ־`tos_v` + `tos_at` בחשבון, והסנכרון ממשיך מיד.
- **5. שער 18+ לבינה מלאכותית — ✅** כבוי כברירת מחדל; אישור 18+ ותנאי גוגל לפני מפתח, בדיקה או שאלה (גם בתהליך הראשי). **חשבון 13–17 — הבינה המלאכותית מוסתרת לגמרי**: ההגדרות, ״נתח אותי״, העוזר, ההזמנה להוסיף מפתח והחיפוש; והתהליך הראשי מסרב ל־setKey/check/ask גם אם הדף מנסה.
- **6. הודעה בדיווח באג — ✅** (v73 legal) מה נשלח, 12 חודשים, קישור למדיניות; צילום המסך לא מסומן כברירת מחדל.
- **7. מחיקה אוטומטית — ✅** `bb_retention()`: דיווחי באגים אחרי 12 חודשים, טביעת ה־IP אחרי 24 שעות, ושורות `bb_join_fails` אחרי יום. רץ בכל דיווח חדש ובכל ניסיון קוד שגוי (טריגר זול, פעם לכל פקודה), ו**פעם ביום עם pg_cron** (`bb_retention`, 03:17 UTC) — הקובץ מנסה `create extension pg_cron` בתוך בלוק עם exception; אם אין — רק הודעה, והטריגרים נשארים. **טביעת ה־IP:** HMAC-SHA256 עם מפתח סודי של 32 בתים שנוצר פעם אחת בטבלה `bb_secret` (בלי הרשאות ל־anon/authenticated), במקום md5 עם ״מלח״ קבוע; טביעות md5 ישנות נמחקו. (מפתח מ־`gen_random_uuid` כפול — בלי תלות ב־pgcrypto; ה־HMAC מומש עם `sha256` המובנה ונבדק מול RFC 4231.)
- **8. מחיקת נהג מוחקת את המשחקים שלו בענן — ✅** בסנכרון: מצבה (בלי שם והגדרות) ואז `DELETE bb_matches` של הנהג; גם מצבות ישנות שנשארו להן מאצ׳ים בענן מנוקות.
- **9. צמצום מה שחברי קבוצה קוראים — ✅** ההרשאות `bb_profiles_team_read` / `bb_matches_team_read` נמחקו (וגם לא נוצרות יותר ב־schema.sql); במקומן `bb_team_profiles()` (owner, id, name, emoji, color, deleted) ו־`bb_team_matches(p_owner, p_since, p_limit)` (owner, profile_id, at, created_at + שדות הסיכום TEAM_FIELDS בלבד). האפליקציה משתמשת בהן, ונופלת לשאילתות הישנות כשהן לא קיימות. הפסקה ״שימו לב / Please note״ נמחקה מהמדיניות. אפליקציה ישנה (עד 1.13) תראה את הקבוצה בלי נהגים ומאצ׳ים של החברים עד שתתעדכן.
- **10. בלי שמות לבינה המלאכותית — ✅** התהליך הראשי (`ai.js`, `Pseudo`) מחליף לפני השליחה: נהגים ← ״Driver 1״, שם החשבון והמייל ← ״Member 1״, הקבוצה ← ״Team X״ — בסיכום של המאמן (driver, team, drivers[].name) ובטקסט החופשי של העוזר (כל שם שהאפליקציה מכירה, גם עם אות שימוש בעברית); בתשובה הכינויים מוחלפים בחזרה רק במחשב. ״מה נשלח לגוגל״ מציג את הכינויים. בחלון העוזר הודעה קבועה לא לכתוב פרטים אישיים. ai.*.md ו־privacy.*.md עודכנו בהתאם (כולל ״האפליקציה מחליפה רק שמות שהיא מכירה״).
- **11. מחיקה מלאה מקומית — ✅** ״אפס הכול״ + תיבה ״כולל הגיבויים״ (עם הסבר ואישור כפול ״הכול נמחק, גם הגיבויים״): בלי גיבוי ביטחון, גם `bbBackups1`; באפליקציה גם תיקיית `backups/` (יומיים ועותקים של כל הנהגים) והסל `trash/` (`store.wipeBackups`, ערוץ `bb:wipeBackups`).
- **12. הצגת המסמכים — ✅** (v73 legal) באפליקציה ובאתר, מכל נקודות הכניסה; CONTACT_EMAIL רק כשמוגדר. תוקן: עברית שנשארה במדיניות באנגלית.
- **13. הודעה על אירוע אבטחה — לא מומש (רשות, לא חובה להשקה).** כרגע: מייל לחשבונות דרך סופאבייס, הודעה בגיטהאב, וגרסה חדשה של האפליקציה. המדיניות לא מבטיחה מנגנון אוטומטי.
- **רשות (לא הובטח):** הגדרה לכיבוי בדיקת העדכונים האוטומטית — לא מומש.

## פתוחים — לטפל לפני השקה ציבורית (לפי סדר עדיפות)

### א׳. בדיקה משפטית ומפעיל מבוגר

- לתת את המסמכים לבדיקה של עורך דין, או לפחות של הגורם המשפטי של בית הספר, של העמותה שמפעילה את הקבוצה או של הורה שמבין בתחום.
- **מי המפעיל הרשמי?** שירות ענן שאוסף מידע של קטינים ממדינות רבות צריך להיות בבעלות ובאחריות של **מבוגר או גוף משפטי** (הורה, מנטור, עמותת הקבוצה או בית הספר) — לא של תלמיד לבד. הסיבות: חוזים (סופאבייס, אפל, חתימת קוד) דורשים גיל בגרות; האחריות לפי חוק הגנת הפרטיות (כולל פיצוי סטטוטורי של עד 100,000 ש״ח לאדם בלי הוכחת נזק) צריכה להיות על מי שמסוגל לשאת בה; ופניות של רשויות צריכות כתובת קבועה. אחרי ההחלטה — לעדכן את ״מי אנחנו״ במדיניות ובתנאים.
- להחליט מי מקבל את הפניות ואת הדיווחים (מי עונה תוך 30 יום על בקשות פרטיות ותוך 7 ימים על דיווחי אבטחה).

### ב׳. אישור מ־FIRST לשם המשחק ולמודל הזירה

מדיניות הקניין הרוחני של FIRST מתירה לקבוצות רשומות להשתמש בסימנים כדי לתאר את הקבוצה ואת הפעילות שלה, אוסרת שימוש מסחרי, ואוסרת שימוש בחומרים המוגנים שלה (תכנון המשחק והזירה) בצורה משונה. אפליקציה שנקראת על שם המשחק ומשתמשת במודל הזירה הרשמי — לא מכוסה במפורש. צריך אישור בכתב. כדאי גם לברר מי הבעלים של קובץ התיב״ם (FIRST או יצרן הזירה). אם התשובה שלילית — לשנות את שם האפליקציה ולהפיץ רק את הגרסה הקלה (בלי המודל).

טיוטה לשליחה (אנגלית — למצוא את כתובת הפנייה הנכונה בדף המותג או יצירת הקשר של FIRST):

**Subject:** Permission request: free team-made FTC field simulator using the BIOBUZZ name and official field CAD

Dear FIRST Marketing and Brand team,

We are FIRST Tech Challenge team Apollo #9662 from Israel. Our students have built a free, non-commercial practice simulator for this season's game, BIOBUZZ, so that teams can practise driving, plan autonomous routines and learn about strategy before they have a working robot. It runs on Windows, macOS, Linux and in a web browser, and we would like to make it available to all FTC teams for free.

Before we publish it more widely we want to make sure we follow the FIRST Intellectual Property Policy, and we would be grateful for your guidance and written permission on three points:

1. Name: the simulator is currently called "BIOBUZZ" (with the subtitle "FTC field simulator"). May we use the game name in this way for a free team project, or would you prefer a different name such as "Apollo 9662 Field Lab — for the FTC BIOBUZZ season"?

2. Field model: the simulator shows the official field CAD model published for the season (Onshape document "am-5850 BIOBUZZ"). We use it only to visualise the field. We converted it to a compressed web format (glTF with meshopt compression) and split it into three parts, but did not change the design. May we include it in a free download in this way? If not, we can ship only our own simplified field model.

3. Rules: the simulator scores matches based on our own reading of the game manual. We tell users clearly that the official game manual always takes priority.

The software is and will remain free: no sales, no advertising and no sponsorship messages. Every page and the app include this disclaimer: "FIRST®, FIRST® Tech Challenge and the game name BIOBUZZ are trademarks of FIRST (For Inspiration and Recognition of Science and Technology); this is an independent team project, not affiliated with, endorsed by or sponsored by FIRST; FIRST is not overseeing, involved with, or responsible for this software." We are happy to change the wording, the name or anything else you ask.

You can see the project at https://github.com/yaarilevrosen-cpu/BIOBUZZ and the website at https://yaarilevrosen-cpu.github.io/BIOBUZZ/. Our team mentor, [mentor name and email], is copied on this message.

Thank you for your time and for everything FIRST does for students.

Best regards,
[Name], captain, FIRST Tech Challenge team Apollo #9662 (Israel)
[Mentor name], mentor

### ג׳. רישיון לקוד

כרגע אין קובץ LICENSE במאגר, כלומר ״כל הזכויות שמורות״: אחרים יכולים לראות את הקוד בגיטהאב אבל לא מורשים להעתיק, לשנות או להפיץ אותו. התנאים נותנים רק רישיון שימוש לא מסחרי. אפשרויות:

- **MIT או Apache-2.0** (קוד פתוח מתירני): הכי פשוט, מאפשר לקבוצות אחרות לתרום ולבנות על זה; מאפשר גם שימוש מסחרי באפליקציה. Apache-2.0 מוסיף הגנה על פטנטים.
- **GPL-3.0** (קוד פתוח עם ״הדבקה״): מי שמפיץ גרסה משונה חייב לפרסם גם הוא את הקוד.
- **PolyForm Noncommercial או CC BY-NC**: מתאים לרוח ״חינם ולא מסחרי״, אבל זה לא קוד פתוח לפי ההגדרה הרשמית (חשוב לחתימת קוד חינמית — ראו ד׳).
- **להשאיר ״כל הזכויות שמורות״**: הכי שמרני, אבל מונע תרומות.

בכל מקרה: מודל הזירה של FIRST, השם BIOBUZZ והגופנים **לא** נכנסים לרישיון שלנו — צריך לכתוב את זה בקובץ הרישיון. אחרי ההחלטה — לעדכן את הפסקה ״רישיון חינמי״ בתנאים.

### ד׳. חתימת קוד

בלי חתימה, חלונות מציגים אזהרה (SmartScreen) ומק חוסם את הפתיחה (Gatekeeper); העדכון האוטומטי במק לא עובד בלי חתימה.

- **חלונות — שירות החתימה של מיקרוסופט (Azure Artifact Signing, לשעבר Trusted Signing):** בערך 9.99 דולר לחודש (5,000 חתימות). אבל הזכאות כרגע: ארגונים בארצות הברית, קנדה, האיחוד האירופי ובריטניה, ואנשים פרטיים רק בארצות הברית ובקנדה — **קבוצה או אדם מישראל כנראה לא זכאים** כרגע.
- **חלונות — תעודת OV:** בערך 129 עד 700 דולר לשנה (SSL.com זולה ביותר עם חתימה בענן; DigiCert,‏ Sectigo,‏ GlobalSign יקרות יותר). מאז 2023 המפתח חייב להיות בחומרה מאובטחת (אסימון USB או חתימה בענן). בדרך כלל ניתנת לגוף רשום (עמותה, חברה, עוסק); ל־SSL.com יש גם תעודה לאדם פרטי. אזהרת SmartScreen נעלמת רק אחרי שנצבר ״מוניטין״.
- **חלונות — SignPath Foundation:** חתימה חינמית לפרויקטי קוד פתוח, אבל רק עם רישיון קוד פתוח מוכר (ראו ג׳) ובתנאים שלהם.
- **חלונות — חנות מיקרוסופט (MSIX):** חלופה שלא דורשת תעודה משלכם.
- **מק — תוכנית המפתחים של אפל:** 99 דולר לשנה, כולל תעודת Developer ID ו־notarization. ההרשמה דורשת גיל בגרות — כלומר **מבוגר** צריך להירשם (או עמותה/בית ספר, שעשויים לקבל פטור מתשלום). אחרי זה: hardenedRuntime: true,‏ notarize ב־electron-builder, וזהות חתימה במקום ״-״.

### ה׳. סופאבייס: תוכנית, אזור והסכם עיבוד נתונים

- **אזור:** לבדוק בלוח הבקרה באיזה אזור הפרויקט (somhwsjbhanyxzrxkyer). אם רוב המשתמשים באירופה ובישראל — פרנקפורט או אירלנד מתאימים. אי אפשר לשנות אזור של פרויקט קיים בקלות (לבדוק מול סופאבייס). לעדכן את סעיף ״העברת מידע לחוץ לארץ״ אם רוצים לציין אזור.
- **תוכנית:** בתוכנית החינמית הפרויקט **מושהה אחרי שבוע בלי פעילות** ו**אין גיבויים אוטומטיים**. לשירות ציבורי כדאי Pro (מ־25 דולר לחודש, גיבוי יומי שנשמר 7 ימים). המדיניות אומרת ״בדרך כלל עד 14 יום״ — מתאים גם ל־Pro וגם ל־Team.
- **מיילים:** שירות המייל המובנה של סופאבייס שולח **רק לחברי הצוות של הארגון** ועד 2 מיילים לשעה. בלי שרת SMTP משלכם (למשל Resend,‏ Postmark,‏ SendGrid) משתמשים חדשים לא יקבלו מייל אישור — **חוסם השקה**. ספק המייל יהפוך לספק משנה — להוסיף אותו למדיניות.
- **הסכם עיבוד נתונים:** ההסכם של סופאבייס הוא חלק מתנאי השירות שלה (הצד השני: Supabase Pte. Ltd., סינגפור), כולל הסעיפים החוזיים התקניים של האיחוד האירופי. לשמור עותק PDF עם התאריך, ולהירשם לעדכונים על ספקי המשנה.
- **להריץ את קובצי ה־SQL:** `v72_security.sql` ואז `v73_privacy.sql`. אחר כך לוודא ש־pg_cron פעיל ושהמשימה קיימת: `select jobname, schedule from cron.job;` (צריך לראות `bb_retention`). אם ההרחבה לא נדלקה — להפעיל אותה ב־Database → Extensions ולהריץ את הקובץ שוב; בלעדיה המחיקה רצה רק כשמגיע דיווח חדש.
- **מי בעל החשבון בסופאבייס:** המבוגר או הגוף שמפעיל (סעיף א׳), עם אימות דו־שלבי.

### ו׳. הבינה המלאכותית בגרסה הציבורית

תנאי ג׳מיני אוסרים שימוש בשירות ״שמכוון לקטינים או שקטינים צפויים להשתמש בו״. BIOBUZZ צפוי לשמש קטינים, גם אם התכונה מיועדת למנטורים. שתי אפשרויות:

- **להשאיר כרשות למבוגרים בלבד** (מה שהמסמכים מתארים): כבוי כברירת מחדל, שער 18+, מפתח של המשתמש, ובקטינים מוסתר. עדיין קיים סיכון שגוגל תראה בזה הפרה, ומבוגר צריך להחליט שהוא מקבל אותו.
- **להסיר מהגרסה הציבורית** ולהשאיר רק בגרסה פנימית של הקבוצה (למשל דגל בנייה). הכי בטוח.

ההמלצה שלנו: להסיר מהגרסה הציבורית הראשונה. דרישות 5 ו־10 (הסתרה ל־13–17, כינויים במקום שמות) כבר מומשו, אבל הן לא מבטלות את הסיכון שבתנאי גוגל. אם מסירים — למחוק את ai.*.md מהאפליקציה ולעדכן את המדיניות והתנאים.

### ז׳. כתובת מייל לפניות

פניות פרטיות (מחיקה, הורים שמגלים שלילד מתחת ל־13 יש חשבון, נגישות) לא צריכות להיכתב בעמוד בעיות פומבי. כרגע המסמכים אומרים ״כתבו רק בקשה ליצירת קשר פרטי״ — זה עובד, אבל מסורבל. מומלץ לפתוח תיבת מייל ייעודית של הקבוצה (לא של תלמיד פרטי), שמבוגר רואה אותה, ולהגדיר אותה ב־CONTACT_EMAIL. רוב הבקשות ממילא נעשות לבד באפליקציה.

### ח׳. אם מספר המשתמשים יגדל

- **רישום מאגר:** לפי תיקון 13 חובת רישום חלה רק על גופים ציבוריים, מאגרים לשיווק ישיר מעל 10,000 איש, ומאגרי מידע רגיש מעל 100,000 איש — לא עלינו. אבל: מאגר עם מידע על הרבה אנשים עשוי לחייב מסמך הגדרות מאגר ו**ממונה על הגנת הפרטיות** בהמשך — לבדוק עם עורך הדין כשמגיעים לאלפי משתמשים.
- **תקנות אבטחת מידע:** גם מאגר קטן חייב בנוהל אבטחה בסיסי. להכין מסמך קצר: מי ניגש לסופאבייס, אימות דו־שלבי, מי מחזיק את המפתחות, בדיקה תקופתית של ההרשאות.
- **יומן אירועים:** לנהל יומן של כל אירוע אבטחה או תקלה עם מידע (מה, מתי, מי נפגע, מה עשינו), גם אם קטן.
- **הודעה על אירוע:** באירוע אבטחה חמור — להודיע לרשות להגנת הפרטיות ״מיד״ לפי תקנות אבטחת מידע; למשתמשים באיחוד האירופי — לרשות הפיקוח תוך 72 שעות (סעיף 33) ולמשתמשים עצמם אם הסיכון גבוה. להכין מראש טיוטת הודעה.
- **ארצות הברית:** הכלל המתוקן של חוק הפרטיות לילדים (נאכף במלואו מ־22 באפריל 2026) דורש מדיניות שמירה כתובה עם זמני מחיקה ותוכנית אבטחה כתובה — המדיניות כוללת את זמני השמירה; את תוכנית האבטחה הכתובה צריך להוסיף (אותו מסמך כמו ב״תקנות אבטחת מידע״).
- **חשבונות לא פעילים:** לשקול מחיקה של חשבונות שלא נכנסו אליהם שנתיים, עם מייל אזהרה קודם. אם מחליטים — להוסיף לטבלת השמירה.
- **נגישות:** עסק קטן (מחזור עד כ־100,000 ש״ח) פטור מהדרישות הטכניות אבל עדיין צריך הצהרת נגישות — יש. אם הפרויקט יעבור לעמותה או לגוף גדול, החובות עשויות לחול במלואן.

## מקורות

- תנאי ממשק ג׳מיני (גיל 18, שירות שקטינים צפויים להשתמש בו, בודקים אנושיים בשירות חינמי, תשלום חובה באזור הכלכלי האירופי, שווייץ ובריטניה; עודכן 28.4.2026): [ai.google.dev/gemini-api/terms](https://ai.google.dev/gemini-api/terms)
- מדיניות הקניין הרוחני של FIRST: [firstinspires.org — IP policy (PDF)](https://www.firstinspires.org/hubfs/web/about/policy/ip-policy-trademarks-copyrighted-materials-first-lego.pdf) · [דף המותג](https://www.firstinspires.org/about/brand)
- תיקון 13 לחוק הגנת הפרטיות: [מיתר — סקירת תיקון 13 (PDF)](https://meitar.com/wp-content/uploads/2025/07/Amendment-13-to-the-Privacy-Protection-Law-Is-on-the-Horizon-–-Is-Your-Organization-Ready-for-the-New-Era-in-the-World-of-Privacy.pdf) · [Israel Desks](https://israeldesks.com/israel-enacts-strict-privacy-reform/) · [Baker McKenzie](https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/emea/israel/topics/regulators-enforcement-priorities-and-penalties)
- תלונה לרשות להגנת הפרטיות: [כל זכות](https://www.kolzchut.org.il/he/הגשת_תלונה_או_פנייה_אל_הרשות_להגנת_הפרטיות_בנושא_הגנת_הפרטיות_במאגרי_מידע) · [gov.il — פניות הציבור](https://www.gov.il/he/Departments/General/public_inquiries_ilita)
- חוק הפרטיות של ילדים בארצות הברית, הכלל המתוקן: [BBB National Programs](https://bbbprograms.org/media/insights/blog/coppa-amended) · [Mondaq](https://webiis10.mondaq.com/unitedstates/privacy-protection/1790866/coppas-amended-rule-is-now-in-full-effect-what-operators-need-to-know)
- תקנות הפרטיות האירופיות: [סעיף 8 — גיל ההסכמה של ילדים](https://eur-lex.europa.eu/eli/reg/2016/679/oj) · [רשימת רשויות הפיקוח](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en) · [החלטות הלימות, כולל ישראל](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en)
- נגישות אתרים בישראל ופטור לעסק קטן: [User-A](https://user-a.co.il/en/legislation/website-accessibility-exemptions-israel-are-you-eligible) · [BOIA](https://boia.org/blog/israels-digital-accessibility-laws-an-overview)
- סופאבייס: [הסכם עיבוד נתונים](https://supabase.com/legal/customer-resources/data-processing-addendum) · [ספקי משנה](https://supabase.com/legal/customer-resources/subprocessor-list) · [אזורים](https://supabase.com/docs/guides/platform/regions) · [גיבויים](https://supabase.com/docs/guides/platform/backups) · [מחירים](https://supabase.com/pricing) · [מגבלות המייל המובנה](https://supabase.com/docs/guides/auth/auth-smtp)
- דפי גיטהאב שומרים כתובות IP של מבקרים: [docs.github.com — What is GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) · [הצהרת הפרטיות של גיטהאב](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
- חתימת קוד: [Azure Artifact Signing — מחירים](https://azure.microsoft.com/en-us/pricing/details/artifact-signing/) · [DevClass — זכאות ומחיר](https://www.devclass.com/security/2026/01/14/code-signing-windows-apps-may-be-easier-and-more-secure-with-new-azure-artifact-service/4079554) · [השוואת מחירי OV ‏2026](https://codenote.net/en/posts/ov-ev-code-signing-certificate-pricing-japan-2026/) · [SignPath Foundation](https://signpath.org/terms) · [אפל — השוואת מנויים](https://developer.apple.com/support/compare-memberships/) · [אפל — פטור מתשלום](https://developer.apple.com/support/membership-fee-waiver/) · [אפל — גיל להרשמה (פורום)](https://developer.apple.com/forums/thread/725974)
- רישיונות: הטקסטים נלקחו מקובצי הרישיון בתוך app/node_modules ומהכותרות בקובצי הספריות (test/lib); רישיון הגופנים מ־[google/fonts](https://github.com/google/fonts/tree/main/ofl) ומטבלת השמות בקובצי הגופנים המוטמעים (build/fonts-block.html).
