#!/usr/bin/env python3
"""Package only the original science gallery, simulation sources and checks."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import tempfile
import zipfile
from build import FILES

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
DEST=ROOT.parent
README='''ORBIT SCIENCE

Open index.html in Safari, Chrome, Edge or Firefox.
Explore 37 working simulations: 23 chemistry and 14 physics.
Choose a subject, search, filter topics and level, or use Go to lesson.
Every lesson has a short guide and an interactive simulation with controls,
measurements, playback, pause, reset, speed and a timeline. No quizzes.
Pendulum Lab supports -90 to +90 degrees: drag the bob, read its live angle,
and release to swing. Arrow keys adjust the bob; Enter or Space releases it.

No account, installation, API key, external fonts or network is required.
The site is an independent Orbit project, not affiliated with PhET or the
University of Colorado Boulder. All models and illustrations are original.

Heart buttons save favorite simulation IDs in this browser only. A visible
warning appears if storage is blocked. Favorites do not sync between devices.
Model controls and recorded collision trials are temporary. Export collision
CSV to keep trials. Read model notes for scientific assumptions and the
difference between visual presentation time and physical simulated time.

GitHub Pages: https://evan-cpu266.github.io/Evan/science-lab/
The source folder rebuilds the exact standalone HTML using standard Python.
This package includes no personal records, uploaded files or login credentials.
'''
SOURCES=['science_gallery/index.html',*FILES.values(),'science_gallery/build.py',
         'science_gallery/package.py','SCIENCE_GALLERY.md','CHEMISTRY_SIMULATORS.md','ORBIT_COURSE.md',
         'tests/science_catalog_test.cjs','tests/science_physics_test.cjs','tests/science_pendulum_test.cjs','tests/science_pendulum_browser.py',
         'tests/science_browser_smoke.py','tests/chem_structure_test.cjs','tests/chem_reactions_test.cjs','tests/chem_equilibrium_test.cjs','tests/orbit_course_experiments_test.cjs','orbit-science.html']

def write_zip(path,entries):
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,data in entries:
            info=zipfile.ZipInfo(name,(2026,11,2,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o644<<16
            archive.writestr(info,data)
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None

def main():
    subprocess.run([sys.executable,str(HERE/'build.py')],check=True)
    html=(ROOT/'orbit-science.html').read_bytes()
    for name in ['Orbit-Science.html','orbit-science.html','Orbit-Science-source.txt']:
        (DEST/name).write_bytes(html)
    site=[('index.html',html),('README.txt',README.encode())]
    directory=DEST/'Orbit-Science-site'
    directory.mkdir(exist_ok=True)
    for name,data in site:
        (directory/name).write_bytes(data)
    write_zip(DEST/'Orbit-Science-site.zip',site)
    names=list(dict.fromkeys(SOURCES))
    write_zip(DEST/'Orbit-Science-project.zip',[(name,(ROOT/name).read_bytes()) for name in names])
    with tempfile.TemporaryDirectory(prefix='orbit-science-source-') as tmp:
        with zipfile.ZipFile(DEST/'Orbit-Science-project.zip') as archive:
            archive.extractall(tmp)
        subprocess.run([sys.executable,'science_gallery/build.py'],cwd=tmp,check=True)
        assert (Path(tmp)/'orbit-science.html').read_bytes()==html
    print(json.dumps({'website':'/workspace/Orbit-Science.html','bytes':len(html),'sha256':hashlib.sha256(html).hexdigest(),'source_rebuild':'byte-identical'},indent=2))

if __name__=='__main__':
    main()
