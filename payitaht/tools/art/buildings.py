"""
PAYİTAHT BİNA SANATI — bütün binalar, her biri 3 SEVİYE AŞAMASINDA.

    python3 tools/art/buildings.py            # hepsi
    python3 tools/art/buildings.py divan cami # yalnızca verilenler

Ikariam'daki gibi bina büyüdükçe görünüşü değişir:
  aşama 1 = seviye 1-3, aşama 2 = seviye 4-7, aşama 3 = seviye 8+.

Çıktı: public/images/game/buildings/<id>-<aşama>.webp (600 px genişlik,
2x2 footprint elması 480 px, tuvalin alt kenarı = elmasın alt köşesi).
Her bina isokit parçalarından kurulur; deterministiktir (sabit tohum).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from isokit import PAL, Scene, Prim, Face, hexc, mix, mul  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'images', 'game', 'buildings')
FH = 0.40  # kat yüksekliği


# ------------------------------------------------------------------ YARDIMCILAR
def facade(length, h, z_base=0.0, spacing=0.3, w=0.11, wh=0.19, kind='win', shutter=None, door=None, first=0, skip=()):
    """Bir duvar yüzü için kat kat pencere dizisi (+ isteğe bağlı kapı)."""
    deco = []
    floors = max(1, int(round((h - 0.06) / FH)))
    n = max(1, int(length / spacing))
    for f in range(first, floors):
        vb = 0.12 + f * FH
        if vb + wh > h - 0.05:
            break
        for i in range(n):
            u = (i + 0.5) / n
            if f == 0 and door is not None and abs(u - door) < 0.6 / n:
                continue
            if (f, i) in skip:
                continue
            deco.append((kind, u, vb, w, wh, shutter))
    if door is not None:
        deco.append(('archdoor', door, 0, 0.15, 0.27))
    return deco


def trims(h, base=PAL['stone2'], cornice=PAL['plaster2']):
    return [('band', 0, min(0.35, 0.06 / h), base), ('band', 1 - min(0.2, 0.045 / h), 1, cornice)]


def block(s, x0, y0, x1, y1, h, z0=0, col=None, mat='plaster', roof='hip', roofcol=None, rh=None,
          wins=True, door_y=None, door_x=None, shutter=None, kind='win', ridge=0.0, spacing=0.3, trim=True, key=None, roofkey=None):
    col = col or PAL['plaster']
    dy, dx = [], []
    if trim:
        dy += trims(h); dx += trims(h)
    if mat == 'stone':
        dy.insert(0, ('courses', 0.1)); dx.insert(0, ('courses', 0.1))
    if wins:
        dy += facade(x1 - x0, h, spacing=spacing, door=door_y, shutter=shutter, kind=kind)
        dx += facade(y1 - y0, h, spacing=spacing, door=door_x, shutter=shutter, kind=kind)
    else:
        if door_y is not None:
            dy.append(('archdoor', door_y, 0, 0.15, 0.27))
        if door_x is not None:
            dx.append(('archdoor', door_x, 0, 0.15, 0.27))
    s.box(x0, y0, z0, x1, y1, z0 + h, col, mat, deco_y=dy, deco_x=dx, key=key)
    top = z0 + h
    rc = roofcol or PAL['roof']
    rh = rh if rh is not None else min(x1 - x0, y1 - y0) * 0.36
    if roof == 'hip':
        s.hip(x0, y0, x1, y1, top, rh, rc, ridge=ridge, mat='roof' if rc in (PAL['roof'], PAL['roof2']) else 'lead', key=roofkey)
    elif roof in ('gx', 'gy'):
        s.gable(x0, y0, x1, y1, top, rh, rc, axis=roof[1], wall=col, wallmat=mat, key=roofkey)
    elif roof == 'flat':
        slab = PAL['stone2'] if mat == 'stone' else PAL['plaster2']
        s.box(x0 - 0.03, y0 - 0.03, top, x1 + 0.03, y1 + 0.03, top + 0.05, slab, mat if mat == 'stone' else 'plaster', key=roofkey)
    return top


def portico(s, x0, x1, y, depth, h, n, z0=0, col=PAL['marble'], roofcol=None, axis='y'):
    """Sütunlu revak. axis='y': revak +y yüzünün önünde, x0..x1 boyunca."""
    if axis == 'y':
        s.box(x0, y, z0, x1, y + depth, z0 + 0.05, PAL['stone2'], 'stone')
        for i in range(n):
            cx = x0 + 0.06 + (x1 - x0 - 0.12) * i / max(1, n - 1)
            s.cylinder(cx, y + depth - 0.06, z0 + 0.05, z0 + h, 0.035, col, 'marble', n=10)
        s.box(x0 - 0.02, y, z0 + h, x1 + 0.02, y + depth + 0.02, z0 + h + 0.09, col, 'marble', deco_y=[('band', 0.55, 0.7, PAL['stone2'])])
        if roofcol:
            s.gable(x0 - 0.02, y, x1 + 0.02, y + depth + 0.02, z0 + h + 0.09, 0.14, roofcol, axis='y', wall=col, wallmat='marble', over=0.03)
    else:
        s.box(y, x0, z0, y + depth, x1, z0 + 0.05, PAL['stone2'], 'stone')
        for i in range(n):
            cy = x0 + 0.06 + (x1 - x0 - 0.12) * i / max(1, n - 1)
            s.cylinder(y + depth - 0.06, cy, z0 + 0.05, z0 + h, 0.035, col, 'marble', n=10)
        s.box(y, x0 - 0.02, z0 + h, y + depth + 0.02, x1 + 0.02, z0 + h + 0.09, col, 'marble', deco_x=[('band', 0.55, 0.7, PAL['stone2'])])
        if roofcol:
            s.gable(y, x0 - 0.02, y + depth + 0.02, x1 + 0.02, z0 + h + 0.09, 0.14, roofcol, axis='x', wall=col, wallmat='marble', over=0.03)


def domed(s, cx, cy, z, r, drum=0.12, col=PAL['lead'], wall=PAL['plaster'], hs=0.95, finial=True):
    """Kasnaklı kubbe (kasnakta küçük kemerli pencereler)."""
    if drum > 0:
        s.cylinder(cx, cy, z, z + drum, r * 1.02, wall, 'plaster', n=24)
        z += drum
    s.dome(cx, cy, z, r, col, 'lead', hscale=hs, finial=finial)


def minaret(s, x, y, h, r=0.06, col=PAL['marble']):
    s.box(x - r * 1.3, y - r * 1.3, 0, x + r * 1.3, y + r * 1.3, 0.2, PAL['stone'], 'stone')
    s.cylinder(x, y, 0.2, h, r, col, 'marble', n=14)
    s.cylinder(x, y, h * 0.72, h * 0.74, r * 1.6, col, 'marble', n=14)  # şerefe
    s.cylinder(x, y, h, h + 0.06, r * 0.9, col, 'marble', n=14)
    s.cone(x, y, h + 0.06, h * 0.32, r * 1.05, PAL['lead'], 'lead', n=14)
    s.sphere(x, y, h + 0.06 + h * 0.32 + 0.02, 0.012, PAL['gold'])


def pave(s, x0, y0, x1, y1, col=None, n=6):
    col = col or PAL['stone']
    s.add(Prim([Face([(x0, y0, 0.005), (x1, y0, 0.005), (x1, y1, 0.005), (x0, y1, 0.005)], col, 'stone', [('grid', n)], False, (0, 0, 1))], key=-50, cast=False))


def ground(s, x0, y0, x1, y1, col=hexc('#cdb484')):
    s.flat([(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], col, 'ground', key=-60)


def awning(s, x0, x1, y, z, depth, col, stripes=True, axis='y', key=None):
    """Eğimli tente (+y yüzünün önünde)."""
    if axis == 'y':
        pts = [(x0, y, z), (x1, y, z), (x1, y + depth, z - depth * 0.55), (x0, y + depth, z - depth * 0.55)]
    else:
        pts = [(y, x1, z), (y, x0, z), (y + depth, x0, z - depth * 0.55), (y + depth, x1, z - depth * 0.55)]
    deco = [('stripes', 8, PAL['white'])] if stripes else None
    s.add(Prim([Face(pts, col, 'canvas', deco, True, (0.0, 0.5, 1.0) if axis == 'y' else (0.5, 0.0, 1.0))], key=key, cull=False))
    # direkler
    if axis == 'y':
        for x in (x0 + 0.02, x1 - 0.02):
            s.cylinder(x, y + depth - 0.02, 0, z - depth * 0.55, 0.012, PAL['wooddark'], 'flat', n=6)
    else:
        for yy in (x0 + 0.02, x1 - 0.02):
            s.cylinder(y + depth - 0.02, yy, 0, z - depth * 0.55, 0.012, PAL['wooddark'], 'flat', n=6)


def logs(s, x, y, n=4, axis='x', length=0.45, r=0.045):
    k = 0
    for row in range(3):
        for i in range(n - row):
            off = i * r * 2.05 + row * r
            z = r + row * r * 1.7
            if axis == 'x':
                s.add(_log(x, y + off, z, length, r, 'x'))
            else:
                s.add(_log(x + off, y, z, length, r, 'y'))
            k += 1


def _log(x, y, z, L, r, axis):
    faces = []
    n = 10
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        am = (a0 + a1) / 2
        if axis == 'x':
            P = lambda a, xx: (xx, y + r * math.cos(a), z + r * math.sin(a))
            nrm = (0, math.cos(am), math.sin(am))
            faces.append(Face([P(a0, x), P(a1, x), P(a1, x + L), P(a0, x + L)], PAL['wood'], 'wood', None, False, nrm))
        else:
            P = lambda a, yy: (x + r * math.cos(a), yy, z + r * math.sin(a))
            nrm = (math.cos(am), 0, math.sin(am))
            faces.append(Face([P(a0, y), P(a1, y), P(a1, y + L), P(a0, y + L)], PAL['wood'], 'wood', None, False, nrm))
    if axis == 'x':
        cap = [(x + L, y + r * math.cos(2 * math.pi * i / n), z + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
        faces.append(Face(cap, hexc('#d9b27a'), 'wood', None, False, (1, 0, 0)))
    else:
        cap = [(x + r * math.cos(2 * math.pi * i / n), y + L, z + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
        faces.append(Face(cap, hexc('#d9b27a'), 'wood', None, False, (0, 1, 0)))
    return Prim(faces)


def stone_blocks(s, x, y, n=3, size=0.12, seed=0):
    import random
    r = random.Random(seed)
    for i in range(n):
        dx, dy = r.random() * 0.25, r.random() * 0.25
        h = size * (0.7 + r.random() * 0.6)
        s.box(x + dx, y + dy, 0, x + dx + size, y + dy + size * (0.8 + r.random() * 0.5), h, PAL['marble'] if r.random() < 0.5 else PAL['stone'], 'stone')


def crane(s, x, y, h=1.0, arm=0.5, axis='x'):
    s.box(x - 0.03, y - 0.03, 0, x + 0.03, y + 0.03, h, PAL['wood2'], 'wood')
    if axis == 'x':
        s.box(x - 0.05, y - 0.02, h - 0.05, x + arm, y + 0.02, h, PAL['wood2'], 'wood')
        s.cylinder(x + arm - 0.02, y, h - 0.35, h - 0.05, 0.004, PAL['iron'], 'flat', n=4, cast=False)
        s.crate(x + arm - 0.07, y - 0.06, 0.12, z=h - 0.47)
    else:
        s.box(x - 0.02, y - 0.05, h - 0.05, x + 0.02, y + arm, h, PAL['wood2'], 'wood')
        s.cylinder(x, y + arm - 0.02, h - 0.35, h - 0.05, 0.004, PAL['iron'], 'flat', n=4, cast=False)


def crenel(s, x0, y0, x1, y1, z, col=PAL['stone'], step=0.12, size=0.06, h=0.07):
    """Mazgallar: kutunun ön iki kenarı boyunca."""
    n = max(1, int((x1 - x0) / step))
    for i in range(n + 1):
        x = x0 + (x1 - x0 - size) * i / n
        s.box(x, y1 - size, z, x + size, y1, z + h, col, 'stone')
    n = max(1, int((y1 - y0) / step))
    for i in range(n + 1):
        y = y0 + (y1 - y0 - size) * i / n
        s.box(x1 - size, y, z, x1, y + size, z + h, col, 'stone')
    n = max(1, int((x1 - x0) / step))
    for i in range(n + 1):
        x = x0 + (x1 - x0 - size) * i / n
        s.box(x, y0, z, x + size, y0 + size, z + h, col, 'stone', key=-5)
    n = max(1, int((y1 - y0) / step))
    for i in range(n + 1):
        y = y0 + (y1 - y0 - size) * i / n
        s.box(x0, y, z, x0 + size, y + size, z + h, col, 'stone', key=-5)


def lantern(s, x, y, z):
    s.sphere(x, y, z, 0.022, hexc('#f2c65a'))


# ------------------------------------------------------------------ BİNALAR
def divan(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    pave(s, 0.9, 1.35, 1.9, 1.9, n=5)
    if st == 1:
        block(s, 0.45, 0.4, 1.45, 1.3, 0.8, door_y=0.5, shutter='s', roof='hip', roofcol=PAL['roof'])
        portico(s, 0.7, 1.2, 1.3, 0.22, 0.42, 3)
        s.flag(0.5, 0.45, 1.05, 0.55)
        s.tree(1.75, 0.45, 0.9); s.tree(0.3, 1.7, 0.8, 'cypress')
    elif st == 2:
        block(s, 0.35, 0.35, 1.55, 1.3, 0.85, door_y=0.5, roof='flat')
        domed(s, 0.95, 0.82, 0.9, 0.3, drum=0.1)
        for cx, cy in ((0.5, 0.5), (1.4, 0.5), (0.5, 1.15), (1.4, 1.15)):
            domed(s, cx, cy, 0.9, 0.1, drum=0.04, finial=False)
        portico(s, 0.6, 1.3, 1.3, 0.25, 0.46, 4, roofcol=PAL['lead'])
        s.flag(0.4, 0.4, 0.95, 0.6); s.flag(1.5, 0.4, 0.95, 0.6)
        s.tree(1.8, 0.35, 0.85, 'cypress'); s.tree(0.25, 1.75, 0.85, 'cypress')
    else:
        block(s, 0.2, 0.55, 0.62, 1.35, 0.7, roof='hip', roofcol=PAL['lead'])
        block(s, 1.3, 0.55, 1.75, 1.35, 0.7, roof='hip', roofcol=PAL['lead'])
        block(s, 0.55, 0.3, 1.4, 1.3, 1.0, door_y=0.5, roof='flat')
        domed(s, 0.97, 0.8, 1.05, 0.34, drum=0.16)
        domed(s, 0.66, 0.45, 1.05, 0.1, drum=0.04, finial=False); domed(s, 1.28, 0.45, 1.05, 0.1, drum=0.04, finial=False)
        portico(s, 0.62, 1.33, 1.3, 0.28, 0.55, 5, roofcol=PAL['lead'])
        # saat kulesi
        block(s, 1.55, 0.2, 1.8, 0.45, 1.3, wins=False, roof='hip', roofcol=PAL['lead'], rh=0.25)
        s.flag(0.3, 0.6, 0.8, 0.6); s.flag(1.7, 0.6, 0.8, 0.6); s.flag(0.97, 0.8, 1.85, 0.45)
        s.tree(0.2, 1.75, 0.85, 'cypress'); s.tree(1.85, 1.45, 0.8, 'cypress')


def saray(s, st):
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d6c095'))
    pave(s, 0.45, 0.45, 1.6, 1.6, PAL['marble'], n=8)
    if st >= 1:
        block(s, 0.2, 0.2, 1.7, 0.6, 0.75, roof='hip', roofcol=PAL['lead'], ridge=0.9)
        block(s, 0.2, 0.6, 0.6, 1.7, 0.6 if st == 1 else 0.75, roof='hip', roofcol=PAL['lead'], ridge=0.6)
    if st >= 2:
        block(s, 1.35, 0.6, 1.75, 1.45, 0.6, roof='hip', roofcol=PAL['lead'], ridge=0.4)
        domed(s, 0.95, 0.4, 0.82, 0.22, drum=0.08)
        # havuz
        s.flat([(0.9, 0.9, 0.01), (1.2, 0.9, 0.01), (1.2, 1.2, 0.01), (0.9, 1.2, 0.01)], PAL['water'], 'flat', key=-40)
    # ön duvar + kapı kulesi
    wall_h = 0.35
    s.box(0.6, 1.7, 0, 1.2, 1.82, wall_h, PAL['plaster'], 'plaster', deco_y=trims(wall_h))
    s.box(1.5, 1.45 if st >= 2 else 0.6, 0, 1.82, 1.82, wall_h, PAL['plaster'], 'plaster', deco_x=trims(wall_h))
    block(s, 1.15, 1.55, 1.55, 1.9, 0.7, door_y=0.5, wins=False, roof='hip', roofcol=PAL['lead'])
    s.tree(1.0, 1.05, 0.7, 'cypress') if st == 1 else None
    if st == 3:
        # Adalet kulesi
        block(s, 0.25, 0.25, 0.55, 0.55, 1.55, wins=False, roof='flat', key=None)
        s.cone(0.4, 0.4, 1.6, 0.45, 0.21, PAL['lead'], 'lead', n=4)
        s.sphere(0.4, 0.4, 2.08, 0.02, PAL['gold'])
        domed(s, 0.4, 1.25, 0.78, 0.16, drum=0.06)
        s.flag(1.35, 1.72, 0.95, 0.5)
    s.flag(1.2, 1.6, 0.92, 0.5)
    s.tree(1.45, 1.0, 0.75, 'cypress')


def elcilik(s, st):
    ground(s, 0.2, 0.2, 1.85, 1.85, hexc('#d2bb8c'))
    h = 0.8 if st == 1 else 1.1
    block(s, 0.45, 0.45, 1.45, 1.3, h, door_y=0.5, shutter='s', roof='hip', roofcol=PAL['roof'], spacing=0.25)
    portico(s, 0.55, 1.35, 1.3, 0.22, 0.5 if st == 1 else 0.8, 4 if st == 1 else 6)
    if st >= 2:
        block(s, 1.45, 0.6, 1.8, 1.2, 0.7, shutter='s', roof='hip', roofcol=PAL['roof'])
    if st == 3:
        block(s, 0.2, 0.6, 0.45, 1.2, 0.7, shutter='s', roof='hip', roofcol=PAL['roof'])
        domed(s, 0.95, 0.88, h + 0.3, 0.14, drum=0.08)
    cols = [PAL['red'], PAL['blue'], PAL['teal'], hexc('#d6a93a'), PAL['green']]
    for i in range(2 + st):
        x = 0.35 + i * 0.32
        s.flag(x, 1.72, 0, 0.75, cols[i % len(cols)])


def konut(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d9c299'))
    houses = [
        (0.3, 0.3, 0.95, 0.9, 0.75, 'gx'),
        (1.1, 0.35, 1.7, 0.95, 0.5, 'hip'),
        (0.3, 1.1, 0.85, 1.7, 0.5, 'gy'),
        (1.05, 1.05, 1.75, 1.7, 1.1, 'hip'),
    ]
    count = {1: 2, 2: 3, 3: 4}[st]
    order = [0, 2, 1, 3]
    for idx in order[:count]:
        x0, y0, x1, y1, h, roof = houses[idx]
        if st == 3 and idx == 0:
            h = 1.1
        # cumba: üst kat çıkması
        block(s, x0, y0, x1, y1, h, door_y=0.35, shutter='s', roof=roof, roofcol=PAL['roof'], spacing=0.26)
        if h >= 0.75:
            s.box(x0 + 0.12, y1, h - 0.4, x1 - 0.12, y1 + 0.1, h - 0.05, PAL['plaster2'], 'plaster',
                  deco_y=[('win', 0.3, 0.08, 0.1, 0.18, None), ('win', 0.7, 0.08, 0.1, 0.18, None)])
    s.tree(1.0, 1.0, 0.7)
    if count < 4:
        s.tree(1.4, 1.4, 0.8); s.tree(1.6, 1.2, 0.6, 'cypress')
    s.barrel(0.9, 1.8)


def hamam(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    def hall(x0, y0, x1, y1, h, r):
        block(s, x0, y0, x1, y1, h, col=PAL['stone'], mat='stone', wins=False, roof='flat', door_y=0.5)
        s.dome((x0 + x1) / 2, (y0 + y1) / 2, h + 0.05, r, PAL['lead'], 'lead', hscale=0.8)
        # yıldız delikler
        return h
    if st == 1:
        hall(0.5, 0.45, 1.4, 1.35, 0.5, 0.36)
    elif st == 2:
        hall(0.35, 0.45, 1.25, 1.35, 0.55, 0.38)
        block(s, 1.25, 0.6, 1.7, 1.2, 0.42, col=PAL['stone'], mat='stone', wins=False, roof='flat')
        s.dome(1.47, 0.9, 0.47, 0.16, PAL['lead'], 'lead', hscale=0.8, finial=False)
    else:
        hall(0.25, 0.3, 1.15, 1.2, 0.6, 0.4)
        block(s, 1.15, 0.45, 1.75, 1.05, 0.45, col=PAL['stone'], mat='stone', wins=False, roof='flat')
        s.dome(1.3, 0.75, 0.5, 0.13, PAL['lead'], 'lead', hscale=0.8, finial=False)
        s.dome(1.6, 0.75, 0.5, 0.13, PAL['lead'], 'lead', hscale=0.8, finial=False)
        block(s, 0.45, 1.2, 1.35, 1.65, 0.45, col=PAL['plaster'], shutter=None, roof='hip', roofcol=PAL['roof'], kind='arch')
    # ocak bacası
    s.box(0.3, 0.3, 0, 0.42, 0.42, 0.95, PAL['stonedark'], 'stone')
    s.tree(1.75, 1.6, 0.7, 'cypress')


def carsi(s, st):
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d9c299'))
    pave(s, 0.2, 0.2, 1.85, 1.85, hexc('#d4c29c'), n=9)
    cols = [PAL['red'], PAL['blue'], hexc('#d6a93a'), PAL['teal'], PAL['green']]
    if st >= 2:
        # bedesten: kubbeli taş han
        n = 2 if st == 2 else 3
        block(s, 0.25, 0.25, 0.25 + 0.42 * n, 0.8, 0.6, col=PAL['stone'], mat='stone', wins=False, roof='flat', door_y=0.5)
        for i in range(n):
            s.dome(0.46 + 0.42 * i, 0.52, 0.65, 0.17, PAL['lead'], 'lead', hscale=0.85, finial=i == 0)
    stalls = [(0.3, 0.95), (0.85, 0.95), (1.35, 0.4), (0.3, 1.45), (0.85, 1.45), (1.35, 0.95), (1.35, 1.45)]
    k = {1: 4, 2: 5, 3: 7}[st]
    if st >= 2:
        stalls = [p for p in stalls if not (p[1] < 0.8 and p[0] < 0.25 + 0.42 * (2 if st == 2 else 3))]
    for i, (x, y) in enumerate(stalls[:k]):
        s.box(x, y, 0, x + 0.4, y + 0.32, 0.3, PAL['wood'], 'wood', deco_y=[('vplanks', 5)], deco_x=[('vplanks', 4)])
        awning(s, x - 0.02, x + 0.42, y + 0.32, 0.42, 0.2, cols[i % len(cols)])
        s.crate(x + 0.05, y + 0.36, 0.09); s.barrel(x + 0.32, y + 0.42, 0.045)
    if st == 1:
        s.tree(1.5, 0.5, 0.8)


def ambar(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cdb484'))
    block(s, 0.3, 0.35, 1.3, 1.1, 0.55 if st == 1 else 0.7, col=PAL['stone'], mat='stone', wins=False, roof='gx', roofcol=PAL['roof'], door_y=0.5, rh=0.32)
    if st >= 2:
        block(s, 1.35, 0.3, 1.8, 1.25, 0.6, col=PAL['wood'], mat='wood', wins=False, roof='gy', roofcol=PAL['roof2'], door_x=0.5, rh=0.25, trim=False)
    if st == 3:
        block(s, 0.3, 1.15, 0.95, 1.75, 0.5, col=PAL['stone'], mat='stone', wins=False, roof='gy', roofcol=PAL['roof'], door_x=0.5, rh=0.25)
        crane(s, 1.2, 1.35, 0.95, 0.35)
    for i in range(2 + st):
        s.crate(1.05 + (i % 3) * 0.18, 1.3 + (i // 3) * 0.2, 0.14)
    for i in range(1 + st):
        s.barrel(0.45 + i * 0.16, 1.35 if st < 3 else 1.82, 0.06)
    s.tree(1.8, 1.7, 0.6)


def kereste(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#c7ae7c'))
    # açık odun hangarı
    x1 = 1.2 if st == 1 else 1.45
    for (x, y) in ((0.35, 0.35), (x1, 0.35), (0.35, 1.0), (x1, 1.0)):
        s.box(x - 0.03, y - 0.03, 0, x + 0.03, y + 0.03, 0.5, PAL['wood2'], 'wood')
    s.gable(0.3, 0.3, x1 + 0.05, 1.05, 0.5, 0.3, PAL['wood2'], axis='x', mat='wood', wall=PAL['wood'], wallmat='wood')
    logs(s, 0.5, 0.45, 4, 'x', 0.6)
    logs(s, 0.4, 1.3, 3 + (st > 1), 'x', 0.55)
    if st >= 2:
        logs(s, 1.3, 1.25, 3, 'y', 0.5)
        block(s, 1.55, 0.3, 1.85, 0.8, 0.45, col=PAL['wood'], mat='wood', wins=False, roof='gy', roofcol=PAL['roof2'], trim=False)
    if st == 3:
        crane(s, 1.2, 1.2, 0.85, 0.4)
    # testere tezgâhı
    s.box(1.0, 1.55, 0, 1.4, 1.65, 0.16, PAL['wood2'], 'wood')
    for x, y in ((1.75, 1.75), (0.25, 1.8), (1.8, 1.0)):
        s.tree(x, y, 0.75)


def tas(s, st):
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#c9b894'))
    rock = hexc('#b8ab94')
    # Doğal kaya kütlesi (arka), önüne kesilmiş basamaklar.
    for (x, y, z, r) in ((0.45, 0.4, 0.2, 0.42), (0.95, 0.3, 0.1, 0.34), (0.3, 0.95, 0.1, 0.32), (1.35, 0.3, 0.0, 0.22)):
        s.blob(x, y, z, r * (0.9 + 0.05 * st), mix(rock, hexc('#a39883'), s.rnd.random() * 0.5), 'stone', squash=0.95)
    s.box(0.55, 0.55, 0, 1.05, 0.95, 0.3, hexc('#d7cbb2'), 'stone', deco_y=[('courses', 0.1)], deco_x=[('courses', 0.1)])
    s.box(0.55, 0.95, 0, 1.05, 1.15, 0.14, hexc('#d7cbb2'), 'stone', deco_y=[('courses', 0.07)], deco_x=[('courses', 0.07)])
    stone_blocks(s, 1.15, 1.0, 2 + st, 0.13, seed=4)
    stone_blocks(s, 0.5, 1.35, 1 + st, 0.12, seed=9)
    crane(s, 1.2, 0.75, 1.0 + 0.1 * st, 0.4, axis='y')
    if st >= 2:
        block(s, 1.45, 0.4, 1.85, 0.85, 0.4, col=PAL['wood'], mat='wood', wins=False, roof='gx', roofcol=PAL['roof2'], trim=False, door_x=0.5)
    if st == 3:
        s.box(1.1, 1.55, 0, 1.75, 1.7, 0.1, PAL['wood2'], 'wood', deco_top=[('vplanks', 6)])  # kızak
        stone_blocks(s, 1.2, 1.5, 2, 0.12, seed=13)


def medrese(s, st):
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d2bb8c'))
    pave(s, 0.55, 0.55, 1.45, 1.45, PAL['marble'], n=6)
    # U şeklinde revaklı hücreler
    for (x0, y0, x1, y1) in ((0.2, 0.2, 1.75, 0.55), (0.2, 0.55, 0.55, 1.6)) + (((1.45, 0.55, 1.8, 1.6),) if st >= 2 else ()):
        block(s, x0, y0, x1, y1, 0.42, kind='arch', roof='hip', roofcol=PAL['lead'], spacing=0.22, ridge=max(0.0, max(x1 - x0, y1 - y0) - 0.5) if (x1 - x0) > (y1 - y0) else 0.0)
    # dershane kubbesi
    domed(s, 0.97, 0.38, 0.45, 0.26 + 0.03 * st, drum=0.1)
    s.cylinder(1.0, 1.0, 0, 0.12, 0.1, PAL['marble'], 'marble', top=PAL['water'])  # şadırvan
    if st == 3:
        minaret(s, 1.72, 0.3, 1.25)
        for cx in (0.35, 1.6):
            s.dome(cx, 0.37, 0.47, 0.1, PAL['lead'], 'lead', hscale=0.85, finial=False)
    s.tree(1.3, 1.65, 0.8, 'cypress'); s.tree(0.7, 1.7, 0.7)


def kisla(s, st):
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#c9b58c'))
    pave(s, 0.3, 1.05, 1.85, 1.85, hexc('#cdb88c'), n=4)
    h = 0.6 + 0.1 * st
    block(s, 0.25, 0.25, 1.45, 1.0, h, col=PAL['stone'], mat='stone', wins=True, kind='arch', spacing=0.28, roof='flat', door_y=0.5)
    crenel(s, 0.22, 0.22, 1.48, 1.03, h + 0.05)
    if st >= 2:
        for (x, y) in ((1.62, 0.4),) + (((0.4, 1.6),) if st == 3 else ()):
            s.cylinder(x, y, 0, h + 0.35, 0.17, PAL['stone'], 'stone', n=18)
            s.cone(x, y, h + 0.35, 0.3, 0.2, PAL['roof'], 'roof', n=18)
    # talim avlusu: kukla hedefler + silah rafı
    for (x, y) in ((1.0, 1.35), (1.3, 1.55), (1.6, 1.3)):
        s.box(x - 0.015, y - 0.015, 0, x + 0.015, y + 0.015, 0.3, PAL['wood2'], 'wood')
        s.sphere(x, y, 0.34, 0.05, hexc('#d9c08c'))
    s.box(0.45, 1.5, 0, 0.8, 1.56, 0.22, PAL['wood'], 'wood')
    s.flag(1.4, 0.3, h + 0.1, 0.6); s.flag(0.3, 0.9, h + 0.1, 0.5)


def liman(s, st):
    # iskele: ahşap platform (kıyıdan denize, +x+y yönünde)
    s.box(0.2, 0.2, 0, 1.3, 1.1, 0.08, PAL['stone'], 'stone', deco_y=[('courses', 0.04)], deco_x=[('courses', 0.04)])
    L = 1.75 if st >= 2 else 1.55
    for x, y in ((1.0, L), (1.25, L), (L, 1.0), (L, 0.75)):
        s.cylinder(x, y, -0.05, 0.08, 0.025, PAL['wooddark'], 'wood', n=6)
    s.box(1.0, 1.1, 0.04, 1.25, L, 0.09, PAL['wood'], 'wood', deco_top=[('vplanks', 3)])
    s.box(1.3, 0.75, 0.04, L, 1.0, 0.09, PAL['wood'], 'wood', deco_top=[('planks', 3)])
    block(s, 0.25, 0.25, 0.85, 0.75, 0.5, col=PAL['plaster'], wins=True, roof='gx', roofcol=PAL['roof'], door_y=0.5, z0=0.08)
    crane(s, 1.1, 0.95, 0.9, 0.45)
    for i in range(2 + st):
        s.crate(0.95 + (i % 3) * 0.15, 0.3 + (i // 3) * 0.17, 0.12, z=0.08)
    s.barrel(0.4, 0.95, 0.05, z=0.08); s.barrel(0.55, 1.0, 0.05, z=0.08)
    if st == 3:
        block(s, 0.25, 0.8, 0.7, 1.05, 0.4, col=PAL['wood'], mat='wood', wins=False, roof='gy', roofcol=PAL['roof2'], z0=0.08, trim=False)
        s.cylinder(0.3, 0.3, 0.58, 1.1, 0.06, PAL['stone'], 'stone')  # fener
        s.sphere(0.3, 0.3, 1.14, 0.05, hexc('#f2c65a'))


def tersane(s, st):
    s.box(0.2, 0.2, 0, 1.2, 1.3, 0.08, PAL['stone'], 'stone', deco_y=[('courses', 0.04)], deco_x=[('courses', 0.04)])
    # kızak (denize eğimli)
    s.box(0.6, 0.55, 0.0, 1.85, 1.0, 0.05, PAL['wood2'], 'wood', deco_top=[('vplanks', 6)])
    # gemi gövdesi iskeleti: kaburgalar
    n = 5 + st
    for i in range(n):
        x = 0.8 + i * 0.13
        h = 0.26 - abs(i - n / 2) * 0.015
        s.box(x, 0.62, 0.05, x + 0.025, 0.66, 0.05 + h, PAL['wood'], 'wood')
        s.box(x, 0.89, 0.05, x + 0.025, 0.93, 0.05 + h, PAL['wood'], 'wood')
        s.box(x, 0.62, 0.05, x + 0.025, 0.93, 0.08, PAL['wood'], 'wood')
    s.box(0.78, 0.76, 0.05, 0.8 + n * 0.13, 0.79, 0.12, PAL['wooddark'], 'wood')  # omurga
    if st >= 2:
        # çatılı tersane gözü
        for (x, y) in ((0.6, 0.45), (1.6, 0.45), (0.6, 1.1), (1.6, 1.1)):
            s.box(x - 0.03, y - 0.03, 0, x + 0.03, y + 0.03, 0.6, PAL['stone'], 'stone')
        s.gable(0.55, 0.4, 1.65, 1.15, 0.6, 0.3, PAL['lead'], axis='x', mat='lead', wall=PAL['stone'], wallmat='stone')
    crane(s, 0.4, 1.1, 0.95, 0.4, axis='y')
    logs(s, 0.25, 1.45, 3, 'x', 0.45)
    block(s, 0.25, 0.25, 0.55, 0.55, 0.45, col=PAL['plaster'], roof='hip', roofcol=PAL['roof'], z0=0.08, door_y=0.5)
    if st == 3:
        s.flag(1.2, 0.45, 0.9, 0.5)


# ---------------------------------------------------------------- YENİ BİNALAR
def kahvehane(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d6be90'))
    pave(s, 0.4, 1.2, 1.8, 1.85, hexc('#d9c59d'), n=6)
    h = 0.75 if st == 1 else 1.0
    block(s, 0.35, 0.35, 1.3, 1.15, h, col=PAL['plaster'], door_y=0.4, shutter='s', roof='hip', roofcol=PAL['roof'], spacing=0.26)
    # ahşap kafesli üst kat çıkması
    s.box(0.5, 1.15, h - 0.38, 1.15, 1.26, h - 0.04, PAL['wood'], 'wood', deco_y=[('vplanks', 8)])
    # asma çardak
    for x, y in ((0.45, 1.8), (1.25, 1.8), (1.25, 1.3)):
        s.cylinder(x, y, 0, 0.42, 0.018, PAL['wooddark'], 'wood', n=6)
    s.add(Prim([Face([(0.4, 1.25, 0.43), (1.3, 1.25, 0.43), (1.3, 1.85, 0.43), (0.4, 1.85, 0.43)], hexc('#6d9a45'), 'leaf', None, False, (0, 0, 1))], key=3.6, cast=True))
    for (x, y) in ((0.65, 1.5), (1.0, 1.6)):
        s.cylinder(x, y, 0, 0.12, 0.07, PAL['wood2'], 'wood', n=12)
    for i in range(3):
        lantern(s, 0.55 + i * 0.3, 1.85, 0.4)
    if st >= 2:
        block(s, 1.35, 0.4, 1.8, 1.0, 0.6, col=PAL['plaster2'], shutter='s', roof='gy', roofcol=PAL['roof'])
    if st == 3:
        awning(s, 1.35, 1.8, 1.0, 0.45, 0.25, PAL['red'], axis='y')
        s.box(0.9, 0.5, h + 0.25, 1.0, 0.6, h + 0.6, PAL['stonedark'], 'stone')  # baca
    s.tree(1.7, 1.6, 0.8)


def cami(s, st):
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d6c095'))
    pave(s, 0.3, 1.2, 1.7, 1.85, PAL['marble'], n=6)
    r = 0.36 if st == 1 else 0.42 if st == 2 else 0.48
    x0, y0, x1, y1 = 0.5 - (st - 1) * 0.08, 0.35 - (st - 1) * 0.05, 1.4 + (st - 1) * 0.06, 1.2
    block(s, x0, y0, x1, y1, 0.62, col=PAL['marble'], mat='marble', kind='arch', spacing=0.24, roof='flat')
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    domed(s, cx, cy, 0.67, r, drum=0.14, wall=PAL['marble'])
    # yarım kubbe hissi: köşe küçük kubbeleri
    for (ax, ay) in ((x0 + 0.13, y0 + 0.13), (x1 - 0.13, y0 + 0.13), (x0 + 0.13, y1 - 0.13), (x1 - 0.13, y1 - 0.13)):
        s.dome(ax, ay, 0.67, 0.09, PAL['lead'], 'lead', hscale=0.9, finial=False)
    # son cemaat yeri: revak + küçük kubbeler
    if st >= 2:
        portico(s, x0 + 0.05, x1 - 0.05, y1, 0.25, 0.42, 5)
        for i in range(3):
            s.dome(x0 + 0.2 + i * (x1 - x0 - 0.4) / 2, y1 + 0.13, 0.51, 0.08, PAL['lead'], 'lead', finial=False)
    minaret(s, x1 + 0.15, y0 + 0.05, 1.35 + 0.15 * st)
    if st == 3:
        minaret(s, x0 - 0.12, y0 + 0.05, 1.8)
    s.cylinder(1.0, 1.55, 0, 0.1, 0.12, PAL['marble'], 'marble', top=PAL['water'])  # şadırvan
    s.tree(1.75, 1.7, 0.85, 'cypress'); s.tree(0.25, 1.7, 0.85, 'cypress')


def muze(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d6c095'))
    x0, x1 = 0.4, 1.55 if st > 1 else 1.4
    y0, y1 = 0.35, 1.2
    s.box(x0 - 0.08, y0 - 0.08, 0, x1 + 0.08, y1 + 0.25, 0.1, PAL['marble'], 'marble', deco_y=[('courses', 0.05)], deco_x=[('courses', 0.05)])
    block(s, x0, y0, x1, y1 - 0.15, 0.62 + 0.08 * st, z0=0.1, col=PAL['marble'], mat='marble', wins=False, roof='gy', roofcol=PAL['roof'], rh=0.2, door_y=0.5)
    portico(s, x0, x1, y1 - 0.15, 0.3, 0.62 + 0.08 * st, 4 + st, z0=0.1, roofcol=None)
    s.gable(x0 - 0.02, y1 - 0.2, x1 + 0.02, y1 + 0.17, 0.81 + 0.08 * st, 0.2, PAL['roof'], axis='y', wall=PAL['marble'], wallmat='marble', over=0.03)
    # heykel kaideleri
    for x in (0.3, 1.7):
        s.box(x - 0.06, 1.55, 0, x + 0.06, 1.67, 0.18, PAL['marble'], 'marble')
        s.cylinder(x, 1.61, 0.18, 0.36, 0.03, hexc('#c9c0ae'), 'marble', n=8)
        s.sphere(x, 1.61, 0.39, 0.035, hexc('#c9c0ae'))
    if st == 3:
        block(s, 1.55, 0.4, 1.85, 1.0, 0.5, col=PAL['marble'], mat='marble', wins=True, kind='arch', roof='hip', roofcol=PAL['roof'])
    s.tree(1.75, 1.45, 0.75, 'cypress')


def marangoz(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#c7ae7c'))
    block(s, 0.35, 0.35, 1.25, 1.05, 0.55, col=PAL['wood'], mat='wood', wins=True, spacing=0.3, roof='gx', roofcol=PAL['roof2'], door_y=0.5, trim=False, rh=0.3)
    # kalas yığınları
    for i in range(2 + st):
        z = i * 0.035
        s.box(0.35, 1.3, z, 1.05, 1.42, z + 0.03, hexc('#c98f55'), 'wood')
    s.box(1.3, 1.3, 0, 1.36, 1.5, 0.16, PAL['wood2'], 'wood'); s.box(1.6, 1.3, 0, 1.66, 1.5, 0.16, PAL['wood2'], 'wood')
    s.box(1.28, 1.36, 0.16, 1.7, 1.44, 0.2, hexc('#c98f55'), 'wood')  # tezgâh
    if st >= 2:
        s.box(1.35, 0.4, 0, 1.8, 1.0, 0.45, PAL['wood2'], 'wood', deco_y=[('vplanks', 5)], deco_x=[('vplanks', 6)])
        s.gable(1.35, 0.4, 1.8, 1.0, 0.45, 0.2, PAL['roof2'], axis='y', wall=PAL['wood2'], wallmat='wood')
    if st == 3:
        logs(s, 0.3, 1.55, 3, 'x', 0.5)
    s.tree(1.75, 1.75, 0.7)


def mimar(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d6c095'))
    block(s, 0.3, 0.3, 1.25, 1.1, 0.8 if st < 3 else 1.1, col=PAL['ochre'], shutter='s', roof='hip', roofcol=PAL['roof'], door_y=0.5, spacing=0.26)
    # avluda maket: iskeleli küçük kubbe
    x, y = 1.45, 1.45
    s.box(x - 0.2, y - 0.2, 0, x + 0.2, y + 0.2, 0.08, PAL['stone'], 'stone')
    domed(s, x, y, 0.08, 0.14, drum=0.08, finial=st > 1)
    for (a, b) in ((x - 0.2, y - 0.2), (x + 0.2, y - 0.2), (x - 0.2, y + 0.2), (x + 0.2, y + 0.2)):
        s.box(a - 0.012, b - 0.012, 0, a + 0.012, b + 0.012, 0.4, PAL['wood2'], 'wood')
    s.box(x - 0.21, y + 0.18, 0.2, x + 0.21, y + 0.21, 0.22, PAL['wood'], 'wood')
    s.box(x + 0.18, y - 0.21, 0.2, x + 0.21, y + 0.21, 0.22, PAL['wood'], 'wood')
    if st >= 2:
        stone_blocks(s, 0.4, 1.35, 3, 0.1, seed=21)
        s.box(1.35, 0.45, 0, 1.75, 0.95, 0.55, PAL['plaster'], 'plaster', deco_x=facade(0.5, 0.55, shutter='s'), deco_y=trims(0.55))
        s.hip(1.35, 0.45, 1.75, 0.95, 0.55, 0.18, PAL['roof'])
    s.tree(0.25, 1.75, 0.8, 'cypress')


def ormanci(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#b9a574'))
    block(s, 0.3, 0.3, 0.95, 0.85, 0.45, col=PAL['wood'], mat='wood', wins=True, spacing=0.3, roof='gx', roofcol=PAL['wood2'], door_y=0.5, trim=False, rh=0.28)
    # fidanlık sıraları
    rows = 2 + st
    for r in range(rows):
        for c in range(4):
            x, y = 1.1 + c * 0.2, 0.35 + r * 0.3
            if y > 1.75:
                continue
            s.tree(x, y, 0.35 + 0.08 * (r % 2) + 0.05 * st, 'cypress' if (r + c) % 3 == 0 else 'olive')
    logs(s, 0.35, 1.15, 3, 'x', 0.45)
    s.tree(0.3, 1.75, 0.95); s.tree(0.7, 1.75, 0.8)


def tasci(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cfc0a0'))
    block(s, 0.3, 0.3, 1.2, 1.0, 0.6, col=PAL['stone'], mat='stone', wins=True, kind='arch', spacing=0.3, roof='gx', roofcol=PAL['roof'], door_y=0.5)
    # sütun gövdeleri ve bloklar
    for i in range(1 + st):
        s.cylinder(1.4 + (i % 2) * 0.22, 1.25 + (i // 2) * 0.25, 0, 0.45, 0.05, PAL['marble'], 'marble', n=12)
    s.add(_log(0.4, 1.35, 0.06, 0.5, 0.06, 'x'))  # yatık sütun (taş rengine boyanır)
    s.prims[-1].faces = [Face(f.pts, PAL['marble'], 'marble', None, False, f.normal) for f in s.prims[-1].faces]
    stone_blocks(s, 0.5, 1.5, 2 + st, 0.12, seed=31)
    if st >= 2:
        s.box(1.35, 0.4, 0, 1.75, 0.8, 0.12, PAL['stone'], 'stone')
        s.box(1.47, 0.52, 0.12, 1.63, 0.68, 0.5, PAL['marble'], 'marble')  # heykel bloğu
        s.sphere(1.55, 0.6, 0.56, 0.07, PAL['marble'])
    if st == 3:
        crane(s, 1.25, 1.05, 0.9, 0.35)


def tophane(s, st):
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#bfae8a'))
    brick = hexc('#b8664a')
    block(s, 0.3, 0.3, 1.35, 1.05, 0.65, col=brick, mat='stone', wins=True, kind='arch', spacing=0.3, roof='flat', door_y=0.5)
    for i in range(1 + (st > 1)):
        s.dome(0.58 + i * 0.5, 0.67, 0.7, 0.2, PAL['lead'], 'lead', hscale=0.85, finial=False, key=3.0)
    for (x, y) in ((0.4, 0.38),) + (((1.22, 0.38),) if st == 3 else ()):
        s.box(x, y, 0.65, x + 0.12, y + 0.12, 1.35, brick, 'stone')
    # toplar
    for i in range(1 + st):
        x, y = 0.55 + i * 0.35, 1.45
        s.add(_log(x, y, 0.09, 0.32, 0.045, 'x'))
        s.prims[-1].faces = [Face(f.pts, hexc('#5b5550'), 'flat', None, False, f.normal) for f in s.prims[-1].faces]
        s.cylinder(x + 0.05, y - 0.07, 0, 0.1, 0.05, PAL['wood2'], 'wood', n=10)
        s.cylinder(x + 0.05, y + 0.07, 0, 0.1, 0.05, PAL['wood2'], 'wood', n=10)
    for i in range(3):
        s.sphere(1.6 + (i % 2) * 0.08, 1.7 + (i // 2) * 0.08, 0.035, 0.035, hexc('#3d3a37'))
    if st >= 2:
        s.box(1.45, 0.45, 0, 1.8, 1.0, 0.5, PAL['stone'], 'stone', deco_x=[('courses', 0.1), ('archdoor', 0.5, 0, 0.18, 0.3)], deco_y=[('courses', 0.1)])
        s.gable(1.45, 0.45, 1.8, 1.0, 0.5, 0.18, PAL['roof'], axis='y', wall=PAL['stone'], wallmat='stone')


def surlar(s, st):
    ground(s, 0.2, 0.2, 1.85, 1.85, hexc('#cdb484'))
    h = 0.45 + 0.1 * st
    col = hexc('#dcc69a')
    s.box(0.3, 1.2, 0, 1.75, 1.45, h, col, 'stone', deco_y=[('courses', 0.1), ('archdoor', 0.5, 0, 0.26, 0.38)], deco_x=[('courses', 0.1)])
    crenel(s, 0.3, 1.2, 1.75, 1.45, h, col)
    for x in (0.35, 1.7):
        s.cylinder(x, 1.32, 0, h + 0.35, 0.2, col, 'stone', n=20)
        s.cone(x, 1.32, h + 0.35, 0.3, 0.23, PAL['roof'], 'roof', n=20)
    if st >= 2:
        s.box(0.25, 0.3, 0, 0.5, 1.2, h, col, 'stone', deco_x=[('courses', 0.1)])
    s.flag(1.05, 1.3, h, 0.5)


def site(s, st):
    """İlk inşaat: temel taşları, yarım duvarlar, iskele, vinç."""
    ground(s, 0.2, 0.2, 1.85, 1.85, hexc('#c9b084'))
    s.box(0.4, 0.4, 0, 1.5, 1.4, 0.06, PAL['stone2'], 'stone', deco_top=[('grid', 5)])
    s.box(0.4, 0.4, 0.06, 1.5, 0.52, 0.42, PAL['stone'], 'stone', deco_y=[('courses', 0.08)])
    s.box(0.4, 0.52, 0.06, 0.52, 1.4, 0.3, PAL['stone'], 'stone', deco_x=[('courses', 0.08)])
    s.box(1.38, 0.52, 0.06, 1.5, 0.95, 0.22, PAL['stone'], 'stone', deco_x=[('courses', 0.08)], deco_y=[('courses', 0.08)])
    scaffold_frame(s, 0.35, 0.35, 1.55, 1.45, 0.75)
    crane(s, 1.7, 0.45, 1.15, 0.6, axis='y')
    stone_blocks(s, 0.95, 1.5, 3, 0.12, seed=5)
    for i in range(3):
        s.box(0.3, 1.55 + i * 0.001, i * 0.03, 0.8, 1.66, i * 0.03 + 0.028, hexc('#c98f55'), 'wood')


def scaffold_frame(s, x0, y0, x1, y1, h, front_only=False):
    pole, plank = PAL['wood2'], hexc('#c98f55')
    pts = [(x, y1) for x in (x0, (x0 + x1) / 2, x1)] + [(x1, y) for y in (y0, (y0 + y1) / 2)]
    if not front_only:
        pts += [(x0, y0), (x0, (y0 + y1) / 2), ((x0 + x1) / 2, y0)]
    for (x, y) in pts:
        s.box(x - 0.015, y - 0.015, 0, x + 0.015, y + 0.015, h, pole, 'wood')
    for z in (h * 0.45, h * 0.95):
        s.box(x0, y1 - 0.02, z, x1, y1 + 0.03, z + 0.025, plank, 'wood')
        s.box(x1 - 0.02, y0, z, x1 + 0.03, y1, z + 0.025, plank, 'wood')
        # çapraz destek
    s.box(x0 + 0.02, y1 + 0.03, 0, x0 + 0.05, y1 + 0.05, h * 0.95, pole, 'wood')


def scaffold(s, st):
    """Yükseltme sürerken binanın ÖNÜNE konan iskele (gölgesiz katman)."""
    scaffold_frame(s, 0.3, 0.3, 1.72, 1.72, 1.0, front_only=True)
    for i in range(3):
        s.crate(1.78, 0.5 + i * 0.25, 0.1)


# ---------------------------------------------------------------- ADA MADENLERİ
def mine_uzum(s, st):
    """Üzüm bağı: sıra sıra asmalar, şarap evi, fıçılar."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#b9a06c'))
    for r in range(5):
        y = 0.35 + r * 0.28
        for c in range(6):
            x = 0.25 + c * 0.2
            s.cylinder(x, y, 0, 0.18, 0.012, PAL['wooddark'], 'wood', n=5)
            s.blob(x, y, 0.2, 0.075, mix(hexc('#5f8c3e'), hexc('#7aa04a'), s.rnd.random() * 0.6), squash=0.8)
            if (r + c) % 2 == 0:
                s.sphere(x + 0.04, y + 0.04, 0.14, 0.03, hexc('#6b2f63'), n=8, rings=5)
    block(s, 1.45, 0.3, 1.85, 0.85, 0.45, col=PAL['plaster'], shutter='s', roof='gx', roofcol=PAL['roof'], door_x=0.5)
    for i in range(3):
        s.barrel(1.5 + i * 0.13, 1.05, 0.055)


def mine_mermer(s, st):
    """Mermer ocağı: beyaz kaya yüzü, kesilmiş bloklar, vinç."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#cfc6b4'))
    white = hexc('#eee9df')
    for (x, y, z, r) in ((0.5, 0.45, 0.25, 0.45), (1.05, 0.35, 0.1, 0.38), (0.35, 1.05, 0.1, 0.32)):
        s.blob(x, y, z, r, mix(white, hexc('#d6d0c4'), s.rnd.random() * 0.6), 'marble', squash=0.95)
    s.box(0.65, 0.65, 0, 1.2, 1.1, 0.35, white, 'marble', deco_y=[('courses', 0.12)], deco_x=[('courses', 0.12)])
    s.box(0.65, 1.1, 0, 1.2, 1.3, 0.18, white, 'marble', deco_y=[('courses', 0.09)], deco_x=[('courses', 0.09)])
    stone_blocks(s, 1.3, 1.2, 4, 0.13, seed=41)
    crane(s, 1.45, 0.7, 1.1, 0.45, axis='y')


def mine_kristal(s, st):
    """Kristal mağarası: kaya ağzı ve dışarı taşan mavi kristaller."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#b8ad98'))
    rock = hexc('#9e968a')
    for (x, y, z, r) in ((0.55, 0.5, 0.2, 0.5), (1.15, 0.4, 0.05, 0.35), (0.4, 1.1, 0.05, 0.3)):
        s.blob(x, y, z, r, mix(rock, hexc('#857d72'), s.rnd.random() * 0.6), 'stone', squash=0.9)
    s.box(0.75, 0.95, 0, 1.05, 1.0, 0.32, hexc('#2b2622'), 'flat')  # mağara ağzı
    for (x, y, h, r) in ((1.2, 1.2, 0.45, 0.07), (1.35, 1.1, 0.32, 0.055), (1.1, 1.4, 0.3, 0.05), (1.45, 1.35, 0.4, 0.06), (0.95, 1.3, 0.22, 0.045)):
        s.cone(x, y, 0, h, r, hexc('#7fc4e0'), 'flat', n=6)
    s.crate(1.5, 0.6, 0.14); s.crate(1.55, 0.8, 0.12)


def mine_kukurt(s, st):
    """Kükürt çukuru: sarı yığınlar, dumanlı ocak."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#bfae84'))
    yellow = hexc('#e2c94a')
    for (x, y, r) in ((0.55, 0.55, 0.3), (0.95, 0.4, 0.22), (0.45, 1.0, 0.22), (1.3, 1.2, 0.18)):
        s.cone(x, y, 0, r * 1.1, r, mix(yellow, hexc('#c9a93a'), s.rnd.random() * 0.5), 'stone', n=14)
    block(s, 1.3, 0.35, 1.8, 0.8, 0.4, col=PAL['stone'], mat='stone', wins=False, roof='flat', door_x=0.5)
    s.box(1.62, 0.45, 0.4, 1.74, 0.57, 0.95, PAL['stonedark'], 'stone')
    for i in range(3):
        s.barrel(0.9 + i * 0.14, 1.5, 0.055)


# ---------------------------------------------------------- BAĞIMSIZ YERLEŞİMLER
def npc_koy(s, st):
    """Barbar köyü: ahşap çit, sazdan kulübeler, ateş."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#b49a6a'))
    thatch = hexc('#b8904f')
    for (x, y, r) in ((0.6, 0.6, 0.22), (1.25, 0.55, 0.2), (0.6, 1.25, 0.2), (1.2, 1.2, 0.24)):
        s.cylinder(x, y, 0, 0.22, r, hexc('#9a7a52'), 'wood', n=14)
        s.cone(x, y, 0.22, 0.32, r * 1.2, thatch, 'wood', n=14)
    for i in range(16):  # çit kazıkları (ön iki kenar)
        t = i / 15
        s.box(0.25 + t * 1.5, 1.72, 0, 0.29 + t * 1.5, 1.76, 0.2, PAL['wood2'], 'wood')
        s.box(1.72, 0.25 + t * 1.5, 0, 1.76, 0.29 + t * 1.5, 0.2, PAL['wood2'], 'wood')
    s.cone(0.95, 0.95, 0, 0.12, 0.08, hexc('#e0762f'), 'flat', n=8)  # ateş
    s.flag(0.35, 0.35, 0, 0.7, hexc('#6b4a2a'))


def npc_korsan(s, st):
    """Korsan ini: ahşap kule, iskele, kara bayrak, sandıklar."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d9c28e'))
    s.box(0.4, 0.4, 0, 1.2, 1.1, 0.55, PAL['wood2'], 'wood', deco_y=[('vplanks', 9)], deco_x=[('vplanks', 8)])
    crenel(s, 0.37, 0.37, 1.23, 1.13, 0.55, PAL['wood2'], step=0.14, size=0.07, h=0.09)
    s.box(0.5, 0.5, 0.55, 0.8, 0.8, 1.05, PAL['wood'], 'wood', deco_y=[('vplanks', 3)], deco_x=[('vplanks', 3)])
    s.hip(0.5, 0.5, 0.8, 0.8, 1.05, 0.18, PAL['wooddark'], mat='wood')
    s.flag(0.65, 0.65, 1.23, 0.5, hexc('#1f1c1a'))
    s.box(1.25, 0.7, 0.02, 1.9, 0.95, 0.07, PAL['wood'], 'wood', deco_top=[('planks', 3)])  # iskele
    for i in range(3):
        s.crate(0.5 + i * 0.2, 1.3, 0.13)
    s.barrel(1.1, 1.45, 0.06); s.barrel(1.25, 1.5, 0.06)


def npc_kale(s, st):
    """Asi kalesi: taş sur, köşe kuleleri, iç burç."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#a99a80'))
    col = hexc('#b9ad97')
    for (x0, y0, x1, y1) in ((0.3, 0.3, 1.7, 0.45), (0.3, 0.45, 0.45, 1.7)):
        s.box(x0, y0, 0, x1, y1, 0.45, col, 'stone', deco_y=[('courses', 0.09)], deco_x=[('courses', 0.09)], key=-3)
    s.box(0.45, 1.55, 0, 1.7, 1.7, 0.45, col, 'stone', deco_y=[('courses', 0.09), ('archdoor', 0.5, 0, 0.18, 0.3)], deco_x=[('courses', 0.09)])
    s.box(1.55, 0.45, 0, 1.7, 1.55, 0.45, col, 'stone', deco_y=[('courses', 0.09)], deco_x=[('courses', 0.09)])
    block(s, 0.75, 0.75, 1.25, 1.25, 0.85, col=col, mat='stone', wins=True, kind='arch', roof='flat', spacing=0.25)
    crenel(s, 0.72, 0.72, 1.28, 1.28, 0.9, col)
    for (x, y) in ((0.37, 0.37), (1.63, 0.37), (0.37, 1.63), (1.63, 1.63)):
        s.cylinder(x, y, 0, 0.7, 0.13, col, 'stone', n=16)
        s.cone(x, y, 0.7, 0.24, 0.15, hexc('#6f6a62'), 'lead', n=16)
    s.flag(1.0, 1.0, 0.95, 0.55, hexc('#5a2c6e'))


BUILDINGS = {
    'divan': divan, 'saray': saray, 'elcilik': elcilik, 'konut': konut, 'hamam': hamam, 'carsi': carsi,
    'ambar': ambar, 'kereste': kereste, 'tas': tas, 'medrese': medrese, 'kisla': kisla, 'liman': liman,
    'tersane': tersane, 'kahvehane': kahvehane, 'cami': cami, 'muze': muze, 'marangoz': marangoz,
    'mimar': mimar, 'ormanci': ormanci, 'tasci': tasci, 'tophane': tophane, 'surlar': surlar,
}
# Aşamasız yardımcı katmanlar: (fonksiyon, gölge var mı)
EXTRAS = {'site': (site, True), 'scaffold': (scaffold, False),
          'mine-uzum': (mine_uzum, True), 'mine-mermer': (mine_mermer, True),
          'mine-kristal': (mine_kristal, True), 'mine-kukurt': (mine_kukurt, True),
          'npc-koy': (npc_koy, True), 'npc-korsan': (npc_korsan, True), 'npc-kale': (npc_kale, True)}


def main(ids):
    os.makedirs(OUT, exist_ok=True)
    for name, (fn, shadow) in EXTRAS.items():
        if ids and name not in ids and len(ids) != len(BUILDINGS):
            continue
        sc = Scene(seed=77)
        fn(sc, 1)
        path = os.path.join(OUT, f'{name}.webp')
        sc.render(path, ground_shadow=shadow)
        print('yazıldı', os.path.relpath(path, ROOT))
    ids = [i for i in ids if i in BUILDINGS]
    # Boyalı görseli olan binalar (tools/art/import-ui.py) kod çizimiyle EZİLMEZ.
    painted = {'konut', 'surlar'}
    folder = os.path.join(ROOT, 'assets', 'source', 'painted', 'buildings')
    if os.path.isdir(folder):
        painted |= {f.rsplit('-', 1)[0] for f in os.listdir(folder) if f.endswith('.png')}
    ids = [i for i in ids if i not in painted]
    for bid in ids:
        for st in (1, 2, 3):
            s = Scene(seed=sum(map(ord, bid)) * 10 + st)
            BUILDINGS[bid](s, st)
            path = os.path.join(OUT, f'{bid}-{st}.webp')
            im = s.render(path)
            print('yazıldı', os.path.relpath(path, ROOT), im.size)


if __name__ == '__main__':
    main(sys.argv[1:] or list(BUILDINGS) + list(EXTRAS))
