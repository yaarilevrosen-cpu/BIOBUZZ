#!/usr/bin/env python3
# שחזור סביבת העבודה מתוך BIOBUZZ-vNN.zip — הכול מתוך הזיפ, בלי רשת
import sys, os, re, json, zipfile, base64
import glob
Z = sys.argv[1] if len(sys.argv) > 1 else (sorted(glob.glob('/mnt/user-data/uploads/**/*.zip', recursive=True)) or [''])[0]
H = '/home/claude'
os.makedirs(H + '/pad', exist_ok=True); os.makedirs(H + '/cad', exist_ok=True)
os.makedirs(H + '/test/lib', exist_ok=True); os.makedirs(H + '/dist', exist_ok=True)
z = zipfile.ZipFile(Z)
get = lambda n: z.read([x for x in z.namelist() if x.endswith('/' + n) or x == n][0])
for n in ('padbridge.py', 'pad.html', 'start.bat', 'README.md'):
    open(H + '/pad/' + n, 'wb').write(get(n))
pb = get('padbridge.py').decode('utf8')
pb = re.sub(r'PAD_B64 = "[A-Za-z0-9+/=]+"', 'PAD_B64 = "__PAD_B64__"', pb, count=1)
open(H + '/pad/padbridge_src.py', 'w', encoding='utf8').write(pb)
s = get('BIOBUZZ-lab.html').decode('utf8')
open(H + '/dist/BIOBUZZ-lab.html', 'w', encoding='utf8').write(s)
# לבנייה מחדש (build_standalone.py): הקידומת והגופנים המוטמעים, בדיוק כמו בקובץ הבודד
os.makedirs(H + '/build', exist_ok=True)
open(H + '/build/prefix.html', 'w', encoding='utf8').write(s[:s.index('<script>window.__CADEMB=')])
open(H + '/build/fonts-block.html', 'w', encoding='utf8').write(re.search(r'<style>\n@font-face.*?\n</style>', s, re.S).group(0))
m = re.search(r'<script>window.__CADEMB=(\{.*?\});</script>\n', s, re.S)
emb = json.loads(m.group(1))
for k, v in emb.items():
    json.dump({'format': 'glb-base64', 'part': k, 'data': v}, open(H + '/cad/cad-%s.json' % k, 'w'))
s = s.replace(m.group(0), '')
CDN = {'three.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/',
       'cannon.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/',
       'GLTFLoader.js': 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/',
       'STLLoader.js': 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/',
       'OBJLoader.js': 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/',
       'meshopt_decoder.js': 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/'}
for name, base in CDN.items():
    pat = re.compile(r'<script>/\* ' + re.escape(name) + r' \*/\n(.*?)\n</script>', re.S)
    mm = pat.search(s)
    open(H + '/test/lib/' + name, 'w', encoding='utf8').write(mm.group(1).replace('<\\/script', '</script'))
    s = s[:mm.start()] + '<script src="%s%s"></script>' % (base, name) + s[mm.end():]
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600&family=Secular+One&family=IBM+Plex+Mono:wght@400;500&display=swap">')
s = re.sub(r'<style>\n@font-face.*?\n</style>', lambda _: FONTS, s, count=1, flags=re.S)
s = s[s.index('<title>'):]
s = s[:s.rindex('\n</body></html>')]
open(H + '/biobuzz-sim.html', 'w', encoding='utf8').write(s)
print('ok:', len(s), 'bytes · CAD', list(emb), '· libs', len(CDN))
