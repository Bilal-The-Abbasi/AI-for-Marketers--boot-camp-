#!/usr/bin/env python3
"""Build all five levels and write the deployable static site to ../site/.
usage: python3 build_site.py     (run from anywhere; needs only Python 3)
site/index.html is a copy of Level 1 so the bare domain opens the course."""
import os, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, '..', 'site')
os.makedirs(SITE, exist_ok=True)
for n in range(1, 6):
    subprocess.check_call([sys.executable, os.path.join(ROOT, 'build.py'), str(n)])
    shutil.copyfile(os.path.join(ROOT, 'out', 'full', 'level%d.html' % n), os.path.join(SITE, 'level%d.html' % n))
shutil.copyfile(os.path.join(SITE, 'level1.html'), os.path.join(SITE, 'index.html'))
shutil.copyfile(os.path.join(ROOT, '404.html'), os.path.join(SITE, '404.html'))
print('site ready:', sorted(os.listdir(SITE)))
