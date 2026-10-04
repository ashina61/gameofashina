#!/usr/bin/env python3
"""
ŞEHİR TABAN ŞABLONU (görsel brif 2, faz H3).

city-slots.json'daki gerçek yerleşimi (arsalar, kıyı arsaları, meydan, yollar,
sur temeli, kapılar ve kıyı çizgisi) tek bir şablon resme döker. Boyalı şehir
taban resmi bu şablonun ÜSTÜNE, aynı oranda boyanır; böylece arsa koordinatları
değişmeden binalar resimdeki arsalara oturur.

    python3 tools/art/city-base-template.py [çıktı.png]

Dünya koordinatından şablona: px = (x - X0) * S, py = (y - Y0) * S. Bölge ve
ölçek tools/art/city-base-region.json'dadır (alt-resim aracıyla ortak).
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'lib/game/city-map/city-slots.json').read_text())
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'docs/mockups/sehir-taban-sablon.png'

TILE_W, TILE_H = DATA['tile']['w'], DATA['tile']['h']
REGION = json.loads((ROOT / 'tools/art/city-base-region.json').read_text())
X0, X1, Y0, Y1, S = REGION['x0'], REGION['x1'], REGION['y0'], REGION['y1'], REGION['scale']
W, H = int((X1 - X0) * S), int((Y1 - Y0) * S)
P = lambda x, y: ((x - X0) * S, (y - Y0) * S)

slots = DATA['slots']
coast = [s for s in slots if s['type'] == 'coast']
hall = next(s for s in slots if s.get('fixed'))['screen']


def smooth01(t):
    c = min(1, max(0, t))
    return c * c * (3 - 2 * c)


SEA_LINE = min(s['screen']['y'] for s in coast) - TILE_H * 0.75
BAY_HALF = max(abs(s['screen']['x'] - hall['x']) for s in coast) + TILE_W * 1.1


def shore_y(x):
    """lib/game/city-map/city-extras.ts shoreYAt ile aynı formül."""
    d = x - hall['x']
    side = d < 0
    h = TILE_H * 16 if side else TILE_H * 11
    ramp = TILE_W * 4.6 if side else TILE_W * 6.2
    out = smooth01((abs(d) - BAY_HALF) / ramp)
    wave = (TILE_H * 1.7 * math.sin(x / (TILE_W * 4.2) + 0.4)
            + TILE_H * 0.85 * math.sin(x / (TILE_W * 2.1) + 2.2)
            + TILE_H * 0.35 * math.sin(x / (TILE_W * 0.83) + 1.3))
    wave_on = smooth01((abs(d) - BAY_HALF + TILE_W) / (TILE_W * 2))
    return SEA_LINE + h * out + wave * wave_on


img = Image.new('RGB', (W, H), (122, 158, 92))
try:
    FONT = ImageFont.truetype('DejaVuSans.ttf', 22)
except OSError:
    FONT = ImageFont.load_default()
d = ImageDraw.Draw(img)

# Deniz: kıyı çizgisinin altı.
sea = [P(X0, Y1)] + [P(x, shore_y(x)) for x in range(X0, X1 + 1, 40)] + [P(X1, Y1)]
d.polygon(sea, fill=(64, 140, 170))
d.line([P(x, shore_y(x)) for x in range(X0, X1 + 1, 40)], fill=(236, 220, 170), width=10)

# Yollar: ikinci dereceden Bezier kenarları.
nodes = {n['id']: n['screen'] for n in DATA['roadGraph']['nodes']}
for e in DATA['roadGraph']['edges']:
    a, b, c = nodes[e['from']], nodes[e['to']], e['ctrl']
    pts = []
    for i in range(25):
        t = i / 24
        x = (1 - t) ** 2 * a['x'] + 2 * (1 - t) * t * c['x'] + t ** 2 * b['x']
        y = (1 - t) ** 2 * a['y'] + 2 * (1 - t) * t * c['y'] + t ** 2 * b['y']
        pts.append(P(x, y))
    d.line(pts, fill=(196, 170, 120), width=int(70 * S))

# Meydan.
pl = DATA['plaza']
cx, cy = P(pl['screen']['x'], pl['screen']['y'])
d.ellipse([cx - pl['rx'] * S, cy - pl['ry'] * S, cx + pl['rx'] * S, cy + pl['ry'] * S], fill=(214, 196, 156), outline=(150, 120, 80), width=3)

# Sur temeli (kapalı halka) ve kapılar.
wall = [P(p['screen']['x'], p['screen']['y']) for p in DATA['defenseFoundation']]
d.line(wall + [wall[0]], fill=(120, 72, 40), width=8)
for g in DATA['wallGates']:
    gx, gy = P(g['screen']['x'], g['screen']['y'])
    d.rectangle([gx - 14, gy - 14, gx + 14, gy + 14], fill=(170, 40, 40))
    d.text((gx + 18, gy - 11), g['id'], fill=(80, 20, 20), font=FONT)


def diamond(x, y, w, h):
    px, py = P(x, y)
    w, h = w * S / 2, h * S / 2
    return [(px, py - h), (px + w, py), (px, py + h), (px - w, py)]


# Arsalar: 2x2 ayak izi = 2 karo genişliğinde elmas.
for s in slots:
    x, y = s['screen']['x'], s['screen']['y']
    if s.get('fixed') and s['type'] == 'city':
        d.polygon(diamond(x, y, TILE_W * 2.6, TILE_H * 2.6), fill=(232, 210, 150), outline=(140, 30, 30), width=4)
    elif s['type'] == 'city':
        d.polygon(diamond(x, y, TILE_W * 2, TILE_H * 2), fill=(222, 196, 140), outline=(90, 60, 30), width=3)
    elif s['type'] == 'coast':
        d.polygon(diamond(x, y, TILE_W * 2, TILE_H * 2), fill=(180, 200, 210), outline=(30, 60, 90), width=3)
    elif s['type'] == 'islet':
        px, py = P(x, y)
        d.ellipse([px - TILE_W * 1.8 * S, py - TILE_H * 1.1 * S, px + TILE_W * 1.8 * S, py + TILE_H * 1.6 * S], fill=(150, 160, 110), outline=(236, 220, 170), width=4)
        d.polygon(diamond(x, y, TILE_W * 2, TILE_H * 2), fill=(200, 170, 150), outline=(110, 40, 30), width=3)
    else:  # savunma kulesi/kapı yuvası: surun üstünde, boyalı resimde boş bırakılır
        px, py = P(x, y)
        d.ellipse([px - 18, py - 18, px + 18, py + 18], outline=(120, 72, 40), width=4)
    px, py = P(x, y)
    if s['type'] != 'defense':
        d.text((px - 22, py - 11), s['id'].replace('city_', 'c').replace('coast_', 'k').replace('islet_01', 'ada'), fill=(30, 20, 10), font=FONT)

d.text((16, 12), 'Payitaht şehir taban şablonu · ölçek %s · dünya x[%d,%d] y[%d,%d] · %dx%d' % (S, X0, X1, Y0, Y1, W, H), fill=(20, 20, 20), font=FONT)
d.text((16, 40), 'krem elmas = bina arsası (24) · kırmızı kenar = Divanhane · mavi = kıyı arsası (3) · ada = korsan adası', fill=(20, 20, 20), font=FONT)
d.text((16, 68), 'kahve çizgi = sur temeli (halkalar: kule yeri) · kırmızı kare = kapı', fill=(20, 20, 20), font=FONT)
OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT)
print(f'{OUT} {W}x{H}')
