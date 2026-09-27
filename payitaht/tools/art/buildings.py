"""
PAYİTAHT BİNA SANATI — bütün binalar, her biri 3 SEVİYE AŞAMASINDA.

    python3 tools/art/buildings.py            # hepsi
    python3 tools/art/buildings.py divan cami # yalnızca verilenler

Ikariam'daki gibi bina büyüdükçe görünüşü değişir; ana mimari aileler artık bilinçli olarak farklı siluet kullanır:
  aşama 1 = seviye 1-3, aşama 2 = seviye 4-7, aşama 3 = seviye 8+.

Çıktı: public/images/game/buildings/<id>-<aşama>.webp (600 px genişlik,
2x2 footprint elması 480 px, tuvalin alt kenarı = elmasın alt köşesi).
Her bina isokit parçalarından kurulur; deterministiktir (sabit tohum).
"""
import math
import json
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
    """KERHANE / HIZAR İŞLİĞİ: kapalı ev değil; yüksek açık sundurma, uzun
    tomruk sahası, testere hattı ve aşamayla büyüyen kurutma hangarı."""
    ground(s, 0.10, 0.10, 1.92, 1.92, hexc('#bca671'))

    # Uzun ana sundurma: cepheyi kapatmadan direk-çatı silueti verir.
    x0, y0, x1, y1 = 0.18, 0.20, 1.36, 0.82
    for x in (x0, 0.58, 0.98, x1):
        for y in (y0, y1):
            s.box(x - 0.025, y - 0.025, 0, x + 0.025, y + 0.025, 0.52, PAL['wood2'], 'wood')
    s.gable(x0 - 0.05, y0 - 0.05, x1 + 0.05, y1 + 0.05, 0.52, 0.34,
            PAL['roof2'], axis='x', mat='roof', wall=PAL['wood'], wallmat='wood', over=0.09)

    # Hızar tezgâhı ve uzun kereste istifi.
    s.box(0.42, 0.47, 0, 1.08, 0.57, 0.18, PAL['wood2'], 'wood')
    s.box(0.53, 0.42, 0.18, 0.57, 0.62, 0.40, PAL['iron'], 'flat')
    logs(s, 0.24, 1.02, 4 + st, 'x', 0.72)
    logs(s, 0.34, 1.28, 3 + st, 'x', 0.58)

    if st >= 2:
        # Ayrı kurutma hangarı: ana binaya yapışmaz, açık endüstriyel avlu hissi verir.
        sx0, sy0, sx1, sy1 = 1.48, 0.30, 1.84, 1.06
        for x in (sx0, sx1):
            for y in (sy0, sy1):
                s.box(x - 0.022, y - 0.022, 0, x + 0.022, y + 0.022, 0.42, PAL['wood2'], 'wood')
        s.gable(sx0 - 0.03, sy0 - 0.03, sx1 + 0.03, sy1 + 0.03, 0.42, 0.18,
                PAL['roof'], axis='y', mat='roof', wall=PAL['wood'], wallmat='wood', over=0.07)
        for k in range(3):
            s.box(1.51, 0.42 + k * 0.18, 0.08 + k * 0.04, 1.81, 0.46 + k * 0.18, 0.12 + k * 0.04, PAL['wood'], 'wood')

    if st >= 3:
        # Portal vinç + araba rampası; sahnenin en yüksek öğesi çatı değil ekipman.
        crane(s, 1.22, 1.48, 0.92, 0.48, axis='x')
        s.box(0.86, 1.60, 0, 1.58, 1.72, 0.08, PAL['wood2'], 'wood', deco_top=[('vplanks', 7)])

    s.tree(0.18, 1.74, 0.82)
    s.tree(1.82, 1.70, 0.78, 'pine')


def tas(s, st):
    """TAŞ OCAĞI: bina yerine teraslı açık ocak. Basamaklı kesim yüzeyi,
    derrick vinç ve ön tarafta işlenmiş blok sahası."""
    ground(s, 0.08, 0.08, 1.94, 1.94, hexc('#c4b48f'))
    rock = hexc('#aaa08d')

    # Arka köşede üç kademeli ocak yüzeyi; sahnedeki ana siluet doğal kaya.
    s.blob(0.38, 0.34, 0.13, 0.46 + st * 0.025, rock, 'stone', squash=0.95)
    s.blob(0.82, 0.30, 0.10, 0.38 + st * 0.02, hexc('#b8ad99'), 'stone', squash=0.92)
    s.box(0.18, 0.56, 0, 1.16, 0.88, 0.20, hexc('#c9bda5'), 'stone',
          deco_y=[('courses', 0.07)], deco_x=[('courses', 0.07)])
    s.box(0.28, 0.88, 0, 1.08, 1.08, 0.12, hexc('#d2c6ae'), 'stone',
          deco_y=[('courses', 0.06)], deco_x=[('courses', 0.06)])

    # Kesim hattı: büyük bloklar öne doğru küçülür.
    stone_blocks(s, 1.20, 0.52, 2 + st, 0.15, seed=14)
    stone_blocks(s, 1.00, 1.16, 2 + st, 0.13, seed=19)
    stone_blocks(s, 0.38, 1.40, 1 + st, 0.11, seed=23)

    # Derrick/portal vinç ocağın imzası.
    crane(s, 1.34, 0.82, 1.08 + 0.12 * st, 0.50, axis='y')

    if st >= 2:
        # Ustabaşı kulübesi çok küçük tutulur; 'ev' gibi görünmez.
        s.box(1.52, 0.18, 0, 1.84, 0.54, 0.32, PAL['wood'], 'wood',
              deco_y=[('vplanks', 4), ('door', 0.5, 0, 0.13, 0.23)],
              deco_x=[('vplanks', 4)])
        s.gable(1.49, 0.15, 1.87, 0.57, 0.32, 0.16, PAL['roof2'], axis='y',
                wall=PAL['wood'], wallmat='wood', over=0.06)

    if st >= 3:
        # Blok taşıma kızağı.
        s.box(1.02, 1.56, 0, 1.80, 1.72, 0.07, PAL['wood2'], 'wood', deco_top=[('vplanks', 7)])
        stone_blocks(s, 1.18, 1.48, 3, 0.12, seed=31)


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
    """TERSANE-İ ÂMİRE: su rengi asset'e bake edilmez. Kara tarafında uzun
    gemi gözleri ve atölyeler, deniz tarafında şeffaf zeminin üstüne uzanan
    kızaklar, kazıklar ve gemi inşa iskeleti bulunur; alttan gerçek runtime
    denizi görünür."""
    stone = hexc('#c8b897')
    cap = hexc('#dfcfac')
    wood = PAL['wood2']

    # Kara-kıyı sınırı: tam dikdörtgen platform yerine dar ve parçalı taş rıhtım.
    # +x deniz yönü açık bırakılır; böylece sprite'ın altında gerçek deniz görünür.
    s.box(0.06, 0.08, 0, 0.34, 1.90, 0.10, stone, 'stone',
          deco_x=[('courses', 0.06)], deco_y=[('courses', 0.06)], top=cap)
    s.box(0.34, 0.08, 0, 1.18, 0.28, 0.10, stone, 'stone',
          deco_y=[('courses', 0.06)], deco_x=[('courses', 0.06)], top=cap)

    # Gemi gözleri: kara tarafında uzun, alçak ve denize açık. Ön uçları suya
    # basmıyor; yalnız duvar/çatı/iskelet var, aradaki boşluk şeffaf.
    n = 2 + (st >= 2)
    bay = 0.44
    for i in range(n):
        y0 = 0.16 + i * 0.49
        y1 = y0 + bay
        # Arka duvar ve yan taşıyıcılar.
        s.box(0.14, y0, 0.10, 0.24, y1, 0.48, stone, 'stone',
              deco_x=[('courses', 0.07)])
        s.box(0.24, y0, 0.10, 1.08, y0 + 0.07, 0.48, stone, 'stone',
              deco_y=[('courses', 0.07)])
        s.box(0.24, y1 - 0.07, 0.10, 1.08, y1, 0.48, stone, 'stone',
              deco_y=[('courses', 0.07)])
        # Büyük beşik çatı denize doğru uzanır; altı açık kalır.
        s.gable(0.12, y0 - 0.025, 1.10, y1 + 0.025, 0.48, 0.24,
                PAL['lead'], axis='x', mat='lead', wall=stone, wallmat='stone', over=0.05)

        # İki ahşap kızak rayı: kıyıdan şeffaf deniz bölgesine kadar uzanır.
        ym = (y0 + y1) / 2
        for off in (-0.085, 0.085):
            s.box(0.38, ym + off - 0.013, 0.035,
                  1.88, ym + off + 0.013, 0.075,
                  PAL['wooddark'], 'wood', outline=False)
        # Ray altı yatay traversler, su üstünde ince bir ritim verir.
        for k in range(7):
            x = 0.44 + k * 0.21
            s.box(x, ym - 0.13, 0.025, x + 0.035, ym + 0.13, 0.055,
                  wood, 'wood', outline=False)

    # Orta kızakta yapım halindeki kadırga.
    ym = 0.16 + (n // 2) * 0.49 + bay / 2
    if st == 1:
        # Sadece omurga + kaburgalar: suyla karışan büyük opak gövde yok.
        s.box(0.72, ym - 0.016, 0.09, 1.70, ym + 0.016, 0.15, PAL['wooddark'], 'wood')
        for i in range(7):
            x = 0.78 + i * 0.13
            rib = 0.16 + 0.075 * math.sin(i / 6 * math.pi)
            s.box(x, ym - rib, 0.08, x + 0.020, ym - rib + 0.025, 0.08 + rib * 1.15, PAL['wood'], 'wood')
            s.box(x, ym + rib - 0.025, 0.08, x + 0.020, ym + rib, 0.08 + rib * 1.15, PAL['wood'], 'wood')
    else:
        ship(s, 1.26, ym, 0.68, 0.22, z=0.07, masts=1, rig='lateen', sails=False)

    # Denize oturan ahşap servis iskelesi. İskelenin altı şeffaf; yalnız kazık,
    # tabla ve babalar çizilir.
    pier_y = 1.66
    for x in (0.48, 0.72, 0.96, 1.20, 1.44, 1.68):
        s.cylinder(x, pier_y - 0.10, 0, 0.16, 0.025, PAL['wooddark'], 'wood', n=8)
        s.cylinder(x, pier_y + 0.10, 0, 0.16, 0.025, PAL['wooddark'], 'wood', n=8)
    s.box(0.42, pier_y - 0.14, 0.13, 1.76, pier_y + 0.14, 0.18,
          wood, 'wood', deco_top=[('vplanks', 10)])

    # Vinç ve malzeme kara/rıhtım tarafında kalır.
    crane(s, 0.78, 1.44, 0.88 + 0.12 * st, 0.36, axis='x')
    logs(s, 0.16, 1.56, 3 + st, 'x', 0.42)
    for i in range(2 + st):
        s.crate(0.18 + (i % 2) * 0.16, 1.74 + (i // 2) * 0.12, 0.09, z=0.10)

    if st >= 2:
        # Küçük servis teknesi gerçek deniz üstünde okunur.
        ship(s, 1.56, 0.28, 0.46, 0.14, z=0.035, masts=1, rig='lateen', stern=False)
    if st >= 3:
        crane(s, 0.40, 0.42, 1.00, 0.40, axis='x')
        cannonballs(s, 0.24, 1.36, z=0.10)

    # Tersane emini odası: kara köşesinde küçük; suyun üstüne taşmaz.
    s.box(0.10, 1.54, 0.10, 0.44, 1.88, 0.42, PAL['plaster'], 'plaster',
          deco_y=[('win', 0.5, 0.09, 0.09, 0.15, 'shutter')],
          deco_x=[('archdoor', 0.5, 0.0, 0.12, 0.22)])
    s.hip(0.08, 1.52, 0.46, 1.90, 0.42, 0.13, PAL['roof2'], over=0.05)
    s.flag(0.24, 1.62, 0.46, 0.42)


def karagoz(s, st):
    """KARAGÖZ PERDESİ: kahve ocağının önünde ışıklı gölge oyunu perdesi,
    ahşap sahne kulübesi, seyirci sedirleri, fenerler; büyüdükçe çizgili
    gölgelik ve kubbeli kahvehane."""
    ground(s, 0.08, 0.08, 1.92, 1.92, hexc('#cdb484'))
    pave(s, 0.25, 0.9, 1.85, 1.85, n=6)
    # Sahne kulübesi: arkası kapalı ahşap oda, önünde (+y) perde.
    s.box(0.25, 0.3, 0, 1.2, 0.85, 0.62, PAL['wood'], 'wood', deco_y=[('karagoz',)],
          deco_x=[('planks', 5), ('archdoor', 0.5, 0.0, 0.14, 0.26)])
    s.box(0.2, 0.25, 0.62, 1.25, 0.9, 0.68, PAL['wood2'], 'wood')
    s.hip(0.2, 0.25, 1.25, 0.9, 0.68, 0.22, PAL['roof'])
    # Perdenin iki yanında sarkan kırmızı perde kanatları.
    for x in (0.22, 1.18):
        s.box(x, 0.85, 0.06, x + 0.05, 0.9, 0.62, PAL['red'], 'canvas')
    # Seyirci sedirleri.
    for row in range(1 + (st >= 2)):
        y = 1.2 + row * 0.3
        s.box(0.35, y, 0, 1.1, y + 0.12, 0.12, PAL['wood2'], 'wood', deco_top=[('planks', 3)])
    # Fenerler.
    for x in (0.18, 1.3):
        s.cylinder(x, 0.95, 0, 0.55, 0.015, PAL['wooddark'], 'flat', n=6)
        s.sphere(x, 0.95, 0.6, 0.045, hexc('#f5c85a'))
    if st >= 2:
        # Seyircinin üstünde kandil dizisi (perdeyi örtmez).
        for (x0, y0, x1, y1) in ((0.18, 0.95, 0.3, 1.85), (1.3, 0.95, 1.2, 1.85)):
            s.cylinder(x1, y1, 0, 0.55, 0.015, PAL['wooddark'], 'flat', n=6)
        cols = [PAL['red'], hexc('#f5c85a'), hexc('#2f7a92'), PAL['green']]
        for i in range(7):
            t = (i + 1) / 8
            for (x0, y0, x1, y1) in ((0.18, 0.95, 0.3, 1.85), (1.3, 0.95, 1.2, 1.85)):
                s.sphere(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0.55 - 0.08 * math.sin(t * math.pi), 0.022, cols[i % 4])
        # Kahve ocağının önünde çizgili tente.
        awning(s, 1.35, 1.75, 1.55, 0.34, 0.22, PAL['red'])
        s.box(1.35, 1.2, 0, 1.75, 1.55, 0.36, PAL['plaster'], 'plaster', deco_y=[('arch', 0.5, 0.05, 0.14, 0.2)], deco_x=[('win', 0.5, 0.12, 0.1, 0.14, 'shutter')])
        s.hip(1.35, 1.2, 1.75, 1.55, 0.36, 0.14, PAL['roof2'])
        s.cylinder(1.55, 1.38, 0.5, 0.62, 0.02, hexc('#7a7a7a'), 'flat', n=6)  # ocak bacası
    if st >= 3:
        domed(s, 0.72, 0.57, 0.9, 0.16)
        s.flag(1.25, 0.3, 0.9, 0.55)
        for i in range(4):
            s.barrel(1.4 + (i % 2) * 0.14, 1.7 + (i // 2) * 0.1, 0.035)
    s.tree(1.75, 0.35, 0.8, kind='cypress')


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
    """KONUT MAHALLESİ: tek 'konak kutusu' yerine dar sokak çevresinde
    birbirinden farklı kütleler, çıkmalar, avlu ve gündelik hayat izleri."""
    ground(s, 0.10, 0.10, 1.92, 1.92, hexc('#d6bf93'))
    # Mahalle omurgası: yapılar düz bir 2x2 blok gibi değil, çapraz bir sokak
    # etrafında okunur. Aynı footprint korunur.
    pave(s, 0.78, 0.15, 1.02, 1.86, hexc('#cdb88c'), n=5)

    # Ana ev her aşamada var; asimetrik ve yüksekliği aşamayla değişir.
    konak(s, 0.18, 0.28, 0.86, 1.02, 2 if st < 3 else 3, OTTO['ochre'],
          cumba=True, roofcol=PAL['roof2'], door=0.68)
    # Mutfağı/ahırı ana kütleden düşük tut: silueti tek bloktan çıkarır.
    s.box(0.12, 1.04, 0, 0.62, 1.46, 0.30, OTTO['stone'], 'stone',
          deco_y=[('courses', 0.08), ('archdoor', 0.45, 0, 0.15, 0.22)],
          deco_x=[('courses', 0.08)])
    s.gable(0.10, 1.02, 0.64, 1.48, 0.30, 0.16, PAL['roof'], axis='y',
            wall=OTTO['stone'], wallmat='stone', over=0.06)

    if st >= 2:
        # İkinci hane sokağın diğer tarafında, daha küçük ve ters oranlı.
        konak(s, 1.16, 0.22, 1.78, 0.82, 2, OTTO['pink'], cumba=False,
              roofcol=PAL['roof'], door=0.32)
        # Sokak kuyusu + taş avlu.
        s.cylinder(1.28, 1.18, 0, 0.11, 0.12, PAL['stone2'], 'stone', n=14, top=PAL['water'])
        s.cylinder(1.28, 1.18, 0.11, 0.28, 0.018, PAL['wood2'], 'wood', n=6)

    if st >= 3:
        # Üçüncü küçük ev sokağın sonunda; mavi sıva/ahşap çatı mahalle ritmini kırar.
        konak(s, 1.18, 1.18, 1.78, 1.70, 2, OTTO['blue'], cumba=True,
              roofcol=PAL['roof2'], door=0.6)
        # Çamaşır/asma avlusu.
        for x in (0.88, 1.08):
            s.box(x - 0.012, 1.48, 0, x + 0.012, 1.50, 0.42, PAL['wood2'], 'wood', outline=False)
        s.box(0.88, 1.485, 0.37, 1.08, 1.495, 0.39, PAL['wood2'], 'wood', outline=False)

    s.barrel(0.66, 1.58, 0.05)
    s.tree(0.30, 1.72, 0.88 if st < 3 else 0.98)
    if st >= 2:
        s.tree(1.75, 1.02, 0.72, 'cypress')


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
    """HAMAM KÜMESİ: yüksek konak yerine yere yayılan sıcaklık-soğukluk
    hücreleri; bir büyük ve birkaç küçük fil gözlü kubbe, belirgin külhan bacası."""
    ground(s, 0.10, 0.10, 1.92, 1.92, hexc('#d1bd96'))

    def cell(x0, y0, x1, y1, h, r, door=False):
        s.box(x0, y0, 0, x1, y1, h, PAL['stone'], 'stone',
              deco_y=[('courses', 0.08)] + ([('archdoor', 0.5, 0, 0.16, 0.25)] if door else []),
              deco_x=[('courses', 0.08)])
        s.box(x0 - 0.02, y0 - 0.02, h, x1 + 0.02, y1 + 0.02, h + 0.04, PAL['stone2'], 'stone')
        s.dome((x0 + x1) / 2, (y0 + y1) / 2, h + 0.04, r, PAL['lead'], 'lead', hscale=0.72, finial=False)
        fil_gozu(s, (x0 + x1) / 2, (y0 + y1) / 2, h + 0.04, r, hscale=0.72)

    # Sıcaklık: ana kütle daima yatay ve alçak.
    cell(0.28, 0.28, 1.22, 1.18, 0.46 + 0.04 * st, 0.36 + 0.015 * st, door=True)

    if st >= 2:
        cell(1.22, 0.42, 1.72, 0.98, 0.38, 0.16)
        # Soyunmalık/soğukluk: kırma çatılı, kubbe kümesinden bilinçli farklı.
        s.box(0.42, 1.20, 0, 1.28, 1.72, 0.36, OTTO['white'], 'plaster',
              deco_y=[('archdoor', 0.5, 0, 0.14, 0.24), ('win', 0.22, 0.10, 0.08, 0.13, 'shutter'), ('win', 0.78, 0.10, 0.08, 0.13, 'shutter')],
              deco_x=[('win', 0.5, 0.10, 0.08, 0.13, 'shutter')])
        s.hip(0.40, 1.18, 1.30, 1.74, 0.36, 0.16, PAL['roof'], over=0.09)

    if st >= 3:
        cell(1.22, 1.02, 1.68, 1.42, 0.34, 0.13)
        # Küçük su haznesi/şadırvan.
        s.cylinder(1.52, 1.64, 0, 0.08, 0.13, PAL['marble'], 'marble', n=14, top=PAL['water'])

    # Külhan bacası: hamamın ayırt edici dikey elemanı.
    ch = 0.88 + 0.12 * st
    s.box(0.16, 0.18, 0, 0.32, 0.34, ch, PAL['stonedark'], 'stone',
          deco_y=[('courses', 0.08)], deco_x=[('courses', 0.08)])
    s.cone(0.24, 0.26, ch, 0.14, 0.10, PAL['lead'], 'lead', n=8)
    s.tree(1.78, 1.62, 0.72, 'cypress')


def carsi(s, st):
    """KAPALIÇARŞI / BEDESTEN: ortada ağır taş çekirdek, etrafında daha
    alçak ve renkli arasta kolları. Kubbe ritmi yalnızca merkezde kalır."""
    ground(s, 0.08, 0.08, 1.94, 1.94, hexc('#d7c096'))
    pave(s, 0.16, 0.18, 1.86, 1.88, hexc('#d2bf96'), n=8)

    # Bedesten çekirdeği: kompakt, ağır ve yüksek.
    bx0, by0, bx1, by1 = 0.28, 0.22, 1.28, 1.02
    s.box(bx0, by0, 0, bx1, by1, 0.56, OTTO['stone'], 'stone',
          deco_y=[('courses', 0.08), ('archdoor', 0.5, 0, 0.20, 0.34),
                  ('arch', 0.18, 0.12, 0.10, 0.20), ('arch', 0.82, 0.12, 0.10, 0.20)],
          deco_x=[('courses', 0.08), ('arch', 0.32, 0.12, 0.10, 0.20), ('arch', 0.68, 0.12, 0.10, 0.20)])
    # İki ana kubbe; stage 3'te arkaya iki küçük ek kubbe.
    for cx in (0.58, 0.98):
        domed(s, cx, 0.62, 0.60, 0.19, drum=0.05, wall=OTTO['stone'])
    if st >= 3:
        for cx in (0.48, 1.08):
            domed(s, cx, 0.34, 0.60, 0.12, drum=0.04, wall=OTTO['stone'], finial=False)

    # Ön arasta: bağımsız küçük dükkânlar ve tenteler; yatay renkli bant oluşturur.
    cols = [PAL['red'], PAL['blue'], hexc('#d6a93a'), PAL['teal'], PAL['green']]
    n = 3 + st
    for i in range(n):
        x = 0.18 + i * (1.58 / n)
        w = 1.42 / n
        y = 1.20 + (i % 2) * 0.05
        s.box(x, y, 0, x + w, y + 0.34, 0.30, PAL['wood'], 'wood',
              deco_y=[('vplanks', 4), ('archdoor', 0.5, 0, min(0.13, w * 0.42), 0.22)],
              deco_x=[('vplanks', 3)])
        awning(s, x - 0.01, x + w + 0.01, y + 0.34, 0.40, 0.18, cols[i % len(cols)])
        if i % 2 == 0:
            s.crate(x + 0.04, y + 0.38, 0.08)
        else:
            s.barrel(x + w * 0.72, y + 0.41, 0.04)

    if st >= 2:
        # Yan arasta kolu; L-siluet Kapalıçarşı hissini büyütür.
        for j in range(2 + (st == 3)):
            y = 0.28 + j * 0.38
            s.box(1.46, y, 0, 1.80, y + 0.30, 0.28, PAL['wood'], 'wood',
                  deco_x=[('vplanks', 4), ('archdoor', 0.5, 0, 0.13, 0.20)])
            awning(s, y, y + 0.30, 1.80, 0.38, 0.15, cols[(j + 2) % len(cols)], axis='x')



def medrese(s, st):
    """MEDRESE: merkezinde gerçek boş avlu, çevresinde ince kubbeli hücre
    kanatları ve arkada tek büyük dershane. Saray/kışla kutusundan ayrılır."""
    ground(s, 0.08, 0.08, 1.94, 1.94, hexc('#d0bb8e'))
    # Boş avlu özellikle görünür bırakılır.
    pave(s, 0.62, 0.62, 1.42, 1.46, PAL['marble'], n=5)

    # Arka hücre kanadı.
    s.box(0.22, 0.20, 0, 1.44, 0.50, 0.38, PAL['marble'], 'marble',
          deco_y=[('arch', (i + 0.5) / 5, 0.03, 0.10, 0.22) for i in range(5)],
          deco_x=[('courses', 0.08)])
    dome_row(s, 0.22, 1.44, 0.35, 0.42, 5, 0.10)

    # Sol kanat: avluya dönük revak hissi.
    s.box(0.22, 0.50, 0, 0.52, 1.62, 0.38, PAL['marble'], 'marble',
          deco_x=[('arch', (i + 0.5) / 4, 0.03, 0.10, 0.22) for i in range(4)],
          deco_y=[('courses', 0.08)])
    dome_row(s, 0.50, 1.62, 0.37, 0.42, 4, 0.10, axis='y')

    if st >= 2:
        # Sağ kanatla U-plan tamamlanır, avlu açık kalır.
        s.box(1.48, 0.54, 0, 1.78, 1.62, 0.38, PAL['marble'], 'marble',
              deco_x=[('arch', (i + 0.5) / 4, 0.03, 0.10, 0.22) for i in range(4)],
              deco_y=[('courses', 0.08)])
        dome_row(s, 0.54, 1.62, 1.63, 0.42, 4, 0.10, axis='y')

    # Dershane: tek büyük kubbe, diğer hücrelerden belirgin şekilde yüksek.
    s.box(1.28, 0.14, 0, 1.84, 0.58, 0.54, PAL['marble'], 'marble',
          deco_y=[('cini', 0.72, 0.84), ('archdoor', 0.5, 0, 0.16, 0.30)],
          deco_x=[('arch', 0.5, 0.10, 0.10, 0.20)])
    domed(s, 1.56, 0.36, 0.58, 0.22 + 0.02 * st, drum=0.08, wall=PAL['marble'])

    # Şadırvan avlunun görsel merkezi.
    s.cylinder(1.02, 1.02, 0, 0.09, 0.13, PAL['marble'], 'marble', n=14, top=PAL['water'])
    s.cylinder(1.02, 1.02, 0.09, 0.22, 0.018, PAL['marble'], 'marble', n=8)
    if st >= 3:
        minaret(s, 0.28, 1.74, 1.16, r=0.045)
        s.tree(1.20, 1.72, 0.78, 'cypress')
    s.tree(0.70, 1.74, 0.72, 'cypress')


def kisla(s, st):
    """KIŞLA: ağır taş U-plan, açık talim avlusu, merkez kapı kulesi ve
    köşe nöbet kuleleri. Saray gibi süslü değil; yatay ve tahkim edilmiş."""
    ground(s, 0.08, 0.08, 1.94, 1.94, hexc('#c4b08a'))
    pave(s, 0.46, 0.64, 1.56, 1.78, hexc('#bda77f'), n=4)

    stone = hexc('#d0c1a5')
    dark = hexc('#aa9a80')
    h = (0.46, 0.54, 0.62)[st - 1]

    # Arka ana koğuş: uzun ve sert yatay çizgi.
    s.box(0.20, 0.20, 0, 1.76, 0.55, h, stone, 'stone',
          deco_y=[('courses', 0.08)] + [('win', u, 0.16, 0.07, 0.12, None) for u in (0.14, 0.31, 0.69, 0.86)],
          deco_x=[('courses', 0.08)])
    s.gable(0.18, 0.18, 1.78, 0.57, h, 0.18, PAL['lead'], axis='x',
            wall=stone, wallmat='stone', over=0.05)

    # Yan koğuşlar U-planı kurar.
    for x0, x1 in ((0.20, 0.52), (1.44, 1.76)):
        if x0 > 1 and st == 1:
            continue
        s.box(x0, 0.55, 0, x1, 1.48, h - 0.04, stone, 'stone',
              deco_x=[('courses', 0.08)] + [('win', u, 0.14, 0.07, 0.12, None) for u in (0.25, 0.50, 0.75)],
              deco_y=[('courses', 0.08)])
        s.gable(x0 - 0.02, 0.53, x1 + 0.02, 1.50, h - 0.04, 0.15, PAL['lead'],
                axis='y', wall=stone, wallmat='stone', over=0.04)

    # Ön kapı kulesi: avluyu çerçeveleyen sert odak.
    gh = h + 0.18 + 0.06 * st
    s.box(0.80, 1.48, 0, 1.18, 1.80, gh, dark, 'stone',
          deco_y=[('courses', 0.08), ('archdoor', 0.5, 0, 0.22, 0.34)],
          deco_x=[('courses', 0.08)])
    crenel(s, 0.80, 1.48, 1.18, 1.80, gh, dark, step=0.09, size=0.05, h=0.06)

    towers = [(0.22, 0.24), (1.74, 0.24)]
    if st >= 2:
        towers += [(0.26, 1.44)]
    if st >= 3:
        towers += [(1.70, 1.44)]
    for x, y in towers:
        pointed_tower(s, x, y, 0.12, h + 0.22, col=dark, cap=0.26)

    # Talim avlusu: hedef ve silah rafı.
    s.box(0.52, 1.18, 0, 0.58, 1.58, 0.20, PAL['wood'], 'wood')
    for k in range(3 + st):
        x = 1.28 + k * 0.07
        s.box(x, 1.20, 0, x + 0.018, 1.22, 0.34, PAL['wood2'], 'wood')
        s.cone(x + 0.009, 1.21, 0.34, 0.08, 0.026, PAL['iron'], 'flat', n=6)
    s.flag(0.99, 1.58, gh + 0.04, 0.48)



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


# ================================================================
# ART PASS 6 — MİMARİ AİLE AYRIMI
# Bu bölüm eski tarifleri bilerek override eder. Ortak 2x2 footprint,
# kamera, ışık ve malzeme dili korunur; ana siluet bina işlevine göre değişir.
# ================================================================

def _p6_storage(s, st, kind):
    if kind == 'ambar':
        ground(s, 0.08, 0.08, 1.94, 1.94, hexc('#c9b183'))
        h = (0.52, 0.62, 0.72)[st - 1]
        # Uzun zahire ambarı + dışarı taşan yükleme saçağı.
        s.box(0.18, 0.22, 0, 1.42, 0.88, h, OTTO['stone'], 'stone',
              deco_y=[('courses', 0.08), ('archdoor', 0.50, 0, 0.22, 0.34)]
                     + [('win', u, h - 0.22, 0.055, 0.09, None) for u in (0.16, 0.32, 0.68, 0.84)],
              deco_x=[('courses', 0.08), ('win', 0.5, h - 0.22, 0.055, 0.09, None)])
        s.gable(0.16, 0.20, 1.44, 0.90, h, 0.28, PAL['roof'], axis='x',
                wall=OTTO['stone'], wallmat='stone', over=0.08)
        # Tahıl siloları depodan ayıran yuvarlak kütleler.
        if st >= 2:
            for cy in (1.18, 1.55):
                s.cylinder(0.38, cy, 0, 0.46, 0.16, hexc('#c9b994'), 'stone', n=16)
                s.cone(0.38, cy, 0.46, 0.18, 0.17, PAL['roof2'], 'roof', n=16)
        if st >= 3:
            s.box(0.92, 1.12, 0, 1.62, 1.62, 0.42, PAL['wood'], 'wood',
                  deco_y=[('vplanks', 8), ('archdoor', 0.5, 0, 0.18, 0.28)],
                  deco_x=[('vplanks', 6)])
            s.gable(0.90, 1.10, 1.64, 1.64, 0.42, 0.20, PAL['roof2'], axis='x',
                    wall=PAL['wood'], wallmat='wood')
        for i in range(3 + st):
            s.sphere(1.05 + (i % 3) * 0.14, 0.98 + (i // 3) * 0.13, 0.06, 0.06, hexc('#dfcda2'))
        s.tree(1.78, 1.72, 0.76)

    elif kind == 'depo':
        ground(s, 0.08, 0.08, 1.94, 1.94, hexc('#c6b187'))
        # Daha endüstriyel, alçak ve geniş yük deposu.
        h = (0.42, 0.48, 0.56)[st - 1]
        s.box(0.18, 0.24, 0, 1.68, 0.82, h, hexc('#cdbd9d'), 'stone',
              deco_y=[('courses', 0.08), ('archdoor', 0.28, 0, 0.20, 0.32), ('archdoor', 0.72, 0, 0.20, 0.32)],
              deco_x=[('courses', 0.08)])
        s.gable(0.16, 0.22, 1.70, 0.84, h, 0.18, PAL['roof2'], axis='x',
                wall=hexc('#cdbd9d'), wallmat='stone', over=0.06)
        # Yükleme platformu / avlusu.
        s.box(0.22, 0.86, 0, 1.66, 1.08, 0.09, PAL['stone2'], 'stone')
        for i in range(2 + st):
            s.crate(0.32 + (i % 4) * 0.24, 1.12 + (i // 4) * 0.16, 0.12)
            if i % 2:
                s.barrel(0.42 + (i % 3) * 0.27, 1.42, 0.05)
        if st >= 2:
            crane(s, 1.48, 1.26, 0.82 + 0.08 * st, 0.36, axis='y')
        if st >= 3:
            # Küçük ikinci depo kanadı.
            s.box(0.18, 1.42, 0, 0.78, 1.80, 0.34, PAL['wood'], 'wood',
                  deco_y=[('vplanks', 6), ('archdoor', 0.5, 0, 0.16, 0.23)])
            s.gable(0.16, 1.40, 0.80, 1.82, 0.34, 0.16, PAL['roof'], axis='x',
                    wall=PAL['wood'], wallmat='wood')

    elif kind == 'ticaret_merkezi':
        ground(s, 0.06, 0.06, 1.95, 1.95, hexc('#d1bb8d'))
        pave(s, 0.48, 0.58, 1.48, 1.55, PAL['stone'], n=5)
        # Kervansaray U-planı: ortada boş ticaret avlusu.
        h = (0.42, 0.50, 0.56)[st - 1]
        s.box(0.16, 0.16, 0, 1.84, 0.48, h, OTTO['stone'], 'stone',
              deco_y=[('courses', 0.08)] + [('arch', (i + 0.5) / 6, 0.05, 0.10, 0.22) for i in range(6)])
        s.box(0.16, 0.48, 0, 0.48, 1.70, h - 0.05, OTTO['stone'], 'stone',
              deco_x=[('courses', 0.08)] + [('arch', (i + 0.5) / 4, 0.04, 0.10, 0.22) for i in range(4)])
        if st >= 2:
            s.box(1.52, 0.48, 0, 1.84, 1.70, h - 0.05, OTTO['stone'], 'stone',
                  deco_x=[('courses', 0.08)] + [('arch', (i + 0.5) / 4, 0.04, 0.10, 0.22) for i in range(4)])
        # Taç kapı ana odak.
        gh = h + 0.26
        s.box(0.78, 1.62, 0, 1.22, 1.84, gh, hexc('#c8b38c'), 'stone',
              deco_y=[('courses', 0.08), ('archdoor', 0.5, 0, 0.22, 0.42), ('cini', 0.78, 0.88)])
        if st >= 3:
            domed(s, 1.0, 1.72, gh + 0.04, 0.14, drum=0.04, wall=hexc('#c8b38c'))
        s.cylinder(1.0, 1.05, 0, 0.08, 0.13, PAL['marble'], 'marble', n=14, top=PAL['water'])
        for i in range(2 + st):
            s.crate(0.62 + i * 0.18, 1.36, 0.10)

    elif kind == 'kara_pazar':
        ground(s, 0.06, 0.06, 1.95, 1.95, hexc('#a99570'))
        # Bilinçli düzensiz, kapalı/yarı kapalı arasta.
        s.box(0.16, 0.20, 0, 1.28, 0.68, 0.38, hexc('#8c765f'), 'stone',
              deco_y=[('courses', 0.08), ('archdoor', 0.28, 0, 0.17, 0.26), ('archdoor', 0.72, 0, 0.17, 0.26)],
              deco_x=[('courses', 0.08)])
        s.gable(0.14, 0.18, 1.30, 0.70, 0.38, 0.18, hexc('#5f4b3f'), axis='x',
                wall=hexc('#8c765f'), wallmat='stone')
        cols = [hexc('#6d3038'), hexc('#2d4e55'), hexc('#74582f'), hexc('#3e5f42')]
        stalls = 3 + st
        for i in range(stalls):
            x = 0.16 + (i % 3) * 0.50
            y = 0.92 + (i // 3) * 0.48
            s.box(x, y, 0, x + 0.38, y + 0.26, 0.24, PAL['wooddark'], 'wood',
                  deco_y=[('vplanks', 4)])
            awning(s, x - 0.01, x + 0.39, y + 0.26, 0.30, 0.18, cols[i % len(cols)])
            s.crate(x + 0.04, y + 0.31, 0.08)
        if st >= 2:
            # Gizli arka oda / gözetleme kulesi.
            pointed_tower(s, 1.66, 0.42, 0.11, 0.52 + 0.08 * st, col=hexc('#776754'), cap=0.20)
        if st >= 3:
            s.flag(1.62, 0.44, 0.78, 0.42, hexc('#3c282b'))


def _p6_workshop(s, st, kind):
    ground(s, 0.08, 0.08, 1.94, 1.94, hexc('#c6b184'))

    if kind == 'marangoz':
        # Uzun açık marangoz atölyesi + su çarkı.
        h = 0.44 + 0.06 * st
        s.box(0.16, 0.22, 0, 1.34, 0.82, h, PAL['wood'], 'wood',
              deco_y=[('vplanks', 10), ('archdoor', 0.28, 0, 0.18, 0.30), ('win', 0.72, 0.15, 0.11, 0.12, None)],
              deco_x=[('vplanks', 6)])
        s.gable(0.14, 0.20, 1.36, 0.84, h, 0.30, PAL['roof2'], axis='x',
                wall=PAL['wood'], wallmat='wood', over=0.08)
        # Dere şeridi ve çark.
        s.flat([(1.50, 0.08, 0.004), (1.92, 0.08, 0.004), (1.92, 1.92, 0.004), (1.50, 1.92, 0.004)], PAL['water'], 'flat', key=-45)
        water_wheel(s, 1.48, 0.62, 0.36, 0.27 + 0.02 * st)
        logs(s, 0.22, 1.12, 3 + st, 'x', 0.70)
        for i in range(2 + st):
            s.box(0.34 + i * 0.22, 1.52, 0, 0.50 + i * 0.22, 1.60, 0.14, PAL['wood2'], 'wood')
        if st >= 3:
            crane(s, 1.18, 1.40, 0.78, 0.32)

    elif kind == 'mimar':
        # Düzenli çizim/taş model avlusu; marangozdan daha taş ve simetrik.
        pave(s, 0.22, 0.22, 1.78, 1.80, PAL['stone'], n=6)
        s.box(0.18, 0.18, 0, 1.32, 0.66, 0.42, OTTO['white'], 'plaster',
              deco_y=[('arch', 0.22, 0.08, 0.10, 0.18), ('archdoor', 0.5, 0, 0.16, 0.27), ('arch', 0.78, 0.08, 0.10, 0.18)])
        s.hip(0.16, 0.16, 1.34, 0.68, 0.42, 0.16, PAL['lead'], over=0.08, mat='lead')
        # Maket pavyonu / çizim masaları.
        s.box(0.32, 1.18, 0, 0.88, 1.32, 0.16, PAL['wood2'], 'wood')
        s.box(0.98, 1.18, 0, 1.54, 1.32, 0.16, PAL['wood2'], 'wood')
        stone_blocks(s, 1.30, 0.82, 2 + st, 0.12, seed=71)
        if st >= 2:
            crane(s, 1.62, 0.62, 0.88, 0.34, axis='y')
        if st >= 3:
            domed(s, 0.46, 0.42, 0.46, 0.13, drum=0.04, wall=OTTO['white'])

    elif kind == 'camci':
        # Cam fırını + ince baca + açık raflar.
        s.box(0.18, 0.22, 0, 1.10, 0.78, 0.40, BRICK, 'stone',
              deco_y=[('courses', 0.07), ('archdoor', 0.35, 0, 0.18, 0.27), ('arch', 0.75, 0.08, 0.10, 0.18)])
        s.gable(0.16, 0.20, 1.12, 0.80, 0.40, 0.20, PAL['roof2'], axis='x',
                wall=BRICK, wallmat='stone')
        # Büyük kubbeli fırın.
        fr = 0.27 + 0.02 * st
        s.dome(1.46, 0.64, 0.12, fr, BRICK, 'stone', hscale=1.05, finial=False)
        s.sphere(1.64, 0.82, 0.18, 0.055, hexc('#ffb347'))
        s.cylinder(1.36, 0.48, 0.18, 0.92 + 0.12 * st, 0.055, BRICK, 'stone', n=10)
        for row in range(1 + (st >= 2)):
            y = 1.18 + row * 0.28
            s.box(0.28, y, 0, 1.18, y + 0.10, 0.18 + row * 0.08, PAL['wood2'], 'wood')
            for i in range(6):
                col = [hexc('#4fa3c7'), hexc('#5bb28a'), hexc('#d6a93a'), hexc('#9c3d6a')][i % 4]
                s.cone(0.34 + i * 0.14, y + 0.05, 0.18 + row * 0.08, 0.11, 0.032, col, 'flat', n=10)

    elif kind == 'simyahane':
        # Deney evi: sekizgen laboratuvar + ayrı ocak ve bacalar.
        s.cylinder(0.72, 0.68, 0, 0.58, 0.36, hexc('#c8b795'), 'stone', n=8)
        s.dome(0.72, 0.68, 0.58, 0.30, PAL['lead'], 'lead', hscale=0.78)
        s.box(1.14, 0.34, 0, 1.72, 0.86, 0.38, BRICK, 'stone',
              deco_y=[('archdoor', 0.5, 0, 0.16, 0.25)], deco_x=[('courses', 0.07)])
        s.hip(1.12, 0.32, 1.74, 0.88, 0.38, 0.12, PAL['roof2'], over=0.04)
        for i, x in enumerate((1.24, 1.52)):
            s.cylinder(x, 0.44, 0.38, 0.78 + 0.12 * st + i * 0.08, 0.045, BRICK, 'stone', n=8)
        # Dış deney masası.
        s.box(0.32, 1.30, 0, 1.24, 1.44, 0.15, PAL['wood2'], 'wood')
        for i in range(3 + st):
            s.sphere(0.42 + i * 0.17, 1.37, 0.19, 0.035, [PAL['blue'], PAL['green'], hexc('#c96a45')][i % 3])

    elif kind == 'gozlukcu':
        # Rasathane/optik atölyesi: ince kule + yatay laboratuvar.
        s.box(0.16, 0.24, 0, 1.12, 0.78, 0.38, OTTO['stone'], 'stone',
              deco_y=[('archdoor', 0.3, 0, 0.16, 0.24), ('win', 0.72, 0.12, 0.10, 0.15, None)])
        s.hip(0.14, 0.22, 1.14, 0.80, 0.38, 0.14, PAL['lead'], over=0.05, mat='lead')
        th = 0.72 + 0.14 * st
        s.cylinder(1.48, 0.54, 0, th, 0.21, OTTO['white'], 'plaster', n=16)
        s.cylinder(1.48, 0.54, th, th + 0.04, 0.24, PAL['stone2'], 'stone', n=16)
        s.dome(1.48, 0.54, th + 0.04, 0.22, PAL['lead'], 'lead', hscale=0.75, finial=False)
        ring_of_spheres(s, 0.72, 1.34, 0.38, 0.15, 'xz', PAL['gold'])
        ring_of_spheres(s, 0.72, 1.34, 0.38, 0.15, 'yz', PAL['gold'])
        s.cylinder(0.72, 1.34, 0, 0.18, 0.06, PAL['marble'], 'marble', n=10)
        if st >= 2:
            s.add(_log(1.18, 1.46, 0.30, 0.46, 0.026, 'x'))

    elif kind == 'bagci':
        # Bağ + pres evi; yapının çoğu açık tarım alanı.
        s.box(0.16, 0.20, 0, 0.72, 0.66, 0.34, OTTO['stone'], 'stone',
              deco_y=[('courses', 0.08), ('archdoor', 0.5, 0, 0.15, 0.23)])
        s.gable(0.14, 0.18, 0.74, 0.68, 0.34, 0.18, PAL['roof2'], axis='y',
                wall=OTTO['stone'], wallmat='stone')
        cardak(s, 0.86, 0.20, 1.78, 0.70, 0.42)
        rows = 3 + st
        for r in range(rows):
            y = 0.98 + r * 0.16
            s.box(0.20, y - 0.008, 0, 1.78, y + 0.008, 0.20, PAL['wood2'], 'wood', outline=False)
            for i in range(8):
                s.blob(0.28 + i * 0.19, y, 0.19, 0.060, PAL['leaf'], squash=0.7)
        if st >= 2:
            s.cylinder(0.54, 0.88, 0, 0.16, 0.15, PAL['wood'], 'wood', n=16, top=hexc('#5b2a5a'))
        for i in range(st):
            s.barrel(0.22 + i * 0.16, 0.78, 0.055)

    elif kind == 'mahzen':
        # Yarı gömülü tonozlar; en düşük profil.
        s.blob(0.78, 0.66, 0.0, 0.66, hexc('#87924f'), 'leaf', squash=0.36)
        s.blob(1.18, 0.76, 0.0, 0.48, hexc('#758442'), 'leaf', squash=0.34)
        n = 1 + min(st, 2)
        for i in range(n):
            x = 0.28 + i * 0.48
            s.box(x, 1.00, 0, x + 0.40, 1.20, 0.32, OTTO['stone'], 'stone',
                  deco_y=[('courses', 0.07), ('archdoor', 0.5, 0, 0.20, 0.26)])
            s.gable(x, 0.98, x + 0.40, 1.22, 0.32, 0.11, PAL['stone2'], axis='y',
                    mat='stone', wall=OTTO['stone'], wallmat='stone')
        for r in range(1 + (st >= 2)):
            for i in range(3 + st):
                s.barrel(0.34 + i * 0.24, 1.42 + r * 0.18, 0.055)
        if st >= 3:
            s.box(1.42, 0.26, 0, 1.82, 0.72, 0.36, PAL['wood'], 'wood',
                  deco_y=[('vplanks', 5), ('archdoor', 0.5, 0, 0.14, 0.24)])
            s.gable(1.40, 0.24, 1.84, 0.74, 0.36, 0.16, PAL['roof2'], axis='x',
                    wall=PAL['wood'], wallmat='wood')

    elif kind == 'ormanci':
        # Orman karakolu: küçük kuleli kulübe + tomruk avlusu.
        s.box(0.20, 0.24, 0, 0.92, 0.78, 0.38, PAL['wood'], 'wood',
              deco_y=[('vplanks', 7), ('archdoor', 0.45, 0, 0.16, 0.26)],
              deco_x=[('vplanks', 5)])
        s.gable(0.18, 0.22, 0.94, 0.80, 0.38, 0.26, PAL['roof2'], axis='x',
                wall=PAL['wood'], wallmat='wood')
        # Gözetleme kulesi.
        for x, y in ((1.28, 0.32), (1.58, 0.32), (1.28, 0.62), (1.58, 0.62)):
            s.box(x - 0.02, y - 0.02, 0, x + 0.02, y + 0.02, 0.70 + 0.08 * st, PAL['wood2'], 'wood')
        s.box(1.22, 0.26, 0.70 + 0.08 * st, 1.64, 0.68, 0.78 + 0.08 * st, PAL['wood'], 'wood')
        s.hip(1.20, 0.24, 1.66, 0.70, 0.78 + 0.08 * st, 0.14, PAL['roof'], over=0.06)
        logs(s, 0.26, 1.18, 3 + st, 'x', 0.66)
        for x, y in ((0.18, 1.72), (1.72, 1.62), (1.70, 1.08)):
            s.tree(x, y, 0.76 + 0.05 * st, 'pine')

    elif kind == 'tasci':
        # Taş ustası: kesim sundurması + portal vinç + düzgün blok avlusu.
        s.box(0.16, 0.20, 0, 1.18, 0.68, 0.36, hexc('#cabca0'), 'stone',
              deco_y=[('courses', 0.07), ('archdoor', 0.32, 0, 0.16, 0.24)])
        s.gable(0.14, 0.18, 1.20, 0.70, 0.36, 0.18, PAL['roof2'], axis='x',
                wall=hexc('#cabca0'), wallmat='stone')
        # Açık kesim sehpası.
        for x in (1.34, 1.72):
            for y in (0.24, 0.78):
                s.box(x - 0.02, y - 0.02, 0, x + 0.02, y + 0.02, 0.44, PAL['wood2'], 'wood')
        s.box(1.28, 0.18, 0.44, 1.78, 0.84, 0.49, PAL['wood2'], 'wood')
        stone_blocks(s, 0.30, 1.04, 3 + st, 0.13, seed=83)
        if st >= 2:
            crane(s, 1.30, 1.34, 0.84, 0.34, axis='x')
        if st >= 3:
            s.box(0.24, 1.62, 0, 1.02, 1.74, 0.08, PAL['wood2'], 'wood', deco_top=[('vplanks', 7)])


def _p6_military(s, st, kind):
    ground(s, 0.07, 0.07, 1.95, 1.95, hexc('#b9aa8b'))

    if kind == 'tophane':
        # Top dökümhanesi: iki uzun fırın holü + yüksek baca.
        h = 0.42 + 0.06 * st
        for y0 in (0.20, 0.82):
            s.box(0.16, y0, 0, 1.34, y0 + 0.46, h, BRICK, 'stone',
                  deco_y=[('courses', 0.07), ('archdoor', 0.25, 0, 0.18, 0.28), ('arch', 0.70, 0.08, 0.12, 0.18)],
                  deco_x=[('courses', 0.07)])
            s.gable(0.14, y0 - 0.02, 1.36, y0 + 0.48, h, 0.20, PAL['roof2'], axis='x',
                    wall=BRICK, wallmat='stone')
        s.cylinder(1.58, 0.42, 0, 0.92 + 0.16 * st, 0.075, BRICK, 'stone', n=10)
        s.cylinder(1.58, 1.10, 0, 0.74 + 0.12 * st, 0.06, BRICK, 'stone', n=10)
        cannonballs(s, 1.48, 1.52)
        cannonballs(s, 1.66, 1.62)
        if st >= 2:
            crane(s, 0.74, 1.52, 0.78, 0.34)
        s.flag(0.22, 0.22, h + 0.38, 0.44)

    elif kind == 'barutane':
        # Baruthane: ayrık, kalın, alçak depolar ve emniyet avlusu.
        wall = hexc('#bcae95')
        units = [(0.18, 0.20, 0.84, 0.74)]
        if st >= 2:
            units.append((1.12, 0.20, 1.78, 0.74))
        if st >= 3:
            units.append((0.46, 1.08, 1.30, 1.62))
        for x0, y0, x1, y1 in units:
            s.box(x0, y0, 0, x1, y1, 0.36, wall, 'stone',
                  deco_y=[('courses', 0.07), ('archdoor', 0.5, 0, 0.14, 0.22)],
                  deco_x=[('courses', 0.07)])
            s.gable(x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02, 0.36, 0.15, PAL['lead'], axis='x',
                    wall=wall, wallmat='stone', over=0.05)
            # Toprak set / kalın kaide.
            s.box(x0 - 0.06, y0 - 0.06, 0, x1 + 0.06, y0 - 0.02, 0.20, hexc('#8f846d'), 'stone')
        pointed_tower(s, 1.66, 1.62, 0.10, 0.54 + 0.08 * st, col=hexc('#a99b83'), cap=0.18)
        s.flag(1.62, 1.60, 0.72, 0.36)

    elif kind == 'siginak':
        # Sığınak: neredeyse tamamen gömülü; yalnız portal ve havalandırmalar görünür.
        s.blob(0.94, 0.72, 0.0, 0.82, hexc('#79804e'), 'leaf', squash=0.30)
        s.blob(1.28, 0.86, 0.0, 0.56, hexc('#6e7745'), 'leaf', squash=0.28)
        s.box(0.44, 1.08, 0, 1.20, 1.30, 0.32, hexc('#9f947e'), 'stone',
              deco_y=[('courses', 0.07), ('archdoor', 0.5, 0, 0.24, 0.27)])
        s.gable(0.42, 1.06, 1.22, 1.32, 0.32, 0.10, PAL['stone2'], axis='y',
                mat='stone', wall=hexc('#9f947e'), wallmat='stone')
        for i in range(1 + st):
            x = 0.46 + i * 0.38
            s.cylinder(x, 0.52, 0.20, 0.42 + 0.08 * st, 0.045, PAL['iron'], 'flat', n=8)
            s.cone(x, 0.52, 0.42 + 0.08 * st, 0.08, 0.07, PAL['lead'], 'lead', n=8)
        if st >= 3:
            s.box(1.46, 1.16, 0, 1.80, 1.50, 0.30, hexc('#948873'), 'stone',
                  deco_y=[('archdoor', 0.5, 0, 0.12, 0.20)])

    elif kind == 'korsan_kalesi':
        # Düzgün saray değil: kaba, düzensiz taş kalıntı + yüksek gözetleme kulesi.
        dark = hexc('#80725f')
        s.box(0.14, 0.20, 0, 1.46, 0.44, 0.40, dark, 'stone', deco_y=[('courses', 0.08)])
        s.box(0.14, 0.44, 0, 0.40, 1.50, 0.44, dark, 'stone', deco_x=[('courses', 0.08)])
        if st >= 2:
            s.box(1.20, 0.44, 0, 1.48, 1.22, 0.38, dark, 'stone', deco_x=[('courses', 0.08)])
        crenel(s, 0.14, 0.20, 1.46, 0.44, 0.40, dark, step=0.13, size=0.06, h=0.07)
        pointed_tower(s, 0.30, 0.32, 0.16, 0.78 + 0.14 * st, col=hexc('#726653'), cap=0.24)
        if st >= 3:
            pointed_tower(s, 1.34, 0.38, 0.13, 0.66, col=hexc('#726653'), cap=0.20)
        s.box(0.60, 1.30, 0, 1.36, 1.56, 0.26, PAL['wooddark'], 'wood', deco_y=[('vplanks', 6)])
        for i in range(2 + st):
            s.barrel(0.46 + i * 0.18, 1.66, 0.05)
        s.flag(0.28, 0.30, 1.06 + 0.14 * st, 0.50, hexc('#3a2b2b'))


def _p6_civic(s, st, kind):
    ground(s, 0.07, 0.07, 1.95, 1.95, hexc('#d2bd92'))

    if kind == 'saray':
        # Katmanlı saray kompleksi: ana köşk + yan kanatlar + bahçe, tek dev kutu değil.
        pave(s, 0.48, 0.80, 1.54, 1.78, PAL['marble'], n=6)
        s.box(0.34, 0.24, 0, 1.44, 0.78, 0.54 + 0.05 * st, OTTO['white'], 'plaster',
              deco_y=[('arch', 0.20, 0.12, 0.10, 0.18), ('archdoor', 0.50, 0, 0.18, 0.30), ('arch', 0.80, 0.12, 0.10, 0.18)])
        s.hip(0.30, 0.20, 1.48, 0.82, 0.54 + 0.05 * st, 0.18, PAL['lead'], over=0.12, mat='lead')
        # İki düşük yan köşk.
        for x0, x1 in ((0.14, 0.50), (1.50, 1.84)):
            if x0 > 1 and st == 1:
                continue
            s.box(x0, 0.54, 0, x1, 1.26, 0.38, OTTO['ochre'], 'plaster',
                  deco_x=[('kafes', 0.35, 0.08, 0.08, 0.16), ('kafes', 0.70, 0.08, 0.08, 0.16)])
            s.hip(x0 - 0.02, 0.52, x1 + 0.02, 1.28, 0.38, 0.12, PAL['roof'], over=0.08)
        domed(s, 0.88, 0.50, 0.62 + 0.05 * st, 0.17 + 0.02 * st, drum=0.04, wall=OTTO['white'])
        s.cylinder(1.08, 1.30, 0, 0.07, 0.15, PAL['marble'], 'marble', n=16, top=PAL['water'])
        if st >= 2:
            pointed_tower(s, 0.22, 0.30, 0.11, 0.70 + 0.12 * st, col=OTTO['stone'], cap=0.25)
        if st >= 3:
            portico(s, 0.58, 1.18, 0.76, 0.22, 0.34, 5, col=PAL['marble'], roofcol=PAL['lead'])
        s.flag(0.88, 0.26, 0.84 + 0.08 * st, 0.52)

    elif kind == 'valilik':
        # Katı simetrik hükümet konağı.
        pave(s, 0.36, 1.10, 1.64, 1.82, PAL['stone'], n=5)
        h = 0.54 + 0.07 * st
        s.box(0.28, 0.28, 0, 1.72, 1.02, h, OTTO['white'], 'plaster',
              deco_y=[('win', u, 0.14, 0.09, 0.16, 'shutter') for u in (0.16, 0.34, 0.66, 0.84)],
              deco_x=[('win', 0.35, 0.14, 0.09, 0.16, 'shutter'), ('win', 0.68, 0.14, 0.09, 0.16, 'shutter')])
        s.hip(0.26, 0.26, 1.74, 1.04, h, 0.18, PAL['lead'], over=0.09, mat='lead')
        # Merkez giriş risaliti + saat/kule.
        s.box(0.78, 0.90, 0, 1.22, 1.34, h + 0.18, hexc('#e7dcc8'), 'plaster',
              deco_y=[('archdoor', 0.5, 0, 0.18, 0.34), ('cini', 0.76, 0.84)])
        portico(s, 0.76, 1.24, 1.28, 0.20, 0.36, 4, col=PAL['marble'], roofcol=PAL['lead'])
        if st >= 2:
            s.dome(1.0, 1.10, h + 0.22, 0.13, PAL['lead'], 'lead', hscale=0.72)
        if st >= 3:
            s.flag(1.0, 1.08, h + 0.56, 0.46)

    elif kind == 'elcilik':
        # Yalı/konak karakteri + diplomatik bahçe, saray kadar ağır değil.
        pave(s, 0.54, 1.20, 1.56, 1.82, PAL['marble'], n=5)
        konak(s, 0.30, 0.28, 1.38, 1.08, 2 if st == 1 else 3, OTTO['blue'],
              cumba=True, roofcol=PAL['roof'], door=0.48)
        if st >= 2:
            konak(s, 1.42, 0.42, 1.82, 1.04, 2, OTTO['ochre'], cumba=False,
                  roofcol=PAL['roof2'], door=0.4)
        portico(s, 0.70, 1.18, 1.04, 0.18, 0.32, 4, col=PAL['marble'], roofcol=PAL['roof'])
        cols = [PAL['red'], PAL['blue'], PAL['teal'], hexc('#d6a93a')]
        for i in range(2 + st):
            s.flag(0.44 + i * 0.28, 1.70, 0, 0.68, cols[i % len(cols)])
        s.tree(1.66, 1.44, 0.82, 'cypress')

    elif kind == 'muze':
        # Yükseltilmiş sergi salonu + heykel bahçesi.
        s.box(0.20, 0.22, 0, 1.76, 1.22, 0.12, PAL['stone2'], 'stone')
        h = 0.46 + 0.05 * st
        s.box(0.36, 0.32, 0.12, 1.58, 0.96, 0.12 + h, OTTO['white'], 'plaster',
              deco_y=[('cini', 0.72, 0.84), ('archdoor', 0.5, 0, 0.18, 0.28),
                      ('arch', 0.20, 0.10, 0.09, 0.18), ('arch', 0.80, 0.10, 0.09, 0.18)])
        s.hip(0.34, 0.30, 1.60, 0.98, 0.12 + h, 0.07, PAL['lead'], over=0.10, mat='lead')
        domed(s, 0.97, 0.64, 0.20 + h, 0.20 + 0.025 * st, drum=0.06, wall=OTTO['white'])
        portico(s, 0.48, 1.46, 0.94, 0.24, 0.38, 6, z0=0.12, col=PAL['marble'], roofcol=PAL['lead'])
        # Heykel/sütun bahçesi.
        if st >= 2:
            for x, y in ((0.36, 1.48), (0.66, 1.58), (1.46, 1.50)):
                s.cylinder(x, y, 0, 0.28, 0.045, PAL['marble'], 'marble', n=10)
        if st >= 3:
            s.box(1.12, 1.52, 0, 1.58, 1.72, 0.13, PAL['marble'], 'marble')

    elif kind == 'harita_arsivi':
        # Kompakt, kalın taş arşiv kanatları + merkez okuma kubbesi.
        s.box(0.22, 0.24, 0, 1.76, 0.60, 0.44, OTTO['stone'], 'stone',
              deco_y=[('courses', 0.07), ('archdoor', 0.5, 0, 0.16, 0.26)]
                     + [('arch', u, 0.08, 0.08, 0.15) for u in (0.18, 0.34, 0.66, 0.82)])
        s.box(0.28, 0.60, 0, 0.66, 1.54, 0.40, OTTO['stone'], 'stone',
              deco_x=[('courses', 0.07)] + [('arch', u, 0.08, 0.08, 0.15) for u in (0.25, 0.50, 0.75)])
        if st >= 2:
            s.box(1.34, 0.60, 0, 1.72, 1.54, 0.40, OTTO['stone'], 'stone',
                  deco_x=[('courses', 0.07)] + [('arch', u, 0.08, 0.08, 0.15) for u in (0.25, 0.50, 0.75)])
        domed(s, 1.0, 0.84, 0.44, 0.22 + 0.02 * st, drum=0.08, wall=OTTO['stone'])
        if st >= 3:
            # Okuma avlusu revakı.
            portico(s, 0.72, 1.28, 1.30, 0.20, 0.32, 4, col=PAL['marble'], roofcol=PAL['lead'])


def _p6_culture(s, st, kind):
    ground(s, 0.07, 0.07, 1.95, 1.95, hexc('#d0bb90'))

    if kind == 'cami':
        # Merkezi kubbeli cami + yarım kubbeler + avlu, tek kutu değil.
        pave(s, 0.24, 1.18, 1.68, 1.82, PAL['marble'], n=5)
        h = 0.46 + 0.04 * st
        s.box(0.44, 0.30, 0, 1.48, 1.16, h, OTTO['white'], 'plaster',
              deco_y=[('archdoor', 0.5, 0, 0.18, 0.30), ('arch', 0.18, 0.12, 0.09, 0.18), ('arch', 0.82, 0.12, 0.09, 0.18)],
              deco_x=[('arch', 0.25, 0.12, 0.09, 0.18), ('arch', 0.75, 0.12, 0.09, 0.18)])
        domed(s, 0.96, 0.72, h, 0.34 + 0.02 * st, drum=0.09, wall=OTTO['white'])
        # Yarım kubbe etkisi: iki düşük yan kubbe.
        for cx in (0.54, 1.38):
            s.dome(cx, 0.74, h - 0.03, 0.17, PAL['lead'], 'lead', hscale=0.62, finial=False)
        minaret(s, 0.24, 0.36, 1.04 + 0.12 * st, r=0.045)
        if st >= 3:
            minaret(s, 1.72, 0.36, 0.98, r=0.042)
        # Avlu şadırvanı.
        s.cylinder(0.98, 1.50, 0, 0.08, 0.13, PAL['marble'], 'marble', n=14, top=PAL['water'])

    elif kind == 'tekke':
        # Mütevazı L-plan dergâh + avlu ağacı; camiden bilinçli küçük.
        konak(s, 0.18, 0.24, 1.08, 0.84, 2, OTTO['white'], cumba=False,
              roofcol=PAL['roof2'], door=0.40)
        s.box(0.18, 0.84, 0, 0.56, 1.52, 0.32, OTTO['stone'], 'stone',
              deco_x=[('archdoor', 0.5, 0, 0.14, 0.23)])
        s.hip(0.16, 0.82, 0.58, 1.54, 0.32, 0.12, PAL['roof2'], over=0.06)
        if st >= 2:
            domed(s, 1.42, 0.54, 0.34, 0.16, drum=0.04, wall=OTTO['stone'])
            s.box(1.20, 0.30, 0, 1.66, 0.78, 0.34, OTTO['stone'], 'stone',
                  deco_y=[('archdoor', 0.5, 0, 0.14, 0.24)])
        if st >= 3:
            portico(s, 0.62, 1.28, 1.30, 0.18, 0.30, 4, col=PAL['marble'], roofcol=PAL['roof2'])
        s.tree(1.20, 1.42, 0.92)
        s.tree(1.70, 1.62, 0.74, 'cypress')

    elif kind == 'mabet':
        # Sekizgen anıt/mabet; yatay komplekslerden tamamen farklı merkezî siluet.
        base = 0.10 + 0.02 * st
        s.cylinder(1.0, 0.86, 0, base, 0.58, PAL['stone2'], 'stone', n=8)
        s.cylinder(1.0, 0.86, base, 0.58 + 0.06 * st, 0.46, hexc('#d8c8a8'), 'stone', n=8)
        s.cylinder(1.0, 0.86, 0.58 + 0.06 * st, 0.64 + 0.06 * st, 0.50, PAL['stone2'], 'stone', n=8)
        s.dome(1.0, 0.86, 0.64 + 0.06 * st, 0.40, PAL['lead'], 'lead', hscale=0.78)
        # Dört yönlü giriş merdiveni / küçük sundurma.
        portico(s, 0.72, 1.28, 1.26, 0.18, 0.30, 4, z0=base, col=PAL['marble'], roofcol=PAL['lead'])
        if st >= 2:
            for x, y in ((0.32, 0.40), (1.68, 0.40), (0.34, 1.44), (1.66, 1.44)):
                s.cylinder(x, y, 0, 0.34, 0.035, PAL['marble'], 'marble', n=8)
        if st >= 3:
            s.flag(1.0, 0.86, 1.18, 0.42, PAL['teal'])

    elif kind == 'kahvehane':
        # Açık köşk, sedir, asma ve şadırvan; yapıdan çok sosyal avlu.
        pave(s, 0.18, 0.18, 1.82, 1.84, hexc('#d5c39c'), n=6)
        x0, y0, x1, y1 = 0.22, 0.22, 1.22, 0.92
        s.box(x0, y0, 0, x1, y1, 0.07, OTTO['stone'], 'stone')
        for x in (x0 + 0.05, 0.56, 0.90, x1 - 0.05):
            s.box(x - 0.018, y1 - 0.04, 0.07, x + 0.018, y1, 0.47, PAL['wood2'], 'wood')
        for y in (y0 + 0.05, y1 - 0.05):
            s.box(x0 + 0.03, y - 0.018, 0.07, x0 + 0.07, y + 0.018, 0.47, PAL['wood2'], 'wood')
        s.hip(x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02, 0.47, 0.22, PAL['roof'], over=0.18)
        cardak(s, 0.32, 1.10, 1.18, 1.62, 0.40)
        if st >= 2:
            s.box(0.54, 0.46, 0.47, 0.63, 0.88, 0.67, OTTO['white'], 'plaster')
            s.hip(0.52, 0.44, 0.65, 0.90, 0.67, 0.08, PAL['roof'], over=0.05)
        if st >= 3:
            s.cylinder(1.58, 0.62, 0, 0.08, 0.14, PAL['marble'], 'marble', n=14, top=PAL['water'])
        for x, y in ((0.48, 1.30), (0.82, 1.42), (1.04, 1.24)):
            s.cylinder(x, y, 0, 0.10, 0.05, PAL['wood'], 'wood', n=8)
        s.tree(1.62, 1.48, 1.00)

    elif kind == 'karagoz':
        # Açık hava tiyatrosu: yüksek sahne cephesi + seyirci avlusu.
        pave(s, 0.18, 0.72, 1.82, 1.84, hexc('#cdb78e'), n=5)
        s.box(0.22, 0.18, 0, 1.40, 0.72, 0.64, PAL['wooddark'], 'wood',
              deco_y=[('karagoz',)], deco_x=[('vplanks', 6)])
        s.hip(0.18, 0.14, 1.44, 0.76, 0.64, 0.20, PAL['roof2'], over=0.10)
        # Sahne ön sütunları/perdeleri.
        for x in (0.26, 1.34):
            s.box(x, 0.68, 0.06, x + 0.055, 0.74, 0.62, PAL['red'], 'canvas')
        # Kademeli seyirci sedirleri.
        for row in range(1 + st):
            y = 1.04 + row * 0.24
            s.box(0.32, y, 0, 1.28, y + 0.11, 0.10 + row * 0.04, PAL['wood2'], 'wood', deco_top=[('planks', 4)])
        # Kandil kemeri.
        if st >= 2:
            for x in (0.18, 1.48):
                s.cylinder(x, 0.80, 0, 0.64, 0.014, PAL['wooddark'], 'flat', n=6)
            for i in range(7):
                x = 0.24 + i * 0.19
                s.sphere(x, 0.84, 0.58 - 0.06 * math.sin(i / 6 * math.pi), 0.022,
                         [PAL['red'], hexc('#f5c85a'), PAL['blue'], PAL['green']][i % 4])
        if st >= 3:
            domed(s, 0.82, 0.44, 0.84, 0.14)


def _p6_harbour(s, st):
    """TİCARET LİMANI: deniz rengi asset'e bake edilmez. Gümrük ve ambar
    kara tarafında kalır; taş mendirek, ahşap iskele, vinç ve gemiler şeffaf
    deniz bölgesinin üstüne uzanır. Böylece oyunun gerçek denizi alttan görünür."""
    stone = PAL['stone']
    cap = hexc('#dfcfac')

    # Kara tarafında dar taş rıhtım omurgası. Eski L biçimli dev opak platform
    # küçültüldü; deniz tarafında geniş şeffaf boşluk bırakıldı.
    s.box(0.06, 0.08, 0, 1.50, 0.34, 0.10, stone, 'stone',
          deco_y=[('courses', 0.055)], deco_x=[('courses', 0.055)], top=cap)
    s.box(0.06, 0.34, 0, 0.40, 1.88, 0.10, stone, 'stone',
          deco_y=[('courses', 0.055)], deco_x=[('courses', 0.055)], top=cap)

    # Gümrük hanı: tamamı kara tarafında ve daha yatay; denizi örtmez.
    h = 0.42 + 0.05 * st
    s.box(0.12, 0.12, 0.10, 1.02, 0.52, 0.10 + h, hexc('#e4d2ad'), 'stone',
          deco_y=[('courses', 0.08), ('archdoor', 0.50, 0, 0.16, 0.25),
                  ('arch', 0.18, 0.08, 0.085, 0.15), ('arch', 0.82, 0.08, 0.085, 0.15)],
          deco_x=[('courses', 0.08)])
    s.hip(0.10, 0.10, 1.04, 0.54, 0.10 + h, 0.15, PAL['lead'], over=0.07, mat='lead')

    if st >= 2:
        # Küçük rıhtım ambarı; yine su üstüne büyük kütle taşımıyor.
        s.box(1.08, 0.12, 0.10, 1.48, 0.52, 0.39, hexc('#cdbb99'), 'stone',
              deco_y=[('archdoor', 0.5, 0, 0.14, 0.22)])
        s.gable(1.06, 0.10, 1.50, 0.54, 0.39, 0.14, PAL['roof'], axis='x',
                wall=hexc('#cdbb99'), wallmat='stone', over=0.04)

    # Ana taş iskele: dar bir parmak gibi şeffaf denizin içine uzanır.
    s.box(0.32, 0.86, 0.02, 1.58, 1.10, 0.10, stone, 'stone',
          deco_y=[('courses', 0.05)], deco_x=[('courses', 0.05)], top=cap)
    bollards(s, [(0.48 + i * 0.22, 0.84) for i in range(5)] +
                [(0.48 + i * 0.22, 1.12) for i in range(5)], z=0.10)

    # İkinci ahşap yükleme iskelesi; aralarında runtime denizi görünür.
    for x in (0.52, 0.78, 1.04, 1.30, 1.56):
        s.cylinder(x, 1.42, 0, 0.15, 0.024, PAL['wooddark'], 'wood', n=8)
        s.cylinder(x, 1.64, 0, 0.15, 0.024, PAL['wooddark'], 'wood', n=8)
    s.box(0.44, 1.38, 0.13, 1.66, 1.68, 0.18, PAL['wood2'], 'wood',
          deco_top=[('vplanks', 9)])
    bollards(s, [(0.54 + i * 0.26, 1.36) for i in range(4)], z=0.18)

    # Yük vinci su-kara sınırında, gemi boşaltma yönüne bakar.
    crane(s, 0.42, 0.70, 0.78 + 0.08 * st, 0.36, axis='x')
    if st >= 2:
        crane(s, 1.18, 1.24, 0.72, 0.30, axis='y')

    # Mallar kıyı hattında kümelenir; su alanına yayılmaz.
    for i in range(3 + st):
        s.crate(0.52 + (i % 3) * 0.18, 0.60 + (i // 3) * 0.14, 0.09, z=0.10)
    for i in range(2 + st):
        s.barrel(0.14 + (i % 2) * 0.13, 0.66 + (i // 2) * 0.14, 0.042, z=0.10)

    # Fener artık dev kule değil; rıhtım ucunda küçük liman feneri.
    fh = 0.58 + 0.10 * st
    fx, fy = 0.22, 1.58
    s.cylinder(fx, fy, 0.10, fh, 0.075, PAL['marble'], 'stone', n=12,
               deco=[('band', 0.28, 0.42, PAL['red'])])
    s.cylinder(fx, fy, fh, fh + 0.045, 0.11, PAL['stone2'], 'stone', n=12)
    s.cylinder(fx, fy, fh + 0.045, fh + 0.13, 0.060, hexc('#f5d27a'), 'flat', n=10)
    s.cone(fx, fy, fh + 0.13, 0.11, 0.085, PAL['lead'], 'lead', n=10)

    # Ticaret gemileri tamamen şeffaf deniz bölgesi üzerinde. Kendi mavi zeminleri yok.
    ship(s, 1.20, 1.20, 0.66 + 0.07 * st, 0.19, z=0.035,
         masts=1 + (st >= 2), rig='square')
    if st >= 3:
        ship(s, 1.30, 1.78, 0.44, 0.13, z=0.03,
             masts=1, rig='lateen', stern=False)

    s.flag(0.18, 0.18, 0.58, 0.42)


# --- Pass 6 override girişleri -------------------------------------
def ambar(s, st): _p6_storage(s, st, 'ambar')
def depo(s, st): _p6_storage(s, st, 'depo')
def ticaret_merkezi(s, st): _p6_storage(s, st, 'ticaret_merkezi')
def kara_pazar(s, st): _p6_storage(s, st, 'kara_pazar')

def marangoz(s, st): _p6_workshop(s, st, 'marangoz')
def mimar(s, st): _p6_workshop(s, st, 'mimar')
def camci(s, st): _p6_workshop(s, st, 'camci')
def simyahane(s, st): _p6_workshop(s, st, 'simyahane')
def gozlukcu(s, st): _p6_workshop(s, st, 'gozlukcu')
def bagci(s, st): _p6_workshop(s, st, 'bagci')
def mahzen(s, st): _p6_workshop(s, st, 'mahzen')
def ormanci(s, st): _p6_workshop(s, st, 'ormanci')
def tasci(s, st): _p6_workshop(s, st, 'tasci')

def tophane(s, st): _p6_military(s, st, 'tophane')
def barutane(s, st): _p6_military(s, st, 'barutane')
def siginak(s, st): _p6_military(s, st, 'siginak')
def korsan_kalesi(s, st): _p6_military(s, st, 'korsan_kalesi')

def saray(s, st): _p6_civic(s, st, 'saray')
def valilik(s, st): _p6_civic(s, st, 'valilik')
def elcilik(s, st): _p6_civic(s, st, 'elcilik')
def muze(s, st): _p6_civic(s, st, 'muze')
def harita_arsivi(s, st): _p6_civic(s, st, 'harita_arsivi')

def cami(s, st): _p6_culture(s, st, 'cami')
def tekke(s, st): _p6_culture(s, st, 'tekke')
def mabet(s, st): _p6_culture(s, st, 'mabet')
def kahvehane(s, st): _p6_culture(s, st, 'kahvehane')
def karagoz(s, st): _p6_culture(s, st, 'karagoz')

def liman(s, st): _p6_harbour(s, st)



# ================================================================
# FINAL VISUAL PASS — DIVANHANE + SURLAR
# Ana landmark ve savunma önizlemesi, güncel şehir sanat diliyle eşleşir.
# ================================================================

def divan(s, st):
    """DİVANHANE / PAYİTAHT MERKEZİ: sabit ana landmark. Tek bir saray kutusu
    değil; tören avlusu, merkez divan kubbesi, iki yan kanat ve Adalet Kulesi
    üzerinden okunur. Aşama arttıkça kompleks genişler ama taban anchor değişmez."""
    ground(s, 0.06, 0.06, 1.96, 1.96, hexc('#d5c092'))
    pave(s, 0.26, 0.78, 1.74, 1.86, PAL['marble'], n=7)

    lead = PAL['lead']
    wall = OTTO['white']
    stone = hexc('#d2c09d')

    # Ana Divan-ı Hümayun: merkezde daha kısa ama geniş, kubbe onu taçlandırır.
    h = (0.48, 0.54, 0.60)[st - 1]
    s.box(0.46, 0.28, 0, 1.52, 0.92, h, wall, 'plaster',
          deco_y=[('arch', 0.18, 0.10, 0.09, 0.18),
                  ('archdoor', 0.50, 0, 0.18, 0.30),
                  ('arch', 0.82, 0.10, 0.09, 0.18)],
          deco_x=[('arch', 0.28, 0.10, 0.09, 0.18),
                  ('arch', 0.72, 0.10, 0.09, 0.18)])
    # Geniş Osmanlı saçağı.
    s.hip(0.42, 0.24, 1.56, 0.96, h, 0.10, lead, over=0.14, mat='lead')
    domed(s, 0.99, 0.60, h + 0.04, 0.25 + 0.02 * st, drum=0.07, wall=wall)

    # Ön revak: sabit landmark'ın güçlü yatay tabanı.
    portico(s, 0.42, 1.56, 0.92, 0.28, 0.40, 7 if st >= 2 else 5,
            col=PAL['marble'], roofcol=lead)

    # Adalet Kulesi: merkezden sola kayık tek baskın dikey eleman.
    th = (0.80, 1.00, 1.20)[st - 1]
    tx, ty = 0.28, 0.34
    s.box(tx - 0.13, ty - 0.13, 0, tx + 0.13, ty + 0.13, th, stone, 'stone',
          deco_y=[('courses', 0.08), ('arch', 0.5, 0.12, 0.08, 0.16)],
          deco_x=[('courses', 0.08), ('arch', 0.5, 0.12, 0.08, 0.16)])
    s.box(tx - 0.15, ty - 0.15, th, tx + 0.15, ty + 0.15, th + 0.05, PAL['stone2'], 'stone')
    s.cylinder(tx, ty, th + 0.05, th + 0.30, 0.14, PAL['marble'], 'marble', n=12)
    s.cone(tx, ty, th + 0.30, 0.34 + 0.05 * st, 0.16, lead, 'lead', n=12)
    s.sphere(tx, ty, th + 0.67 + 0.05 * st, 0.018, PAL['gold'])

    # Yan yönetim kanatları: level 1'de sol, level 2'de sağ, level 3'te tam avlu.
    s.box(0.18, 0.98, 0, 0.58, 1.56, 0.34, OTTO['ochre'], 'plaster',
          deco_x=[('kafes', 0.30, 0.08, 0.08, 0.14),
                  ('kafes', 0.70, 0.08, 0.08, 0.14)])
    s.hip(0.16, 0.96, 0.60, 1.58, 0.34, 0.12, PAL['roof'], over=0.08)

    if st >= 2:
        s.box(1.42, 0.98, 0, 1.82, 1.56, 0.34, OTTO['ochre'], 'plaster',
              deco_x=[('kafes', 0.30, 0.08, 0.08, 0.14),
                      ('kafes', 0.70, 0.08, 0.08, 0.14)])
        s.hip(1.40, 0.96, 1.84, 1.58, 0.34, 0.12, PAL['roof'], over=0.08)

        # Bâbüsselâm: tören avlusunun önünde, iki ince kapı kulesi.
        gx0, gx1, gy0, gy1 = 0.72, 1.28, 1.58, 1.76
        gh = 0.34
        s.box(gx0, gy0, 0, gx1, gy1, gh, wall, 'plaster',
              deco_y=[('band', 0.58, 0.70, hexc('#345f49')),
                      ('archdoor', 0.5, 0, 0.20, 0.29)])
        crenel(s, gx0, gy0, gx1, gy1, gh, wall, step=0.09, size=0.045, h=0.055)
        for x in (gx0 - 0.03, gx1 + 0.03):
            s.cylinder(x, (gy0 + gy1) / 2, 0, 0.52 + 0.07 * st, 0.11, wall, 'plaster', n=8)
            s.cone(x, (gy0 + gy1) / 2, 0.52 + 0.07 * st, 0.30, 0.13, lead, 'lead', n=8)

    # Avlu şadırvanı: level 2'den sonra şehir merkezi daha "yaşayan" görünür.
    if st >= 2:
        s.cylinder(1.00, 1.30, 0, 0.08, 0.15, PAL['marble'], 'marble', n=16, top=PAL['water'])
        s.cylinder(1.00, 1.30, 0.08, 0.22, 0.018, PAL['marble'], 'marble', n=8)

    if st >= 3:
        # Saray mutfakları: arka sağda ritmik bacalar, ana silueti boğmaz.
        s.box(1.60, 0.18, 0, 1.86, 0.96, 0.34, stone, 'stone',
              deco_x=[('courses', 0.07)], deco_y=[('courses', 0.07)])
        for i in range(4):
            cy = 0.30 + i * 0.18
            s.cylinder(1.73, cy, 0.34, 0.60, 0.045, stone, 'stone', n=10)
            s.dome(1.73, cy, 0.60, 0.060, lead, 'lead', hscale=0.70, finial=False)

        # Tören sancağı ve iki servi, landmark'ı diğer anıtsal yapılardan ayırır.
        s.flag(1.00, 1.66, 0.44, 0.62)
        s.tree(0.30, 1.70, 0.86, 'cypress')
        s.tree(1.70, 1.70, 0.86, 'cypress')


def surlar(s, st):
    """SURLAR ÖNİZLEMESİ: oyun içindeki halka duvarın temsilî kapı kesiti.
    Level arttıkça duvar kalınlaşır, kapı kulesi ve mazgal ritmi güçlenir."""
    ground(s, 0.12, 0.12, 1.90, 1.90, hexc('#c7b183'))
    pave(s, 0.30, 1.40, 1.72, 1.82, hexc('#b8a078'), n=4)

    h = (0.38, 0.50, 0.62)[st - 1]
    col = hexc('#c9b083')
    top = hexc('#dfcaa0')

    # Uzun ana duvar kesiti.
    s.box(0.18, 1.06, 0, 1.82, 1.36, h, col, 'stone',
          deco_y=[('courses', 0.07), ('archdoor', 0.50, 0, 0.24, 0.34)],
          deco_x=[('courses', 0.07)])
    s.box(0.16, 1.04, h, 1.84, 1.38, h + 0.05, top, 'stone')
    crenel(s, 0.18, 1.06, 1.82, 1.36, h + 0.05, col,
           step=0.11 if st < 3 else 0.095, size=0.05, h=0.065)

    # Kapı iki yanında yuvarlak kuleler; level 1'de kısa, 3'te belirgin.
    for x in (0.36, 1.64):
        th = h + 0.22 + 0.08 * st
        s.cylinder(x, 1.21, 0, th, 0.18 + 0.01 * st, col, 'stone', n=16)
        s.cylinder(x, 1.21, th, th + 0.05, 0.21 + 0.01 * st, top, 'stone', n=16)
        # Runtime duvar dili gibi düz/mazgallı kule; fantastik sivri çatı yok.
        for k in range(8):
            a = 2 * math.pi * k / 8
            cx = x + math.cos(a) * (0.17 + 0.01 * st)
            cy = 1.21 + math.sin(a) * (0.17 + 0.01 * st)
            s.box(cx - 0.028, cy - 0.028, th + 0.05,
                  cx + 0.028, cy + 0.028, th + 0.12, col, 'stone')

    # Level 2: bir yan duvar kanadı; level 3: ikinci kanat + nöbetçi platformu.
    if st >= 2:
        s.box(0.18, 0.40, 0, 0.46, 1.06, h * 0.92, col, 'stone',
              deco_x=[('courses', 0.07)])
        crenel(s, 0.18, 0.40, 0.46, 1.06, h * 0.92, col, step=0.12, size=0.05, h=0.06)
    if st >= 3:
        s.box(1.54, 0.40, 0, 1.82, 1.06, h * 0.92, col, 'stone',
              deco_x=[('courses', 0.07)])
        crenel(s, 1.54, 0.40, 1.82, 1.06, h * 0.92, col, step=0.12, size=0.05, h=0.06)
        s.box(0.78, 0.66, 0, 1.22, 0.94, 0.28, hexc('#a98e67'), 'stone',
              deco_y=[('courses', 0.06)])

    s.flag(1.00, 1.18, h + 0.16, 0.48)

BUILDINGS = {
    'divan': divan, 'saray': saray, 'elcilik': elcilik, 'konut': konut, 'hamam': hamam, 'carsi': carsi,
    'ambar': ambar, 'kereste': kereste, 'tas': tas, 'medrese': medrese, 'kisla': kisla, 'liman': liman,
    'tersane': tersane, 'kahvehane': kahvehane, 'cami': cami, 'muze': muze, 'marangoz': marangoz,
    'mimar': mimar, 'ormanci': ormanci, 'tasci': tasci, 'tophane': tophane, 'surlar': surlar,
    'bagci': bagci, 'simyahane': simyahane, 'camci': camci, 'mahzen': mahzen, 'gozlukcu': gozlukcu,
    'barutane': barutane, 'depo': depo, 'ticaret_merkezi': ticaret_merkezi, 'harita_arsivi': harita_arsivi,
    'valilik': valilik, 'korsan_kalesi': korsan_kalesi, 'kara_pazar': kara_pazar,
    'siginak': siginak, 'tekke': tekke, 'mabet': mabet, 'karagoz': karagoz,
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
    # Oyuncu binalarının sancak kumaşı oyunda canlı çizilir: burada yalnız direk.
    os.environ['NOFLAG'] = '1'
    manifest_path = os.path.join(ROOT, 'lib', 'game', 'city-map', 'building-flags.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    # Aynı kamera/ışık/footprint korunur; mimari aileler bilinçli olarak farklı siluet dili kullanır.
    for bid in ids:
        for st in (1, 2, 3):
            s = Scene(seed=sum(map(ord, bid)) * 10 + st)
            BUILDINGS[bid](s, st)
            path = os.path.join(OUT, f'{bid}-{st}.webp')
            im = s.render(path)
            if s.flag_px:
                manifest[f'{bid}-{st}'] = [im.size[0], im.size[1], s.flag_px]
            else:
                manifest.pop(f'{bid}-{st}', None)
            print('yazıldı', os.path.relpath(path, ROOT), im.size, len(s.flag_px), 'sancak')
    json.dump(dict(sorted(manifest.items())), open(manifest_path, 'w'), separators=(',', ':'))
    os.environ.pop('NOFLAG', None)


if __name__ == '__main__':
    main(sys.argv[1:] or list(BUILDINGS) + list(EXTRAS))
