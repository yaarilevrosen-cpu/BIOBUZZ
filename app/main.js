/* BIOBUZZ — האפליקציה (Electron, התהליך הראשי) */
"use strict";
const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const { Store, writeAtomic } = require("./store");

/* במחשב נייד עם שני כרטיסי מסך — תמיד החזק */
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("ignore-gpu-blocklist");

/* הנתונים: באפליקציה המותקנת — %APPDATA%\BIOBUZZ\data. בגרסה הניידת — ליד קובץ ה-EXE (טוב לדיסק און קי) */
const DATA = process.env.BIOBUZZ_DATA ||
  (process.env.PORTABLE_EXECUTABLE_DIR ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, "BIOBUZZ-data") : path.join(app.getPath("userData"), "data"));
const SIM = process.env.BIOBUZZ_SIM || path.join(__dirname, "sim", "index.html");
let store = null, win = null;

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
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
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
  ipcMain.handle("bb:profileAdd", (e, name, emoji, color) => { const p = store.addProfile(name, { emoji, color }); return p; });
  ipcMain.handle("bb:profileUpdate", (e, id, patch) => store.updateProfile(id, patch || {}));
  ipcMain.handle("bb:profileRemove", (e, id) => store.removeProfile(id));
  ipcMain.handle("bb:profileSwitch", (e, id) => { const ok = store.switchTo(id); if (ok) setTimeout(() => win && win.webContents.reload(), 30); return ok; });
  ipcMain.handle("bb:firstRunDone", () => { store.firstRun = false; return true; });
  ipcMain.handle("bb:matchAdd", (e, m) => store.addMatch(m));
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
  ipcMain.handle("bb:importBackup", async (e, txt) => {
    txt = txt || await pick("ייבוא גיבוי מהדפדפן"); if (txt == null) return { ok: false, canceled: true };
    const r = store.importBrowserBackup(txt); if (r.ok) setTimeout(() => win && win.webContents.reload(), 30); return r;
  });
}

app.whenReady().then(() => {
  store = new Store(DATA);
  try { store.dailyBackup(14); } catch (e) { console.error(e); }
  reg();
  createWindow();
});
app.on("before-quit", () => { try { store && store.flushKv(); } catch (e) {} });
app.on("window-all-closed", () => { try { store && store.flushKv(); } catch (e) {} app.quit(); });
