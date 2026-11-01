#!/usr/bin/env python3
"""Bundle the original Orbit Science gallery and local simulation engines."""
from pathlib import Path
import re

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
FILES={
    'CSS':'science_gallery/science.css',
    'CHEM_CATALOG':'chemistry_lab/catalog.js',
    'CHEM_STRUCTURE':'chemistry_lab/structure.js',
    'CHEM_REACTIONS':'chemistry_lab/reactions.js',
    'CHEM_EQUILIBRIUM':'chemistry_lab/equilibrium.js',
    'PHYSICS_EXTRA':'science_gallery/physics-extra.js',
    'CHEM_ENGINE':'chemistry_lab/experiments.js',
    'PHYSICS_ENGINE':'orbit_course/experiments.js',
    'CATALOG':'science_gallery/catalog.js',
    'ART':'science_gallery/art.js',
    'APP':'science_gallery/app.js',
}

def build():
    html=(HERE/'index.html').read_text(encoding='utf-8')
    for key,name in FILES.items():
        marker='{{'+key+'}}'
        assert html.count(marker)==1,marker
        source=(ROOT/name).read_text(encoding='utf-8')
        if key!='CSS' and '</script' in source.lower():
            raise ValueError('Unexpected script terminator: '+name)
        html=html.replace(marker,source)
    for pattern in [r'<(?:iframe|object|embed)\b',r'<script\b[^>]*\bsrc\s*=',r'<link\b[^>]*\bhref\s*=',r'\.(?:innerHTML|outerHTML)\s*=',r'\.insertAdjacentHTML\s*\(',r'\beval\s*\(',r'\bnew\s+Function\s*\(',r'\bfetch\s*\(']:
        if re.search(pattern,html,re.I):
            raise ValueError('Unexpected runtime dependency or unsafe sink: '+pattern)
    output=ROOT/'orbit-science.html'
    output.write_text(html,encoding='utf-8')
    print(f'Built {output.name}: {output.stat().st_size:,} bytes; 37 chemistry and physics simulations.')
    return output

if __name__=='__main__':
    build()
