#!/usr/bin/env python3
# בנייה מלאה: biobuzz-sim.html → dist/BIOBUZZ-lab.html (מלא, עם CAD) + dist/BIOBUZZ-lab-lite.html (קל, בלי CAD)
import subprocess, sys, os
H = os.path.dirname(os.path.abspath(__file__))
for extra in ([], ['--lite']):
    subprocess.run([sys.executable, H + '/build_standalone.py'] + extra, check=True)
