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
import argparse, base64, hashlib, ipaddress, json, os, random, shutil, socket, struct
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

def _check(d):
    return sum((i + 1) * v for i, v in enumerate(d)) % 32

def room_code(ip, port, key):
    p = [int(x) for x in ip.split(".")]
    off = port - 9662
    if len(p) != 4 or not (0 <= off <= 15):
        return ""
    # ברוב הבתים ובתי הספר הרשת היא 192.168.x.y — אז הקוד קצר: 6 תווים (XXX-XXX)
    if p[0] == 192 and p[1] == 168 and off == 0 and 0 < key < 0x1000:
        n = (p[2] << 20) | (p[3] << 12) | key
        d = []
        for _ in range(6):
            d.insert(0, n & 31)
            n >>= 5
        s = "".join(AB[v] for v in d)
        return s[:3] + "-" + s[3:]
    n = 0
    for v in p:
        n = (n << 8) | v
    n = (n << 4) | off
    n = (n << 14) | (key & 0x3FFF)
    d = []
    for _ in range(10):
        d.insert(0, n & 31)
        n >>= 5
    d.append(_check(d))
    s = "".join(AB[v] for v in d)
    return s[:4] + "-" + s[4:8] + "-" + s[8:]

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

def load_key(fixed):
    if fixed is not None:
        return fixed & 0x3FFF
    path = os.path.join(HERE, ".room-key")
    try:
        with open(path) as f:
            k = int(f.read().strip())
        if 0 < k < 0x1000:
            return k
        raise ValueError("old key")          # מפתח ישן וגדול — מחליפים במפתח של 12 ביט לקוד הקצר
    except Exception:
        k = random.SystemRandom().randrange(1, 0x1000)
        try:
            with open(path, "w") as f:
                f.write(str(k))
        except Exception:
            pass
        return k

# ── WebSocket מינימלי (RFC 6455) ──
class WS:
    def __init__(self, sock, role, addr):
        self.sock, self.role, self.addr = sock, role, addr
        self.lock = threading.Lock()
        self.alive = True
        self.id = None
        self.name = ""
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

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
            if ln > 4 * 1024 * 1024:
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
    def __init__(self, port, key):
        self.port, self.key = port, key
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
            k = random.SystemRandom().randrange(1, 0x1000)
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

    def health(self):
        with self.lock:
            return {"ok": True, "host": self.host is not None, "sims": len(self.sims),
                    "pad": len(self.pads) > 0,
                    "guests": [{"id": g.id, "name": g.name, "addr": g.addr} for g in self.guests.values()],
                    "port": self.port, "lan": self.lan, "code": self.code}

    def join_url(self):
        return "http://%s:%d/join?k=%d" % (self.lan[0], self.port, self.key) if self.lan else ""

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
            if op == 2:                               # מצב הזירה — לכל האורחים כמו שהוא
                for g in list(self.guests.values()):
                    g.send(data, 2)
                return
            try:
                m = json.loads(data.decode("utf-8"))
            except Exception:
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
            elif to in self.guests:
                g = self.guests[to]
                g.send(s)
                if m.get("t") == "deny":
                    g.close()
        elif r == "guest":
            if op != 1 or len(data) > 2000 or not data.startswith(b"{"):
                return
            if self.host:
                self.host.send('{"t":"g","id":"%s","m":%s}' % (ws.id, data.decode("utf-8", "replace")))

ROOM = None
SIM_PATH = None

def pad_page():
    ext = os.path.join(HERE, "pad.html")
    if os.path.exists(ext):                           # קובץ חיצוני קודם — משנים פריסה בלי לגעת בקוד
        with open(ext, "rb") as f:
            return f.read()
    return base64.b64decode(PAD_B64)

def sim_page(join=None):
    if not SIM_PATH or not os.path.exists(SIM_PATH):
        return None
    with open(SIM_PATH, "rb") as f:
        body = f.read()
    if join is not None:
        inj = ("<script>window.BB_JOIN={port:%d,key:%d};</script>" % (join[0], join[1])).encode()
        i = body.find(b"<head>")
        body = body[:i + 6] + inj + body[i + 6:] if i >= 0 else inj + body
    return body

class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "padbridge"

    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        peer = self.client_address[0]
        if not is_lan(peer):                          # רשת מקומית בלבד — אין חריגים
            return self._send(403, "LAN only")
        u = urlparse(self.path)
        q = parse_qs(u.query)
        path = u.path.rstrip("/") or "/"
        if path == "/ws":
            return self.upgrade(q, peer)
        if path == "/health":
            return self._send(200, json.dumps(ROOM.health()), "application/json")
        if path == "/":
            return self._send(200, pad_page())
        if path == "/sim":
            if not is_local(peer):
                return self._send(403, "local only")
            b = sim_page()
            return self._send(200, b) if b else self._send(404, "sim file not found")
        if path == "/join":
            try:
                k = int((q.get("k") or ["-1"])[0])
            except ValueError:
                k = -1
            if k != ROOM.key:
                return self._send(403, "<meta charset=utf-8><body dir=rtl style='font:18px system-ui'>"
                                  "צריך את קוד החדר. פתח את הסימולטור והקלד אותו בלובי.")
            b = sim_page((ROOM.port, ROOM.key))
            return self._send(200, b) if b else self._send(404, "sim file not found")
        return self._send(404, "not found")

    def upgrade(self, q, peer):
        role = (q.get("role") or [""])[0]
        if role not in ("pad", "sim", "host", "guest"):
            return self._send(400, "bad role")
        if role in ("sim", "host") and not is_local(peer):
            return self._send(403, "local only")
        if role == "guest":
            try:
                k = int((q.get("k") or ["-1"])[0])
            except ValueError:
                k = -1
            if k != ROOM.key:
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
        ws.name = ((q.get("n") or ["אורח"])[0])[:20]
        ROOM.add(ws)
        try:
            while ws.alive:
                op, data = ws.recv()
                ROOM.route(ws, op, data)
        except Exception:
            pass
        finally:
            ROOM.drop(ws)
            ws.close()
            self.close_connection = True

# ── צופה ADB: כל טלפון חדש מקבל adb reverse מיד ──
def find_adb():
    a = shutil.which("adb")
    if a:
        return a
    cands = []
    for env in ("ANDROID_HOME", "ANDROID_SDK_ROOT"):
        if os.environ.get(env):
            cands.append(os.path.join(os.environ[env], "platform-tools"))
    home = os.path.expanduser("~")
    cands += [os.path.join(home, "AppData", "Local", "Android", "Sdk", "platform-tools"),
              os.path.join(home, "Library", "Android", "sdk", "platform-tools"),
              os.path.join(home, "Android", "Sdk", "platform-tools")]
    for c in cands:
        for n in ("adb.exe", "adb"):
            p = os.path.join(c, n)
            if os.path.exists(p):
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
    if not SIM_PATH:
        say("   (לא נמצא BIOBUZZ-lab.html ליד הגשר)", "   (BIOBUZZ-lab.html not found next to the bridge)")
    if ROOM.lan:
        say(" קוד חדר:              %s" % ROOM.code, " room code:        %s" % ROOM.code)
        say(" הצטרפות ממחשב אחר:   %s" % ROOM.join_url(), " join from LAN:    %s" % ROOM.join_url())
        say(" שלט טלפון בוויי-פיי:  http://%s:%d" % (ROOM.lan[0], a.port), " phone over Wi-Fi: http://%s:%d" % (ROOM.lan[0], a.port))
    else:
        say(" לא נמצאה רשת מקומית — משחק ברשת לא זמין", " no LAN found — network play unavailable")
    say(" רשת מקומית בלבד. Ctrl+C לסגירה.", " LAN only. Ctrl+C to quit.")
    if not a.no_adb:
        threading.Thread(target=adb_watch, args=(a.port,), daemon=True).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        say("\nנסגר.", "\nbye.")

if __name__ == "__main__":
    main()
