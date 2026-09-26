/* BIOBUZZ — האפליקציה (Electron, התהליך הראשי) */
"use strict";
const { app, BrowserWindow, ipcMain, dialog, shell, screen, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const { Store, writeAtomic } = require("./store");
const { Sync } = require("./sync");
const { Bridge, findAdb } = require("./bridge");
const { execFile } = require("child_process");
const os = require("os");
const REPO = { owner: "yaarilevrosen-cpu", repo: "BIOBUZZ" };

/* במחשב נייד עם שני כרטיסי מסך — תמיד החזק */
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("ignore-gpu-blocklist");

/* הנתונים: באפליקציה המותקנת — %APPDATA%\BIOBUZZ\data. בגרסה הניידת — ליד קובץ ה-EXE (טוב לדיסק און קי) */
const DATA = process.env.BIOBUZZ_DATA ||
  (process.env.PORTABLE_EXECUTABLE_DIR ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, "BIOBUZZ-data") : path.join(app.getPath("userData"), "data"));
const SIM = process.env.BIOBUZZ_SIM || path.join(__dirname, "sim", "index.html");
let store = null, win = null, sync = null, bridge = null;
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

function createWindow() {
  const b = loadBounds();
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height, minWidth: 900, minHeight: 600,
    backgroundColor: "#0B0E12", title: "BIOBUZZ — אפולו 9662", show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false,
      sandbox: true, backgroundThrottling: false, spellcheck: false }
  });
  win.setMenu(null);
  if (b.max) win.maximize();
  if (b.full) win.setFullScreen(true);
  win.once("ready-to-show", () => win.show());
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
    else if (i.key === "F12" || (i.control && i.shift && i.key.toLowerCase() === "i")) { win.webContents.toggleDevTools(); e.preventDefault(); }
    else if (i.control && i.key.toLowerCase() === "r") { store.flushKv(); win.webContents.reload(); e.preventDefault(); }
  });
  win.loadFile(SIM);
}

function reg() {
  /* סינכרוני — לפני שהסימולטור עולה, הוא צריך את הנתונים של הנהג */
  ipcMain.on("bb:boot", e => {
    e.returnValue = { kv: store.kvAll(), profile: store.active(), profiles: store.profiles(), firstRun: store.firstRun,
      version: app.getVersion(), dataDir: DATA, backups: store.backupsList() };
  });
  ipcMain.on("bb:kvSet", (e, k, v) => store.kvSet(k, v));
  ipcMain.on("bb:kvRemove", (e, k) => store.kvSet(k, null));
  ipcMain.on("bb:kvClear", () => store.kvClear());
  ipcMain.on("bb:flush", e => { store.flushKv(); e.returnValue = true; });
  ipcMain.handle("bb:profiles", () => store.profiles());
  ipcMain.handle("bb:profileAdd", (e, name, emoji, color) => { const p = store.addProfile(name, { emoji, color }); soonSync(); return p; });
  ipcMain.handle("bb:profileUpdate", (e, id, patch) => { const p = store.updateProfile(id, patch || {}); soonSync(); return p; });
  ipcMain.handle("bb:profileRemove", (e, id) => { const r = store.removeProfile(id); soonSync(); return r; });
  ipcMain.handle("bb:profileSwitch", (e, id) => { const ok = store.switchTo(id); if (ok) setTimeout(() => win && win.webContents.reload(), 30); return ok; });
  ipcMain.handle("bb:firstRunDone", () => { store.firstRun = false; return true; });
  ipcMain.handle("bb:matchAdd", (e, m) => { const r = store.addMatch(m); soonSync(); return r; });
  ipcMain.handle("bb:matches", (e, id) => store.matches(id, { lite: true }));
  ipcMain.handle("bb:team", () => store.team());
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
  ipcMain.handle("bb:acctStatus", () => sync.status());
  ipcMain.handle("bb:acctSignIn", async (e, em, pw) => { const r = await sync.signIn(em, pw); if (r.ok) runSync("login"); return r; });
  ipcMain.handle("bb:acctSignUp", async (e, em, pw) => { const r = await sync.signUp(em, pw); if (r.ok && !r.confirm) runSync("login"); return r; });
  ipcMain.handle("bb:acctRecover", (e, em) => sync.recover(em));
  ipcMain.handle("bb:acctSignOut", async () => { const r = await sync.signOut(); send("bb:sync", { status: sync.status() }); return r; });
  ipcMain.handle("bb:syncNow", () => runSync("manual"));
  /* ── עדכונים ── */
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
function soonSync(ms) { if (!sync || !sync.status().loggedIn) return; clearTimeout(syncT); syncT = setTimeout(() => runSync("soon"), ms || 4000); }
async function runSync(why) {
  if (!sync || !sync.status().loggedIn) return { ok: false, why: "לא מחוברים" };
  send("bb:sync", { status: Object.assign(sync.status(), { busy: true }) });
  const r = await sync.syncNow();
  send("bb:sync", { status: sync.status(), result: r, why });
  return r;
}
/* ── עדכונים מגיטהאב ── */
const PORTABLE = !!process.env.PORTABLE_EXECUTABLE_DIR;
let AU = null;
const UPD = { state: "idle", version: "", percent: 0, url: "https://github.com/" + REPO.owner + "/" + REPO.repo + "/releases/latest", auto: false, error: "" };
function updSet(p) { Object.assign(UPD, p); send("bb:upd", UPD); }
function verCmp(a, b) { const x = String(a).replace(/^v/, "").split(/[.-]/).map(n => parseInt(n, 10) || 0), y = String(b).replace(/^v/, "").split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; }
function updInit() {
  if (!app.isPackaged || PORTABLE || process.platform !== "win32" || process.env.BIOBUZZ_TEST) return;
  try { AU = require("electron-updater").autoUpdater; } catch (e) { AU = null; return; }
  AU.autoDownload = true; AU.autoInstallOnAppQuit = true; AU.allowPrerelease = false;
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

app.whenReady().then(() => {
  store = new Store(DATA);
  try { store.dailyBackup(14); } catch (e) { console.error(e); }
  const enc = s => (safeStorage && safeStorage.isEncryptionAvailable()) ? "e:" + safeStorage.encryptString(s).toString("base64") : "p:" + Buffer.from(s, "utf8").toString("base64");
  const dec = s => s.startsWith("e:") ? safeStorage.decryptString(Buffer.from(s.slice(2), "base64")) : Buffer.from(s.replace(/^p:/, ""), "base64").toString("utf8");
  sync = new Sync(store, DATA, { enc, dec });
  /* הגשר המובנה: שלט טלפון ומשחק ברשת בלי start.bat */
  if (!process.env.BIOBUZZ_TEST || process.env.BIOBUZZ_BRIDGE) {
    bridge = new Bridge({ port: +process.env.BIOBUZZ_BRIDGE || 9662, dataDir: DATA, simPath: SIM, padPath: path.join(__dirname, "pad", "pad.html") });
    bridge.start().then(ok => { if (ok) bridge.adbWatch(); });
  }
  reg();
  createWindow();
  updInit();
  win.webContents.once("did-finish-load", () => {
    if (sync.status().loggedIn) setTimeout(() => runSync("start"), 1500);
    if (AU) setTimeout(() => updCheck(false), 8000);
  });
  setInterval(() => runSync("timer"), 120000);
});
let quitting = false;
app.on("before-quit", e => {
  try { store && store.flushKv(); } catch (err) {}
  /* לפני יציאה — עוד סנכרון אחד (עד 6 שניות), כדי שהמחשב הבא יקבל הכול */
  if (!quitting && sync && sync.status().loggedIn && !process.env.BIOBUZZ_TEST) {
    e.preventDefault(); quitting = true;
    Promise.race([sync.syncNow(), new Promise(r => setTimeout(r, 6000))]).finally(() => app.quit());
  }
});
app.on("will-quit", () => { try { bridge && bridge.stop(); } catch (e) {} });
app.on("window-all-closed", () => { try { store && store.flushKv(); } catch (e) {} app.quit(); });
