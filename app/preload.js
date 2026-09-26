/* BIOBUZZ — הגשר בין הסימולטור לאפליקציה.
   לפני שהסימולטור עולה: הנתונים של הנהג הפעיל נכתבים לאחסון של הדף. */
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const KEYRE = /^(bb|biobuzz)/i;
const boot = ipcRenderer.sendSync("bb:boot");
try {
  const ls = window.localStorage, rm = [];
  for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && KEYRE.test(k)) rm.push(k); }
  rm.forEach(k => ls.removeItem(k));
  for (const k in boot.kv) ls.setItem(k, boot.kv[k]);
} catch (e) { console.error("bbApp preload", e); }

contextBridge.exposeInMainWorld("bbApp", {
  version: boot.version, dataDir: boot.dataDir, firstRun: boot.firstRun,
  profile: boot.profile, profilesAtBoot: boot.profiles, backupsAtBoot: boot.backups,
  kvSet: (k, v) => { if (KEYRE.test(k)) ipcRenderer.send("bb:kvSet", String(k), String(v)); },
  kvRemove: k => { if (KEYRE.test(k)) ipcRenderer.send("bb:kvRemove", String(k)); },
  kvClear: () => ipcRenderer.send("bb:kvClear"),
  flush: () => ipcRenderer.sendSync("bb:flush"),
  profiles: () => ipcRenderer.invoke("bb:profiles"),
  profileAdd: (name, emoji, color) => ipcRenderer.invoke("bb:profileAdd", String(name || ""), emoji, color),
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
  importBackup: txt => ipcRenderer.invoke("bb:importBackup", txt)
});
