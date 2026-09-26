#!/usr/bin/env python3
# בונה את הקובץ הבודד dist/BIOBUZZ-lab.html: ספריות, גופנים ו-CAD מוטמעים, אפס בקשות רשת.
# ההפך המדויק של restore.py — מקובץ המקור של v33 הוא בונה בחזרה את הקובץ של v33 בית לבית.
import re, json, sys, os
H = os.path.dirname(os.path.abspath(__file__))
LITE = '--lite' in sys.argv
args = [a for a in sys.argv[1:] if a != '--lite']
src = args[0] if len(args) > 0 else H + '/biobuzz-sim.html'
out = args[1] if len(args) > 1 else H + ('/dist/BIOBUZZ-lab-lite.html' if LITE else '/dist/BIOBUZZ-lab.html')
s = open(src, encoding='utf8').read()
# גופנים
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600&family=Secular+One&family=IBM+Plex+Mono:wght@400;500&display=swap">')
assert FONTS in s, 'fonts link missing'
fb = open(H + '/build/fonts-block.html', encoding='utf8').read()
s = s.replace(FONTS, fb, 1)
# ספריות
def lib(m):
    name = m.group(1)
    code = open(H + '/test/lib/' + name, encoding='utf8').read().replace('</script', '<\\/script')
    return '<script>/* %s */\n%s\n</script>' % (name, code)
s, n = re.subn(r'<script src="https://[^"]*/([A-Za-z_.]+\.js)"></script>', lib, s)
assert n == 6, n
# CAD
emb = {}
for k in ('static', 'red', 'blue'):
    emb[k] = json.load(open(H + '/cad/cad-%s.json' % k))['data']
cad = '<script>window.__CADEMB=' + json.dumps(emb) + ';</script>\n'
if LITE:   # גרסה קלה: בלי המודל הרשמי — הזירה הפרמטרית היא גיבוי מלא
    cad = '<script>window.__LITE=true;</script>\n'
pre = open(H + '/build/prefix.html', encoding='utf8').read()
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf8').write(pre + cad + s + '\n</body></html>\n')
print('built', out, os.path.getsize(out), 'bytes')
