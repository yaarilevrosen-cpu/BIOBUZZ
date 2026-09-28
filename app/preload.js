/* BIOBUZZ — הגשר בין הסימולטור לאפליקציה.
   לפני שהסימולטור עולה: הנתונים של הנהג הפעיל נכתבים לאחסון של הדף. */
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
/* חלון השידור (מסך שני) הוא דף ריק שהסימולטור מצייר אליו — בלי גשר ובלי נתונים */
if (!/^file:/.test(String(window.location.href))) return;
const KEYRE = /^(bb|biobuzz)/i;
const boot = ipcRenderer.sendSync("bb:boot");
/* v63: התהליך הראשי עונה רק לדף של הסימולטור */
if (!boot || typeof boot !== "object") return;
try {
  const ls = window.localStorage, rm = [];
  for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && KEYRE.test(k)) rm.push(k); }
  rm.forEach(k => ls.removeItem(k));
  for (const k in boot.kv) ls.setItem(k, boot.kv[k]);
} catch (e) { console.error("bbApp preload", e); }

contextBridge.exposeInMainWorld("bbApp", {
  version: boot.version, dataDir: boot.dataDir, firstRun: boot.firstRun, test: !!boot.test,
  /* v63: האסימון לגשר המובנה (חיבור ״sim״/״host״) — חדש בכל הפעלה */
  bridgeTok: String(boot.bridgeTok || ""),
  profile: boot.profile, profilesAtBoot: boot.profiles, backupsAtBoot: boot.backups,
  kvSet: (k, v) => { if (KEYRE.test(k)) ipcRenderer.send("bb:kvSet", String(k), String(v)); },
  kvRemove: k => { if (KEYRE.test(k)) ipcRenderer.send("bb:kvRemove", String(k)); },
  kvClear: () => ipcRenderer.send("bb:kvClear"),
  flush: () => ipcRenderer.sendSync("bb:flush"),
  bugSend: row => ipcRenderer.invoke("bb:bugSend", row),
  shot: () => ipcRenderer.invoke("bb:shot"),
  ready: () => ipcRenderer.send("bb:ready"),
  profiles: () => ipcRenderer.invoke("bb:profiles"),
  profileAdd: (name, emoji, color, local) => ipcRenderer.invoke("bb:profileAdd", String(name || ""), emoji, color, !!local),
  profileUpdate: (id, patch) => ipcRenderer.invoke("bb:profileUpdate", id, patch),
  profileRemove: id => ipcRenderer.invoke("bb:profileRemove", id),
  profileSwitch: id => ipcRenderer.invoke("bb:profileSwitch", id),
  firstRunDone: () => ipcRenderer.invoke("bb:firstRunDone"),
  matchAdd: m => ipcRenderer.invoke("bb:matchAdd", m),
  matches: id => ipcRenderer.invoke("bb:matches", id),
  team: () => ipcRenderer.invoke("bb:team"),
  openData: () => ipcRenderer.invoke("bb:openData"),
  backupNow: () => ipcRenderer.invoke("bb:backupNow"),
  teamExport: () => ipcRenderer.invoke("bb:teamExport"),
  teamImport: txt => ipcRenderer.invoke("bb:teamImport", txt),
  importBackup: txt => ipcRenderer.invoke("bb:importBackup", txt),
  bridgeStatus: () => ipcRenderer.invoke("bb:bridgeStatus"),
  saveVideo: (buf, name) => ipcRenderer.invoke("bb:saveVideo", buf, String(name || "")),
  showFile: f => ipcRenderer.invoke("bb:showFile", String(f || "")),
  openVideos: () => ipcRenderer.invoke("bb:openVideos"),
  adbPull: ip => ipcRenderer.invoke("bb:adbPull", String(ip || "")),
  /* חשבון וסנכרון */
  acctStatus: () => ipcRenderer.invoke("bb:acctStatus"),
  acctSignIn: (email, pw) => ipcRenderer.invoke("bb:acctSignIn", String(email || ""), String(pw || "")),
  acctSignUp: (email, pw) => ipcRenderer.invoke("bb:acctSignUp", String(email || ""), String(pw || "")),
  acctRecover: email => ipcRenderer.invoke("bb:acctRecover", String(email || "")),
  acctSignOut: () => ipcRenderer.invoke("bb:acctSignOut"),
  teamCall: (what, a, b) => ipcRenderer.invoke("bb:teamCall", String(what || ""), String(a || ""), String(b || "")),
  syncNow: () => ipcRenderer.invoke("bb:syncNow"),
  acctName: n => ipcRenderer.invoke("bb:acctName", String(n || "")),
  /* בינה מלאכותית — המפתח נכנס פעם אחת ולא חוזר לדף */
  aiStatus: () => ipcRenderer.invoke("bb:aiStatus"),
  aiSetKey: k => ipcRenderer.invoke("bb:aiSetKey", String(k || "")),
  aiClear: () => ipcRenderer.invoke("bb:aiClear"),
  aiCheck: () => ipcRenderer.invoke("bb:aiCheck"),
  aiDrills: () => ipcRenderer.invoke("bb:aiDrills"),
  aiAsk: (kind, o) => ipcRenderer.invoke("bb:aiAsk", String(kind || ""), o),
  onSync: cb => { ipcRenderer.on("bb:sync", (e, d) => { try { cb(d); } catch (err) {} }); },
  /* עדכונים */
  updCheck: () => ipcRenderer.invoke("bb:updCheck"),
  updInstall: () => ipcRenderer.invoke("bb:updInstall"),
  updState: () => ipcRenderer.invoke("bb:updState"),
  onUpd: cb => { ipcRenderer.on("bb:upd", (e, d) => { try { cb(d); } catch (err) {} }); },
  openUrl: url => ipcRenderer.invoke("bb:openUrl", String(url || ""))
});
