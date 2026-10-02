#!/usr/bin/env python3
"""
BİNA ÖLÇEK DENETİMİ (V2 Faz 4.3) — boyalı bina görsellerinin şehirde ne kadar
yer kapladığını karşılaştırır. Ölçü: opak alanın karekökü, 600px tuvale
indirgenip bina profil ölçeğiyle çarpılır (building-assets.ts). Oran, bütün
binaların 3. aşama ortancasına göredir.

Çalıştır: python3 tools/art/scale-audit.py
"""
import glob
import os
import re
import statistics

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
assets = open(os.path.join(ROOT, 'lib/game/city-map/building-assets.ts')).read()
profile = {k: (c, float(s)) for k, c, s in re.findall(r"  (\w+): vp\('(\w+)', '\w+', ([\d.]+)", assets)}

size = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'public/images/game/buildings/*-painted-*.webp'))):
    name = os.path.basename(f)[:-5]
    bid, stage = name.rsplit('-painted-', 1)
    if '-duz' in bid or bid not in profile:
        continue
    im = Image.open(f)
    area = int((np.array(im.getchannel('A')) > 40).sum())
    size.setdefault(bid, {})[stage] = np.sqrt(area) * 600 / im.width * profile[bid][1]

median3 = statistics.median(v['3'] for v in size.values())
for bid, v in sorted(size.items(), key=lambda kv: kv[1]['3']):
    ratio = v['3'] / median3
    flag = '  <-- gözden geçir' if ratio < 0.85 or (ratio > 1.2 and bid not in ('divan', 'saray')) else ''
    print(f"{bid:16} {profile[bid][0]:11} ölçek {profile[bid][1]:.2f}  aşama 1/2/3 {v['1']:.0f}/{v['2']:.0f}/{v['3']:.0f}  oran {ratio:.2f}{flag}")
