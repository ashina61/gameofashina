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


def water_basin(s, x0, y0, x1, y1, z=0.02):
    """Liman havuzu: koyu deniz suyu ve üstünde açık dalga çizgileri."""
    s.flat([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], hexc('#4d8fa3'), 'flat', key=-98)
    rnd = s.rnd
    for i in range(int((x1 - x0) * (y1 - y0) * 26)):
        x = x0 + 0.05 + rnd.random() * (x1 - x0 - 0.2)
        y = y0 + 0.05 + rnd.random() * (y1 - y0 - 0.1)
        s.flat([(x, y, z + 0.004), (x + 0.12, y, z + 0.004), (x + 0.12, y + 0.012, z + 0.004), (x, y + 0.012, z + 0.004)],
               hexc('#a9d6de'), 'flat', key=-97)


def ship(s, x0, y, L, B, z=0.02, masts=2, rig='square', hull=None, band=None, sails=True, stern=True):
    """Osmanlı gemisi: sivri baş (+x), kıç köşkü, kırmızı-altın küpeşte,
    direkler ve yelkenler. Gövde tek dışbükey parça (sıralama sağlam)."""
    hull = hull or hexc('#6b4424')
    band = band or PAL['red']
    D = B * 0.55

    def ring(xs, xe, xt, half, zz):
        return [(xs, y - half, zz), (xe, y - half, zz), (xt, y, zz), (xe, y + half, zz), (xs, y + half, zz)]

    def slab(r_top, r_bot, col, top_col, mat='wood', key=None):
        faces = [Face(r_top, top_col, mat, None, True, (0, 0, 1)), Face(list(reversed(r_bot)), col, mat, None, True, (0, 0, -1))]
        for i in range(len(r_top)):
            j = (i + 1) % len(r_top)
            faces.append(Face([r_bot[i], r_bot[j], r_top[j], r_top[i]], col, mat, None, True))
        return s.add(Prim(faces, key=key))

    k = x0 + L * 0.5 + y + 0.1
    bot = ring(x0 + L * 0.1, x0 + L * 0.66, x0 + L * 0.9, B * 0.2, z - 0.02)
    mid = ring(x0, x0 + L * 0.72, x0 + L, B / 2, z + D)
    slab(mid, bot, hull, hexc('#b48a58'), key=k)
    top = ring(x0 - 0.01, x0 + L * 0.72, x0 + L + 0.02, B / 2 + 0.012, z + D + 0.045)
    slab(top, mid, band, hexc('#b48a58'), key=k + 0.01)
    if stern:  # kıç köşkü
        s.box(x0 + 0.01, y - B * 0.42, z + D + 0.045, x0 + L * 0.2, y + B * 0.42, z + D + 0.17, hexc('#8a5a30'), 'wood',
              deco_y=[('band', 0.75, 0.9, PAL['gold']), ('win', 0.3, 0.03, 0.035, 0.05), ('win', 0.7, 0.03, 0.035, 0.05)],
              deco_x=[('band', 0.75, 0.9, PAL['gold'])], key=k + 0.02)
        s.flag(x0 + 0.04, y, z + D + 0.17, 0.35, key=k + 0.3)
    zd = z + D + 0.045
    for m in range(masts):
        mx = x0 + L * (0.35 + 0.3 * m) if masts > 1 else x0 + L * 0.5
        mh = (0.95 if m == 0 or masts == 1 else 0.8) * L / 1.1
        s.cylinder(mx, y, zd, zd + mh, 0.014, PAL['wooddark'], 'wood', n=6, key=k + 0.05 + m * 0.01)
        if not sails:
            continue
        if rig == 'lateen':  # kadırga: üçgen latin yelken
            pts = [(mx - L * 0.28, y, zd + mh * 0.25), (mx + L * 0.2, y, zd + mh * 1.02), (mx + L * 0.02, y, zd + mh * 0.3)]
            s.add(Prim([Face(pts, hexc('#f4ead2'), 'canvas', None, False, (0, 1, 0))], key=k + 0.2 + m * 0.01, cull=False))
        else:  # kalyon: iki kat kare yelken
            for (z0f, z1f, w) in ((0.3, 0.62, 0.46), (0.66, 0.9, 0.36)):
                hw = B * 2.2 * w
                pts = [(mx + 0.02, y - hw, zd + mh * z0f), (mx + 0.02, y + hw, zd + mh * z0f),
                       (mx + 0.02, y + hw * 0.9, zd + mh * z1f), (mx + 0.02, y - hw * 0.9, zd + mh * z1f)]
                deco = [('crescent',)] if z0f < 0.5 and m == 0 else None
                s.add(Prim([Face(pts, hexc('#f6eedb'), 'canvas', deco, False, (1, 0, 0))], key=k + 0.25 + m * 0.01, cull=False))
        s.sphere(mx, y, zd + mh + 0.01, 0.018, PAL['gold'])


def bollards(s, pts, z=0.1):
    for x, y in pts:
        s.cylinder(x, y, z, z + 0.05, 0.018, PAL['iron'], 'flat', n=8)


def cannonballs(s, x, y, z=0.1):
    r = 0.022
    for i in range(3):
        for j in range(3 - i):
            s.sphere(x + j * 2 * r + i * r, y + i * r * 1.7, z + r + i * r * 1.5, r, PAL['iron'])


def liman(s, st):
    """TİCARET LİMANI: taş rıhtımla çevrili liman havuzu, revaklı gümrük
    hanı, ambarlar, vinçler, fener kulesi ve demirli ticaret gemileri."""
    q = PAL['stone']
    cr = [('courses', 0.05)]
    # Rıhtım (L biçimli), içinde havuz.
    s.box(0.08, 0.08, 0, 1.95, 1.0, 0.1, q, 'stone', deco_y=cr, deco_x=cr, top=hexc('#e2d3b0'))
    s.box(0.08, 1.0, 0, 0.9, 1.95, 0.1, q, 'stone', deco_y=cr, deco_x=cr, top=hexc('#e2d3b0'))
    water_basin(s, 0.9, 1.0, 1.97, 1.97)
    bollards(s, [(1.1 + 0.2 * i, 0.96) for i in range(4)] + [(0.86, 1.2 + 0.2 * i) for i in range(4)])
    # Gümrük hanı: revaklı zemin kat + kafesli üst kat, kurşun kırma çatı.
    gx1 = 0.85 if st == 1 else 0.95
    s.box(0.15, 0.15, 0.1, gx1, 0.8, 0.46, hexc('#efe0bf'), 'stone',
          deco_y=[('courses', 0.1)] + [('arch', (i + 0.5) / 4, 0.02, 0.12, 0.26) for i in range(4)],
          deco_x=[('courses', 0.1)] + [('arch', (i + 0.5) / 4, 0.02, 0.12, 0.26) for i in range(4)])
    s.box(0.13, 0.13, 0.46, gx1 + 0.02, 0.82, 0.5, PAL['stone2'], 'stone')
    s.box(0.15, 0.15, 0.5, gx1, 0.8, 0.84, PAL['plaster'], 'plaster',
          deco_y=[('win', (i + 0.5) / 4, 0.08, 0.1, 0.17, 'shutter') for i in range(4)],
          deco_x=[('win', (i + 0.5) / 4, 0.08, 0.1, 0.17, 'shutter') for i in range(4)])
    s.hip(0.15, 0.15, gx1, 0.8, 0.84, 0.26, PAL['lead'], mat='lead')
    if st == 3:
        domed(s, (0.15 + gx1) / 2, 0.475, 0.96, 0.14)
    # Ambarlar (rıhtım boyunca), vinç ve yük.
    if st >= 2:
        block(s, 1.1, 0.15, 1.85, 0.55, 0.42, z0=0.1, col=hexc('#d9c7a1'), mat='stone', wins=False, roof='gy', roofcol=PAL['roof'],
              door_x=0.5, door_y=0.5)
    crane(s, 1.3, 0.85, 1.0, 0.5, axis='y')
    for i in range(2 + st):
        s.crate(1.02 + (i % 3) * 0.17, 0.62 + (i // 3) * 0.14, 0.12, z=0.1)
    for i in range(2 + st):
        s.barrel(0.3 + (i % 3) * 0.13, 1.05 + (i // 3) * 0.14, 0.045, z=0.1)
    # Fener kulesi rıhtım ucunda: taş kaide, kırmızı kuşaklı gövde, fener odası.
    fz = 0.85 + 0.18 * st
    s.box(0.28, 1.55, 0.1, 0.62, 1.89, 0.34, PAL['stone2'], 'stone', deco_y=[('courses', 0.06)], deco_x=[('courses', 0.06), ('archdoor', 0.5, 0.0, 0.1, 0.18)])
    s.cylinder(0.45, 1.72, 0.34, fz, 0.11, PAL['marble'], 'stone', deco=[('band', 0.25, 0.4, PAL['red']), ('band', 0.62, 0.77, PAL['red'])])
    s.cylinder(0.45, 1.72, fz, fz + 0.04, 0.16, PAL['stone2'], 'stone')
    s.cylinder(0.45, 1.72, fz + 0.04, fz + 0.17, 0.085, hexc('#f5d27a'), 'flat')
    s.cone(0.45, 1.72, fz + 0.17, 0.15, 0.12, PAL['lead'], 'lead')
    s.sphere(0.45, 1.72, fz + 0.34, 0.025, PAL['gold'])
    # Demirli gemiler.
    ship(s, 1.0, 1.3, 0.8 + 0.1 * st, 0.24, masts=1 + (st >= 2), rig='square')
    if st >= 2:
        ship(s, 1.05, 1.8, 0.55, 0.16, masts=1, rig='lateen', stern=False)
    s.flag(0.2, 0.2, 0.84, 0.55)
    if st == 3:
        s.flag(1.85, 0.2, 0.52, 0.5)


def tersane(s, st):
    """TERSANE-İ ÂMİRE: denize açılan kemerli, kurşun örtülü gemi gözleri;
    önünde kızakta yapılan kadırga ve suya indirilmiş kalyon; kaptan paşa
    köşkü, gülle yığınları, kereste ve vinç."""
    q = PAL['stone']
    cr = [('courses', 0.05)]
    s.box(0.05, 0.05, 0, 1.25, 1.95, 0.1, q, 'stone', deco_y=cr, deco_x=cr, top=hexc('#e2d3b0'))
    water_basin(s, 1.25, 0.05, 1.97, 1.97)
    n = 2 + (st >= 2)
    w = 0.44
    for i in range(n):
        y0 = 0.12 + i * (w + 0.02)
        s.box(0.15, y0, 0.1, 1.2, y0 + w, 0.64, hexc('#e6d5b2'), 'stone',
              deco_x=[('courses', 0.1), ('band', 0.86, 0.92, PAL['stone2']), ('archdoor', 0.5, 0.0, 0.32, 0.46)],
              deco_y=[('courses', 0.1)] + ([('arch', (k + 0.5) / 4, 0.14, 0.1, 0.22) for k in range(4)] if i == n - 1 else []))
        s.gable(0.12, y0 - 0.02, 1.23, y0 + w + 0.02, 0.64, 0.26, PAL['lead'], axis='x', mat='lead', wall=hexc('#e6d5b2'), wallmat='stone')
    # Kızak: gözden suya uzanan ahşap rampa ve üstünde yapılan gemi.
    ym = 0.12 + (n // 2) * (w + 0.02) + w / 2
    s.box(1.2, ym - 0.14, 0.02, 1.9, ym + 0.14, 0.06, PAL['wood2'], 'wood', deco_top=[('vplanks', 6)])
    if st == 1:
        m = 6
        for i in range(m):
            x = 1.28 + i * 0.1
            hgt = 0.26 - abs(i - m / 2) * 0.02
            s.box(x, ym - 0.13, 0.06, x + 0.022, ym - 0.1, 0.06 + hgt, PAL['wood'], 'wood')
            s.box(x, ym + 0.1, 0.06, x + 0.022, ym + 0.13, 0.06 + hgt, PAL['wood'], 'wood')
        s.box(1.26, ym - 0.015, 0.06, 1.9, ym + 0.015, 0.12, PAL['wooddark'], 'wood')
    else:
        ship(s, 1.25, ym, 0.68, 0.24, z=0.08, masts=1, rig='lateen', sails=False)
    if st >= 2:  # suya indirilmiş kalyon
        ship(s, 1.3, 0.3 if ym > 0.8 else 1.55, 0.62, 0.2, masts=2, rig='square')
    if st == 3:  # ikinci kalyon ve kaptan paşa köşkü
        ship(s, 1.3, 1.72, 0.6, 0.2, masts=2, rig='square')
    # Kaptan paşa köşkü / tersane emini.
    ky = 0.12 + n * (w + 0.02) + 0.02
    if st == 1:  # boş rıhtımda yelken ve halat atölyesi, kereste yığınları
        block(s, 0.82, 1.1, 1.2, 1.46, 0.38, z0=0.1, col=PAL['wood'], mat='wood', wins=False, roof='gx', roofcol=PAL['roof2'], trim=False, door_y=0.5)
        logs(s, 0.8, 1.62, 4, 'x', 0.4)
        cannonballs(s, 0.3, 1.66)
    if ky < 1.85:
        s.box(0.15, ky, 0.1, 0.75, min(1.9, ky + 0.42), 0.5, PAL['plaster'], 'plaster',
              deco_y=[('win', (k + 0.5) / 3, 0.1, 0.1, 0.18, 'shutter') for k in range(3)],
              deco_x=[('archdoor', 0.5, 0.0, 0.13, 0.24)])
        s.hip(0.15, ky, 0.75, min(1.9, ky + 0.42), 0.5, 0.2, PAL['roof'])
        if st >= 2:
            cannonballs(s, 0.85, ky + 0.12)
            logs(s, 0.85, min(1.75, ky + 0.3), 3, 'x', 0.35)
    crane(s, 1.15, 0.1, 1.15, 0.45, axis='x')
    s.flag(0.2, 0.15, 0.9, 0.6)
    if st >= 2:
        s.flag(1.1, 0.15, 0.9, 0.55)


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
    # Talim alanı boş: askerler oyunda canlı talim yapar. Kenarda silah rafı.
    s.box(1.72, 1.45, 0, 1.78, 1.85, 0.22, PAL['wood'], 'wood')
    s.flag(1.65, 0.25, h + 0.7, 0.5); s.flag(0.3, 1.5, 0, 0.8)



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



def pazar(s, st):
    """İSKELE PAZARI (süs): kiremit çatılı taş-ahşap arasta, önünde tenteli
    dükkânlar; avluda kanvas çadırlar, sandık, fıçı, çuval, meyve sepetleri,
    balık kurutma sehpası ve gölgelik çınar."""
    ground(s, 0.12, 0.12, 1.9, 1.9, hexc('#d3bf94'))
    pave(s, 0.3, 0.95, 1.75, 1.85, hexc('#d9c7a1'), n=7)
    # Arasta: dükkân sırası, tek kiremit çatı altında.
    x0, x1, y0, y1 = 0.2, 1.75, 0.3, 0.8
    doors = [('archdoor', (i + 0.5) / 5, 0, 0.16, 0.26) for i in range(5)]
    s.box(x0, y0, 0, x1, y1, 0.42, OTTO['stone'], 'stone', deco_y=[('courses', 0.1)] + doors, deco_x=[('courses', 0.1), ('archdoor', 0.5, 0, 0.16, 0.26)])
    s.hip(x0, y0, x1, y1, 0.42, 0.16, PAL['roof'], over=0.1, ridge=1.0)
    cols = [PAL['red'], PAL['blue'], hexc('#d6a93a'), PAL['teal'], PAL['green']]
    for i in range(5):
        a = x0 + (x1 - x0) * i / 5
        awning(s, a + 0.02, a + (x1 - x0) / 5 - 0.02, y1, 0.36, 0.2, cols[i % len(cols)])
    # Dükkân önü malları.
    for i in range(5):
        a = x0 + (x1 - x0) * (i + 0.5) / 5
        s.crate(a - 0.08, y1 + 0.05, 0.1)
        for k in range(3):
            s.sphere(a - 0.05 + k * 0.03, y1 + 0.1, 0.12, 0.02, [hexc('#c8453a'), hexc('#e29b2f'), hexc('#6f9a48')][(i + k) % 3])
    # Kanvas çadırlar (gable), çizgili.
    for (tx, ty, col) in ((0.45, 1.15, PAL['red']), (1.2, 1.2, hexc('#2f6b4c'))):
        for (px, py) in ((tx, ty), (tx + 0.42, ty), (tx, ty + 0.34), (tx + 0.42, ty + 0.34)):
            s.cylinder(px, py, 0, 0.3, 0.012, PAL['wooddark'], 'flat', n=6)
        s.gable(tx, ty, tx + 0.42, ty + 0.34, 0.3, 0.14, col, axis='x', mat='canvas', wall=PAL['canvas'], wallmat='canvas', over=0.03)
        s.box(tx + 0.05, ty + 0.06, 0, tx + 0.37, ty + 0.28, 0.12, PAL['wood'], 'wood', deco_y=[('planks', 2)])
        for k in range(4):
            s.sphere(tx + 0.1 + k * 0.07, ty + 0.17, 0.14, 0.025, [hexc('#e6c34a'), hexc('#c8453a'), hexc('#9c3d6a'), hexc('#e29b2f')][k])
    # Çuvallar, fıçılar, sandık yığını.
    for (x, y) in ((1.72, 1.1), (1.8, 1.22), (1.7, 1.3)):
        s.sphere(x, y, 0.06, 0.06, hexc('#e2d3a6'))
    s.barrel(0.3, 1.7, 0.06); s.barrel(0.44, 1.76, 0.06)
    s.crate(1.35, 1.65, 0.13); s.crate(1.5, 1.7, 0.11); s.crate(1.4, 1.62, 0.1, z=0.13)
    # Balık kurutma sehpası.
    s.box(0.95, 1.7, 0, 0.97, 1.72, 0.3, PAL['wood2'], 'wood'); s.box(1.25, 1.7, 0, 1.27, 1.72, 0.3, PAL['wood2'], 'wood')
    s.box(0.95, 1.7, 0.28, 1.27, 1.72, 0.3, PAL['wood2'], 'wood')
    for k in range(4):
        s.box(1.0 + k * 0.07, 1.705, 0.14, 1.03 + k * 0.07, 1.715, 0.28, hexc('#b8c2c6'), 'flat', outline=False)
    s.tree(1.82, 1.75, 0.95)



# ------------------------------------------------ AYIRT EDİLİR YENİ TARİFLER
BRICK = hexc('#b8664a')
EARTH = hexc('#8a7a4e')


def ring_of_spheres(s, cx, cy, cz, r, plane, col, n=18, size=0.009):
    """İnce halka (usturlap, çark): küçük kürelerle çizilir."""
    for k in range(n):
        a = 2 * math.pi * k / n
        if plane == 'xy':
            p = (cx + r * math.cos(a), cy + r * math.sin(a), cz)
        elif plane == 'xz':
            p = (cx + r * math.cos(a), cy, cz + r * math.sin(a))
        else:
            p = (cx, cy + r * math.cos(a), cz + r * math.sin(a))
        s.sphere(*p, size, col)



def water_wheel(s, cx, cy, cz, r, width=0.14):
    """Dikey su çarkı (mil x yönünde): iki yan jant, altı parmak, kürekler."""
    wood, dark = PAL['wood'], PAL['wooddark']
    for side, x in ((-1, cx - width / 2), (1, cx + width / 2)):
        faces = []
        n = 28
        for k in range(n):
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            P = lambda a, rr: (x, cy + rr * math.cos(a), cz + rr * math.sin(a))
            faces.append(Face([P(a0, r * 0.84), P(a1, r * 0.84), P(a1, r), P(a0, r)], dark, 'wood', None, False, (side, 0, 0)))
        for k in range(6):
            a = math.pi * k / 3
            ca, sa = math.cos(a), math.sin(a)
            w = 0.018
            pts = [(x, cy + w * -sa, cz + w * ca), (x, cy + r * 0.86 * ca - w * sa, cz + r * 0.86 * sa + w * ca),
                   (x, cy + r * 0.86 * ca + w * sa, cz + r * 0.86 * sa - w * ca), (x, cy + w * sa, cz - w * ca)]
            faces.append(Face(pts, wood, 'wood', None, False, (side, 0, 0)))
        s.add(Prim(faces, cull=False))
    for k in range(12):  # kürekler: iki jant arasında
        a = 2 * math.pi * k / 12
        py, pz = cy + r * 0.92 * math.cos(a), cz + r * 0.92 * math.sin(a)
        s.box(cx - width / 2, py - 0.03, pz - 0.03, cx + width / 2, py + 0.03, pz + 0.03, PAL['wood2'], 'wood')
    s.cylinder(cx + width / 2, cy, cz - 0.03, cz + 0.03, 0.04, PAL['iron'], 'flat', n=10)

def ambar(s, st):
    """Ambar (zahire ambarı): havalandırma delikli yüksek taş ambar, beşik kiremit
    çatı; yanında ayaklar üstünde ahşap serender, çuval yığınları ve kantar."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#cdb484'))
    h = (0.55, 0.65, 0.72)[st - 1]
    x0, y0, x1, y1 = 0.25, 0.3, 1.35, 0.92
    vents_y = [('win', u, h - 0.2, 0.05, 0.1, None) for u in (0.15, 0.32, 0.68, 0.85)]
    vents_x = [('win', u, h - 0.2, 0.05, 0.1, None) for u in (0.3, 0.7)]
    s.box(x0, y0, 0, x1, y1, h, OTTO['stone'], 'stone', deco_y=[('courses', 0.1)] + vents_y + [('archdoor', 0.5, 0, 0.24, 0.36)],
          deco_x=[('courses', 0.1)] + vents_x)
    s.gable(x0, y0, x1, y1, h, 0.3, PAL['roof'], axis='x', wall=OTTO['stone'], wallmat='stone')
    if st >= 2:  # serender: dört ayak, taş mantar başlıklar, tahta sandık, beşik çatı
        sx0, sy0, sx1, sy1 = 1.45, 0.35, 1.82, 0.78
        for (px, py) in ((sx0 + 0.04, sy0 + 0.04), (sx1 - 0.04, sy0 + 0.04), (sx0 + 0.04, sy1 - 0.04), (sx1 - 0.04, sy1 - 0.04)):
            s.box(px - 0.025, py - 0.025, 0, px + 0.025, py + 0.025, 0.28, PAL['wood2'], 'wood')
            s.cylinder(px, py, 0.28, 0.32, 0.06, PAL['stone2'], 'stone', n=10)
        s.box(sx0, sy0, 0.32, sx1, sy1, 0.66, PAL['wood'], 'wood', deco_y=[('vplanks', 6)], deco_x=[('vplanks', 6)])
        s.gable(sx0, sy0, sx1, sy1, 0.66, 0.2, PAL['roof2'], axis='y', wall=PAL['wood'], wallmat='wood')
    if st >= 3:  # ikinci taş kanat
        s.box(0.25, 0.98, 0, 0.7, 1.55, 0.5, OTTO['stone'], 'stone', deco_x=[('courses', 0.1), ('archdoor', 0.5, 0, 0.18, 0.3)], deco_y=[('courses', 0.1)])
        s.gable(0.25, 0.98, 0.7, 1.55, 0.5, 0.2, PAL['roof'], axis='y', wall=OTTO['stone'], wallmat='stone')
    sack = hexc('#e2d3a6')
    for i in range(3 + 2 * st):
        s.sphere(0.85 + (i % 4) * 0.13, 1.12 + (i // 4) * 0.14, 0.06, 0.065, sack)
    # kantar: iki direk, kiriş, kefe
    s.box(1.45, 1.35, 0, 1.48, 1.38, 0.5, PAL['wood2'], 'wood'); s.box(1.75, 1.35, 0, 1.78, 1.38, 0.5, PAL['wood2'], 'wood')
    s.box(1.45, 1.35, 0.48, 1.78, 1.38, 0.51, PAL['wood2'], 'wood')
    s.cylinder(1.61, 1.36, 0.18, 0.2, 0.08, PAL['iron'], 'flat', n=12)
    s.tree(1.75, 1.72, 0.8)


def bagci(s, st):
    """Bağ evi: tek katlı taş bağ evi, önünde asma çardağı ve cendere (üzüm
    sıkma teknesi); arsanın çoğu sıra sıra bağ omcası."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#bda877'))
    s.box(0.25, 0.25, 0, 0.8, 0.7, 0.4, OTTO['stone'], 'stone', deco_y=[('courses', 0.09), ('archdoor', 0.5, 0, 0.15, 0.26)], deco_x=[('courses', 0.09), ('win', 0.5, 0.14, 0.08, 0.12, None)])
    s.gable(0.25, 0.25, 0.8, 0.7, 0.4, 0.2, PAL['roof2'], axis='y', wall=OTTO['stone'], wallmat='stone')
    cardak(s, 0.9, 0.3, 1.8, 0.75, 0.42)
    if st >= 2:  # cendere: yuvarlak ahşap tekne, dikey vida, kol
        s.cylinder(0.55, 0.95, 0, 0.18, 0.16, PAL['wood'], 'wood', n=16, top=hexc('#5b2a5a'))
        s.box(0.54, 0.94, 0.18, 0.56, 0.96, 0.5, PAL['iron'], 'flat')
        s.box(0.38, 0.94, 0.46, 0.72, 0.96, 0.48, PAL['wood2'], 'wood')
    rows = 3 + st
    for r in range(rows):
        y = 1.02 + r * 0.16
        x0 = 0.85 if (st >= 2 and y < 1.2) else 0.3
        s.box(x0, y - 0.008, 0, 1.82, y + 0.008, 0.2, PAL['wood2'], 'wood', outline=False)
        for i in range(int((1.82 - x0) / 0.17)):
            s.blob(x0 + 0.08 + i * 0.17, y, 0.19, 0.065, mix(PAL['leaf'], hexc('#7fa24d'), (i + r) % 3 * 0.25), squash=0.7)
            if (i + r) % 2 == 0:
                s.sphere(x0 + 0.1 + i * 0.17, y + 0.035, 0.13, 0.02, hexc('#5b2a5a'))
    for i in range(st):
        s.barrel(0.3 + i * 0.16, 0.8, 0.06)


def camci(s, st):
    """Camcı: kubbeli kırmızı tuğla cam fırını (akkor ağzı, yüksek baca),
    kiremit çatılı atölye ve raflarda renk renk şişeler."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#c9b58c'))
    block(s, 0.25, 0.3, 0.95, 0.85, 0.45, col=BRICK, mat='stone', kind='arch', spacing=0.24, roof='gx', roofcol=PAL['roof2'], door_y=0.5, trim=False)
    fx, fy, fr = 1.35, 0.75, (0.3, 0.34, 0.36)[st - 1]
    s.cylinder(fx, fy, 0, 0.12, fr * 1.05, PAL['stone2'], 'stone', n=18)
    s.dome(fx, fy, 0.12, fr, BRICK, 'stone', hscale=1.05, finial=False)
    s.sphere(fx + fr * 0.62, fy + fr * 0.62, 0.2, 0.07, hexc('#ffb347'))  # akkor fırın ağzı
    s.sphere(fx + fr * 0.62, fy + fr * 0.62, 0.2, 0.045, hexc('#fff0b0'))
    s.cylinder(fx - 0.05, fy - 0.2, 0.2, 1.05 + 0.1 * st, 0.06, BRICK, 'stone', n=10)
    if st >= 3:
        s.dome(1.65, 1.3, 0, 0.2, BRICK, 'stone', hscale=1.0, finial=False)
        s.sphere(1.74, 1.4, 0.08, 0.05, hexc('#ffb347'))
    glass = [hexc('#4fa3c7'), hexc('#5bb28a'), hexc('#d6a93a'), hexc('#9c3d6a'), hexc('#7fc4d9')]
    for row in range(1 + min(st, 2)):
        y = 1.15 + row * 0.24
        s.box(0.3, y, 0, 1.0, y + 0.1, 0.16 + 0.1 * row, PAL['wood2'], 'wood', deco_y=[('planks', 2)])
        for i in range(6):
            s.cone(0.36 + i * 0.11, y + 0.05, 0.16 + 0.1 * row, 0.12, 0.035, glass[(i + row) % len(glass)], 'flat', n=10)
    s.tree(1.75, 1.72, 0.8, 'cypress')


def gozlukcu(s, st):
    """Gözlükçü (Takiyüddin rasathanesi): kubbeli rasat kulesi, taş atölye,
    avluda usturlap (halkalı gök küresi) ve ikinci aşamadan dürbün."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    pave(s, 0.9, 1.0, 1.8, 1.8, PAL['marble'], n=5)
    block(s, 0.25, 0.3, 1.0, 0.85, 0.45, col=OTTO['stone'], mat='stone', kind='arch', spacing=0.22, roof='flat', door_y=0.5)
    th = (0.75, 0.95, 1.1)[st - 1]
    tx, ty = 1.35, 0.55
    s.cylinder(tx, ty, 0, th, 0.22, OTTO['white'], 'plaster', n=16)
    s.cylinder(tx, ty, th, th + 0.04, 0.25, PAL['stone2'], 'stone', n=16)
    s.dome(tx, ty, th + 0.04, 0.23, PAL['lead'], 'lead', hscale=0.9, finial=False)
    s.box(tx + 0.1, ty + 0.1, th + 0.06, tx + 0.13, ty + 0.13, th + 0.24, PAL['window'], 'flat', outline=False)  # rasat yarığı
    for u, z in ((0.3, 0.25), (0.6, 0.5)):
        s.box(tx + 0.19, ty - 0.03, th * u + 0.1, tx + 0.23, ty + 0.03, th * u + 0.2, PAL['window'], 'flat', outline=False)
    # Usturlap: kaide + üç halka + altın küre.
    ax, ay, az = 1.35, 1.35, 0.42
    s.cylinder(ax, ay, 0, 0.2, 0.07, PAL['marble'], 'marble', n=10)
    s.cylinder(ax, ay, 0.2, 0.28, 0.02, PAL['gold'], 'flat', n=6)
    ring_of_spheres(s, ax, ay, az, 0.15, 'xz', PAL['gold'])
    ring_of_spheres(s, ax, ay, az, 0.15, 'yz', PAL['gold'])
    ring_of_spheres(s, ax, ay, az, 0.15, 'xy', hexc('#c9953a'))
    s.sphere(ax, ay, az, 0.04, hexc('#3f6f9a'))
    if st >= 2:  # dürbün: sehpa üstünde yatık boru
        s.box(0.45, 1.3, 0, 0.48, 1.33, 0.3, PAL['wood2'], 'wood'); s.box(0.62, 1.3, 0, 0.65, 1.33, 0.3, PAL['wood2'], 'wood')
        s.add(_log(0.35, 1.315, 0.33, 0.45, 0.028, 'x'))
        s.prims[-1].faces = [Face(f.pts, hexc('#b8872e'), 'flat', None, False, f.normal) for f in s.prims[-1].faces]
    if st >= 3:  # duvar kadranı (rub-ı müceyyeb)
        s.box(0.3, 1.65, 0, 0.9, 1.72, 0.45, PAL['marble'], 'marble', deco_y=[('band', 0.2, 0.25, PAL['gold']), ('band', 0.6, 0.65, PAL['gold'])])
    s.tree(1.8, 1.8, 0.8, 'cypress')


def kahvehane(s, st):
    """Kahvehane: ahşap direkli, dört yanı açık köşk (geniş saçaklı kırma çatı),
    önünde asma çardağı, peykeler, şadırvan ve ulu çınar."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d6c096'))
    pave(s, 0.25, 0.25, 1.4, 1.85, hexc('#d9c7a1'), n=6)
    x0, y0, x1, y1 = 0.35, 0.35, 1.25, 1.0
    s.box(x0, y0, 0, x1, y1, 0.08, OTTO['stone'], 'stone')
    s.box(x0 + 0.02, y0 + 0.02, 0.08, x1 - 0.02, y0 + 0.08, 0.36, OTTO['white'], 'plaster', deco_y=_kafes_row(x1 - x0, 0.08))  # arka duvar
    n = 5
    for i in range(n):
        u = x0 + 0.04 + (x1 - x0 - 0.08) * i / (n - 1)
        s.box(u - 0.018, y1 - 0.05, 0.08, u + 0.018, y1 - 0.014, 0.46, PAL['wood2'], 'wood')
    for j in range(1, 3):
        v = y0 + (y1 - y0) * j / 3
        for u in (x0 + 0.03, x1 - 0.05):
            s.box(u, v - 0.018, 0.08, u + 0.036, v + 0.018, 0.46, PAL['wood2'], 'wood')
    for i in range(4):  # peykeler, minder
        s.box(x0 + 0.1 + i * 0.2, y0 + 0.12, 0.08, x0 + 0.24 + i * 0.2, y0 + 0.28, 0.16, PAL['red'], 'canvas')
    s.hip(x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02, 0.46, 0.2, PAL['roof'], over=0.2, ridge=0.25)
    if st >= 2:  # tepe fenerliği
        s.box(0.7, 0.6, 0.62, 0.9, 0.78, 0.74, OTTO['white'], 'plaster', deco_y=[('kafes', 0.5, 0.02, 0.1, 0.08)])
        s.hip(0.7, 0.6, 0.9, 0.78, 0.74, 0.08, PAL['roof'], over=0.06)
    cardak(s, 0.4, 1.2, 1.2, 1.7, 0.42)
    for (x, y) in ((0.6, 1.4), (0.9, 1.52), (1.05, 1.32)):
        s.cylinder(x, y, 0, 0.1, 0.05, PAL['wood'], 'wood', n=8)
    if st >= 3:
        s.cylinder(1.6, 0.6, 0, 0.1, 0.14, PAL['marble'], 'marble', top=PAL['water'])
        s.cylinder(1.6, 0.6, 0.1, 0.24, 0.02, PAL['marble'], 'marble', n=8)
    s.tree(1.6, 1.4, 1.1); s.tree(1.75, 0.3, 0.85, 'cypress')


def mahzen(s, st):
    """Şıra mahzeni: toprak tümseğin içine gömülü tonozlu mahzen; taş kemerli
    ağızlar, üstünde bağ, önde fıçı sıraları ve üzüm küfeleri."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#bda877'))
    s.blob(0.85, 0.7, 0.0, 0.62, hexc('#8f9a52'), 'leaf', squash=0.42)
    s.blob(0.55, 0.45, 0.0, 0.42, hexc('#7f8c48'), 'leaf', squash=0.45)
    n = 1 + min(st, 2)
    for i in range(n):
        x = 0.45 + i * 0.42
        s.box(x, 1.02, 0, x + 0.36, 1.2, 0.34, OTTO['stone'], 'stone', deco_y=[('courses', 0.08), ('archdoor', 0.5, 0, 0.2, 0.27)])
        s.gable(x, 1.02, x + 0.36, 1.2, 0.34, 0.1, PAL['stone2'], axis='y', mat='stone', wall=OTTO['stone'], wallmat='stone', over=0.02)
    for i in range(3):  # tümsek üstünde omcalar
        s.blob(0.55 + i * 0.25, 0.55 + i * 0.06, 0.24, 0.07, PAL['leaf'], squash=0.7)
    for row in range(1 + (st >= 2)):
        for i in range(3 + st):
            s.add(_log(0.4 + i * 0.26, 1.35 + row * 0.2, 0.08, 0.2, 0.075, 'y'))
            s.prims[-1].faces = [Face(f.pts, PAL['wood'], 'wood', [('band', 0.2, 0.26, PAL['iron']), ('band', 0.74, 0.8, PAL['iron'])] if False else None, False, f.normal) for f in s.prims[-1].faces]
    if st >= 3:  # sıkımhane: ahşap
        s.box(1.45, 0.3, 0, 1.85, 0.8, 0.42, PAL['wood'], 'wood', deco_y=[('vplanks', 5)], deco_x=[('vplanks', 6), ('door', 0.5, 0, 0.14, 0.26)])
        s.gable(1.45, 0.3, 1.85, 0.8, 0.42, 0.18, PAL['roof2'], axis='x', wall=PAL['wood'], wallmat='wood')
    for i in range(2):
        s.cylinder(1.55 + i * 0.16, 1.7, 0, 0.1, 0.06, hexc('#b08a52'), 'wood', n=10, top=hexc('#5b2a5a'))


def marangoz(s, st):
    """Marangozhane: dere kenarında su çarkıyla dönen hızarlı ahşap atölye,
    dik beşik çatı, tahta istifleri ve hızar sehpaları."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#c9b58c'))
    s.flat([(1.58, 0.1, 0.004), (1.92, 0.1, 0.004), (1.92, 1.92, 0.004), (1.58, 1.92, 0.004)], PAL['water'], 'flat', key=-45)
    h = 0.5 + 0.1 * (st >= 2)
    x0, y0, x1, y1 = 0.3, 0.3, 1.35, 0.95
    s.box(x0, y0, 0, x1, y1, h, PAL['wood'], 'wood', deco_y=[('vplanks', 12), ('door', 0.3, 0, 0.2, 0.32), ('win', 0.72, 0.18, 0.12, 0.12, None)],
          deco_x=[('vplanks', 8), ('win', 0.5, 0.2, 0.12, 0.12, None)])
    s.gable(x0, y0, x1, y1, h, 0.4, PAL['roof2'], axis='x', wall=PAL['wood'], wallmat='wood')
    # Su çarkı: atölyenin dere yanındaki duvarına bitişik, mili x yönünde.
    cx, cy, cz, r = 1.5, 0.63, 0.38, 0.3 + 0.03 * st
    water_wheel(s, cx, cy, cz, r)
    s.add(_log(1.35, cy, cz, 0.2, 0.03, 'x'))
    # Tahta istifleri.
    for k in range(1 + st):
        z = k * 0.045
        s.box(0.35, 1.15, z, 1.0, 1.35, z + 0.04, hexc('#d9a86a'), 'wood', deco_top=[('planks', 4)])
    for i in range(st):  # hızar sehpası
        x = 0.45 + i * 0.4
        s.box(x, 1.55, 0.2, x + 0.3, 1.6, 0.23, PAL['wood2'], 'wood')
        for dx in (0.03, 0.25):
            s.box(x + dx, 1.54, 0, x + dx + 0.03, 1.61, 0.2, PAL['wood2'], 'wood')
    logs(s, 1.05, 1.5, n=3, axis='x', length=0.45)


def mimar(s, st):
    """Mimarbaşı atölyesi: kurşun çatılı taş çizimhane; avluda iskele içinde
    yükselen cami maketi (kasnak, sonra kubbe), çizim masası ve vinç."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#d2bb8c'))
    block(s, 0.25, 0.25, 1.0, 0.8, 0.5, col=OTTO['stone'], mat='stone', kind='arch', spacing=0.22, roof='hip', roofcol=PAL['lead'], door_y=0.5)
    mx, my = 1.3, 1.25
    s.box(mx - 0.38, my - 0.38, 0, mx + 0.38, my + 0.38, 0.06, PAL['stone2'], 'stone', deco_top=[('grid', 5)])
    s.box(mx - 0.3, my - 0.3, 0.06, mx + 0.3, my + 0.3, 0.3, hexc('#e0a784'), 'plaster', deco_y=[('arch', u, 0.04, 0.07, 0.14) for u in (0.25, 0.5, 0.75)], deco_x=[('arch', u, 0.04, 0.07, 0.14) for u in (0.25, 0.5, 0.75)])
    s.cylinder(mx, my, 0.3, 0.38, 0.22, hexc('#e0a784'), 'plaster', n=16)
    if st >= 2:
        s.dome(mx, my, 0.38, 0.22, PAL['lead'], 'lead', hscale=0.6 if st == 2 else 0.8, finial=st == 3)
    if st >= 3:
        minaret(s, mx + 0.36, my - 0.36, 0.75, r=0.03)
    if st < 3:
        scaffold_frame(s, mx - 0.34, my - 0.34, mx + 0.34, my + 0.34, 0.5 + 0.1 * st, front_only=True)
    # Çizim masası, rulo planlar.
    s.box(0.35, 1.05, 0.2, 0.75, 1.3, 0.23, PAL['wood'], 'wood')
    for (x, y) in ((0.37, 1.07), (0.71, 1.07), (0.37, 1.26), (0.71, 1.26)):
        s.box(x, y, 0, x + 0.03, y + 0.03, 0.2, PAL['wood2'], 'wood')
    s.box(0.42, 1.1, 0.23, 0.66, 1.25, 0.235, PAL['white'], 'flat')
    crane(s, 0.4, 1.7, 0.95, 0.35)
    s.tree(1.8, 0.35, 0.85, 'cypress')


def ormanci(s, st):
    """Ormancı evi: sık orman içinde yatay tahtalı kütük ev, taş bacalı dik
    çatı; çitle çevrili fidanlık ve odun yığını."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#a9a068'))
    x0, y0, x1, y1 = 0.3, 0.35, 0.95, 0.85
    s.box(x0, y0, 0, x1, y1, 0.38, hexc('#8a5a35'), 'wood', deco_y=[('planks', 6), ('door', 0.5, 0, 0.14, 0.26)], deco_x=[('planks', 6), ('win', 0.5, 0.16, 0.1, 0.1, None)])
    s.gable(x0, y0, x1, y1, 0.38, 0.36, PAL['wooddark'], axis='y', mat='wood', wall=hexc('#8a5a35'), wallmat='wood')
    s.box(0.34, 0.4, 0, 0.46, 0.52, 0.95, PAL['stonedark'], 'stone')
    # Fidanlık: çit + sıra sıra fidan.
    fx0, fy0, fx1, fy1 = 1.05, 1.05, 1.8, 1.8
    for x in (fx0, fx1):
        s.box(x - 0.01, fy0, 0, x + 0.01, fy1, 0.14, PAL['wood2'], 'wood', outline=False)
    for y in (fy0, fy1):
        s.box(fx0, y - 0.01, 0, fx1, y + 0.01, 0.14, PAL['wood2'], 'wood', outline=False)
    for r in range(2 + st):
        for i in range(4):
            s.blob(fx0 + 0.1 + i * 0.18, fy0 + 0.12 + r * 0.16, 0.05, 0.045, PAL['leaf'], squash=0.8)
    logs(s, 0.35, 1.05, n=3, axis='x', length=0.45)
    trees = [(1.2, 0.3), (1.5, 0.35), (1.8, 0.45), (1.35, 0.7), (1.7, 0.8), (0.25, 1.55), (0.55, 1.75)][:3 + 2 * st]
    for i, (x, y) in enumerate(trees):
        s.tree(x, y, 0.85 + 0.1 * (i % 3), 'cypress' if i % 2 else 'olive')


def barutane(s, st):
    """Barut deneme alanı: kalın duvarlı, piramit kurşun çatılı barut mahzeni
    ve koruma duvarı; toprak set önünde nişan tahtaları, sıra sıra deneme topları."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#c2ad80'))
    # Toprak set + nişanlar (arka sağ).
    s.box(1.45, 0.2, 0, 1.85, 1.4, 0.32, EARTH, 'ground')
    for i in range(1 + st):
        y = 0.35 + i * 0.32
        s.box(1.4, y, 0, 1.44, y + 0.2, 0.34, PAL['white'], 'plaster', deco_x=[('band', 0.35, 0.65, PAL['red'])])
    # Barut mahzeni (sol arka): koruma duvarı içinde.
    s.box(0.2, 0.2, 0, 0.9, 0.26, 0.26, OTTO['stone'], 'stone', deco_y=[('courses', 0.08)])
    s.box(0.2, 0.26, 0, 0.26, 0.9, 0.26, OTTO['stone'], 'stone', deco_x=[('courses', 0.08)])
    s.box(0.35, 0.35, 0, 0.82, 0.82, 0.4, OTTO['stone'], 'stone', deco_y=[('courses', 0.1), ('door', 0.5, 0, 0.14, 0.24)], deco_x=[('courses', 0.1)])
    s.hip(0.35, 0.35, 0.82, 0.82, 0.4, 0.3, PAL['lead'], over=0.04, mat='lead')
    s.sphere(0.585, 0.585, 0.72, 0.02, PAL['gold'])
    # Deneme topları (sete dönük).
    for i in range(1 + st):
        x, y = 0.45 + (i % 2) * 0.1, 1.05 + i * 0.25
        s.add(_log(x, y, 0.1, 0.34, 0.045, 'x'))
        s.prims[-1].faces = [Face(f.pts, hexc('#5b5550'), 'flat', None, False, f.normal) for f in s.prims[-1].faces]
        s.cylinder(x + 0.06, y - 0.07, 0, 0.1, 0.05, PAL['wood2'], 'wood', n=10)
        s.cylinder(x + 0.06, y + 0.07, 0, 0.1, 0.05, PAL['wood2'], 'wood', n=10)
    for (x, y, r) in ((1.25, 0.6, 0.07), (1.32, 0.95, 0.05)):  # barut dumanı
        s.sphere(x, y, 0.35, r, hexc('#e4e0d8'))
    for i in range(4):
        s.sphere(0.95 + (i % 2) * 0.08, 1.7 + (i // 2) * 0.08, 0.035, 0.035, hexc('#3d3a37'))
    if st >= 3:
        s.flag(0.3, 0.3, 0.26, 0.6, PAL['red'])


def simyahane(s, st):
    """Simyahane: sekizgen taş laboratuvar kulesi (sivri külah), yanında yüksek
    ocak bacası; avluda damıtma imbikleri, boru bağlı cam küreler."""
    ground(s, 0.15, 0.15, 1.9, 1.9, hexc('#c9b58c'))
    th = (0.7, 0.85, 1.0)[st - 1]
    tx, ty = 0.7, 0.65
    s.cylinder(tx, ty, 0, th, 0.34, OTTO['stone'], 'stone', n=8)
    s.cylinder(tx, ty, th, th + 0.04, 0.37, PAL['stone2'], 'stone', n=8)
    s.cone(tx, ty, th + 0.04, 0.45, 0.38, PAL['lead'], 'lead', n=8)
    s.sphere(tx, ty, th + 0.52, 0.02, PAL['gold'])
    for a in (0.3, 0.9, 1.5):
        px, py = tx + 0.33 * math.cos(a), ty + 0.33 * math.sin(a)
        s.box(px - 0.035, py - 0.035, th * 0.45, px + 0.035, py + 0.035, th * 0.45 + 0.14, PAL['window'], 'flat', outline=False)
    s.box(1.12, 0.3, 0, 1.28, 0.46, 1.1 + 0.1 * st, PAL['stonedark'], 'stone', deco_y=[('courses', 0.12)], deco_x=[('courses', 0.12)])
    s.sphere(1.2, 0.38, 1.25 + 0.1 * st, 0.07, hexc('#b7d7a8'))  # yeşil buhar
    # Atanor (ocak) ve imbikler.
    s.dome(1.45, 1.05, 0, 0.2, BRICK, 'stone', hscale=1.0, finial=False)
    s.sphere(1.58, 1.18, 0.07, 0.045, hexc('#ffb347'))
    flasks = [(1.0, 1.35), (1.25, 1.5), (1.55, 1.55), (0.75, 1.4), (1.7, 1.3)][:2 + st]
    for (x, y) in flasks:
        s.cylinder(x, y, 0, 0.12, 0.04, PAL['wood2'], 'wood', n=8)
        s.sphere(x, y, 0.2, 0.07, hexc('#7fcf9a') if (x + y) % 0.5 > 0.25 else hexc('#c7a0e0'))
        s.box(x - 0.008, y - 0.008, 0.26, x + 0.008, y + 0.008, 0.4, hexc('#cfe8e0'), 'flat', outline=False)
    if st >= 2:
        block(s, 1.35, 0.3, 1.82, 0.75, 0.4, col=OTTO['stone'], mat='stone', wins=False, roof='flat', door_x=0.5)
        s.dome(1.585, 0.525, 0.44, 0.16, PAL['lead'], 'lead', hscale=0.8, finial=False)
    s.tree(0.3, 1.7, 0.8, 'cypress')


def kara_pazar(s, st):
    """Kara pazar: harap koyu taş han (kemerli dehlizler, mazgallı dam),
    gölgeli kanvas çadırlar, fenerler ve kaçak mal sandıkları."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#a89878'))
    pave(s, 0.25, 0.25, 1.85, 1.85, hexc('#8f8168'), n=7)
    dark = hexc('#7d7060')
    hx0, hy0, hx1, hy1 = 0.22, 0.22, 1.2, 0.72
    s.box(hx0, hy0, 0, hx1, hy1, 0.55, dark, 'stone', deco_y=[('courses', 0.1)] + [('archdoor', u, 0, 0.16, 0.3) for u in (0.2, 0.5, 0.8)],
          deco_x=[('courses', 0.1), ('archdoor', 0.5, 0, 0.16, 0.3)])
    crenel(s, hx0, hy0, hx1, hy1, 0.55, dark, step=0.12, size=0.06, h=0.07)
    if st >= 2:  # gözcü kulesi
        s.box(1.2, 0.22, 0, 1.45, 0.47, 0.95, dark, 'stone', deco_y=[('courses', 0.1), ('win', 0.5, 0.6, 0.06, 0.12, None)], deco_x=[('courses', 0.1)])
        s.hip(1.2, 0.22, 1.45, 0.47, 0.95, 0.18, PAL['wooddark'], over=0.05, mat='wood')
        lantern(s, 1.33, 0.49, 0.8)
    cols = [hexc('#4b2a3a'), hexc('#2f3f4f'), hexc('#3d2c20'), hexc('#2c3a2a')]
    tents = [(0.3, 0.95), (0.9, 1.0), (0.35, 1.45), (1.35, 0.85), (1.0, 1.5)][:2 + st]
    for i, (tx, ty) in enumerate(tents):
        for (px, py) in ((tx, ty), (tx + 0.4, ty), (tx, ty + 0.32), (tx + 0.4, ty + 0.32)):
            s.cylinder(px, py, 0, 0.28, 0.012, PAL['wooddark'], 'flat', n=6)
        s.gable(tx, ty, tx + 0.4, ty + 0.32, 0.28, 0.13, cols[i % len(cols)], axis='x', mat='canvas', wall=cols[i % len(cols)], wallmat='canvas', over=0.03)
        s.crate(tx + 0.06, ty + 0.08, 0.11); s.barrel(tx + 0.3, ty + 0.2, 0.045)
    for (x, y) in ((0.3, 0.8), (1.25, 1.35), (1.7, 1.7)):
        s.box(x - 0.008, y - 0.008, 0, x + 0.008, y + 0.008, 0.5, PAL['wooddark'], 'flat', outline=False)
        lantern(s, x, y, 0.52)
    for i in range(3):
        s.crate(1.55 + (i % 2) * 0.15, 1.2 + (i // 2) * 0.16, 0.12)



def tekke(s, st):
    """Ahi Tekkesi: sekizgen semahane, üstünde yeşil yivli külah; yanında kubbeli
    derviş hücreleri ve ocak bacaları; avluda şadırvan, serviler, lonca sancağı."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#d2bb8c'))
    pave(s, 0.25, 1.1, 1.85, 1.85, PAL['marble'], n=6)
    green = hexc('#3f8a5a')
    cx, cy = 0.75, 0.72
    h = (0.5, 0.58, 0.66)[st - 1]
    r = 0.34
    s.cylinder(cx, cy, 0, h, r, OTTO['white'], 'plaster', n=8,
               deco=[('arch', u, 0.12, 0.07, 0.16) for u in (0.2, 0.5, 0.8)])
    s.cylinder(cx, cy, h, h + 0.05, r * 1.1, PAL['stone2'], 'stone', n=8)
    s.cone(cx, cy, h + 0.05, (0.5, 0.6, 0.72)[st - 1], r * 1.08, green, 'lead', n=16)
    s.sphere(cx, cy, h + 0.12 + (0.5, 0.6, 0.72)[st - 1], 0.022, PAL['gold'])
    # Derviş hücreleri: kubbe sıralı alçak kanat (ikinci aşamadan uzar).
    n = (2, 3, 4)[st - 1]
    x0, x1 = 1.18, min(1.85, 1.18 + 0.2 * n)
    s.box(x0, 0.3, 0, x1, 0.7, 0.36, OTTO['stone'], 'stone', deco_y=[('courses', 0.09)] + [('archdoor', (i + 0.5) / n, 0, 0.1, 0.2) for i in range(n)],
          deco_x=[('courses', 0.09)])
    s.box(x0 - 0.02, 0.28, 0.36, x1 + 0.02, 0.72, 0.39, PAL['lead'], 'lead')
    dome_row(s, x0, x1, 0.5, 0.39, n, 0.08)
    for i in range(n):
        x = x0 + (x1 - x0) * (i + 0.5) / n
        s.box(x - 0.02, 0.32, 0.36, x + 0.02, 0.36, 0.52, PAL['stonedark'], 'stone', outline=False)
    if st >= 3:  # matbah (aşevi): kiremit çatılı konak
        konak(s, 1.35, 0.85, 1.82, 1.25, 1, OTTO['ochre'], cumba=False)
    # Şadırvan: sekiz direkli, kurşun külahlı.
    fx, fy = 1.05, 1.45
    s.cylinder(fx, fy, 0, 0.08, 0.16, PAL['marble'], 'marble', top=PAL['water'], n=8)
    for k in range(8):
        a = 2 * math.pi * k / 8
        s.cylinder(fx + 0.15 * math.cos(a), fy + 0.15 * math.sin(a), 0.08, 0.3, 0.012, PAL['wood2'], 'wood', n=6)
    s.cone(fx, fy, 0.3, 0.14, 0.2, PAL['lead'], 'lead', n=8)
    s.flag(0.35, 1.3, 0, 0.8, green)
    s.tree(0.3, 1.75, 0.95, 'cypress'); s.tree(1.75, 1.7, 0.95, 'cypress'); s.tree(1.6, 1.35, 0.8)


def mabet(s, st):
    """Ongun Mabedi: açık hava mabedi. Taş çember ve balbal taşları, ortada
    oymalı ongun direği (tepesinde kartal), kutsal ateş; keçe otağ, tuğlar ve
    bez bağlanmış dilek ağacı. Son aşamada kurgan ve ikinci otağ."""
    ground(s, 0.1, 0.1, 1.92, 1.92, hexc('#bdb07a'))
    cx, cy = 0.95, 0.95
    s.flat([(cx + 0.62 * math.cos(a), cy + 0.62 * math.sin(a) * 1.0, 0.004) for a in [i * math.pi / 16 for i in range(32)]], hexc('#cdbf8e'), 'ground', key=-55)
    # Balbal taşları: çember boyunca dikili taşlar.
    n = (8, 10, 12)[st - 1]
    for k in range(n):
        a = 2 * math.pi * k / n + 0.2
        x, y = cx + 0.58 * math.cos(a), cy + 0.58 * math.sin(a)
        h = 0.2 + 0.06 * ((k * 7) % 3)
        s.box(x - 0.035, y - 0.03, 0, x + 0.035, y + 0.03, h, hexc('#a8a294'), 'stone')
        s.sphere(x, y, h + 0.02, 0.03, hexc('#a8a294'), 'stone')
    # Ongun direği: oymalı, renkli halkalar, tepede kartal.
    oh = (0.9, 1.1, 1.25)[st - 1]
    s.cylinder(cx, cy, 0, oh, 0.045, PAL['wood'], 'wood', n=10)
    for i, col in enumerate([PAL['red'], hexc('#2f7a92'), PAL['gold'], PAL['red']][:2 + st]):
        z = 0.25 + i * (oh - 0.35) / (2 + st)
        s.cylinder(cx, cy, z, z + 0.06, 0.055, col, 'wood', n=10)
    s.sphere(cx, cy, oh + 0.04, 0.05, hexc('#5a3a22'))
    for sx in (-1, 1):  # kartal kanatları
        s.add(Prim([Face([(cx, cy, oh + 0.05), (cx + sx * 0.2, cy - sx * 0.2, oh + 0.14), (cx + sx * 0.16, cy - sx * 0.16, oh + 0.02)], hexc('#6a4a2a'), 'wood', None, False, (0.3, 0.3, 1))], cull=False))
    # Kutsal ateş: taş ocak, alev.
    fx, fy = cx + 0.28, cy + 0.2
    s.cylinder(fx, fy, 0, 0.07, 0.1, hexc('#8a8478'), 'stone', n=10, top=hexc('#3a2a1c'))
    s.cone(fx, fy, 0.07, 0.2, 0.07, hexc('#f2a53a'), 'flat', n=8)
    s.cone(fx, fy, 0.07, 0.12, 0.045, hexc('#ffe08a'), 'flat', n=8)
    # Keçe otağ (yurt).
    def otag(x, y, r):
        s.cylinder(x, y, 0, 0.26, r, hexc('#efe6d2'), 'canvas', n=16, deco=[('band', 0.55, 0.68, PAL['red'])])
        s.cone(x, y, 0.26, 0.2, r * 1.05, hexc('#d9cdb0'), 'canvas', n=16)
        s.sphere(x, y, 0.47, 0.025, PAL['red'])
    if st >= 2:
        otag(0.35, 0.4, 0.2)
    if st >= 3:
        otag(1.6, 0.35, 0.17)
        s.blob(1.6, 1.6, 0.0, 0.3, hexc('#8f9a52'), 'leaf', squash=0.5)  # kurgan
        s.box(1.58, 1.58, 0.14, 1.64, 1.64, 0.45, hexc('#a8a294'), 'stone')
    # Tuğlar: direk + at kılı püskül.
    for (x, y) in ((0.3, 1.3), (1.55, 0.95))[:1 + (st >= 2)]:
        s.cylinder(x, y, 0, 0.75, 0.012, PAL['wooddark'], 'flat', n=6)
        s.sphere(x, y, 0.78, 0.022, PAL['gold'])
        s.cone(x, y, 0.55, 0.2, 0.05, hexc('#f4efe4'), 'flat', n=10)
    # Dilek ağacı: bez bağlı dallar.
    s.tree(0.45, 1.65, 1.0)
    for k, col in enumerate([PAL['red'], hexc('#2f7a92'), PAL['gold'], hexc('#f4efe4'), PAL['green']]):
        s.box(0.35 + (k % 3) * 0.08, 1.58 + (k // 3) * 0.1, 0.34 + (k % 2) * 0.06, 0.37 + (k % 3) * 0.08, 1.6 + (k // 3) * 0.1, 0.44 + (k % 2) * 0.06, col, 'canvas', outline=False)

BUILDINGS = {
    'divan': divan, 'saray': saray, 'elcilik': elcilik, 'konut': konut, 'hamam': hamam, 'carsi': carsi,
    'ambar': ambar, 'kereste': kereste, 'tas': tas, 'medrese': medrese, 'kisla': kisla, 'liman': liman,
    'tersane': tersane, 'kahvehane': kahvehane, 'cami': cami, 'muze': muze, 'marangoz': marangoz,
    'mimar': mimar, 'ormanci': ormanci, 'tasci': tasci, 'tophane': tophane, 'surlar': surlar,
    'bagci': bagci, 'simyahane': simyahane, 'camci': camci, 'mahzen': mahzen, 'gozlukcu': gozlukcu,
    'barutane': barutane, 'depo': depo, 'ticaret_merkezi': ticaret_merkezi, 'harita_arsivi': harita_arsivi,
    'valilik': valilik, 'korsan_kalesi': korsan_kalesi, 'kara_pazar': kara_pazar,
    'siginak': siginak, 'tekke': tekke, 'mabet': mabet,
}
# Aşamasız yardımcı katmanlar: (fonksiyon, gölge var mı)
EXTRAS = {'site': (site, True), 'scaffold': (scaffold, False),
          'mine-uzum': (mine_uzum, True), 'mine-mermer': (mine_mermer, True),
          'mine-kristal': (mine_kristal, True), 'mine-kukurt': (mine_kukurt, True),
          'npc-koy': (npc_koy, True), 'pazar': (pazar, True), 'npc-korsan': (npc_korsan, True), 'npc-kale': (npc_kale, True)}


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
