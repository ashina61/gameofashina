"""
ISOKIT — küçük izometrik 3B sprite çizim motoru (Payitaht bina sanatı).

Binalar el ile boyanmış resim yerine BASİT 3B PARÇALARDAN (kutu, çatı, kubbe,
silindir, koni) kurulur ve Ikariam'ın temiz, ışıklı izometrik diline göre
çizilir:

  * izdüşüm oyunla birebir: 2:1 izometri, karo birimi = 1 (2x2 footprint).
  * ışık sol-üstten (sol-ön yüz aydınlık, sağ-ön yüz gölgede), gölge sağa düşer.
  * her yüz malzemesine göre dokulanır (sıva, kesme taş, kiremit, kurşun,
    ahşap); pencere/kapı/kemer yüzün üstüne "çıkartma" olarak çizilir.
  * 3x süper-örnekleme + LANCZOS küçültme -> yumuşak kenar, boyalı his.

Çıktı tuvali: genişlik 600 px; 2x2 footprint elması 480 px genişliğinde ve
TUVALİN ALT KENARI = elmasın alt köşesi (oyunda origin 0.5,1 ile oturur).
"""
import math
import random

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

SS = 3                    # süper-örnekleme
OUT_W = 600               # çıktı genişliği
DIAMOND_W = 480           # 2x2 footprint elmasının çıktıdaki genişliği
A = DIAMOND_W / 4         # 1 karo biriminin yatay yarı-genişliği (px)
ZP = 128                  # 1 birim yüksekliğin ekrandaki boyu (px)

# Işık: sol-üst. +y yüzü (ekranda sol-ön) aydınlık, +x yüzü (sağ-ön) gölgede.
LIGHT = np.array([-0.62, 0.55, 1.0]); LIGHT = LIGHT / np.linalg.norm(LIGHT)
VIEW = np.array([1.0, 1.0, A / ZP * 1.0]); VIEW = VIEW / np.linalg.norm(VIEW)


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def mul(c, k):
    return tuple(max(0, min(255, int(round(v * k)))) for v in c)


# ------------------------------------------------------------------ PALET
PAL = {
    'plaster': hexc('#f8e6c2'), 'plaster2': hexc('#f0d8a8'), 'ochre': hexc('#e2c48e'),
    'stone': hexc('#d9c7a1'), 'stone2': hexc('#c4ae86'), 'stonedark': hexc('#9d8c72'),
    'marble': hexc('#f4efe4'),
    'roof': hexc('#c65d36'), 'roof2': hexc('#b04d2c'),
    'lead': hexc('#8fa7ae'), 'lead2': hexc('#7b949c'),
    'wood': hexc('#a26f41'), 'wood2': hexc('#7d5230'), 'wooddark': hexc('#5e3c22'),
    'gold': hexc('#e4b94c'), 'green': hexc('#4f7d4a'), 'leaf': hexc('#5f8c3e'),
    'window': hexc('#3a2d24'), 'door': hexc('#5b3920'), 'frame': hexc('#f7efdc'),
    'shutter': hexc('#4c7c8c'), 'red': hexc('#b8412f'), 'white': hexc('#f7f2e6'),
    'blue': hexc('#3f6f9a'), 'teal': hexc('#3f8d8a'), 'canvas': hexc('#efe2c2'),
    'iron': hexc('#4a4744'), 'water': hexc('#5fa9a4'),
}

# Malzeme -> (doku gürültüsü gücü, gürültü ölçeği)
MATERIALS = {
    'plaster': (0.035, 5), 'stone': (0.07, 3), 'marble': (0.03, 6), 'roof': (0.06, 2),
    'lead': (0.04, 4), 'wood': (0.08, 1.5), 'flat': (0.0, 1), 'leaf': (0.12, 2),
    'canvas': (0.03, 5), 'ground': (0.08, 3),
}
MAT_INDEX = {k: i + 1 for i, k in enumerate(MATERIALS)}


def proj(p):
    x, y, z = p
    return ((x - y) * A * SS, ((x + y) * A / 2 - z * ZP) * SS)


class Face:
    __slots__ = ('pts', 'color', 'mat', 'deco', 'outline', 'normal', 'shade', 'auto')

    def __init__(self, pts, color, mat='flat', deco=None, outline=True, normal=None, shade=None):
        self.pts = [np.array(p, dtype=float) for p in pts]
        self.color = color
        self.mat = mat
        self.deco = deco or []
        self.outline = outline
        self.auto = normal is None
        if normal is None:
            a, b, c = self.pts[0], self.pts[1], self.pts[2]
            n = np.cross(b - a, c - a)
            ln = np.linalg.norm(n)
            normal = n / ln if ln > 1e-9 else np.array([0, 0, 1.0])
        self.normal = np.array(normal, dtype=float)
        self.shade = shade


class Prim:
    """Dışbükey bir parça: yüzleri birbirini örtmez; sıralama parça bazında."""

    def __init__(self, faces, key=None, cast=True, cull=True):
        self.faces = faces
        allp = np.array([p for f in faces for p in f.pts])
        c = allp.mean(axis=0)
        self.key = key if key is not None else float(c[0] + c[1] + c[2] * 0.25)
        # Normali verilmemiş yüzler dışa baksın (nokta sırası serbest kalsın).
        for f in faces:
            fc = np.mean(f.pts, axis=0)
            if f.auto and float(np.dot(f.normal, fc - c)) < 0:
                f.normal = -f.normal
        self.cast = cast
        self.cull = cull


# ------------------------------------------------------------------ SAHNE
class Scene:
    def __init__(self, seed=1):
        self.prims = []
        self.rnd = random.Random(seed)

    def add(self, prim):
        self.prims.append(prim)
        return prim

    # ---------------------------------------------------------- İLKELLER
    def box(self, x0, y0, z0, x1, y1, z1, color, mat='plaster', top=None, topmat=None,
            deco_y=None, deco_x=None, deco_top=None, key=None, cast=True, outline=True):
        """Eksen hizalı kutu. deco_y: +y yüzü (sol-ön) süsleri, deco_x: +x yüzü (sağ-ön)."""
        top = top or color
        topmat = topmat or mat
        P = lambda x, y, z: (x, y, z)
        faces = [
            Face([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top, topmat, deco_top, outline, (0, 0, 1)),
            # +y yüzü: u boyunca x, v boyunca z
            Face([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], color, mat, deco_y, outline, (0, 1, 0)),
            # +x yüzü: u boyunca -y (ekranda soldan sağa), v boyunca z
            Face([P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1)], color, mat, deco_x, outline, (1, 0, 0)),
            Face([P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)], color, mat, None, outline, (-1, 0, 0)),
            Face([P(x1, y0, z0), P(x0, y0, z0), P(x0, y0, z1), P(x1, y0, z1)], color, mat, None, outline, (0, -1, 0)),
        ]
        return self.add(Prim(faces, key=key, cast=cast))

    def gable(self, x0, y0, x1, y1, z, h, color, axis='x', over=0.08, mat='roof', wall=None, wallmat='plaster', key=None):
        """Beşik çatı. axis='x': mahya x yönünde. wall: alın üçgeni rengi."""
        wall = wall or PAL['plaster']
        faces = []
        if axis == 'x':
            ym = (y0 + y1) / 2
            a0, a1 = x0 - over, x1 + over
            faces.append(Face([(a0, y1 + over, z - over * 0.5), (a1, y1 + over, z - over * 0.5), (a1, ym, z + h), (a0, ym, z + h)], color, mat, [('tiles', 'down')]))
            faces.append(Face([(a1, y0 - over, z - over * 0.5), (a0, y0 - over, z - over * 0.5), (a0, ym, z + h), (a1, ym, z + h)], color, mat, [('tiles', 'down')]))
            faces.append(Face([(x1, y1, z), (x1, y0, z), (x1, ym, z + h)], wall, wallmat, None, True, (1, 0, 0)))
            faces.append(Face([(x0, y0, z), (x0, y1, z), (x0, ym, z + h)], wall, wallmat, None, True, (-1, 0, 0)))
        else:
            xm = (x0 + x1) / 2
            b0, b1 = y0 - over, y1 + over
            faces.append(Face([(x1 + over, b1, z - over * 0.5), (x1 + over, b0, z - over * 0.5), (xm, b0, z + h), (xm, b1, z + h)], color, mat, [('tiles', 'down')]))
            faces.append(Face([(x0 - over, b0, z - over * 0.5), (x0 - over, b1, z - over * 0.5), (xm, b1, z + h), (xm, b0, z + h)], color, mat, [('tiles', 'down')]))
            faces.append(Face([(x0, y1, z), (x1, y1, z), (xm, y1, z + h)], wall, wallmat, None, True, (0, 1, 0)))
            faces.append(Face([(x1, y0, z), (x0, y0, z), (xm, y0, z + h)], wall, wallmat, None, True, (0, -1, 0)))
        return self.add(Prim(faces, key=key))

    def hip(self, x0, y0, x1, y1, z, h, color, over=0.08, mat='roof', ridge=0.0, key=None):
        """Kırma (dört yana eğimli) çatı; ridge>0 ise x yönünde mahya."""
        x0 -= over; y0 -= over; x1 += over; y1 += over
        z0 = z - over * 0.5
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        r = ridge / 2
        t0, t1 = (cx - r, cy, z + h), (cx + r, cy, z + h)
        faces = [
            Face([(x0, y1, z0), (x1, y1, z0), t1, t0], color, mat, [('tiles', 'down')]),
            Face([(x1, y1, z0), (x1, y0, z0), t1], color, mat, [('tiles', 'down')]),
            Face([(x1, y0, z0), (x0, y0, z0), t0, t1], color, mat),
            Face([(x0, y0, z0), (x0, y1, z0), t0], color, mat),
        ]
        faces = [f for f in faces if len({tuple(p) for p in f.pts}) >= 3]
        return self.add(Prim(faces, key=key))

    def cylinder(self, cx, cy, z0, z1, r, color, mat='plaster', n=22, top=None, topmat=None, key=None, deco=None, cast=True):
        faces = []
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            p0 = (cx + r * math.cos(a0), cy + r * math.sin(a0))
            p1 = (cx + r * math.cos(a1), cy + r * math.sin(a1))
            am = (a0 + a1) / 2
            faces.append(Face([(p0[0], p0[1], z0), (p1[0], p1[1], z0), (p1[0], p1[1], z1), (p0[0], p0[1], z1)],
                              color, mat, None, False, (math.cos(am), math.sin(am), 0)))
        cap = [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n), z1) for i in range(n)]
        faces.append(Face(cap, top or color, topmat or mat, deco, False, (0, 0, 1)))
        return self.add(Prim(faces, key=key, cast=cast))

    def cone(self, cx, cy, z0, h, r, color, mat='lead', n=22, key=None):
        faces = []
        apex = (cx, cy, z0 + h)
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            am = (a0 + a1) / 2
            s = r / math.hypot(r, h)
            nrm = (math.cos(am) * h / math.hypot(r, h), math.sin(am) * h / math.hypot(r, h), s)
            faces.append(Face([(cx + r * math.cos(a0), cy + r * math.sin(a0), z0), (cx + r * math.cos(a1), cy + r * math.sin(a1), z0), apex],
                              color, mat, None, False, nrm))
        return self.add(Prim(faces, key=key))

    def dome(self, cx, cy, z0, r, color, mat='lead', hscale=1.0, n=26, rings=9, ribs=True, key=None, finial=True):
        faces = []
        for j in range(rings):
            b0, b1 = (math.pi / 2) * j / rings, (math.pi / 2) * (j + 1) / rings
            for i in range(n):
                a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
                def P(a, b):
                    return (cx + r * math.cos(b) * math.cos(a), cy + r * math.cos(b) * math.sin(a), z0 + r * hscale * math.sin(b))
                am, bm = (a0 + a1) / 2, (b0 + b1) / 2
                nrm = (math.cos(bm) * math.cos(am), math.cos(bm) * math.sin(am), math.sin(bm) / max(hscale, 0.3))
                col = color
                if ribs and i % 3 == 0:
                    col = mul(color, 0.93)
                pts = [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)] if j < rings - 1 else [P(a0, b0), P(a1, b0), P(0, math.pi / 2)]
                faces.append(Face(pts, col, mat, None, False, nrm))
        prim = self.add(Prim(faces, key=key))
        if finial:
            top = z0 + r * hscale
            self.cylinder(cx, cy, top - 0.01, top + r * 0.18, r * 0.05, PAL['gold'], 'flat', n=8, key=(prim.key + 0.01))
            self.sphere(cx, cy, top + r * 0.22, r * 0.07, PAL['gold'], key=prim.key + 0.02)
        return prim

    def sphere(self, cx, cy, cz, r, color, mat='flat', n=12, rings=8, key=None):
        faces = []
        for j in range(rings):
            b0 = -math.pi / 2 + math.pi * j / rings
            b1 = -math.pi / 2 + math.pi * (j + 1) / rings
            for i in range(n):
                a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
                def P(a, b):
                    return (cx + r * math.cos(b) * math.cos(a), cy + r * math.cos(b) * math.sin(a), cz + r * math.sin(b))
                am, bm = (a0 + a1) / 2, (b0 + b1) / 2
                faces.append(Face([P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)], color, mat, None, False,
                                  (math.cos(bm) * math.cos(am), math.cos(bm) * math.sin(am), math.sin(bm))))
        return self.add(Prim(faces, key=key))

    def blob(self, cx, cy, cz, r, color, mat='leaf', squash=0.85, key=None):
        """Ağaç tacı / çalı: düzensiz küre."""
        rnd = self.rnd
        faces = []
        n, rings = 12, 7
        jit = {}
        def R(i, j):
            if (i % n, j) not in jit:
                jit[(i % n, j)] = 1 + (rnd.random() - 0.5) * 0.28
            return jit[(i % n, j)]
        for j in range(rings):
            b0 = -math.pi / 2 + math.pi * j / rings
            b1 = -math.pi / 2 + math.pi * (j + 1) / rings
            for i in range(n):
                a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
                def P(ii, a, jj, b):
                    k = r * (R(ii, jj) if 0 < jj < rings else 1)
                    return (cx + k * math.cos(b) * math.cos(a), cy + k * math.cos(b) * math.sin(a), cz + k * squash * math.sin(b))
                am, bm = (a0 + a1) / 2, (b0 + b1) / 2
                faces.append(Face([P(i, a0, j, b0), P(i + 1, a1, j, b0), P(i + 1, a1, j + 1, b1), P(i, a0, j + 1, b1)], color, mat, None, False,
                                  (math.cos(bm) * math.cos(am), math.cos(bm) * math.sin(am), math.sin(bm))))
        return self.add(Prim(faces, key=key))

    def flat(self, pts, color, mat='ground', key=-99, cast=False):
        """Zemine yatık çokgen (kaldırım, avlu, su)."""
        return self.add(Prim([Face(pts, color, mat, None, False, (0, 0, 1))], key=key, cast=cast))

    # ---------------------------------------------------------- BİLEŞİKLER
    def tree(self, x, y, s=1.0, kind='olive'):
        rnd = self.rnd
        self.cylinder(x, y, 0, 0.3 * s, 0.03 * s, PAL['wood2'], 'wood', n=8)
        if kind == 'cypress':
            self.cone(x, y, 0.1 * s, 0.95 * s, 0.12 * s, hexc('#3f6a37'), 'leaf', n=12)
            return
        if kind == 'palm':
            self.cylinder(x, y, 0.3 * s, 0.75 * s, 0.025 * s, PAL['wood'], 'wood', n=8)
            for i in range(7):
                a = 2 * math.pi * i / 7
                self.add(Prim([Face([(x, y, 0.78 * s), (x + math.cos(a) * 0.3 * s, y + math.sin(a) * 0.3 * s, 0.6 * s),
                                     (x + math.cos(a + 0.25) * 0.26 * s, y + math.sin(a + 0.25) * 0.26 * s, 0.66 * s)],
                                    hexc('#5d8a3a'), 'leaf', None, False)], cull=False))
            return
        base = mix(PAL['leaf'], hexc('#7fa24d'), rnd.random() * 0.6)
        for i in range(6):
            a = rnd.random() * 2 * math.pi
            r = 0.09 * s * rnd.random()
            self.blob(x + math.cos(a) * r, y + math.sin(a) * r, (0.38 + rnd.random() * 0.14) * s,
                      (0.11 + rnd.random() * 0.05) * s, mix(base, hexc('#a4b660'), rnd.random() * 0.25))

    def crate(self, x, y, s=0.16, z=0):
        self.box(x, y, z, x + s, y + s, z + s, PAL['wood'], 'wood', deco_y=[('planks', 3)], deco_x=[('planks', 3)])

    def barrel(self, x, y, s=0.08, z=0):
        self.cylinder(x, y, z, z + s * 2.2, s, PAL['wood'], 'wood', n=12, top=PAL['wood2'])

    def flag(self, x, y, z, h=0.7, color=None, key=None):
        color = color or PAL['red']
        self.cylinder(x, y, z, z + h, 0.012, PAL['wooddark'], 'flat', n=6, cast=False)
        k = (x + y + z * 0.25 + 0.5) if key is None else key
        self.add(Prim([Face([(x, y, z + h), (x + 0.28, y - 0.04, z + h - 0.05), (x + 0.26, y - 0.04, z + h - 0.2), (x, y, z + h - 0.16)],
                            color, 'canvas', [('crescent',)], False, (0.2, 1, 0))], key=k, cull=False))

    # ---------------------------------------------------------- ÇİZİM
    def render(self, path, height_hint=None, ground_shadow=True, trim=True):
        prims = sorted(self.prims, key=lambda p: p.key)
        # Sınırlar
        allpts = [proj(p) for pr in prims for f in pr.faces for p in f.pts]
        xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
        W = OUT_W * SS
        bottom = 4 * A / 2 * SS  # elmasın alt köşesi (x=y=2)
        top = min(ys) - 40 * SS
        H = int(math.ceil(bottom - top))
        ox, oy = W / 2, -top
        T = lambda p: (p[0] + ox, p[1] + oy)
        if max(xs) + ox > W or min(xs) + ox < 0:
            print('  uyarı: yatay taşma', path)

        color = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        matbuf = Image.new('L', (W, H), 0)
        d = ImageDraw.Draw(color)
        dm = ImageDraw.Draw(matbuf)

        # Gölge: tüm parçalar ışık yönünde zemine izdüşürülür.
        if ground_shadow:
            sh = Image.new('L', (W, H), 0)
            ds = ImageDraw.Draw(sh)
            for pr in prims:
                if not pr.cast:
                    continue
                for f in pr.faces:
                    pts = []
                    for p in f.pts:
                        # Uzun gölgeler (minare) tuvalden taşmasın: boy kırpılır.
                        z = min(0.85, max(0.0, p[2]))
                        q = (p[0] - LIGHT[0] * z / LIGHT[2], p[1] - LIGHT[1] * z / LIGHT[2], 0)
                        pts.append(T(proj(q)))
                    if len(pts) >= 3:
                        ds.polygon(pts, fill=255)
            sh = sh.filter(ImageFilter.GaussianBlur(5 * SS))
            shadow = Image.new('RGBA', (W, H), (26, 34, 18, 0))
            shadow.putalpha(sh.point(lambda v: int(v * 0.42)))
            color.alpha_composite(shadow)

        edges = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        de = ImageDraw.Draw(edges)
        for pr in prims:
            for f in pr.faces:
                if pr.cull and float(np.dot(f.normal, VIEW)) <= 1e-4:
                    continue
                n = f.normal / (np.linalg.norm(f.normal) or 1)
                lam = max(0.0, float(np.dot(n, LIGHT)))
                k = f.shade if f.shade is not None else (0.70 + 0.40 * lam)
                c = mul(f.color, k)
                # sıcak ışık / serin-mor gölge
                c = mix(c, (255, 238, 205), 0.07 * lam) if lam > 0.3 else mix(c, (92, 84, 112), 0.12 * (0.3 - lam) / 0.3)
                pts = [T(proj(p)) for p in f.pts]
                d.polygon(pts, fill=c + (255,))
                if len(f.pts) == 4 and abs(n[2]) < 0.2:
                    # Dikey yüz: tabana doğru hafif koyulaşma (ortam gölgesi).
                    for i in range(5):
                        v0, v1 = i / 5 * 0.5, (i + 1) / 5 * 0.5
                        cc = mul(c, 0.86 + 0.14 * (i / 5))
                        d.polygon([T(proj(face_point(f, 0, v0))), T(proj(face_point(f, 1, v0))),
                                   T(proj(face_point(f, 1, v1))), T(proj(face_point(f, 0, v1)))], fill=cc + (255,))
                dm.polygon(pts, fill=MAT_INDEX.get(f.mat, 0))
                for dec in f.deco:
                    draw_deco(d, dm, f, dec, T, c)
                if f.outline:
                    # Kenar çizgisi yüzle birlikte çizilir: arkada kalan kenar önündeki yüzce örtülür.
                    d.line(pts + [pts[0]], fill=mul(c, 0.62) + (255,), width=int(1.1 * SS), joint='curve')
        # Doku: malzeme tamponuna göre gürültü
        color = apply_textures(color, matbuf, self.rnd)
        # Siluet kontur (Ikariam'ın temiz çizgisi)
        a = color.getchannel('A')
        grow = a.filter(ImageFilter.MaxFilter(3 * SS // 2 * 2 + 1))
        rim = ImageChops.subtract(grow, a)
        outline = Image.new('RGBA', (W, H), (54, 38, 24, 0))
        outline.putalpha(rim.point(lambda v: int(v * 0.35)))
        color = Image.alpha_composite(outline, color)
        out = color.resize((OUT_W, max(1, round(H / SS))), Image.LANCZOS)
        out.save(path, 'WEBP', quality=90, method=6)
        return out


def face_point(f, u, v):
    """Dörtgen yüzde (u,v) ∈ [0,1]² bilineer nokta."""
    p = f.pts
    if len(p) == 3:
        a = p[0] + (p[1] - p[0]) * u
        return a + (p[2] - a) * v
    a = p[0] + (p[1] - p[0]) * u
    b = p[3] + (p[2] - p[3]) * u
    return a + (b - a) * v


def face_dims(f):
    p = f.pts
    return float(np.linalg.norm(p[1] - p[0])), float(np.linalg.norm(p[-1] - p[0]))


def draw_deco(d, dm, f, dec, T, base):
    kind = dec[0]
    FP = lambda u, v: T(proj(face_point(f, u, v)))
    W_, H_ = face_dims(f)
    if kind == 'tiles':  # kiremit sıraları: v boyunca yatay çizgiler + kısa dikler
        rows = max(3, int(H_ / 0.075))
        dark = mul(base, 0.72) + (255,)
        lite = mul(base, 1.12) + (255,)
        cols = max(4, int(W_ / 0.07))
        for r in range(1, rows):
            v = r / rows
            d.line([FP(0.0, v), FP(1.0, v)], fill=dark, width=int(1.3 * SS))
            d.line([FP(0.0, v + 0.18 / rows), FP(1.0, v + 0.18 / rows)], fill=lite, width=max(1, int(0.6 * SS)))
            off = 0.5 if r % 2 else 0
            for c in range(cols):
                u = (c + off) / cols
                if 0.02 < u < 0.98:
                    d.line([FP(u, v - 0.9 / rows), FP(u, v)], fill=mul(base, 0.8) + (200,), width=max(1, int(0.8 * SS)))
        # saçak çizgisi
        d.line([FP(0, 0.005), FP(1, 0.005)], fill=mul(base, 0.6) + (255,), width=int(2 * SS))
    elif kind == 'courses':  # kesme taş sıraları
        h = dec[1] if len(dec) > 1 else 0.11
        rows = max(2, int(H_ / h))
        line = mul(base, 0.8) + (170,)
        for r in range(1, rows):
            v = r / rows
            d.line([FP(0, v), FP(1, v)], fill=line, width=max(1, int(0.9 * SS)))
            cols = max(2, int(W_ / (h * 2.2)))
            off = 0.5 if r % 2 else 0
            for c in range(cols):
                u = (c + off) / cols
                if 0.01 < u < 0.99:
                    d.line([FP(u, v), FP(u, v + 1 / rows)], fill=line, width=max(1, int(0.9 * SS)))
    elif kind == 'planks':
        n = dec[1]
        for i in range(1, n + 1):
            v = i / (n + 1)
            d.line([FP(0, v), FP(1, v)], fill=mul(base, 0.7) + (200,), width=max(1, int(0.9 * SS)))
    elif kind == 'vplanks':
        n = dec[1]
        for i in range(1, n):
            u = i / n
            d.line([FP(u, 0), FP(u, 1)], fill=mul(base, 0.72) + (200,), width=max(1, int(0.9 * SS)))
    elif kind == 'band':  # yatay silme / kuşak
        v0, v1, col = dec[1], dec[2], dec[3]
        c = mul(col, (sum(base) / 3) / max(1, sum(PAL['plaster']) / 3))
        d.polygon([FP(0, v0), FP(1, v0), FP(1, v1), FP(0, v1)], fill=c + (255,))
    elif kind in ('win', 'arch', 'door', 'archdoor'):
        # ('win', u_center, v_bottom, w, h, shutter?) — ölçüler dünya biriminde
        uc, vb, w, h = dec[1], dec[2], dec[3], dec[4]
        extra = dec[5] if len(dec) > 5 else None
        u0, u1 = uc - w / 2 / W_, uc + w / 2 / W_
        v0, v1 = vb / H_, (vb + h) / H_
        arch = kind in ('arch', 'archdoor')
        dark = PAL['door'] if kind in ('door', 'archdoor') else PAL['window']
        lum = (sum(base) / 3) / 210
        dark = mul(dark, 0.8 + 0.3 * lum)
        def outline_pts(pad):
            pu, pv = pad / W_, pad / H_
            pts = [(u0 - pu, v0 - pv), (u1 + pu, v0 - pv)]
            if arch:
                rv = (w / 2) / H_
                top = v1 - rv
                pts.append((u1 + pu, top))
                for i in range(1, 12):
                    t = math.pi * i / 12
                    pts.append((uc + (w / 2 / W_ + pu) * math.cos(t), top + (rv + pv) * math.sin(t)))
                pts.append((u0 - pu, top))
            else:
                pts += [(u1 + pu, v1 + pv), (u0 - pu, v1 + pv)]
            return [FP(u, v) for u, v in pts]
        d.polygon(outline_pts(0.025), fill=mul(PAL['frame'], 0.75 + 0.3 * lum) + (255,))
        d.polygon(outline_pts(0.0), fill=dark + (255,))
        if kind == 'win' and extra == 'shutter':
            sw = w * 0.55
            for side in (-1, 1):
                a0 = uc + side * (w / 2 + 0.01) / W_
                a1 = uc + side * (w / 2 + sw) / W_
                d.polygon([FP(a0, v0), FP(a1, v0), FP(a1, v1), FP(a0, v1)], fill=mul(PAL['shutter'], 0.7 + 0.4 * lum) + (255,))
        if kind in ('win', 'arch') and h > 0.1:
            # pencere ışıltısı
            d.line([FP(uc, v0 + 0.01), FP(uc, v1 - 0.02)], fill=mul(PAL['frame'], 0.6) + (160,), width=max(1, int(0.8 * SS)))
        if kind == 'win':
            d.line([FP(u0 - 0.03 / W_, v0 - 0.012 / H_), FP(u1 + 0.03 / W_, v0 - 0.012 / H_)], fill=mul(PAL['frame'], 0.95) + (255,), width=int(2 * SS))
    elif kind == 'studs':  # ahşap karkas: dikmeler + çapraz payandalar (Osmanlı konağı üst katı)
        n, v0, v1, col = dec[1], dec[2], dec[3], dec[4]
        c = mul(col, 0.75 + 0.35 * ((sum(base) / 3) / 210)) + (255,)
        wd = max(1, int(1.6 * SS))
        d.line([FP(0, v0), FP(1, v0)], fill=c, width=wd)
        d.line([FP(0, v1), FP(1, v1)], fill=c, width=wd)
        for i in range(n + 1):
            u = i / n
            d.line([FP(u, v0), FP(u, v1)], fill=c, width=wd)
            if i < n and i % 2 == 0:
                d.line([FP(u, v0), FP(u + 1 / n, v1)], fill=c, width=max(1, int(1.1 * SS)))
    elif kind == 'kafes':  # kafesli pencere: çerçeve, koyu iç, ahşap çapraz kafes
        uc, vb, w, h = dec[1], dec[2], dec[3], dec[4]
        u0, u1 = uc - w / 2 / W_, uc + w / 2 / W_
        v0, v1 = vb / H_, (vb + h) / H_
        pu, pv = 0.02 / W_, 0.02 / H_
        d.polygon([FP(u0 - pu, v0 - pv), FP(u1 + pu, v0 - pv), FP(u1 + pu, v1 + pv), FP(u0 - pu, v1 + pv)], fill=mul(PAL['wooddark'], 1.1) + (255,))
        d.polygon([FP(u0, v0), FP(u1, v0), FP(u1, v1), FP(u0, v1)], fill=mul(PAL['window'], 0.9) + (255,))
        lc = mul(PAL['wood'], 1.15) + (255,)
        k = 5
        for i in range(-k, k + 1):
            a = i / k
            d.line([FP(u0 + (u1 - u0) * max(0, a), v0 + (v1 - v0) * max(0, -a)), FP(u0 + (u1 - u0) * min(1, 1 + a), v0 + (v1 - v0) * min(1, 1 - a))], fill=lc, width=max(1, int(0.8 * SS)))
            d.line([FP(u1 - (u1 - u0) * max(0, a), v0 + (v1 - v0) * max(0, -a)), FP(u1 - (u1 - u0) * min(1, 1 + a), v0 + (v1 - v0) * min(1, 1 - a))], fill=lc, width=max(1, int(0.8 * SS)))
    elif kind == 'cini':  # çini kuşak: mavi zemin, beyaz-turkuaz desen
        v0, v1 = dec[1], dec[2]
        d.polygon([FP(0, v0), FP(1, v0), FP(1, v1), FP(0, v1)], fill=hexc('#2f6a9a') + (255,))
        n = max(4, int(W_ / 0.06))
        for i in range(n):
            u = (i + 0.5) / n
            c = FP(u, (v0 + v1) / 2)
            r = 0.012 * A * SS
            d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=(236, 244, 246, 255) if i % 2 else (64, 170, 170, 255))
        d.line([FP(0, v0), FP(1, v0)], fill=hexc('#f4efe4') + (255,), width=max(1, int(1.0 * SS)))
        d.line([FP(0, v1), FP(1, v1)], fill=hexc('#f4efe4') + (255,), width=max(1, int(1.0 * SS)))
    elif kind == 'stripes':  # tente çizgileri (u boyunca)
        n, col = dec[1], dec[2]
        for i in range(0, n, 2):
            a0, a1 = i / n, (i + 1) / n
            d.polygon([FP(a0, 0), FP(a1, 0), FP(a1, 1), FP(a0, 1)], fill=mul(col, (sum(base) / 3) / 200) + (255,))
    elif kind == 'crescent':
        c = FP(0.5, 0.5)
        r = 0.035 * A * SS
        d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=(250, 244, 230, 255))
        d.ellipse([c[0] - r * 0.55, c[1] - r * 1.0, c[0] + r * 1.2, c[1] + r * 0.8], fill=base + (255,))
    elif kind == 'ribs':  # kurşun çatı/kubbe dilimleri gibi dikey çizgiler
        n = dec[1]
        for i in range(1, n):
            d.line([FP(i / n, 0), FP(i / n, 1)], fill=mul(base, 0.8) + (200,), width=max(1, int(0.8 * SS)))
    elif kind == 'grid':  # kaldırım/avlu taşları (üst yüz)
        n = dec[1]
        for i in range(1, n):
            d.line([FP(i / n, 0), FP(i / n, 1)], fill=mul(base, 0.86) + (200,), width=max(1, int(0.7 * SS)))
            d.line([FP(0, i / n), FP(1, i / n)], fill=mul(base, 0.86) + (200,), width=max(1, int(0.7 * SS)))


_NOISE = {}


def _noise(W, H, scale, seed):
    key = (W, H, scale, seed)
    if key not in _NOISE:
        rng = np.random.default_rng(seed)
        sw, sh = max(2, int(W / (scale * 6 * SS))), max(2, int(H / (scale * 6 * SS)))
        small = rng.random((sh, sw)).astype(np.float32)
        img = Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
        fine = Image.effect_noise((W, H), 60).filter(ImageFilter.GaussianBlur(0.8 * SS))
        a = np.asarray(img, dtype=np.float32) / 255 - 0.5
        b = np.asarray(fine, dtype=np.float32) / 255 - 0.5
        _NOISE[key] = a * 0.7 + b * 0.6
    return _NOISE[key]


def apply_textures(color, matbuf, rnd):
    arr = np.asarray(color, dtype=np.float32).copy()
    mat = np.asarray(matbuf)
    H, W = mat.shape
    for name, (strength, scale) in MATERIALS.items():
        if strength <= 0:
            continue
        m = mat == MAT_INDEX[name]
        if not m.any():
            continue
        nz = _noise(W, H, scale, MAT_INDEX[name] * 7 + 3)
        f = 1 + nz * strength * 2
        for ch in range(3):
            arr[..., ch] = np.where(m, arr[..., ch] * f, arr[..., ch])
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')
