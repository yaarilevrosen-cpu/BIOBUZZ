#!/bin/bash
# בונה את הסימולטור ומעתיק אותו לאפליקציה
set -e
cd "$(dirname "$0")/.."
python3 build.py
cp dist/BIOBUZZ-lab.html app/sim/index.html
echo "app/sim/index.html ready ($(du -h app/sim/index.html | cut -f1))"
