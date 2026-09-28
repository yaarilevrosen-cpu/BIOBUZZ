#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
padbridge — גשר ושרת חדר לסימולטור BIOBUZZ של אפולו 9662.

שלושה תפקידים, ואף אחד מהם לא מכיל לוגיקת משחק — הגשר רק מעביר בתים:
  pad   — שלט הטלפון (דרך adb reverse או ברשת) ↔ הסימולטור במחשב הזה
  host  — הסימולטור שפתח חדר; הוא המכריע
  guest — סימולטור במחשב אחר באותה רשת

ספריית התקן בלבד. פייתון 3.8 ומעלה.
הרצה:  python padbridge.py            (פורט 9662)
       python padbridge.py --no-adb   (בלי לחפש טלפון בכבל)
       python padbridge.py --sim BIOBUZZ-lab.html
"""
import argparse, base64, hashlib, hmac, ipaddress, json, os, re, secrets, socket, struct
import subprocess, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, quote

PAD_B64 = "__PAD_B64__"
HERE = os.path.dirname(os.path.abspath(__file__))
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

# ── קונסולה: עברית אם אפשר, אנגלית אם לא ──
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    "שלום".encode(sys.stdout.encoding or "ascii")
    HEB = True
except Exception:
    HEB = False

def say(he, en):
    try:
        print(he if HEB else en, flush=True)
    except UnicodeEncodeError:
        print(en, flush=True)

# ── קוד חדר: אותה פונקציה בדיוק כמו netCodeMake בסימולטור ──
AB = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
KEY_MIN, KEY_MAX = 0x10000, 0x100000000          # v63: מפתח של 32 ביט

def _check(d):
    return sum((i + 1) * v for i, v in enumerate(d)) % 32

def _b32(n, ln):
    d = []
    for _ in range(ln):
        d.insert(0, n & 31)
        n >>= 5
    return d

def room_code(ip, port, key):
    try:
        p = [int(x) for x in ip.split(".")]
    except ValueError:
        return ""
    off = port - 9662
    if len(p) != 4 or any(not (0 <= v <= 255) for v in p) or not (0 <= off <= 15) or not key > 0:
        return ""
    # מפתח ישן (12 ביט) ב-192.168 — הקוד הקצר הישן: 6 תווים (XXX-XXX)
    if key < 0x1000 and p[0] == 192 and p[1] == 168 and off == 0:
        s = "".join(AB[v] for v in _b32((p[2] << 20) | (p[3] << 12) | key, 6))
        return s[:3] + "-" + s[3:]
    if key < 0x4000:
        n = 0
        for v in p:
            n = (n << 8) | v
        n = (((n << 4) | off) << 14) | (key & 0x3FFF)
        d = _b32(n, 10)
        d.append(_check(d))
        s = "".join(AB[v] for v in d)
        return s[:4] + "-" + s[4:8] + "-" + s[8:]
    k = int(key) & 0xFFFFFFFF
    # v63: מפתח 32 ביט. ב-192.168 — XXXXX-XXXXX (כתובת 16 ביט + מפתח 32 ביט + 2 ביט ביקורת)
    if p[0] == 192 and p[1] == 168 and off == 0:
        d = _b32((p[2] << 40) | (p[3] << 32) | k, 10)
        d[0] += 8 * (_check(d[1:]) & 3)
        s = "".join(AB[v] for v in d)
        return s[:5] + "-" + s[5:]
    n = 0
    for v in p:
        n = (n << 8) | v
    n = (((n << 4) | off) << 32) | k
    d = _b32(n, 14)
    d.append(_check(d))
    s = "".join(AB[v] for v in d)
    return s[:5] + "-" + s[5:10] + "-" + s[10:]

def is_lan(addr):
    try:
        a = ipaddress.ip_address(addr.split("%")[0])
    except ValueError:
        return False
    if a.version == 6 and a.ipv4_mapped:
        a = a.ipv4_mapped
    return a.is_private or a.is_loopback or a.is_link_local

def is_local(addr):
    try:
        a = ipaddress.ip_address(addr.split("%")[0])
        if a.version == 6 and a.ipv4_mapped:
            a = a.ipv4_mapped
        return a.is_loopback
    except ValueError:
        return False

def host_ok(h):
    """כתובת IP מספרית או localhost — לא שם דומיין (מונע DNS rebinding)"""
    h = (h or "").lower().strip("[]")
    return h == "localhost" or re.match(r"^\d{1,3}(\.\d{1,3}){3}$", h) is not None or re.match(r"^[0-9a-f:]+$", h) is not None

def split_host(hp):
    hp = (hp or "").lower()
    m = re.match(r"^\[([^\]]+)\](?::(\d+))?$", hp) or re.match(r"^([^:]+)(?::(\d+))?$", hp)
    return (m.group(1), int(m.group(2)) if m.group(2) else 80) if m else None

def origin_ok(origin, host_hdr, role):
    """Origin מותר: בלי Origin (לא דפדפן), file:// / null, או הכתובת של הגשר עצמו.
    לאורח מותר גם גשר BIOBUZZ אחר ברשת (http://<IP>:9662–9677)"""
    if origin is None:
        return True
    origin = origin.lower()
    if origin == "null" or origin.startswith("file:"):
        return True
    if not origin.startswith("http://"):
        return False
    o, h = split_host(origin[7:]), split_host(host_hdr)
    if not o or not host_ok(o[0]):
        return False
    loop = lambda x: x == "localhost" or is_local(x)
    if h and o[1] == h[1] and (o[0] == h[0] or (loop(o[0]) and loop(h[0]))):
        return True
    if role == "guest" and 9662 <= o[1] <= 9677 and (o[0] == "localhost" or is_lan(o[0])):
        return True
    return False

def lan_ips():
    out = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))          # לא שולח כלום — רק בוחר ממשק
        out.append(s.getsockname()[0]); s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in out:
                out.append(ip)
    except Exception:
        pass
    good = [ip for ip in out if is_lan(ip) and not ip.startswith("127.")]
    return good

def _new_key():
    return secrets.randbelow(KEY_MAX - KEY_MIN) + KEY_MIN

def load_key(fixed):
    if fixed is not None:
        return int(fixed) & 0xFFFFFFFF
    path = os.path.join(HERE, ".room-key")
    try:
        with open(path) as f:
            k = int(f.read().strip())
        if KEY_MIN <= k < KEY_MAX:
            return k
        raise ValueError("old key")          # מפתח ישן וקטן — מחליפים במפתח של 32 ביט
    except Exception:
        k = _new_key()
        try:
            with open(path, "w") as f:
                f.write(str(k))
        except Exception:
            pass
        return k

# ── הגבלות (v63) ──
LIM = {"fails_per_ip": 8, "fail_window": 300, "lock": 300, "fails_global": 60, "lock_global": 120,
       "join_per_min": 20, "ws_per_ip": 12, "small": 64 * 1024, "big": 4 * 1024 * 1024}

# ── WebSocket מינימלי (RFC 6455) ──
class WS:
    def __init__(self, sock, role, addr):
        self.sock, self.role, self.addr = sock, role, addr
        self.lock = threading.Lock()
        self.alive = True
        self.id = None
        self.name = ""
        self.maxlen = LIM["small"] if role in ("pad", "guest") else LIM["big"]
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        # חיבור מת (טלפון שנכבה) לא נשאר לנצח: הגשר שולח פינג כל 20 שניות, ו-60 שניות בלי כלום = נסגר
        sock.settimeout(60)

    def _recv(self, n):
        buf = b""
        while len(buf) < n:
            c = self.sock.recv(n - len(buf))
            if not c:
                raise ConnectionError
            buf += c
        return buf

    def recv(self):
        """מחזיר (opcode, payload) של הודעה שלמה, כולל חיבור מקטעים"""
        data, first = b"", None
        while True:
            h = self._recv(2)
            fin, op = h[0] & 0x80, h[0] & 0x0F
            masked, ln = h[1] & 0x80, h[1] & 0x7F
            if ln == 126:
                ln = struct.unpack(">H", self._recv(2))[0]
            elif ln == 127:
                ln = struct.unpack(">Q", self._recv(8))[0]
            if ln > self.maxlen or len(data) + ln > self.maxlen:
                raise ConnectionError
            mask = self._recv(4) if masked else b"\0\0\0\0"
            p = bytearray(self._recv(ln))
            for i in range(len(p)):
                p[i] ^= mask[i & 3]
            if op >= 8:                               # בקרה באמצע הודעה
                if op == 8:
                    raise ConnectionError
                if op == 9:
                    self.send(bytes(p), 0xA)
                continue
            if first is None:
                first = op
            data += bytes(p)
            if fin:
                return first, data

    def send(self, payload, op=None):
        if isinstance(payload, str):
            payload = payload.encode("utf-8")
            op = 1 if op is None else op
        op = 2 if op is None else op
        n = len(payload)
        if n < 126:
            hdr = struct.pack(">BB", 0x80 | op, n)
        elif n < 65536:
            hdr = struct.pack(">BBH", 0x80 | op, 126, n)
        else:
            hdr = struct.pack(">BBQ", 0x80 | op, 127, n)
        try:
            with self.lock:
                self.sock.sendall(hdr + payload)
            return True
        except Exception:
            self.alive = False
            return False

    def close(self):
        self.alive = False
        try:
            self.sock.close()
        except Exception:
            pass

# ── החדר: מי מחובר, ולאן כל הודעה הולכת ──
class Room:
    def __init__(self, port, key, token=None):
        self.port, self.key = port, key
        self.token = token or secrets.token_urlsafe(24)
        self.fails, self.gfails, self.glock, self.joins, self.conns = {}, [], 0.0, {}, {}
        self.lock = threading.Lock()
        self.sims, self.pads, self.guests = [], [], {}
        self.host = None
        self.n = 0
        self.lan = lan_ips()
        self.code = room_code(self.lan[0], port, key) if self.lan else ""

    def rekey(self):
        # קוד חדש לבקשת המארח — מי שכבר בפנים נשאר
        k = self.key
        while k == self.key:
            k = _new_key()
        self.key = k
        try:
            with open(os.path.join(HERE, ".room-key"), "w") as f:
                f.write(str(k))
        except Exception:
            pass
        self.lan = lan_ips()
        self.code = room_code(self.lan[0], self.port, k) if self.lan else ""

    def info(self):
        return {"t": "info", "lan": self.lan, "port": self.port, "key": self.key, "code": self.code}

    def health(self, local):
        # v63: בלי קוד חדר ובלי שמות/כתובות של אורחים. כתובות הרשת — רק למחשב הזה (קוד QR לטלפון)
        with self.lock:
            o = {"ok": True, "host": self.host is not None, "sims": len(self.sims),
                 "pad": len(self.pads) > 0, "guests": len(self.guests), "port": self.port}
        if local:
            o["lan"] = self.lan
        return o

    # ── ניסיונות שגויים ──
    def locked(self, ip):
        now = time.time()
        with self.lock:
            if self.glock > now:
                return True
            f = self.fails.get(ip)
            return bool(f and f[2] > now)

    def fail(self, ip):
        now = time.time()
        with self.lock:
            n, t0, until = self.fails.get(ip, (0, now, 0))
            if now - t0 > LIM["fail_window"]:
                n, t0 = 0, now
            n += 1
            if n >= LIM["fails_per_ip"]:
                n, t0, until = 0, now, now + LIM["lock"]
            self.fails[ip] = (n, t0, until)
            self.gfails = [t for t in self.gfails if now - t < LIM["fail_window"]] + [now]
            if len(self.gfails) >= LIM["fails_global"]:
                self.glock, self.gfails = now + LIM["lock_global"], []
                say("! יותר מדי קודים שגויים — הצטרפות מושהית לשתי דקות", "! too many wrong room codes — joining paused for 2 minutes")
            if len(self.fails) > 5000:
                self.fails.clear()

    def key_ok(self, v):
        return bool(re.match(r"^\d{1,10}$", v or "")) and int(v) == self.key

    def tok_ok(self, v):
        return hmac.compare_digest((v or "").encode(), self.token.encode())

    def join_rate(self, ip):
        now = time.time()
        with self.lock:
            n, t0 = self.joins.get(ip, (0, now))
            if now - t0 > 60:
                n, t0 = 0, now
            self.joins[ip] = (n + 1, t0)
            if len(self.joins) > 5000:
                self.joins.clear()
            return n + 1 <= LIM["join_per_min"]

    def conn(self, ip, d):
        with self.lock:
            n = self.conns.get(ip, 0) + d
            if n > 0:
                self.conns[ip] = n
            else:
                self.conns.pop(ip, None)
            return n

    def join_url(self):
        return "http://%s:%d/join?k=%d" % (self.lan[0], self.port, self.key) if self.lan else ""

    def busy(self):
        return bool(self.sims) or self.host is not None

    def all(self):
        with self.lock:
            return list(self.sims) + list(self.pads) + list(self.guests.values()) + ([self.host] if self.host else [])


    # שלט טלפון ↔ סימולטור
    def to_sims(self, msg):
        for s in list(self.sims):
            s.send(msg)

    def add(self, ws):
        with self.lock:
            if ws.role == "sim":
                self.sims.append(ws)
            elif ws.role == "pad":
                self.pads.append(ws)
            elif ws.role == "host":
                old = self.host
                self.host = ws
                if old:
                    old.close()
            elif ws.role == "guest":
                self.n += 1
                ws.id = "g%d" % self.n
                self.guests[ws.id] = ws
        if ws.role == "pad":
            self.to_sims('{"t":"pad","on":true}')
            say("● טלפון התחבר (%s)" % ws.addr, "* phone connected (%s)" % ws.addr)
        elif ws.role == "sim":
            ws.send('{"t":"pad","on":%s}' % ("true" if self.pads else "false"))
            for p in self.pads:
                p.send('{"t":"sim","on":true}')
        elif ws.role == "host":
            ws.send(json.dumps(self.info()))
            for g in self.guests.values():
                ws.send(json.dumps({"t": "gj", "id": g.id, "name": g.name}))
            say("● חדר נפתח. קוד: %s" % self.code, "* room open. code: %s" % self.code)
        elif ws.role == "guest":
            if self.host:
                self.host.send(json.dumps({"t": "gj", "id": ws.id, "name": ws.name}))
            else:
                ws.send('{"t":"nohost"}')
            say("● %s הצטרף מ-%s" % (ws.name, ws.addr), "* %s joined from %s" % (ws.name, ws.addr))

    def drop(self, ws):
        with self.lock:
            if ws in self.sims:
                self.sims.remove(ws)
            if ws in self.pads:
                self.pads.remove(ws)
            if self.host is ws:
                self.host = None
            if ws.id and self.guests.get(ws.id) is ws:
                del self.guests[ws.id]
        if ws.role == "pad" and not self.pads:
            self.to_sims('{"t":"pad","on":false}')
            say("○ הטלפון התנתק", "o phone disconnected")
        elif ws.role == "guest" and self.host:
            self.host.send(json.dumps({"t": "gl", "id": ws.id}))
            say("○ %s יצא" % ws.name, "o %s left" % ws.name)
        elif ws.role == "host":
            for g in list(self.guests.values()):
                g.send('{"t":"nohost"}')
            say("○ החדר נסגר", "o room closed")

    def route(self, ws, op, data):
        r = ws.role
        if r == "pad":
            if op == 1:
                self.to_sims(data.decode("utf-8", "replace"))
        elif r == "sim":
            if op != 1:
                return
            s = data.decode("utf-8", "replace")
            if self.pads:
                for p in list(self.pads):
                    p.send(s)
            elif '"t":"q"' in s:                      # אין טלפון — הגשר עונה לבד
                ws.send(s.replace('"t":"q"', '"t":"qr"'))
        elif r == "host":
            if ws is not self.host:
                return
            if op == 2:                               # מצב הזירה — לכל האורחים כמו שהוא
                for g in list(self.guests.values()):
                    g.send(data, 2)
                return
            try:
                m = json.loads(data.decode("utf-8"))
            except Exception:
                return
            if not isinstance(m, dict):
                return
            if m.get("t") == "info":
                ws.send(json.dumps(self.info()))
                return
            if m.get("t") == "rekey" and ws is self.host:
                self.rekey()
                ws.send(json.dumps(self.info()))
                return
            to = m.pop("to", None)
            s = json.dumps(m, ensure_ascii=False)
            if to == "*":
                for g in list(self.guests.values()):
                    g.send(s)
            elif isinstance(to, str) and to in self.guests:
                g = self.guests[to]
                g.send(s)
                if m.get("t") == "deny":
                    g.close()
        elif r == "guest":
            # v63: מפענחים ובונים מחדש — אורח לא יכול להוסיף ״id״ משלו ולהתחזות לאורח אחר
            if op != 1 or len(data) > 2000:
                return
            try:
                m = json.loads(data.decode("utf-8"))
            except Exception:
                return
            if not isinstance(m, dict):
                return
            h = self.host
            if h:
                h.send(json.dumps({"t": "g", "id": ws.id, "m": m}, ensure_ascii=False))

def pinger():
    while True:
        time.sleep(20)
        for w in ROOM.all():
            w.send(b"", 9)

ROOM = None
SIM_PATH = None

def pad_page():
    ext = os.path.join(HERE, "pad.html")
    if os.path.exists(ext):                           # קובץ חיצוני קודם — משנים פריסה בלי לגעת בקוד
        with open(ext, "rb") as f:
            return f.read()
    return base64.b64decode(PAD_B64)

_SIM_CACHE = {"key": None, "body": None, "at": 0}
_SIM_LOCK = threading.Lock()

def sim_body():
    """הסימולטור מהדיסק — נקרא פעם אחת ונשמר (מתחדש כשהקובץ משתנה)"""
    if not SIM_PATH:
        return None
    try:
        st = os.stat(SIM_PATH)
    except OSError:
        return None
    k = (st.st_mtime_ns, st.st_size)
    with _SIM_LOCK:
        if _SIM_CACHE["key"] != k:
            try:
                with open(SIM_PATH, "rb") as f:
                    body = f.read()
            except OSError:
                return None
            i = body.find(b"<head>")
            _SIM_CACHE.update(key=k, body=body, at=i + 6 if i >= 0 else 0)
        return _SIM_CACHE["body"], _SIM_CACHE["at"]

class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "padbridge"

    def log_message(self, *a):
        pass

    timeout = 30                                      # בקשה שלא נגמרת — נסגרת

    def _send(self, code, body, ctype="text/html; charset=utf-8", extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _send_sim(self, inj):
        b = sim_body()
        if not b:
            return self._send(404, "sim file not found")
        body, at = b
        inj = inj.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body) + len(inj)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        mv = memoryview(body)
        self.wfile.write(mv[:at])
        self.wfile.write(inj)
        self.wfile.write(mv[at:])

    def do_GET(self):
        peer = self.client_address[0]
        if not is_lan(peer):                          # רשת מקומית בלבד — אין חריגים
            return self._send(403, "LAN only")
        hh = split_host(self.headers.get("Host"))
        if not hh or not host_ok(hh[0]):                  # שם דומיין בכותרת Host = ניסיון DNS rebinding
            return self._send(403, "bad host")
        u = urlparse(self.path)
        q = parse_qs(u.query)
        path = u.path.rstrip("/") or "/"
        if path == "/ws":
            return self.upgrade(q, peer)
        if path == "/health":
            o = (self.headers.get("Origin") or "").lower()
            cors = {"Access-Control-Allow-Origin": "null", "Vary": "Origin"} if (o == "null" or o.startswith("file:")) else {"Vary": "Origin"}
            return self._send(200, json.dumps(ROOM.health(is_local(peer))), "application/json", cors)
        if path == "/":
            return self._send(200, pad_page())
        if path == "/sim":
            if not is_local(peer):
                return self._send(403, "local only")
            return self._send_sim("<script>window.BB_TOK=%s;</script>" % json.dumps(ROOM.token))
        if path == "/join":
            if not ROOM.join_rate(peer) or ROOM.locked(peer):
                return self._send(429, "<meta charset=utf-8><body dir=rtl style='font:18px system-ui'>יותר מדי ניסיונות — נסו שוב בעוד כמה דקות.")
            if not ROOM.key_ok((q.get("k") or [""])[0]):
                ROOM.fail(peer)
                return self._send(403, "<meta charset=utf-8><body dir=rtl style='font:18px system-ui'>"
                                  "צריך את קוד החדר. פתח את הסימולטור והקלד אותו בלובי.")
            return self._send_sim("<script>window.BB_JOIN={port:%d,key:%d};</script>" % (ROOM.port, ROOM.key))
        return self._send(404, "not found")

    def upgrade(self, q, peer):
        role = (q.get("role") or [""])[0]
        if role not in ("pad", "sim", "host", "guest"):
            return self._send(400, "bad role")
        origin = self.headers.get("Origin")
        if not origin_ok(origin, self.headers.get("Host"), role):
            return self._send(403, "bad origin")
        if role in ("sim", "host") and not is_local(peer):
            return self._send(403, "local only")
        # מארח צריך את האסימון הסודי (מוזרק לדף /sim). ״sim״ (שלט הטלפון בסימולטור) מותר גם מסימולטור שנפתח מקובץ
        tok = ROOM.tok_ok((q.get("t") or [""])[0])
        if role == "host" and not tok:
            return self._send(403, "open the simulator from the bridge: http://localhost:%d/sim" % ROOM.port)
        if role == "sim" and not tok and not (origin is None or origin.lower() == "null" or origin.lower().startswith("file:")):
            return self._send(403, "bad token")
        if ROOM.conn(peer, 0) >= LIM["ws_per_ip"]:
            return self._send(429, "too many connections")
        if role == "guest":
            if ROOM.locked(peer):
                return self._send(429, "too many attempts")
            if not ROOM.key_ok((q.get("k") or [""])[0]):
                ROOM.fail(peer)
                return self._send(403, "bad key")
        key = self.headers.get("Sec-WebSocket-Key")
        if not key:
            return self._send(400, "no key")
        acc = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        self.send_response(101)
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", acc)
        self.end_headers()
        self.wfile.flush()
        ws = WS(self.connection, role, peer)
        ws.name = re.sub(r"[\x00-\x1f<>]", "", (q.get("n") or ["אורח"])[0])[:20] or "אורח"
        ROOM.conn(peer, 1)
        ROOM.add(ws)
        try:
            while ws.alive:
                op, data = ws.recv()
                ROOM.route(ws, op, data)
        except Exception:
            pass
        finally:
            ROOM.conn(peer, -1)
            ROOM.drop(ws)
            ws.close()
            self.close_connection = True

# ── צופה ADB: כל טלפון חדש מקבל adb reverse מיד ──
def find_adb():
    # v63: רק תיקיות מוחלטות ב-PATH (shutil.which בוינדוס בודק קודם את התיקייה הנוכחית)
    names = ("adb.exe",) if os.name == "nt" else ("adb",)
    cands = [d for d in os.environ.get("PATH", "").split(os.pathsep) if d and os.path.isabs(d)]
    for env in ("ANDROID_HOME", "ANDROID_SDK_ROOT"):
        if os.environ.get(env) and os.path.isabs(os.environ[env]):
            cands.append(os.path.join(os.environ[env], "platform-tools"))
    home = os.path.expanduser("~")
    cands += [os.path.join(home, "AppData", "Local", "Android", "Sdk", "platform-tools"),
              os.path.join(home, "Library", "Android", "sdk", "platform-tools"),
              os.path.join(home, "Android", "Sdk", "platform-tools")]
    for c in cands:
        for n in names:
            p = os.path.join(c, n)
            if os.path.isfile(p):
                return p
    return None

def adb_watch(port):
    adb = find_adb()
    if not adb:
        say("אין adb — שלט הטלפון יעבוד רק דרך הרשת", "no adb found — phone pad over Wi-Fi only")
        return
    seen = set()
    flags = 0x08000000 if os.name == "nt" else 0
    while True:
        if not ROOM.busy():                       # רק כשהסימולטור מחובר לגשר (או שיש חדר)
            seen = set()
            time.sleep(1.5)
            continue
        try:
            out = subprocess.run([adb, "devices"], capture_output=True, text=True, timeout=5,
                                 creationflags=flags).stdout
            now = set(l.split()[0] for l in out.splitlines()[1:] if l.strip().endswith("device"))
            for s in now - seen:
                subprocess.run([adb, "-s", s, "reverse", "tcp:%d" % port, "tcp:%d" % port],
                               capture_output=True, timeout=5, creationflags=flags)
                say("● טלפון בכבל: %s — פתח בו http://localhost:%d" % (s, port),
                    "* phone on USB: %s — open http://localhost:%d on it" % (s, port))
            seen = now
        except Exception:
            pass
        time.sleep(1.5)

def main():
    global ROOM, SIM_PATH
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=9662)
    ap.add_argument("--sim", default=None)
    ap.add_argument("--no-adb", action="store_true")
    ap.add_argument("--key", type=int, default=None)
    a = ap.parse_args()
    if a.sim:
        SIM_PATH = os.path.abspath(a.sim)
    else:
        for n in ("BIOBUZZ-lab.html", "biobuzz-sim.html"):
            if os.path.exists(os.path.join(HERE, n)):
                SIM_PATH = os.path.join(HERE, n)
                break
    ROOM = Room(a.port, load_key(a.key))
    srv = ThreadingHTTPServer(("0.0.0.0", a.port), H)
    srv.daemon_threads = True
    say("═" * 52, "=" * 52)
    say(" גשר BIOBUZZ · אפולו 9662 · פורט %d" % a.port, " BIOBUZZ bridge · Apollo 9662 · port %d" % a.port)
    say("═" * 52, "=" * 52)
    say(" סימולטור במחשב הזה:  http://localhost:%d/sim" % a.port, " simulator here:  http://localhost:%d/sim" % a.port)
    say("   (לפתוח חדר — רק מהכתובת הזאת)", "   (to host a room, open the simulator from this address)")
    if not SIM_PATH:
        say("   (לא נמצא BIOBUZZ-lab.html ליד הגשר)", "   (BIOBUZZ-lab.html not found next to the bridge)")
    if ROOM.lan:
        say(" קוד חדר:              %s" % ROOM.code, " room code:        %s" % ROOM.code)
        say(" הצטרפות ממחשב אחר:   %s" % ROOM.join_url(), " join from LAN:    %s" % ROOM.join_url())
        say(" שלט טלפון בוויי-פיי:  http://%s:%d" % (ROOM.lan[0], a.port), " phone over Wi-Fi: http://%s:%d" % (ROOM.lan[0], a.port))
    else:
        say(" לא נמצאה רשת מקומית — משחק ברשת לא זמין", " no LAN found — network play unavailable")
    say(" רשת מקומית בלבד. Ctrl+C לסגירה.", " LAN only. Ctrl+C to quit.")
    threading.Thread(target=pinger, daemon=True).start()
    if not a.no_adb:
        threading.Thread(target=adb_watch, args=(a.port,), daemon=True).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        say("\nנסגר.", "\nbye.")

if __name__ == "__main__":
    main()
