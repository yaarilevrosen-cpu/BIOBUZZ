/* BIOBUZZ — האפליקציה (Electron, התהליך הראשי) */
"use strict";
const { app, BrowserWindow, ipcMain, dialog, shell, screen, safeStorage, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { Store, writeAtomic } = require("./store");
const { Sync } = require("./sync");
const { Bridge, findAdb } = require("./bridge");
const { AI } = require("./ai");
const { execFile } = require("child_process");
const os = require("os");
const REPO = { owner: "yaarilevrosen-cpu", repo: "BIOBUZZ" };
const MAC = process.platform === "darwin", LINUX = process.platform === "linux";

/* במחשב נייד עם שני כרטיסי מסך — תמיד החזק */
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
/* הסימולטור ממשיך לרוץ גם כשחלון אחר (למשל המסך השני) מכסה אותו */
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");

/* הנתונים: באפליקציה המותקנת — %APPDATA%\BIOBUZZ\data (במק: ~/Library/Application Support/BIOBUZZ/data, בלינוקס: ~/.config/BIOBUZZ/data). בגרסה הניידת — ליד קובץ ה-EXE (טוב לדיסק און קי) */
const DATA = process.env.BIOBUZZ_DATA ||
  (process.env.PORTABLE_EXECUTABLE_DIR ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, "BIOBUZZ-data") : path.join(app.getPath("userData"), "data"));
const SIM = process.env.BIOBUZZ_SIM || path.join(__dirname, "sim", "index.html");
let store = null, win = null, sync = null, bridge = null, ai = null;
/* v57: חשבון אחד לכל אדם; הקבוצה — קוד הצטרפות */
function acctStatus() { return sync ? sync.status() : { loggedIn: false }; }
const send = (ch, d) => { try { if (win && !win.isDestroyed()) win.webContents.send(ch, d); } catch (e) {} };

if (!process.env.BIOBUZZ_TEST && !app.requestSingleInstanceLock()) { app.quit(); }
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function boundsFile() { return path.join(DATA, "window.json"); }
function loadBounds() {
  let b = null; try { b = JSON.parse(fs.readFileSync(boundsFile(), "utf8")); } catch (e) {}
  if (!b || !isFinite(b.width)) return { width: 1440, height: 900, max: true };
  /* החלון חוזר למסך שעדיין קיים */
  const ok = screen.getAllDisplays().some(d => { const a = d.workArea;
    return b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y < a.y + a.height - 40 && b.y + b.height > a.y; });
  return ok ? b : { width: b.width, height: b.height, max: b.max };
}
function saveBounds() {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds();
  try { writeAtomic(boundsFile(), JSON.stringify(Object.assign(b, { max: win.isMaximized(), full: win.isFullScreen() }))); } catch (e) {}
}

/* מסך פתיחה בזמן שהזירה נטענת */
let splash = null, splashAt = 0;
function createSplash() {
  if (process.env.BIOBUZZ_TEST) return;
  const logo = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#12161c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 7v10l8 5 8-5V7z"/><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const en = !!(store && store.kv && store.kv.bbLang1 === "en");
  const html = '<!doctype html><html dir="' + (en ? "ltr" : "rtl") + '"><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#0B0E12;color:#E9EFF5;font-family:"Segoe UI",system-ui,sans-serif;overflow:hidden;-webkit-user-select:none;-webkit-app-region:drag}' +
    '.w{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:radial-gradient(420px 260px at 50% 0%,rgba(255,176,32,.16),transparent 70%)}' +
    '.m{width:92px;height:92px;border-radius:26px;background:#FFB020;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 40px rgba(255,176,32,.25)}' +
    'b{font-size:26px;letter-spacing:.06em} i{font-style:normal;color:#95A5B4;font-size:13px}.bar{width:180px;height:4px;border-radius:4px;background:#1C242D;overflow:hidden;margin-top:6px}' +
    '.bar s{display:block;height:100%;width:40%;background:#FFB020;border-radius:4px;animation:g 1.1s ease-in-out infinite}@keyframes g{0%{transform:translateX(160%)}100%{transform:translateX(-260%)}}' +
    'small{color:#7D8C9A;font-size:11px;position:absolute;bottom:12px;left:14px}</style></head><body><div class="w"><div class="m">' + logo + '</div><b>BIOBUZZ</b><i>' + (en ? "FTC field simulator · loading the field…" : "סימולטור שדה ל-FTC · טוען את הזירה…") + '</i><div class="bar"><s></s></div></div><small>' + app.getVersion() + '</small></body></html>';
  splash = new BrowserWindow({ width: 440, height: 300, frame: false, resizable: false, movable: true, alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: "#0B0E12", show: true, center: true, icon: path.join(__dirname, "build", "icon.png"), webPreferences: { sandbox: true } });
  splash.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html)); splashAt = Date.now();
}
let shown = false;
function showMain() {
  if (shown || !win || win.isDestroyed()) return;
  const wait = Math.max(0, 900 - (Date.now() - splashAt));
  if (splash && wait > 0) { setTimeout(showMain, wait); return; }
  shown = true; win.show();
  if (splash && !splash.isDestroyed()) { const s = splash; splash = null; setTimeout(() => { try { s.close(); } catch (e) {} }, 150); }
}

function createWindow() {
  const b = loadBounds();
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height, minWidth: 900, minHeight: 600,
    backgroundColor: "#0B0E12", title: "BIOBUZZ", show: false, autoHideMenuBar: true,
    /* שורת כותרת משלנו: הכותרת של הסימולטור היא ״ידית״ החלון, וכפתורי Windows מצוירים עליה */
    titleBarStyle: "hidden", titleBarOverlay: { color: "#141A21", symbolColor: "#B9C6D2", height: 67 },
    /* במק: שלושת הכפתורים משמאל, באמצע הכותרת */
    ...(MAC ? { trafficLightPosition: { x: 20, y: 27 } } : {}),
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false,
      sandbox: true, backgroundThrottling: false, spellcheck: false }
  });
  win.setMenu(null);
  if (b.max) win.maximize();
  if (b.full) win.setFullScreen(true);
  win.once("ready-to-show", () => setTimeout(showMain, 400));
  win.webContents.on("did-finish-load", () => { try { win.webContents.setVisualZoomLevelLimits(1, 1); } catch (e) {} });
  /* במק הכפתורים משמאל — מפנים להם מקום בכותרת (בשתי השפות) */
  if (MAC) win.webContents.on("did-finish-load", () => { try { win.webContents.insertCSS("html.app header{padding-left:92px!important}"); } catch (e) {} });
  win.on("close", saveBounds);
  win.on("resize", () => { clearTimeout(win._bt); win._bt = setTimeout(saveBounds, 500); });
  /* קישורים חיצוניים נפתחים בדפדפן, לא בתוך האפליקציה */
  win.webContents.setWindowOpenHandler(({ url, frameName }) => {
    /* חלון השידור למסך שני: נפתח על המסך החיצוני, במסך מלא */
    if (frameName === "bbcast" && (url === "" || url === "about:blank")) {
      const prim = screen.getPrimaryDisplay(), cur = screen.getDisplayMatching(win.getBounds());
      const ext = screen.getAllDisplays().find(d => d.id !== cur.id) || null;
      const a = (ext || prim).workArea;
      return { action: "allow", overrideBrowserWindowOptions: {
        x: ext ? a.x : undefined, y: ext ? a.y : undefined, width: ext ? a.width : 1280, height: ext ? a.height : 720,
        fullscreen: !!ext, autoHideMenuBar: true, backgroundColor: "#05070a", title: "BIOBUZZ — שידור",
        icon: path.join(__dirname, "build", "icon.png"), webPreferences: { backgroundThrottling: false } } };
    }
    if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" };
  });
  win.webContents.on("did-create-window", w => { try { w.setMenu(null); w.webContents.on("before-input-event", (e, i) => {
    if (i.type === "keyDown" && i.key === "F11") { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); }
    if (i.type === "keyDown" && i.key === "Escape" && w.isFullScreen()) { w.setFullScreen(false); e.preventDefault(); } }); } catch (e) {} });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file:")) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    if (i.key === "F11") { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (i.key === "F12" || ((i.control || i.meta) && (i.shift || i.alt) && i.key.toLowerCase() === "i")) { win.webContents.toggleDevTools(); e.preventDefault(); }
    else if ((i.control || i.meta) && i.key.toLowerCase() === "r") { store.flushKv(); win.webContents.reload(); e.preventDefault(); }
  });
  win.loadFile(SIM);
}

function reg() {
  /* סינכרוני — לפני שהסימולטור עולה, הוא צריך את הנתונים של הנהג */
  ipcMain.on("bb:boot", e => {
    e.returnValue = { kv: store.kvAll(), profile: store.active(), profiles: store.profiles(), firstRun: store.firstRun,
      version: app.getVersion(), dataDir: DATA, backups: store.backupsList(), test: !!process.env.BIOBUZZ_TEST };
  });
  ipcMain.on("bb:kvSet", (e, k, v) => store.kvSet(k, v));
  ipcMain.on("bb:kvRemove", (e, k) => store.kvSet(k, null));
  ipcMain.on("bb:kvClear", () => store.kvClear());
  ipcMain.on("bb:flush", e => { store.flushKv(); e.returnValue = true; });
  ipcMain.on("bb:ready", () => showMain());
  ipcMain.handle("bb:profiles", () => store.profiles());
  ipcMain.handle("bb:profileAdd", (e, name, emoji, color, local) => { const p = store.addProfile(name, { emoji, color, local: !!local }); soonSync(); return p; });
  ipcMain.handle("bb:profileUpdate", (e, id, patch) => { const p = store.updateProfile(id, patch || {}); soonSync(); return p; });
  ipcMain.handle("bb:profileRemove", (e, id) => { const r = store.removeProfile(id); soonSync(); return r; });
  ipcMain.handle("bb:profileSwitch", (e, id) => { const ok = store.switchTo(id); if (ok) setTimeout(() => win && win.webContents.reload(), 30); return ok; });
  ipcMain.handle("bb:firstRunDone", () => { store.firstRun = false; return true; });
  ipcMain.handle("bb:matchAdd", (e, m) => { const r = store.addMatch(m); soonSync(); return r; });
  ipcMain.handle("bb:matches", (e, id) => store.matches(id, { lite: true }));
  ipcMain.handle("bb:team", () => store.team(sync && sync.status().loggedIn ? sync.team : null));
  ipcMain.handle("bb:openData", () => shell.openPath(DATA));
  ipcMain.handle("bb:backupNow", () => { const t = store.dailyBackup(); return { tag: t, list: store.backupsList() }; });
  ipcMain.handle("bb:teamExport", async () => {
    const d = new Date(), pad = x => String(x).padStart(2, "0");
    const r = await dialog.showSaveDialog(win, { title: "ייצוא הקבוצה", defaultPath: "BIOBUZZ-team-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json",
      filters: [{ name: "BIOBUZZ", extensions: ["json"] }] });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(r.filePath, store.teamExport()); return { ok: true, file: r.filePath };
  });
  const pick = async title => {
    const r = await dialog.showOpenDialog(win, { title, properties: ["openFile"], filters: [{ name: "BIOBUZZ", extensions: ["json", "txt"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    return fs.readFileSync(r.filePaths[0], "utf8");
  };
  ipcMain.handle("bb:teamImport", async (e, txt) => { txt = txt || await pick("ייבוא קבוצה"); if (txt == null) return { ok: false, canceled: true }; return store.teamImport(txt); });
  /* ── חשבון וסנכרון ── */
  /* ── סרטונים ── */
  const vdir = () => process.env.BIOBUZZ_VIDEOS || path.join(app.getPath("videos"), "BIOBUZZ");
  ipcMain.handle("bb:saveVideo", (e, buf, name) => {
    const safe = String(name || "BIOBUZZ.mp4").replace(/[^\w.\-]/g, "_").slice(0, 80);
    fs.mkdirSync(vdir(), { recursive: true }); const f = path.join(vdir(), safe);
    fs.writeFileSync(f, Buffer.from(buf)); return { ok: true, path: f };
  });
  ipcMain.handle("bb:showFile", (e, f) => { if (typeof f === "string" && f.startsWith(vdir())) shell.showItemInFolder(f); });
  ipcMain.handle("bb:openVideos", () => { fs.mkdirSync(vdir(), { recursive: true }); return shell.openPath(vdir()); });
  /* ── יומן אודומטריה מהרובוט (adb) ── */
  ipcMain.handle("bb:adbPull", (e, ip) => adbPull(String(ip || "").trim()));
  ipcMain.handle("bb:bridgeStatus", () => bridge ? bridge.status() : { on: false, error: "כבוי" });
  ipcMain.handle("bb:acctStatus", () => acctStatus());
  ipcMain.handle("bb:acctSignIn", async (e, em, pw) => { const r = await sync.signIn(em, pw); if (r.ok) runSync("login"); return r; });
  ipcMain.handle("bb:acctSignUp", async (e, em, pw) => { const r = await sync.signUp(em, pw); if (r.ok && !r.confirm) runSync("login"); return r; });
  ipcMain.handle("bb:acctRecover", (e, em) => sync.recover(em));
  ipcMain.handle("bb:acctSignOut", async () => { const r = await sync.signOut(); send("bb:sync", { status: acctStatus() }); return r; });
  ipcMain.handle("bb:teamCall", async (e, what, a, b) => { const r = await sync.teamCall(String(what || ""), a, b); send("bb:sync", { status: acctStatus(), result: { ok: true, team: true } }); return r; });
  ipcMain.handle("bb:syncNow", () => runSync("manual"));
  /* ── בינה מלאכותית: המפתח נשאר כאן, הדף מקבל רק סטטוס ותשובות ── */
  ipcMain.handle("bb:aiStatus", () => ai.status());
  ipcMain.handle("bb:aiSetKey", async (e, k) => { const r = await ai.setKey(String(k || "")); return Object.assign({ status: ai.status() }, r, { status: ai.status() }); });
  ipcMain.handle("bb:aiClear", () => ai.clear());
  ipcMain.handle("bb:aiCheck", async () => { const r = await ai.check(); return Object.assign({}, r, { status: ai.status() }); });
  ipcMain.handle("bb:aiDrills", () => ai.drills());
  ipcMain.handle("bb:aiAsk", (e, kind, o) => ai.ask(kind === "coach" ? "coach" : "helper", o && typeof o === "object" ? o : {}));
  ipcMain.handle("bb:acctName", async (e, n) => { const r = await sync.nameSet(String(n || "")); send("bb:sync", { status: acctStatus() }); return r; });
  /* ── עדכונים ── */
  ipcMain.handle("bb:bugSend", (e, row) => sync.bugSend(row || {}));
  ipcMain.handle("bb:shot", async () => { try { let img = await win.webContents.capturePage(); const sz = img.getSize();
    if (sz.width > 1280) img = img.resize({ width: 1280 }); return "data:image/jpeg;base64," + img.toJPEG(72).toString("base64"); } catch (e) { return ""; } });
  ipcMain.handle("bb:updCheck", () => updCheck(true));
  ipcMain.handle("bb:updInstall", () => { if (AU && UPD.state === "ready") { setImmediate(() => AU.quitAndInstall(false, true)); return true; } return false; });
  ipcMain.handle("bb:updState", () => UPD);
  ipcMain.handle("bb:openUrl", (e, url) => { if (/^https:\/\/github\.com\//.test(url)) shell.openExternal(url); });
  ipcMain.handle("bb:importBackup", async (e, txt) => {
    txt = txt || await pick("ייבוא גיבוי מהדפדפן"); if (txt == null) return { ok: false, canceled: true };
    const r = store.importBrowserBackup(txt); if (r.ok) setTimeout(() => win && win.webContents.reload(), 30); return r;
  });
}

/* ── adb: מושך את odolog.csv מה-Control Hub ── */
function adbRun(adb, args, ms) {
  return new Promise(res => execFile(adb, args, { timeout: ms || 10000, windowsHide: true, maxBuffer: 8e6 },
    (err, out, errOut) => res({ ok: !err, out: String(out || ""), err: String(errOut || (err && err.message) || "") })));
}
async function adbPull(ip) {
  const adb = process.env.BIOBUZZ_ADB || findAdb();
  if (!adb) return { ok: false, why: "לא נמצא adb במחשב. מתקינים Android Studio (או platform-tools) — והאפליקציה תמצא אותו לבד." };
  let serial = null;
  if (ip && !/^usb$/i.test(ip)) {
    const t = ip.includes(":") ? ip : ip + ":5555";
    const c = await adbRun(adb, ["connect", t], 9000);
    if (/connected to|already connected/i.test(c.out)) serial = t;
  }
  if (!serial) {
    const d = await adbRun(adb, ["devices"], 6000);
    const devs = d.out.split(/\r?\n/).slice(1).map(l => l.trim()).filter(l => /\sdevice$/.test(l)).map(l => l.split(/\s+/)[0]);
    if (!devs.length) return { ok: false, why: "הרובוט לא נמצא — חברו את המחשב לרשת של ה-Control Hub (או בכבל USB) ונסו שוב." };
    serial = devs.find(x => ip && x.startsWith(ip)) || devs[0];
  }
  const ls = await adbRun(adb, ["-s", serial, "shell", "ls", "-t", "/sdcard/FIRST/"], 8000);
  const files = ls.out.split(/\s+/).filter(f => /\.(csv|txt|log)$/i.test(f));
  const pick = files.includes("odolog.csv") ? "odolog.csv" : (files.find(f => /odo/i.test(f)) || null);
  if (!pick) return { ok: false, why: "ברובוט אין /sdcard/FIRST/odolog.csv — מריצים קודם אוטונומי עם קוד הרישום (״קוד רישום לרובוט״)." };
  const tmp = path.join(os.tmpdir(), "biobuzz-odo-" + Date.now() + ".csv");
  const p = await adbRun(adb, ["-s", serial, "pull", "/sdcard/FIRST/" + pick, tmp], 20000);
  let text = ""; try { text = fs.readFileSync(tmp, "utf8"); fs.unlinkSync(tmp); } catch (e) {}
  if (!p.ok || !text) return { ok: false, why: "המשיכה נכשלה: " + (p.err || "").slice(0, 160) };
  return { ok: true, text, file: pick, serial };
}

/* ── סנכרון: בהתחברות, כל שתי דקות, זמן קצר אחרי שינוי, ולפני יציאה ── */
let syncT = null;
const anyIn = () => !!(sync && sync.status().loggedIn);
function soonSync(ms) { if (!anyIn()) return; clearTimeout(syncT); syncT = setTimeout(() => runSync("soon"), ms || 4000); }
let syncRun = null;
function runSync(why) {
  if (!anyIn()) return Promise.resolve({ ok: false, why: "לא מחוברים" });
  if (syncRun) return syncRun;
  syncRun = (async () => {
    const st = acctStatus(); st.busy = true; send("bb:sync", { status: st });
    const out = await sync.syncNow();
    send("bb:sync", { status: acctStatus(), result: out, why });
    return out;
  })().finally(() => { syncRun = null; });
  return syncRun;
}
/* ── עדכונים מגיטהאב ── */
const PORTABLE = !!process.env.PORTABLE_EXECUTABLE_DIR;
let AU = null;
const UPD = { state: "idle", version: "", percent: 0, url: "https://github.com/" + REPO.owner + "/" + REPO.repo + "/releases/latest", auto: false, error: "" };
function updSet(p) { Object.assign(UPD, p); send("bb:upd", UPD); }
function verCmp(a, b) { const x = String(a).replace(/^v/, "").split(/[.-]/).map(n => parseInt(n, 10) || 0), y = String(b).replace(/^v/, "").split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; }
/* עדכון אוטומטי: Windows (מתקין), לינוקס AppImage, ולינוקס deb. במק — בודקים ומציעים להוריד
   (במק עדכון אוטומטי דורש חתימה של אפל, ועוד אין) */
function isDeb() {
  try { return LINUX && fs.readFileSync(path.join(process.resourcesPath, "package-type"), "utf8").trim() === "deb"; } catch (e) { return false; }
}
function updInit() {
  const deb = isDeb();
  const can = process.platform === "win32" || (LINUX && (!!process.env.APPIMAGE || deb));
  if (!app.isPackaged || PORTABLE || !can || process.env.BIOBUZZ_TEST) return;
  try { AU = require("electron-updater").autoUpdater; } catch (e) { AU = null; return; }
  /* deb: מורידים לבד, ומתקינים רק כשלוחצים ״התקן״ — ההתקנה מבקשת סיסמה (pkexec), ולא נקפיץ אותה ביציאה */
  AU.autoDownload = true; AU.autoInstallOnAppQuit = !deb; AU.allowPrerelease = false;
  AU.on("checking-for-update", () => updSet({ state: "checking", error: "" }));
  AU.on("update-not-available", () => updSet({ state: "none" }));
  AU.on("update-available", i => updSet({ state: "downloading", version: i.version, percent: 0 }));
  AU.on("download-progress", p => updSet({ state: "downloading", percent: Math.round(p.percent || 0) }));
  AU.on("update-downloaded", i => updSet({ state: "ready", version: i.version, percent: 100 }));
  AU.on("error", e => updSet({ state: "error", error: String(e && e.message || e).slice(0, 200) }));
  UPD.auto = true;
}
/* בגרסה הניידת (ובפיתוח) — רק בודקים ומציעים להוריד מהאתר */
async function updCheck(manual) {
  if (AU) { try { await AU.checkForUpdates(); } catch (e) { updSet({ state: "error", error: String(e.message || e).slice(0, 200) }); } return UPD; }
  updSet({ state: "checking", error: "" });
  try {
    const url = process.env.BIOBUZZ_UPD_URL || ("https://api.github.com/repos/" + REPO.owner + "/" + REPO.repo + "/releases/latest");
    const r = await fetch(url, { headers: { "User-Agent": "BIOBUZZ", Accept: "application/vnd.github+json" } });
    if (r.status === 404) { updSet({ state: "none" }); return UPD; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(); const v = String(j.tag_name || "").replace(/^v/, "");
    if (v && verCmp(v, app.getVersion()) > 0) updSet({ state: "available", version: v, url: j.html_url || UPD.url });
    else updSet({ state: "none", version: v });
  } catch (e) { updSet({ state: "error", error: /fetch failed|ENOTFOUND/i.test(String(e.message)) ? "אין חיבור לאינטרנט" : String(e.message).slice(0, 200) }); }
  return UPD;
}

/* במק אין תפריט בתוך החלון — אבל בלי תפריט יישום לא עובדים ⌘C / ⌘V / ⌘Q ושדות הטקסט */
function macMenu() {
  if (!MAC) return;
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: "appMenu" }, { role: "editMenu" },
    { label: "View", submenu: [{ role: "togglefullscreen" }] },
    { role: "windowMenu" }
  ]));
}

app.whenReady().then(() => {
  macMenu();
  store = new Store(DATA);
  try { store.dailyBackup(14); } catch (e) { console.error(e); }
  const enc = s => (safeStorage && safeStorage.isEncryptionAvailable()) ? "e:" + safeStorage.encryptString(s).toString("base64") : "p:" + Buffer.from(s, "utf8").toString("base64");
  const dec = s => s.startsWith("e:") ? safeStorage.decryptString(Buffer.from(s.slice(2), "base64")) : Buffer.from(s.replace(/^p:/, ""), "base64").toString("utf8");
  sync = new Sync(store, DATA, { enc, dec });
  /* מפתח גוגל: רק מוצפן באמת (safeStorage). בלי הצפנה — נשמר בזיכרון עד היציאה */
  ai = new AI(DATA, { enc: s => "e:" + safeStorage.encryptString(s).toString("base64"),
    dec: s => s.startsWith("e:") && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(s.slice(2), "base64")) : "",
    canEnc: () => !!(safeStorage && safeStorage.isEncryptionAvailable()) || !!process.env.BIOBUZZ_AI_PLAIN });
  /* הגשר המובנה: שלט טלפון ומשחק ברשת בלי start.bat */
  if (!process.env.BIOBUZZ_TEST || process.env.BIOBUZZ_BRIDGE) {
    bridge = new Bridge({ port: +process.env.BIOBUZZ_BRIDGE || 9662, dataDir: DATA, simPath: SIM, padPath: path.join(__dirname, "pad", "pad.html") });
    bridge.start().then(ok => { if (ok && !process.env.BIOBUZZ_NOADB) bridge.adbWatch(); });
  }
  reg();
  createSplash();
  createWindow();
  setTimeout(showMain, 25000);
  updInit();
  win.webContents.once("did-finish-load", () => {
    if (anyIn()) setTimeout(() => runSync("start"), 1500);
    if (AU) setTimeout(() => updCheck(false), 8000);
  });
  setInterval(() => runSync("timer"), 120000);
});
let quitting = false;
app.on("before-quit", e => {
  try { store && store.flushKv(); } catch (err) {}
  /* לפני יציאה — עוד סנכרון אחד (עד 6 שניות), כדי שהמחשב הבא יקבל הכול */
  if (!quitting && anyIn() && !process.env.BIOBUZZ_TEST) {
    e.preventDefault(); quitting = true;
    Promise.race([runSync("quit"), new Promise(r => setTimeout(r, 6000))]).finally(() => app.quit());
  }
});
app.on("will-quit", () => { try { bridge && bridge.stop(); } catch (e) {} });
app.on("window-all-closed", () => { try { store && store.flushKv(); } catch (e) {} app.quit(); });
/* במק: לחיצה על האייקון במזח מחזירה את החלון */
app.on("activate", () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } });
