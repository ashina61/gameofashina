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


# ------------------------------------------------------------------ OSMANLI PARÇALARI
OTTO = {
    'ochre': hexc('#ecd09a'), 'pink': hexc('#ecc0a8'), 'blue': hexc('#c6d8de'), 'white': hexc('#f6eedc'),
    'green': hexc('#d3dcb0'), 'timber': hexc('#5a3a22'), 'stone': hexc('#d8c6a0'),
}


def _kafes_row(length, vb, spacing=0.26, w=0.1, h=0.19, skip_mid=False):
    n = max(1, int(length / spacing))
    out = []
    for i in range(n):
        u = (i + 0.5) / n
        if skip_mid and abs(u - 0.5) < 0.6 / n:
            continue
        out.append(('kafes', u, vb, w, h))
    return out


def konak(s, x0, y0, x1, y1, floors=2, col=None, cumba=True, roofcol=None, door=0.5, eave=0.12, stone_base=True):
    """OSMANLI KONAĞI: taş zemin kat, taşan (çıkmalı) ahşap karkaslı sıvalı üst
    katlar, kafesli pencereler, +y yüzünde konsollu cumba, geniş saçaklı kırma çatı."""
    col = col or OTTO['white']
    g = 0.34
    base_col = OTTO['stone'] if stone_base else col
    small = [('win', u, 0.12, 0.07, 0.12, None) for u in (0.2, 0.8)]
    s.box(x0, y0, 0, x1, y1, g, base_col, 'stone' if stone_base else 'plaster',
          deco_y=([('courses', 0.1)] if stone_base else []) + small + [('archdoor', door, 0, 0.15, 0.25)],
          deco_x=([('courses', 0.1)] if stone_base else []) + small)
    top = g
    ox = 0.0
    for f in range(max(0, floors - 1)):
        ox += 0.045
        fh = 0.36
        ny = max(2, int((x1 - x0 + 2 * ox) / 0.12)); nx = max(2, int((y1 - y0 + 2 * ox) / 0.12))
        s.box(x0 - ox, y0 - ox, top, x1 + ox, y1 + ox, top + fh, col, 'plaster',
              deco_y=[('studs', ny, 0.02, 0.98, OTTO['timber'])] + _kafes_row(x1 - x0, 0.1, skip_mid=cumba and f == floors - 2),
              deco_x=[('studs', nx, 0.02, 0.98, OTTO['timber'])] + _kafes_row(y1 - y0, 0.1))
        # kat arası konsollar (çıkma altı)
        for i in range(ny // 2 + 1):
            bx = x0 - ox + (x1 - x0 + 2 * ox) * i / max(1, ny // 2)
            s.box(bx - 0.012, y1 + ox - 0.05, top - 0.05, bx + 0.012, y1 + ox, top, OTTO['timber'], 'wood', outline=False)
        top += fh
    if cumba and floors >= 2:
        cx = (x0 + x1) / 2
        cw = min(0.2, (x1 - x0) * 0.28)
        cy1 = y1 + ox
        s.box(cx - cw, cy1, top - 0.34, cx + cw, cy1 + 0.13, top - 0.02, col, 'plaster',
              deco_y=[('studs', 4, 0.02, 0.98, OTTO['timber'])] + [('kafes', 0.3, 0.08, 0.08, 0.18), ('kafes', 0.7, 0.08, 0.08, 0.18)],
              deco_x=[('kafes', 0.5, 0.08, 0.06, 0.18)])
        for bx in (cx - cw + 0.02, cx + cw - 0.02):  # eğik payanda
            s.box(bx - 0.015, cy1, top - 0.44, bx + 0.015, cy1 + 0.1, top - 0.34, OTTO['timber'], 'wood', outline=False)
    rc = roofcol or PAL['roof']
    rh = min(x1 - x0, y1 - y0) * 0.22
    s.hip(x0 - ox, y0 - ox, x1 + ox, y1 + ox, top, rh, rc, over=eave, mat='roof' if rc in (PAL['roof'], PAL['roof2']) else 'lead',
          ridge=max(0.0, (x1 - x0) - (y1 - y0)))
    return top


def dome_row(s, x0, x1, y, z, n, r, finial=False, axis='x'):
    for i in range(n):
        t = (i + 0.5) / n
        if axis == 'x':
            s.dome(x0 + (x1 - x0) * t, y, z, r, PAL['lead'], 'lead', hscale=0.8, finial=finial)
        else:
            s.dome(y, x0 + (x1 - x0) * t, z, r, PAL['lead'], 'lead', hscale=0.8, finial=finial)


def pointed_tower(s, x, y, r, h, col=None, cap=0.42):
    """Sekizgen gövde + sivri kurşun külah + altın alem (Rumeli Hisarı, Selimiye kışlası)."""
    col = col or OTTO['stone']
    s.cylinder(x, y, 0, h, r, col, 'stone', n=8)
    s.cylinder(x, y, h, h + 0.04, r * 1.12, PAL['stone2'], 'stone', n=8)
    s.cone(x, y, h + 0.04, cap, r * 1.15, PAL['lead'], 'lead', n=8)
    s.sphere(x, y, h + 0.06 + cap, 0.018, PAL['gold'])


def fil_gozu(s, cx, cy, z0, r, hscale=0.8):
    """Hamam kubbesindeki cam ışıklıklar (fil gözü)."""
    for b in (0.5, 0.95):
        for k in range(7):
            a = -0.35 * math.pi + k * (1.15 * math.pi / 6)
            x = cx + r * math.cos(b) * math.cos(a)
            y = cy + r * math.cos(b) * math.sin(a)
            z = z0 + r * hscale * math.sin(b)
            s.sphere(x, y, z + 0.005, 0.016, hexc('#e9f4f0'))


def cardak(s, x0, y0, x1, y1, h=0.4):
    """Asma çardağı: dört direk, üstünde yapraklı örtü, mor salkımlar."""
    for (x, y) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
        s.box(x - 0.015, y - 0.015, 0, x + 0.015, y + 0.015, h, PAL['wood2'], 'wood', outline=False)
    for i in range(4):
        for j in range(3):
            s.blob(x0 + (x1 - x0) * (i + 0.5) / 4, y0 + (y1 - y0) * (j + 0.5) / 3, h + 0.02, 0.09, PAL['leaf'], squash=0.45)
    for i in range(3):
        s.sphere(x0 + (x1 - x0) * (i + 0.7) / 3.5, y1 - 0.03, h - 0.05, 0.02, hexc('#5b2a5a'))


# ------------------------------------------------------------------ BİNALAR
def divan(s, st):
    """TOPKAPI SARAYI: Adalet Kulesi, üç kubbeli Kubbealtı (Divan-ı Hümâyun),
    Bâbüsselâm'ın iki sivri külahlı kulesi; son aşamada saray mutfaklarının
    bacaları ve mazgallı surlar."""
    ground(s, 0.12, 0.12, 1.92, 1.92, hexc('#d6c196'))
    pave(s, 0.2, 1.1, 1.9, 1.9, PAL['marble'], n=7)
    lead, gold = PAL['lead'], PAL['gold']
    # --- Adalet Kulesi (arka sol): taş gövde, kemerli köşk katı, sivri kurşun külah.
    th = (0.62, 0.85, 1.05)[st - 1]
    tx0, ty0, tx1, ty1 = 0.3, 0.22, 0.6, 0.52
    s.box(tx0, ty0, 0, tx1, ty1, th, PAL['stone'], 'stone', deco_y=[('courses', 0.1)], deco_x=[('courses', 0.1)])
    s.box(tx0 - 0.02, ty0 - 0.02, th, tx1 + 0.02, ty1 + 0.02, th + 0.04, PAL['stone2'], 'stone')
    kh = 0.26
    kdeco = [('arch', 0.25, 0.04, 0.07, 0.15), ('arch', 0.5, 0.04, 0.07, 0.15), ('arch', 0.75, 0.04, 0.07, 0.15)]
    s.box(tx0 + 0.02, ty0 + 0.02, th + 0.04, tx1 - 0.02, ty1 - 0.02, th + 0.04 + kh, PAL['marble'], 'marble', deco_y=kdeco, deco_x=kdeco)
    s.hip(tx0 + 0.02, ty0 + 0.02, tx1 - 0.02, ty1 - 0.02, th + 0.04 + kh, 0.04, lead, over=0.07, mat='lead')
    sh = (0.36, 0.5, 0.62)[st - 1]
    s.cone((tx0 + tx1) / 2, (ty0 + ty1) / 2, th + 0.1 + kh, sh, 0.15, lead, 'lead', n=8)
    top = th + 0.1 + kh + sh
    s.cylinder((tx0 + tx1) / 2, (ty0 + ty1) / 2, top - 0.02, top + 0.08, 0.012, gold, 'flat', n=6)
    s.sphere((tx0 + tx1) / 2, (ty0 + ty1) / 2, top + 0.1, 0.022, gold)

    # --- Kubbealtı: geniş saçaklı, kurşun kubbeli divan; önünde sütunlu revak.
    dx0, dy0, dx1, dy1 = 0.66, 0.36, 1.46, 0.9
    dh = 0.46
    block(s, dx0, dy0, dx1, dy1, dh, kind='arch', spacing=0.2, roof=None, door_y=0.5)
    s.hip(dx0, dy0, dx1, dy1, dh, 0.07, lead, over=0.13, mat='lead')  # geniş Osmanlı saçağı
    domes = [(dx0 + dx1) / 2] if st == 1 else [dx0 + 0.18, (dx0 + dx1) / 2, dx1 - 0.18]
    for i, cx in enumerate(domes):
        r = 0.17 if (len(domes) == 1 or i == 1) else 0.13
        domed(s, cx, (dy0 + dy1) / 2, dh + 0.06, r, drum=0.05, wall=PAL['marble'], finial=True)
    s.box(dx0 - 0.02, dy1, 0, dx1 + 0.02, dy1 + 0.3, 0.04, PAL['stone2'], 'stone')
    n = 5 if st == 1 else 7
    for i in range(n):
        cx = dx0 + 0.05 + (dx1 - dx0 - 0.1) * i / (n - 1)
        s.cylinder(cx, dy1 + 0.25, 0.04, 0.4, 0.028, PAL['marble'], 'marble', n=10)
    s.hip(dx0 - 0.02, dy1, dx1 + 0.02, dy1 + 0.28, 0.4, 0.05, lead, over=0.1, mat='lead')

    # --- Bâbüsselâm (ön): mazgallı kapı duvarı, iki sivri külahlı sekizgen kule.
    if st >= 2:
        gx0, gx1, gy0, gy1 = 0.52, 1.36, 1.56, 1.74
        gh = 0.42
        s.box(gx0, gy0, 0, gx1, gy1, gh, PAL['plaster'], 'plaster',
              deco_y=[('courses', 0.12), ('band', 0.62, 0.74, hexc('#2f5a44')), ('archdoor', 0.5, 0, 0.2, 0.3)])
        crenel(s, gx0, gy0, gx1, gy1, gh, PAL['plaster'], step=0.1, size=0.05, h=0.06)
        for tx in (gx0 - 0.02, gx1 + 0.02):
            ch = 0.6 if st == 2 else 0.7
            s.cylinder(tx, (gy0 + gy1) / 2, 0, ch, 0.13, PAL['plaster'], 'plaster', n=8)
            s.cylinder(tx, (gy0 + gy1) / 2, ch, ch + 0.04, 0.15, PAL['stone2'], 'stone', n=8)
            s.cone(tx, (gy0 + gy1) / 2, ch + 0.04, 0.42, 0.155, lead, 'lead', n=8)
            s.sphere(tx, (gy0 + gy1) / 2, ch + 0.5, 0.018, gold)
        s.flag((gx0 + gx1) / 2, (gy0 + gy1) / 2, gh + 0.06, 0.45)

    # --- Saray mutfakları: uzun yapı üstünde kubbeli baca dizisi.
    if st >= 3:
        kx0, kx1, ky0, ky1 = 1.55, 1.86, 0.2, 1.2
        block(s, kx0, ky0, kx1, ky1, 0.4, mat='stone', wins=False, roof='flat')
        for i in range(5):
            cy = ky0 + 0.1 + (ky1 - ky0 - 0.2) * i / 4
            s.cylinder((kx0 + kx1) / 2, cy, 0.45, 0.62, 0.055, PAL['stone'], 'stone', n=10)
            s.dome((kx0 + kx1) / 2, cy, 0.62, 0.075, lead, 'lead', hscale=0.8, finial=False)
        # Arka sur: mazgallı.
        s.box(0.15, 0.12, 0, 1.5, 0.2, 0.3, PAL['stone'], 'stone', deco_y=[('courses', 0.1)])
        crenel(s, 0.15, 0.12, 1.5, 0.2, 0.3, step=0.1, size=0.05, h=0.06)
        s.flag(0.2, 0.3, 0.3, 0.55); s.flag(1.8, 1.3, 0.1, 0.6)

    # --- Avlu: ulu çınar ve serviler.
    s.tree(1.72, 1.62, 1.0 if st < 3 else 1.1)
    s.tree(0.24, 1.3, 0.95, 'cypress'); s.tree(0.24, 1.62, 0.9, 'cypress')
    if st == 1:
        s.tree(1.7, 0.5, 0.9)


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
def cami(s, st):
    """AYASOFYA: pembe-aşı boyalı gövde, köşe payandaları, pencereli kasnak
    üstünde basık büyük kubbe, iki yanında basamaklanan yarım kubbeler;
    aşamayla çoğalan dört minare ve önde son cemaat yeri."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d6c095'))
    pave(s, 0.3, 1.45, 1.8, 1.9, PAL['marble'], n=7)
    wall = hexc('#e0a784'); wall2 = hexc('#cf946f'); lead, gold = PAL['lead'], PAL['gold']
    x0, y0, x1, y1 = 0.48, 0.42, 1.52, 1.4
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    h = 0.52
    block(s, x0, y0, x1, y1, h, col=wall, mat='plaster', kind='arch', spacing=0.2, roof=None)
    s.box(x0 - 0.03, y0 - 0.03, h, x1 + 0.03, y1 + 0.03, h + 0.04, lead, 'lead')  # kurşun dam
    # Köşe payanda kuleleri.
    bh = h + (0.12 if st == 1 else 0.2)
    for (bx, by) in ((x0, y0), (x1 - 0.2, y0), (x0, y1 - 0.2), (x1 - 0.2, y1 - 0.2)):
        s.box(bx - 0.03, by - 0.03, 0, bx + 0.23, by + 0.23, bh, wall2, 'plaster', deco_y=[('arch', 0.5, 0.2, 0.06, 0.13)], deco_x=[('arch', 0.5, 0.2, 0.06, 0.13)])
        s.hip(bx - 0.03, by - 0.03, bx + 0.23, by + 0.23, bh, 0.05, lead, over=0.03, mat='lead')
    # Yarım kubbeler (uzun eksende iki yana basamaklanır).
    if st >= 2:
        for sx in (-1, 1):
            s.dome(cx + sx * 0.3, cy, h, 0.27, lead, 'lead', hscale=0.55, finial=False)
            if st >= 3:
                for sy in (-1, 1):
                    s.dome(cx + sx * 0.42, cy + sy * 0.2, h - 0.02, 0.12, lead, 'lead', hscale=0.6, finial=False)
    # Kasnak: koyu pencereler arasında payanda dişleri; üstünde basık ana kubbe.
    r = (0.3, 0.36, 0.4)[st - 1]
    z = h + 0.02
    s.cylinder(cx, cy, z, z + 0.1, r * 1.02, hexc('#5d463a'), 'plaster', n=28)
    teeth = 20
    for i in range(teeth):
        a = 2 * math.pi * i / teeth
        px, py = cx + math.cos(a) * r * 1.03, cy + math.sin(a) * r * 1.03
        s.box(px - 0.022, py - 0.022, z, px + 0.022, py + 0.022, z + 0.1, wall, 'plaster', outline=False)
    s.cylinder(cx, cy, z + 0.1, z + 0.12, r * 1.06, wall2, 'plaster', n=28)
    s.dome(cx, cy, z + 0.12, r, lead, 'lead', hscale=0.5, finial=True)
    # Son cemaat yeri (ön revak, kurşun örtülü).
    if st >= 2:
        s.box(x0 + 0.1, y1, 0, x1 - 0.1, y1 + 0.16, 0.3, wall, 'plaster', deco_y=[('arch', u, 0.04, 0.08, 0.17) for u in (0.12, 0.3, 0.5, 0.7, 0.88)])
        s.hip(x0 + 0.1, y1, x1 - 0.1, y1 + 0.16, 0.3, 0.06, lead, over=0.04, mat='lead')
    # Minareler: iki kalın (taş kaideli), iki ince.
    mins = [(1.8, 0.22, 1.7, 0.07)]
    if st >= 2:
        mins.append((0.22, 0.24, 1.62, 0.07))
    if st >= 3:  # öndeki ince minareler köşeye: cepheyi kapatmasın
        mins += [(1.86, 1.84, 1.78, 0.052), (0.2, 1.74, 1.78, 0.052)]
    for (mx, my, mh, mr) in mins:
        minaret(s, mx, my, mh, r=mr, col=hexc('#f0e6d6'))
    # Avlu: şadırvan, serviler.
    if st >= 2:
        s.cylinder(1.0, 1.7, 0, 0.08, 0.13, PAL['marble'], 'marble', top=PAL['water'])
        s.cylinder(1.0, 1.7, 0.08, 0.24, 0.02, PAL['marble'], 'marble', n=8)
        s.dome(1.0, 1.7, 0.24, 0.07, lead, 'lead', hscale=0.7, finial=False)
    s.tree(1.82, 1.1, 0.9, 'cypress'); s.tree(0.18, 1.1, 0.9, 'cypress')


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


# ------------------------------------------------ IKARIAM KARŞILIĞI YENİ YAPILAR
def korsan_kalesi(s, st):
    """Korsan kalesi: taş burç, ahşap çit, iskele, kara bayrak; seviyeyle büyür."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#cdb88a'))
    col = hexc('#a99c86')
    s.box(0.35, 0.35, 0, 1.15, 1.05, 0.5 + 0.08 * st, col, 'stone', deco_y=[('courses', 0.09), ('archdoor', 0.5, 0, 0.18, 0.28)], deco_x=[('courses', 0.09)])
    crenel(s, 0.33, 0.33, 1.17, 1.07, 0.5 + 0.08 * st, col, step=0.13, size=0.07, h=0.08)
    s.cylinder(0.5, 0.5, 0, 0.95 + 0.18 * st, 0.16, col, 'stone', n=16)
    s.cone(0.5, 0.5, 0.95 + 0.18 * st, 0.3, 0.2, PAL['wooddark'], 'wood')
    s.flag(0.5, 0.5, 1.25 + 0.18 * st, 0.5, hexc('#1f1c1a'))
    s.box(1.2, 0.55, 0.02, 1.92, 0.8, 0.07, PAL['wood'], 'wood', deco_top=[('planks', 3)])  # iskele
    for i in range(1 + st):
        s.barrel(0.55 + i * 0.16, 1.3, 0.06)
    s.crate(1.3, 1.2, 0.14)
    if st >= 2:
        s.box(1.25, 1.1, 0, 1.75, 1.6, 0.4, PAL['wood2'], 'wood', deco_y=[('vplanks', 6)], deco_x=[('vplanks', 6)])
        s.gable(1.25, 1.1, 1.75, 1.6, 0.4, 0.2, PAL['wooddark'], mat='wood')
    if st >= 3:
        s.cylinder(1.15, 0.35, 0, 0.8, 0.12, col, 'stone', n=14)
        s.flag(1.15, 0.35, 0.8, 0.4, PAL['red'])


def siginak(s, st):
    """Gizli sığınak: sarmaşıklı taş ev, alçak kapı, kuyu ve çardak; seviyeyle gizli kule."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#bfae86'))
    col = hexc('#b3a58c')
    s.box(0.4, 0.45, 0, 1.25, 1.2, 0.45 + 0.07 * st, col, 'stone', deco_y=[('courses', 0.09), ('archdoor', 0.5, 0, 0.14, 0.24)], deco_x=[('courses', 0.09)])
    s.hip(0.4, 0.45, 1.25, 1.2, 0.45 + 0.07 * st, 0.2, PAL['wooddark'], mat='wood')
    s.cylinder(1.5, 1.45, 0, 0.12, 0.12, PAL['stone2'], 'stone', top=PAL['window'])
    for i in range(1 + st):
        s.tree(0.3 + i * 0.35, 1.7, 0.7, 'cypress')
    if st >= 2:
        s.box(1.35, 0.35, 0, 1.75, 0.75, 0.3, PAL['wood2'], 'wood', deco_y=[('vplanks', 4)], deco_x=[('vplanks', 4)])
        s.gable(1.35, 0.35, 1.75, 0.75, 0.3, 0.16, PAL['wooddark'], mat='wood')
    if st >= 3:
        s.cylinder(0.5, 0.55, 0, 0.95, 0.1, col, 'stone', n=14)
        s.cone(0.5, 0.55, 0.95, 0.22, 0.14, PAL['wooddark'], 'wood')


# ------------------------------------------------------------------ OSMANLI TARİFLERİ
def konut(s, st):
    """Konaklar: cumbalı, ahşap karkaslı, renkli sıvalı Osmanlı evleri."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d9c299'))
    if st == 1:
        konak(s, 0.5, 0.45, 1.3, 1.15, 2, OTTO['ochre'])
        s.tree(1.6, 0.5, 0.9); s.tree(0.3, 1.6, 0.85, 'cypress')
    elif st == 2:
        konak(s, 0.3, 0.55, 1.05, 1.3, 2, OTTO['ochre'])
        konak(s, 1.2, 0.3, 1.78, 0.9, 2, OTTO['pink'], cumba=False)
        s.tree(1.55, 1.45, 0.95); s.tree(0.25, 1.7, 0.85, 'cypress')
    else:
        konak(s, 0.3, 0.3, 1.1, 1.05, 3, OTTO['white'])
        konak(s, 1.22, 0.3, 1.8, 0.88, 2, OTTO['pink'], cumba=False)
        konak(s, 1.2, 1.05, 1.78, 1.62, 2, OTTO['blue'])
        s.tree(0.4, 1.55, 1.0); s.tree(0.85, 1.75, 0.8, 'cypress')
    s.barrel(0.95, 1.75)


def elcilik(s, st):
    """Elçilik: üç katlı büyük konak (yalı üslubu), sütunlu giriş, ülke sancakları."""
    ground(s, 0.2, 0.2, 1.85, 1.85, hexc('#d2bb8c'))
    pave(s, 0.4, 1.35, 1.6, 1.85, PAL['marble'], n=6)
    konak(s, 0.4, 0.4, 1.45, 1.2, 2 if st == 1 else 3, OTTO['white'], roofcol=PAL['roof'])
    if st >= 2:
        konak(s, 1.5, 0.5, 1.85, 1.05, 2, OTTO['ochre'], cumba=False)
    if st == 3:
        konak(s, 0.12, 0.5, 0.38, 1.05, 2, OTTO['ochre'], cumba=False)
    cols = [PAL['red'], PAL['blue'], PAL['teal'], hexc('#d6a93a'), PAL['green']]
    for i in range(2 + st):
        s.flag(0.35 + i * 0.3, 1.78, 0, 0.75, cols[i % len(cols)])


def hamam(s, st):
    """Hamam: fil gözlü kurşun kubbeler, taş gövde, soğukluk kanadı, ocak bacası."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    def hall(x0, y0, x1, y1, h, r):
        block(s, x0, y0, x1, y1, h, col=PAL['stone'], mat='stone', wins=False, roof='flat', door_y=0.5)
        s.dome((x0 + x1) / 2, (y0 + y1) / 2, h + 0.05, r, PAL['lead'], 'lead', hscale=0.8)
        fil_gozu(s, (x0 + x1) / 2, (y0 + y1) / 2, h + 0.05, r)
    if st == 1:
        hall(0.5, 0.45, 1.4, 1.35, 0.5, 0.36)
    elif st == 2:
        hall(0.35, 0.45, 1.25, 1.35, 0.55, 0.38)
        block(s, 1.25, 0.6, 1.7, 1.2, 0.42, col=PAL['stone'], mat='stone', wins=False, roof='flat')
        s.dome(1.47, 0.9, 0.47, 0.16, PAL['lead'], 'lead', hscale=0.8, finial=False)
        fil_gozu(s, 1.47, 0.9, 0.47, 0.16)
    else:
        hall(0.25, 0.3, 1.15, 1.2, 0.6, 0.4)
        block(s, 1.15, 0.45, 1.75, 1.05, 0.45, col=PAL['stone'], mat='stone', wins=False, roof='flat')
        for cx in (1.3, 1.6):
            s.dome(cx, 0.75, 0.5, 0.13, PAL['lead'], 'lead', hscale=0.8, finial=False)
            fil_gozu(s, cx, 0.75, 0.5, 0.13)
        # soğukluk: ahşap saçaklı giriş kanadı
        konak(s, 0.45, 1.2, 1.35, 1.65, 1, OTTO['white'], cumba=False, stone_base=False)
    s.box(0.3, 0.3, 0, 0.42, 0.42, 0.95, PAL['stonedark'], 'stone')
    s.cone(0.36, 0.36, 0.95, 0.12, 0.08, PAL['lead'], 'lead', n=8)
    s.tree(1.75, 1.6, 0.8, 'cypress')


def carsi(s, st):
    """Çarşı: kubbeli taş bedesten, önünde arasta dükkânları ve tenteler."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d9c299'))
    pave(s, 0.2, 0.2, 1.85, 1.85, hexc('#d4c29c'), n=9)
    nx = (2, 3, 3)[st - 1]; ny = (1, 1, 2)[st - 1]
    x0, y0 = 0.25, 0.25
    x1, y1 = x0 + 0.42 * nx, y0 + 0.45 * ny
    block(s, x0, y0, x1, y1, 0.55, col=OTTO['stone'], mat='stone', kind='arch', spacing=0.21, roof='flat', door_y=0.5)
    for j in range(ny):
        dome_row(s, x0, x1, y0 + 0.225 + 0.45 * j, 0.6, nx, 0.16, finial=(j == 0))
    cols = [PAL['red'], PAL['blue'], hexc('#d6a93a'), PAL['teal'], PAL['green']]
    stalls = [(0.3, y1 + 0.12), (0.85, y1 + 0.12), (1.4, y1 + 0.12), (1.45, 0.3), (1.45, 0.75), (0.3, y1 + 0.6), (0.85, y1 + 0.6)]
    stalls = [p for p in stalls if not (p[0] < x1 and p[1] < y1)][:(3, 4, 5)[st - 1]]
    for i, (x, y) in enumerate(stalls):
        s.box(x, y, 0, x + 0.4, y + 0.3, 0.3, PAL['wood'], 'wood', deco_y=[('vplanks', 5)], deco_x=[('vplanks', 4)])
        awning(s, x - 0.02, x + 0.42, y + 0.3, 0.42, 0.2, cols[i % len(cols)])
        s.crate(x + 0.05, y + 0.34, 0.09); s.barrel(x + 0.32, y + 0.42, 0.045)


def ambar(s, st):
    """Ambar: kalın taş duvarlı, kurşun kubbeli kiler (bedesten üslubu) ve avlu."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cdb484'))
    n = (2, 3, 3)[st - 1]
    x0, x1, y0, y1 = 0.3, 0.3 + 0.4 * n, 0.3, 0.95
    block(s, x0, y0, x1, y1, 0.55, col=OTTO['stone'], mat='stone', wins=False, roof='flat', door_y=0.5)
    dome_row(s, x0, x1, (y0 + y1) / 2, 0.6, n, 0.17)
    if st >= 2:
        konak(s, 1.35, 1.05, 1.82, 1.62, 1, OTTO['ochre'], cumba=False)
    if st == 3:
        crane(s, 1.2, 1.35, 0.95, 0.35)
    for i in range(2 + st):
        s.crate(0.4 + (i % 3) * 0.18, 1.2 + (i // 3) * 0.2, 0.14)
    for i in range(1 + st):
        s.barrel(0.45 + i * 0.16, 1.75, 0.06)


def medrese(s, st):
    """Medrese: revaklı avlunun çevresinde kubbeli öğrenci hücreleri, büyük
    dershane kubbesi, avluda şadırvan; son aşamada ince minare."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d2bb8c'))
    pave(s, 0.6, 0.6, 1.45, 1.45, PAL['marble'], n=6)
    wings = [(0.2, 0.2, 1.3, 0.55, 'x'), (0.2, 0.55, 0.55, 1.6, 'y')]
    if st >= 2:
        wings.append((1.5, 0.55, 1.85, 1.6, 'y'))
    for (x0, y0, x1, y1, ax) in wings:
        block(s, x0, y0, x1, y1, 0.4, col=PAL['marble'], mat='marble', kind='arch', spacing=0.2, roof='flat')
        if ax == 'x':
            dome_row(s, x0, x1, (y0 + y1) / 2, 0.45, int((x1 - x0) / 0.27), 0.11)
        else:
            dome_row(s, y0, y1, (x0 + x1) / 2, 0.45, int((y1 - y0) / 0.27), 0.11, axis='y')
    # Dershane: köşede büyük kubbeli kare oda.
    block(s, 1.3, 0.15, 1.85, 0.62, 0.52, col=PAL['marble'], mat='marble', kind='arch', spacing=0.22, roof='flat')
    domed(s, 1.575, 0.385, 0.56, 0.2 + 0.02 * st, drum=0.08, wall=PAL['marble'])
    s.cylinder(1.0, 1.0, 0, 0.1, 0.12, PAL['marble'], 'marble', top=PAL['water'])
    if st == 3:
        minaret(s, 0.3, 1.75, 1.2, r=0.05)
    s.tree(1.3, 1.7, 0.85, 'cypress'); s.tree(0.8, 1.72, 0.8)


def kisla(s, st):
    """Kışla (Selimiye): avlulu taş blok, çok katlı pencere dizileri, köşelerde
    sivri kurşun külahlı kuleler; önünde talim alanı."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#c9b58c'))
    pave(s, 0.3, 1.4, 1.85, 1.88, hexc('#cdb88c'), n=4)
    h = 0.55 + 0.1 * st
    X0, Y0, X1, Y1 = 0.25, 0.25, 1.65, 1.25
    t = 0.3
    wings = [(X0, Y0, X1, Y0 + t), (X0, Y0 + t, X0 + t, Y1)]
    if st >= 2:
        wings.append((X1 - t, Y0 + t, X1, Y1))
    if st >= 3:
        wings.append((X0 + t, Y1 - t, X1 - t, Y1))
    for (a, b, c, d) in wings:
        block(s, a, b, c, d, h, col=OTTO['white'], mat='plaster', kind='arch', spacing=0.2, roof='hip', roofcol=PAL['lead'],
              rh=0.1, ridge=max(0.0, (c - a) - (d - b)))
    towers = [(X1, Y0)] + ([(X0, Y1)] if st >= 2 else []) + ([(X0, Y0), (X1, Y1)] if st >= 3 else [])
    for (x, y) in towers:
        pointed_tower(s, x, y, 0.15, h + 0.25, col=OTTO['white'], cap=0.4)
    for (x, y) in ((0.6, 1.62), (0.9, 1.72), (1.2, 1.62)):
        s.box(x - 0.015, y - 0.015, 0, x + 0.015, y + 0.015, 0.3, PAL['wood2'], 'wood')
        s.sphere(x, y, 0.34, 0.05, hexc('#d9c08c'))
    s.flag(1.65, 0.25, h + 0.7, 0.5); s.flag(0.3, 1.5, 0, 0.8)


def kahvehane(s, st):
    """Kahvehane: geniş saçaklı ahşap köşk, önünde asma çardağı, peykeler, çınar."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d6c096'))
    pave(s, 0.3, 1.05, 1.5, 1.8, hexc('#d9c7a1'), n=5)
    if st == 1:
        konak(s, 0.35, 0.35, 1.15, 0.95, 1, OTTO['ochre'], cumba=False, stone_base=False, eave=0.17)
    else:
        konak(s, 0.3, 0.3, 1.2, 0.95, 2, OTTO['ochre'], eave=0.17)
    cardak(s, 0.4, 1.1, 1.2, 1.6, 0.42)
    for (x, y) in ((0.55, 1.3), (0.85, 1.45), (1.05, 1.25)):  # peyke/tabure
        s.cylinder(x, y, 0, 0.1, 0.05, PAL['wood'], 'wood', n=8)
    if st >= 3:
        s.cylinder(1.6, 0.6, 0, 0.1, 0.13, PAL['marble'], 'marble', top=PAL['water'])
    s.tree(1.6, 1.5, 1.05); s.tree(1.7, 0.4, 0.85, 'cypress')


def muze(s, st):
    """Müze (Çinili Köşk): yükseltilmiş taş set üstünde çini kuşaklı köşk,
    önde sivri kemerli revak, ortada kurşun kubbe."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d6c096'))
    s.box(0.3, 0.3, 0, 1.7, 1.45, 0.12, OTTO['stone'], 'stone', deco_y=[('courses', 0.06)], deco_x=[('courses', 0.06)])
    x0, y0, x1, y1 = 0.45, 0.4, 1.55, 1.15
    s.box(x0, y0, 0.12, x1, y1, 0.62, OTTO['white'], 'plaster',
          deco_y=[('cini', 0.72, 0.84), ('arch', 0.25, 0.08, 0.09, 0.2), ('arch', 0.75, 0.08, 0.09, 0.2), ('archdoor', 0.5, 0, 0.14, 0.26)],
          deco_x=[('cini', 0.72, 0.84), ('arch', 0.3, 0.08, 0.09, 0.2), ('arch', 0.7, 0.08, 0.09, 0.2)])
    s.hip(x0, y0, x1, y1, 0.62, 0.06, PAL['lead'], over=0.12, mat='lead')
    domed(s, (x0 + x1) / 2, (y0 + y1) / 2, 0.66, 0.22 + 0.03 * st, drum=0.08, wall=OTTO['white'])
    # Revak: sivri kemerli sütun dizisi, kurşun saçak.
    n = 6 if st == 1 else 8
    for i in range(n):
        cx = x0 + 0.05 + (x1 - x0 - 0.1) * i / (n - 1)
        s.cylinder(cx, y1 + 0.2, 0.12, 0.5, 0.025, PAL['marble'], 'marble', n=8)
    s.hip(x0 - 0.02, y1, x1 + 0.02, y1 + 0.24, 0.5, 0.05, PAL['lead'], over=0.08, mat='lead')
    if st >= 2:
        for sx in (x0 - 0.02, x1 - 0.2):
            s.dome(sx + 0.11, y0 + 0.15, 0.66, 0.08, PAL['lead'], 'lead', hscale=0.85, finial=False)
    if st >= 3:  # bahçede antik sütun parçaları, lahit
        for (x, y) in ((1.72, 0.5), (1.78, 0.8)):
            s.cylinder(x, y, 0, 0.26, 0.04, PAL['marble'], 'marble', n=10)
        s.box(1.6, 1.55, 0, 1.85, 1.72, 0.12, PAL['marble'], 'marble')
    s.tree(0.2, 1.65, 0.9, 'cypress'); s.tree(1.75, 1.7, 0.95)


def marangoz(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cdb484'))
    konak(s, 0.35, 0.35, 1.2, 1.0, 1 if st == 1 else 2, OTTO['ochre'], cumba=st == 3)
    if st >= 2:
        s.box(1.3, 0.3, 0, 1.8, 0.85, 0.4, PAL['wood'], 'wood', deco_y=[('vplanks', 6)], deco_x=[('vplanks', 6)])
        s.hip(1.3, 0.3, 1.8, 0.85, 0.4, 0.15, PAL['roof2'], over=0.12)
    logs(s, 0.4, 1.3, n=3 + st)
    s.crate(1.3, 1.3, 0.14); s.crate(1.5, 1.4, 0.12)
    s.tree(1.7, 1.65, 0.8)


def mimar(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    konak(s, 0.35, 0.3, 1.2, 1.0, 1 + min(st, 2), OTTO['white'])
    # Çizimhane: kubbeli küçük taş oda.
    if st >= 2:
        block(s, 1.3, 0.35, 1.78, 0.85, 0.42, col=OTTO['stone'], mat='stone', wins=False, roof='flat', door_x=0.5)
        s.dome(1.54, 0.6, 0.46, 0.17, PAL['lead'], 'lead', hscale=0.8)
    stone_blocks(s, 0.4, 1.35, n=2 + st)
    if st == 3:
        crane(s, 1.4, 1.35, 0.9, 0.3)
    s.tree(0.25, 1.7, 0.85, 'cypress')


def ormanci(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#c9b58c'))
    konak(s, 0.4, 0.4, 1.15, 0.95, 1 if st == 1 else 2, hexc('#b98a5a'), cumba=False, stone_base=True)
    logs(s, 1.3, 0.4, n=2 + st, axis='y')
    for i in range(3 + st):
        s.tree(0.3 + (i % 4) * 0.4, 1.25 + (i // 4) * 0.35, 0.7 + 0.08 * (i % 3), 'cypress' if i % 2 else 'olive')


def bagci(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cdb484'))
    konak(s, 0.3, 0.3, 1.0, 0.9, 2, OTTO['pink'], cumba=st >= 2)
    rows = 2 + st
    for r in range(rows):
        y = 1.1 + r * 0.18
        s.box(0.3, y - 0.01, 0, 1.75, y + 0.01, 0.2, PAL['wood2'], 'wood', outline=False)
        for i in range(8):
            s.blob(0.35 + i * 0.19, y, 0.2, 0.06, PAL['leaf'], squash=0.7)
            if (i + r) % 3 == 0:
                s.sphere(0.37 + i * 0.19, y + 0.03, 0.14, 0.018, hexc('#5b2a5a'))
    for i in range(st):
        s.barrel(1.3 + i * 0.16, 0.5, 0.06)


def simyahane(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cdb484'))
    block(s, 0.4, 0.4, 1.3, 1.1, 0.5, col=OTTO['stone'], mat='stone', kind='arch', spacing=0.25, roof='flat', door_y=0.5)
    s.dome(0.85, 0.75, 0.55, 0.26, PAL['lead'], 'lead', hscale=0.8)
    s.box(1.18, 0.45, 0, 1.3, 0.57, 0.95, PAL['stonedark'], 'stone')
    s.cone(1.24, 0.51, 0.95, 0.1, 0.08, PAL['lead'], 'lead', n=8)
    for i in range(2 + st):
        s.cone(0.4 + i * 0.22, 1.4, 0, 0.12, 0.06, hexc('#e6c34a'), 'flat', n=10)
    if st >= 2:
        s.dome(1.55, 0.6, 0, 0.2, hexc('#b8654a'), 'plaster', hscale=0.9, finial=False)  # ocak
    s.tree(1.7, 1.6, 0.8, 'cypress')


def camci(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cdb484'))
    konak(s, 0.35, 0.35, 1.15, 0.95, 1 if st == 1 else 2, OTTO['blue'], cumba=st == 3)
    s.dome(1.5, 0.6, 0, 0.26, hexc('#b8654a'), 'plaster', hscale=0.95, finial=False)  # cam fırını
    s.box(1.46, 0.3, 0.2, 1.54, 0.38, 0.55, PAL['stonedark'], 'stone')
    for i in range(3 + st):
        s.cone(0.4 + i * 0.18, 1.35, 0, 0.14, 0.05, hexc('#4fa3c7'), 'flat', n=10)
    s.tree(1.7, 1.6, 0.8)


def mahzen(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#c9b58c'))
    konak(s, 0.35, 0.35, 1.2, 1.0, 1 if st == 1 else 2, OTTO['ochre'], cumba=False)
    # Tonozlu taş mahzen girişi.
    s.box(1.3, 0.4, 0, 1.75, 1.0, 0.3, OTTO['stone'], 'stone', deco_x=[('courses', 0.08), ('archdoor', 0.5, 0, 0.18, 0.24)])
    s.gable(1.3, 0.4, 1.75, 1.0, 0.3, 0.12, PAL['lead'], axis='y', mat='lead', wall=OTTO['stone'], wallmat='stone')
    for i in range(2 + st):
        s.barrel(0.45 + (i % 4) * 0.2, 1.35 + (i // 4) * 0.2, 0.07)
    s.tree(1.7, 1.65, 0.8)


def gozlukcu(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    konak(s, 0.4, 0.35, 1.3, 1.05, 1 + min(st, 2), OTTO['white'])
    awning(s, 0.45, 1.25, 1.05, 0.32, 0.2, PAL['blue'])
    if st == 3:
        konak(s, 1.4, 0.4, 1.85, 0.95, 2, OTTO['green'], cumba=False)
    s.tree(1.6, 1.55, 0.85, 'cypress')


def barutane(s, st):
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#c9b58c'))
    block(s, 0.4, 0.4, 1.2, 1.0, 0.45, col=OTTO['stone'], mat='stone', wins=False, roof='flat', door_y=0.5)
    s.dome(0.8, 0.7, 0.5, 0.26, PAL['lead'], 'lead', hscale=0.75)
    if st >= 2:
        block(s, 1.3, 0.4, 1.75, 0.85, 0.35, col=OTTO['stone'], mat='stone', wins=False, roof='flat')
        s.dome(1.525, 0.625, 0.4, 0.15, PAL['lead'], 'lead', hscale=0.75, finial=False)
    for i in range(1 + st):  # deneme topları
        x = 0.5 + i * 0.35
        s.cylinder(x, 1.45, 0.08, 0.14, 0.05, PAL['iron'], 'flat', n=10)
        s.box(x - 0.08, 1.4, 0, x + 0.08, 1.5, 0.07, PAL['wood2'], 'wood')
    s.tree(1.75, 1.6, 0.8, 'cypress')


def depo(s, st):
    """Depo: uzun taş arasta, sırt boyunca küçük kurşun kubbeler; avluda sandık yığını."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cdb484'))
    n = (3, 4, 5)[st - 1]
    x0, x1 = 0.25, min(1.8, 0.25 + 0.3 * n)
    block(s, x0, 0.3, x1, 0.8, 0.45, col=OTTO['stone'], mat='stone', kind='arch', spacing=0.3, roof='flat', door_y=0.5)
    dome_row(s, x0, x1, 0.55, 0.5, n, 0.12)
    if st >= 2:
        block(s, 0.25, 0.9, 0.75, 1.6, 0.4, col=OTTO['stone'], mat='stone', wins=False, roof='flat', door_x=0.5)
        dome_row(s, 0.9, 1.6, 0.5, 0.45, 2, 0.13, axis='y')
    for i in range(3 + st):
        s.crate(0.95 + (i % 3) * 0.2, 1.05 + (i // 3) * 0.22, 0.15)


def ticaret_merkezi(s, st):
    """Ticaret merkezi (han / kervansaray): kubbe sıralı revaklı kanatlar,
    yüksek taç kapı, avlunun ortasında köşk mescit."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d2bb8c'))
    pave(s, 0.55, 0.55, 1.45, 1.45, PAL['stone'], n=6)
    t = 0.32
    wings = [(0.2, 0.2, 1.8, 0.2 + t, 'x'), (0.2, 0.2 + t, 0.2 + t, 1.8, 'y')]
    if st >= 2:
        wings.append((1.8 - t, 0.2 + t, 1.8, 1.8, 'y'))
    for (a, b, c, d, ax) in wings:
        block(s, a, b, c, d, 0.5, col=OTTO['stone'], mat='stone', kind='arch', spacing=0.2, roof='flat')
        if ax == 'x':
            dome_row(s, a, c, (b + d) / 2, 0.55, int((c - a) / 0.3), 0.11)
        else:
            dome_row(s, b, d, (a + c) / 2, 0.55, int((d - b) / 0.3), 0.11, axis='y')
    # Taç kapı (ön): yüksek sivri kemerli portal.
    s.box(0.8, 1.72, 0, 1.25, 1.86, 0.72, OTTO['stone'], 'stone', deco_y=[('courses', 0.1), ('archdoor', 0.5, 0, 0.2, 0.42), ('cini', 0.8, 0.88)])
    crenel(s, 0.8, 1.72, 1.25, 1.86, 0.72, OTTO['stone'], step=0.09, size=0.05, h=0.05)
    # Köşk mescit: dört ayak üstünde küçük kubbeli oda.
    if st >= 2:
        for (x, y) in ((0.88, 0.88), (1.12, 0.88), (0.88, 1.12), (1.12, 1.12)):
            s.box(x - 0.03, y - 0.03, 0, x + 0.03, y + 0.03, 0.3, OTTO['stone'], 'stone')
        s.box(0.83, 0.83, 0.3, 1.17, 1.17, 0.5, OTTO['stone'], 'stone', deco_y=[('arch', 0.5, 0.04, 0.08, 0.12)], deco_x=[('arch', 0.5, 0.04, 0.08, 0.12)])
        s.dome(1.0, 1.0, 0.5, 0.14, PAL['lead'], 'lead', hscale=0.85)
    for i in range(1 + st):
        s.crate(0.65 + i * 0.2, 1.4, 0.13)


def harita_arsivi(s, st):
    """Harita arşivi (Osmanlı kütüphanesi): yükseltilmiş taş kitaplık, ortada
    kubbe, önde küçük kubbeli revak, çini kuşak."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    s.box(0.35, 0.35, 0, 1.55, 1.3, 0.1, OTTO['stone'], 'stone')
    x0, y0, x1, y1 = 0.45, 0.4, 1.45, 1.1
    s.box(x0, y0, 0.1, x1, y1, 0.6, OTTO['stone'], 'stone',
          deco_y=[('courses', 0.1), ('cini', 0.74, 0.84), ('arch', 0.25, 0.1, 0.09, 0.2), ('arch', 0.75, 0.1, 0.09, 0.2)],
          deco_x=[('courses', 0.1), ('cini', 0.74, 0.84), ('arch', 0.5, 0.1, 0.09, 0.2)])
    s.box(x0 - 0.03, y0 - 0.03, 0.6, x1 + 0.03, y1 + 0.03, 0.64, PAL['lead'], 'lead')
    domed(s, (x0 + x1) / 2, (y0 + y1) / 2, 0.64, 0.24 + 0.02 * st, drum=0.08, wall=OTTO['stone'])
    if st >= 2:  # revak: üç küçük kubbe
        s.box(x0 + 0.1, y1, 0.1, x1 - 0.1, y1 + 0.2, 0.45, OTTO['stone'], 'stone', deco_y=[('arch', u, 0.02, 0.1, 0.22) for u in (0.2, 0.5, 0.8)])
        dome_row(s, x0 + 0.1, x1 - 0.1, y1 + 0.1, 0.45, 3, 0.09)
    if st == 3:
        s.flag(1.6, 0.35, 0, 0.9, PAL['blue'])
    s.tree(0.25, 1.65, 0.9, 'cypress'); s.tree(1.7, 1.6, 0.85)


def valilik(s, st):
    """Valilik (hükümet konağı): simetrik büyük konak, ortada cumbalı giriş,
    kurşun kırma çatı, sancak."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    pave(s, 0.5, 1.3, 1.5, 1.85, PAL['marble'], n=5)
    konak(s, 0.35, 0.4, 1.6, 1.2, 2 if st == 1 else 3, OTTO['white'], roofcol=PAL['lead'])
    portico(s, 0.8, 1.15, 1.2, 0.2, 0.34, 4)
    s.flag(0.97, 0.8, 1.35 if st > 1 else 1.0, 0.6)
    s.tree(0.25, 1.6, 0.9, 'cypress'); s.tree(1.75, 1.6, 0.9, 'cypress')


def kara_pazar(s, st):
    """Kara pazar: arka sokakta koyu ahşap konak (han), loş tenteler, sandıklar, fener."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#c9b58c'))
    pave(s, 0.25, 0.25, 1.8, 1.8, hexc('#bfae8a'), n=7)
    cols = [hexc('#5a2b3a'), hexc('#2f3f4f'), hexc('#4b3a22'), hexc('#3d4a2c')]
    konak(s, 0.25, 0.25, 1.0, 0.7, 1 + min(st, 2), hexc('#b89a78'), cumba=st >= 2, roofcol=PAL['roof2'])
    stalls = [(0.3, 0.95), (0.85, 0.95), (1.35, 0.5), (1.35, 1.05), (0.3, 1.45), (0.85, 1.45)][:2 + st]
    for i, (x, y) in enumerate(stalls):
        s.box(x, y, 0, x + 0.38, y + 0.3, 0.28, PAL['wooddark'], 'wood', deco_y=[('vplanks', 5)], deco_x=[('vplanks', 4)])
        awning(s, x - 0.02, x + 0.4, y + 0.3, 0.4, 0.2, cols[i % len(cols)], stripes=False)
        s.crate(x + 0.05, y + 0.34, 0.1); s.barrel(x + 0.3, y + 0.4, 0.045)
    lantern(s, 1.2, 1.35, 0.45)


BUILDINGS = {
    'divan': divan, 'saray': saray, 'elcilik': elcilik, 'konut': konut, 'hamam': hamam, 'carsi': carsi,
    'ambar': ambar, 'kereste': kereste, 'tas': tas, 'medrese': medrese, 'kisla': kisla, 'liman': liman,
    'tersane': tersane, 'kahvehane': kahvehane, 'cami': cami, 'muze': muze, 'marangoz': marangoz,
    'mimar': mimar, 'ormanci': ormanci, 'tasci': tasci, 'tophane': tophane, 'surlar': surlar,
    'bagci': bagci, 'simyahane': simyahane, 'camci': camci, 'mahzen': mahzen, 'gozlukcu': gozlukcu,
    'barutane': barutane, 'depo': depo, 'ticaret_merkezi': ticaret_merkezi, 'harita_arsivi': harita_arsivi,
    'valilik': valilik, 'korsan_kalesi': korsan_kalesi, 'kara_pazar': kara_pazar,
    'siginak': siginak,
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
    # Eski boyalı görseller kullanılmıyor: bütün binalar aynı ölçek ve dille çizilir.
    for bid in ids:
        for st in (1, 2, 3):
            s = Scene(seed=sum(map(ord, bid)) * 10 + st)
            BUILDINGS[bid](s, st)
            path = os.path.join(OUT, f'{bid}-{st}.webp')
            im = s.render(path)
            print('yazıldı', os.path.relpath(path, ROOT), im.size)


if __name__ == '__main__':
    main(sys.argv[1:] or list(BUILDINGS) + list(EXTRAS))
