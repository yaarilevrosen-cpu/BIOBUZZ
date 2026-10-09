#!/usr/bin/env python3
# BIOBUZZ v73 — המסמכים המשפטיים: legal/*.md → כל המקומות שמציגים אותם.
#   • biobuzz-sim.html — בלוק <script type="application/json" id="legalDocs"> (המציג באפליקציה קורא ממנו)
#   • site/privacy.html, terms.html, ai.html, security.html, accessibility.html, licenses.html — דפים דו־לשוניים (עברית, ובלחיצה English)
#   • site/index.html — כותרת תחתונה עם קישורים לכל המסמכים והצהרת FIRST
#   • app/build/license.txt — תנאי השימוש (אנגלית ואז עברית) לדף הרישיון במתקין של Windows (nsis.license)
# הרצה: python3 tools/legal_embed.py          — כותב (אפשר להריץ שוב: אותה תוצאה בדיוק)
#        python3 tools/legal_embed.py --check  — לא כותב; יוצא עם 1 אם משהו לא מעודכן (בדיקות / CI)
# Markdown מצומצם בלבד: # ## ###, פסקאות, רשימות "- ", **מודגש**, [טקסט](https://…), ---
import html, json, os, re, sys

H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEGAL = os.path.join(H, 'legal')
DOCS = ['privacy', 'terms', 'ai', 'security', 'accessibility', 'licenses']
LANGS = ['he', 'en']
# שמות בכותרות/בקישורים (לא תוכן המסמך)
LABEL = {
    'he': {'privacy': 'פרטיות', 'terms': 'תנאי שימוש', 'ai': 'בינה מלאכותית', 'security': 'אבטחה',
           'accessibility': 'נגישות', 'licenses': 'רישיונות', 'home': 'BIOBUZZ', 'contact': 'יצירת קשר (GitHub)',
           'ver': 'גרסת המסמכים', 'bug': 'דיווח על באג', 'toggle': 'English'},
    'en': {'privacy': 'Privacy', 'terms': 'Terms', 'ai': 'AI', 'security': 'Security',
           'accessibility': 'Accessibility', 'licenses': 'Third-party notices', 'home': 'BIOBUZZ', 'contact': 'Contact (GitHub)',
           'ver': 'Legal version', 'bug': 'Report a bug', 'toggle': 'עברית'},
}
REPO = 'https://github.com/yaarilevrosen-cpu/BIOBUZZ'
CONTACT = REPO + '/issues'
# כתובת מייל לפניות — ריקה עד שהבעלים מחליט לפרסם (אז מופיעה גם בכותרת התחתונה)
CONTACT_EMAIL = ''
FIRST_NOTE = ('<i>FIRST</i>®, <i>FIRST</i>® Tech Challenge and the game name are trademarks of <i>FIRST</i> '
              '(For Inspiration and Recognition of Science and Technology); this is an independent team project, '
              'not affiliated with, endorsed by or sponsored by <i>FIRST</i>; <i>FIRST</i> is not overseeing, '
              'involved with, or responsible for this software.')


# ── Markdown מצומצם ──
def lint(md, name):
    errs = []
    for i, ln in enumerate(md.split('\n'), 1):
        s = ln.strip()
        if re.search(r'<[A-Za-z/!]', s): errs.append('%s:%d: HTML is not allowed' % (name, i))
        if s.startswith('|'): errs.append('%s:%d: tables are not allowed' % (name, i))
        if '![' in s: errs.append('%s:%d: images are not allowed' % (name, i))
        if s.startswith('####'): errs.append('%s:%d: only #, ## and ### headings' % (name, i))
        for m in re.finditer(r'\[[^\]\n]*\]\(([^)\s]*)\)', s):
            if not m.group(1).startswith('https://'): errs.append('%s:%d: only https:// links (%s)' % (name, i, m.group(1)))
    return errs


def inline(s):
    t = html.escape(s, quote=False).replace('"', '&quot;')   # בדיוק כמו appEsc בסימולטור (& < > ")
    t = re.sub(r'\[([^\]\n]+)\]\((https://(?:(?!&quot;)[^\s()])+)\)',
               lambda m: '<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (m.group(2), m.group(1)), t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    return t


def blocks(md):
    """[(kind, text)] — kind: h1 h2 h3 p li hr. אותה חלוקה כמו legalMd() בסימולטור"""
    out, para, = [], []
    def flush():
        if para: out.append(('p', ' '.join(para))); para.clear()
    for ln in md.replace('\r\n', '\n').split('\n'):
        s = ln.strip()
        if not s: flush(); continue
        if re.fullmatch(r'-{3,}', s): flush(); out.append(('hr', '')); continue
        m = re.match(r'(#{1,3})\s+(.*)$', s)
        if m: flush(); out.append(('h%d' % len(m.group(1)), m.group(2))); continue
        m = re.match(r'[-*]\s+(.*)$', s)
        if m: flush(); out.append(('li', m.group(1))); continue
        para.append(s)
    flush()
    return out


def md_html(md):
    h, inlist = [], False
    for k, t in blocks(md):
        if k != 'li' and inlist: h.append('</ul>'); inlist = False
        if k == 'li':
            if not inlist: h.append('<ul>'); inlist = True
            h.append('<li>' + inline(t) + '</li>')
        elif k == 'hr': h.append('<hr>')
        else: h.append('<%s>%s</%s>' % (k, inline(t), k))
    if inlist: h.append('</ul>')
    return '\n'.join(h)


def md_text(md):
    plain = lambda t: re.sub(r'\[([^\]\n]+)\]\((https://[^\s()]+)\)', r'\1 (\2)', re.sub(r'\*\*(.+?)\*\*', r'\1', t))
    out = []
    for k, t in blocks(md):
        t = plain(t)
        if k == 'h1': out += ['', t.upper() if t.isascii() else t, '=' * min(60, max(8, len(t)))]
        elif k in ('h2', 'h3'): out += ['', t, '-' * min(60, max(8, len(t)))]
        elif k == 'li': out.append('  * ' + t)
        elif k == 'hr': out += ['', '-' * 40]
        else: out += ['', t]
    return '\n'.join(out).strip() + '\n'


def title_of(md):
    for k, t in blocks(md):
        if k == 'h1': return re.sub(r'\*\*|\[|\]\([^)]*\)', '', t)
    return ''


# ── קריאת המסמכים ──
def load():
    ver = open(os.path.join(LEGAL, 'VERSION'), encoding='utf8').read().strip()
    assert re.fullmatch(r'\d{4}-\d\d-\d\d', ver), 'legal/VERSION must be one line: YYYY-MM-DD'
    D, errs = {l: {} for l in LANGS}, []
    for d in DOCS:
        for l in LANGS:
            f = os.path.join(LEGAL, '%s.%s.md' % (d, l))
            if not os.path.exists(f) and l == 'he':
                f = os.path.join(LEGAL, '%s.en.md' % d)   # רישיונות — מספיק באנגלית
            if not os.path.exists(f): errs.append('missing ' + os.path.relpath(f, H)); continue
            md = open(f, encoding='utf8').read().replace('\r\n', '\n').strip() + '\n'
            errs += lint(md, os.path.relpath(f, H)); D[l][d] = md
    if errs: print('\n'.join(errs)); sys.exit(2)
    return ver, D


# ── biobuzz-sim.html ──
def sim_block(ver, D):
    j = json.dumps({'v': ver, 'he': D['he'], 'en': D['en']}, ensure_ascii=False, separators=(',', ':'))
    j = j.replace('</', '<\\/').replace('<!--', '<\\!--')
    return '<script type="application/json" id="legalDocs">' + j + '</script>'


def sim_out(src, ver, D):
    blk = sim_block(ver, D)
    lines = src.split('\n')
    for i, ln in enumerate(lines):
        if 'id="legalDocs"' in ln and ln.startswith('<script type="application/json"'):
            lines[i] = blk; return '\n'.join(lines)
    for anchor in ('id="i18nX_v73legal"', 'id="i18nX_v72merge"'):
        for i, ln in enumerate(lines):
            if anchor in ln and ln.startswith('<script type="application/json"'):
                lines.insert(i + 1, blk); return '\n'.join(lines)
    raise SystemExit('biobuzz-sim.html: no place for the legalDocs block')


# ── האתר ──
SITE_CSS = """:root{--bg:#0B0E12;--panel:#12171D;--panel2:#1A2129;--line:#26303A;--ink:#E9EFF5;--ink2:#B7C3CF;--muted:#7D8C9A;--accent:#FFB020;
  --ui:"Segoe UI",system-ui,-apple-system,sans-serif}
*{box-sizing:border-box} html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 var(--ui)}
a{color:var(--accent)} .wrap{max-width:860px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;gap:12px;padding:22px 0;flex-wrap:wrap}
.logo{width:40px;height:40px;border-radius:12px;background:var(--accent);display:grid;place-items:center}
header b{font-size:18px;letter-spacing:.06em} header a.home{color:var(--ink);text-decoration:none;display:flex;align-items:center;gap:12px}
header nav{margin-inline-start:auto;display:flex;gap:14px;flex-wrap:wrap;font-size:14px} header nav a{color:var(--ink2);text-decoration:none} header nav a:hover,header nav a.on{color:var(--ink)}
header nav a.on{border-bottom:2px solid var(--accent)}
#lang{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:6px 12px;font:600 13px var(--ui);cursor:pointer}
article{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:8px 28px 24px;margin:6px 0 10px}
article h1{font-size:28px;line-height:1.2;margin:20px 0 12px} article h2{font-size:20px;margin:26px 0 8px} article h3{font-size:16px;margin:18px 0 6px}
article ul{padding-inline-start:22px} article li{margin:4px 0} article hr{border:0;border-top:1px solid var(--line);margin:22px 0}
article p,article li{color:var(--ink2)} article strong{color:var(--ink)}
.ver{color:var(--muted);font-size:13px;margin:0 0 6px}
html.js [data-l]{display:none} html.js[lang=he] [data-l=he],html.js[lang=en] [data-l=en]{display:revert}
footer{padding:30px 0 50px;color:var(--muted);font-size:13px;border-top:1px solid var(--line);margin-top:30px}
footer nav{display:flex;gap:6px 14px;flex-wrap:wrap;margin-bottom:8px} footer p{margin:6px 0}
@media (max-width:600px){ article{padding:4px 16px 18px} }"""

LOGO = ('<div class="logo"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#12161c" stroke-width="2.4" '
        'stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 7v10l8 5 8-5V7z"/><path d="M4 7h16M4 12h16M4 17h16"/></svg></div>')
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' "
        "fill='%23FFB020'/%3E%3Cpath d='M12 4 6 7.5v9L12 20l6-3.5v-9z' fill='none' stroke='%2312161c' stroke-width='2'/%3E%3C/svg%3E")


def footer_inner(ver, langs):
    """langs=['en'] לדף הבית (באנגלית); ['he','en'] לדפי המסמכים (לפי השפה שנבחרה)"""
    def part(l):
        L = LABEL[l]; tag = (' data-l="%s"' % l) if len(langs) > 1 else ''
        links = ' '.join('<a href="%s.html">%s</a>' % (d, html.escape(L[d])) for d in DOCS)
        links += ' <a href="%s" target="_blank" rel="noopener">%s</a>' % (CONTACT, html.escape(L['contact']))
        if CONTACT_EMAIL: links += ' <a href="mailto:%s">%s</a>' % (html.escape(CONTACT_EMAIL), html.escape(CONTACT_EMAIL))
        line = ('BIOBUZZ · סימולטור שדה ל-FTC · חינמי ולא מסחרי · של קבוצת FTC Apollo #9662' if l == 'he'
                else 'BIOBUZZ · an FTC field simulator · free and non-commercial · by FTC team Apollo #9662')
        return ('<div%s><nav class="legal">%s</nav><p>%s · <a href="%s/issues/new?labels=bug" target="_blank" rel="noopener">%s</a> · %s %s</p></div>'
                % (tag, links, line, REPO, html.escape(L['bug']), html.escape(L['ver']), ver))
    return ''.join(part(l) for l in langs) + '<p class="tm" lang="en" dir="ltr">' + FIRST_NOTE + '</p>'


FOOT_A, FOOT_B = '<!-- legal-footer: generated by tools/legal_embed.py from legal/ — do not edit here -->', '<!-- /legal-footer -->'


def site_page(doc, ver, D):
    nav = ''.join(''.join('<a href="%s.html" data-l="%s"%s>%s</a>' % (d, l, ' class="on" aria-current="page"' if d == doc else '', html.escape(LABEL[l][d]))
                          for l in LANGS) for d in DOCS)
    arts = ''.join('<article lang="%s" dir="%s" data-l="%s"><p class="ver">%s %s</p>\n%s\n</article>\n'
                   % (l, 'rtl' if l == 'he' else 'ltr', l, html.escape(LABEL[l]['ver']), ver, md_html(D[l][doc])) for l in LANGS)
    th, te = title_of(D['he'][doc]), title_of(D['en'][doc])
    return ('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            '<title>%s · %s — BIOBUZZ</title>\n<meta name="description" content="BIOBUZZ — %s">\n<link rel="icon" href="%s">\n'
            '<!-- generated by tools/legal_embed.py from legal/%s.*.md — edit those files, not this one -->\n<style>\n%s\n</style>\n'
            '<script>document.documentElement.classList.add("js");</script>\n</head>\n<body>\n<div class="wrap">\n'
            '<header><a class="home" href="index.html">%s<b>BIOBUZZ</b></a><nav>%s</nav>'
            '<button id="lang" type="button"><span data-l="he">English</span><span data-l="en">עברית</span></button></header>\n<main>\n%s</main>\n'
            '<footer>%s</footer>\n</div>\n<script>\n(function(){\n'
            '  var T={he:%s,en:%s}, h=document.documentElement;\n'
            '  function set(l){ h.lang=l; h.dir=l==="he"?"rtl":"ltr"; document.title=T[l]+" — BIOBUZZ"; try{ localStorage.setItem("bbSiteLang",l); }catch(e){} }\n'
            '  var q=/[?&]lang=(he|en)/.exec(location.search), s=null; try{ s=localStorage.getItem("bbSiteLang"); }catch(e){}\n'
            '  set(q?q[1]:location.hash==="#en"?"en":s==="en"?"en":"he");\n'
            '  document.getElementById("lang").addEventListener("click",function(){ set(h.lang==="he"?"en":"he"); });\n'
            '})();\n</script>\n</body>\n</html>\n') % (
        html.escape(th), html.escape(te), html.escape(te), ICON, doc, SITE_CSS, LOGO, nav, arts, footer_inner(ver, LANGS),
        json.dumps(th, ensure_ascii=False), json.dumps(te, ensure_ascii=False))


def index_out(src, ver):
    foot = '<footer>' + FOOT_A + footer_inner(ver, ['en']) + FOOT_B + '</footer>'
    out, n = re.subn(r'<footer>.*?</footer>', lambda m: foot, src, count=1, flags=re.S)
    if not n: raise SystemExit('site/index.html: no <footer>')
    if 'footer nav.legal' not in out:   # עיצוב קטן לשורת הקישורים (פעם אחת)
        out = out.replace('</style>', 'footer nav.legal{display:flex;gap:6px 14px;flex-wrap:wrap;margin-bottom:8px} footer p{margin:6px 0}\n</style>', 1)
    return out


def license_txt(ver, D):
    t = ('BIOBUZZ - Terms of Use / תנאי שימוש (legal version %s)\n\n' % ver + md_text(D['en']['terms']) +
         '\n' + '=' * 60 + '\n\n' + md_text(D['he']['terms']) +
         '\nPrivacy Policy / מדיניות פרטיות: https://yaarilevrosen-cpu.github.io/BIOBUZZ/privacy.html\n')
    return '﻿' + t.replace('\n', '\r\n')


def outputs():
    ver, D = load()
    rd = lambda p: open(os.path.join(H, p), encoding='utf8', newline='').read()
    out = {'biobuzz-sim.html': sim_out(rd('biobuzz-sim.html'), ver, D), 'site/index.html': index_out(rd('site/index.html'), ver),
           'app/build/license.txt': license_txt(ver, D)}
    for d in DOCS: out['site/%s.html' % d] = site_page(d, ver, D)
    return out


def main():
    check = '--check' in sys.argv
    stale = []
    for p, txt in outputs().items():
        f = os.path.join(H, p)
        try: cur = open(f, encoding='utf8', newline='').read()
        except FileNotFoundError: cur = None
        if cur == txt: continue
        stale.append(p)
        if not check:
            os.makedirs(os.path.dirname(f), exist_ok=True)
            with open(f, 'w', encoding='utf8', newline='') as fh: fh.write(txt)
    if check:
        if stale: print('legal: out of date — run python3 tools/legal_embed.py:\n  ' + '\n  '.join(stale)); sys.exit(1)
        print('legal: up to date')
    else:
        print('legal: wrote ' + (', '.join(stale) if stale else 'nothing (already up to date)'))


if __name__ == '__main__':
    main()
