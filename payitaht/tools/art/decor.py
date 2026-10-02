"""
PAYİTAHT ÇEVRE SANATI — ağaçlar, çalı, çiçek, kaya, sur kulesi, zemin dokuları.

    python3 tools/art/decor.py

Hepsi isokit ile (bina sanatıyla AYNI ışık/izdüşüm) çizilir; eski boyalı
paketin yerini alır. Dekor görselleri sıkı kırpılır: taban noktası yatayda
ortada ve yüksekliğin %92'sinde durur (terrain-builder origin 0.5, 0.92).
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from isokit import PAL, Scene, hexc, mix, OUT_W, A  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DECOR = os.path.join(ROOT, 'public', 'images', 'game', 'decor')
TERRAIN = os.path.join(ROOT, 'public', 'images', 'game', 'terrain')
WALLS = os.path.join(ROOT, 'public', 'images', 'game', 'walls')
TMP = '/tmp/_decor.webp'


def crop_base(img, base_frac=0.92, contact=True):
    """Taban (1,1,0) -> (300, H-120). Yatayda ortalı, tabanı %92'de kırp."""
    W, H = img.size
    bx, by = W // 2, H - int(A)
    a = np.asarray(img.getchannel('A'))
    ys, xs = np.nonzero(a > 6)
    half = int(max(bx - xs.min(), xs.max() - bx)) + 4
    top = int(ys.min()) - 2
    h = int(math.ceil((by - top) / base_frac))
    out = Image.new('RGBA', (half * 2, h), (0, 0, 0, 0))
    out.alpha_composite(img.crop((bx - half, top, bx + half, min(H, top + h))), (0, 0))
    if contact:
        sh = Image.new('RGBA', out.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(sh)
        cy = by - top
        rx = half * 0.55
        d.ellipse([half - rx * 0.8, cy - rx * 0.22, half + rx * 1.1, cy + rx * 0.26], fill=(28, 40, 20, 70))
        sh = sh.filter(ImageFilter.GaussianBlur(6))
        sh.alpha_composite(out)
        out = sh
    return out


def render_crop(build, path, size_w, seed=1, **kw):
    s = Scene(seed)
    build(s)
    im = s.render(TMP, ground_shadow=False)
    out = crop_base(im, **kw)
    h = round(out.height * size_w / out.width)
    out = out.resize((size_w, h), Image.LANCZOS)
    out.save(path, optimize=True)
    print('yazıldı', os.path.relpath(path, ROOT), out.size)


def olive(s):
    s.rnd.seed(11)
    for (dx, dy, t) in ((0, 0, 0.034), (0.03, -0.05, 0.022)):
        s.cylinder(1 + dx, 1 + dy, 0, 0.24, t, hexc('#6e5236'), 'wood', n=8)
    # Zeytin: geniş, alçak, gümüşi-yeşil; birçok küçük yaprak kümesi.
    base = hexc('#72914c')
    for i in range(18):
        a = s.rnd.random() * 2 * math.pi
        r = 0.24 * math.sqrt(s.rnd.random())
        s.blob(1 + math.cos(a) * r, 1 + math.sin(a) * r, 0.27 + s.rnd.random() * 0.12,
               0.075 + s.rnd.random() * 0.04, mix(base, hexc('#a9b27a'), s.rnd.random() * 0.5), squash=0.7)


def bush(s):
    s.rnd.seed(5)
    for i in range(6):
        a = s.rnd.random() * 2 * math.pi
        r = 0.09 * math.sqrt(s.rnd.random())
        s.blob(1 + math.cos(a) * r, 1 + math.sin(a) * r, 0.06 + s.rnd.random() * 0.05,
               0.07 + s.rnd.random() * 0.03, mix(hexc('#5b8a3b'), hexc('#8fae55'), s.rnd.random() * 0.5), squash=0.8)


def flower(s):
    bush(s)
    s.rnd.seed(9)
    for i in range(9):
        a = s.rnd.random() * 2 * math.pi
        r = 0.1 * math.sqrt(s.rnd.random())
        col = [hexc('#d9534a'), hexc('#f2d24c'), hexc('#f4f0e6'), hexc('#c46fb0')][i % 4]
        s.sphere(1 + math.cos(a) * r, 1 + math.sin(a) * r, 0.1 + s.rnd.random() * 0.05, 0.018, col, n=8, rings=5)


def rock(s):
    s.rnd.seed(3)
    for (dx, dy, z, r) in ((0, 0, 0.02, 0.12), (0.09, 0.06, 0.0, 0.07), (-0.07, 0.08, 0.0, 0.06)):
        s.blob(1 + dx, 1 + dy, z, r, mix(hexc('#b3a994'), hexc('#8f8676'), s.rnd.random() * 0.6), 'stone', squash=0.75)


def cypress(s, tall=1.0):
    s.cylinder(1, 1, 0, 0.1, 0.02, hexc('#6e5236'), 'wood', n=8)
    col = hexc('#3e6a36')
    s.cone(1, 1, 0.05, 0.85 * tall, 0.1, col, 'leaf', n=14)
    s.cone(1, 1, 0.2, 0.55 * tall, 0.115, mix(col, hexc('#5b8a45'), 0.25), 'leaf', n=14)


def pine(s):
    """Fıstık çamı: uzun eğik gövde, tepede yayvan şemsiye taç."""
    s.rnd.seed(21)
    s.cylinder(1, 1, 0, 0.62, 0.028, hexc('#7a5634'), 'wood', n=8)
    s.cylinder(1.04, 0.98, 0.45, 0.66, 0.02, hexc('#6e4c2e'), 'wood', n=8)
    base = hexc('#3f6a3a')
    for i in range(22):
        a = s.rnd.random() * 2 * math.pi
        r = 0.27 * math.sqrt(s.rnd.random())
        s.blob(1 + math.cos(a) * r, 1 + math.sin(a) * r, 0.66 + s.rnd.random() * 0.08,
               0.07 + s.rnd.random() * 0.035, mix(base, hexc('#6f9a4e'), s.rnd.random() * 0.55), squash=0.55)


def plane_tree(s):
    """Çınar: kalın gövde, iri yuvarlak koyu yeşil taç."""
    s.rnd.seed(33)
    s.cylinder(1, 1, 0, 0.36, 0.05, hexc('#8a7a62'), 'wood', n=10)
    base = hexc('#4f7e3a')
    for i in range(26):
        a = s.rnd.random() * 2 * math.pi
        r = 0.22 * math.sqrt(s.rnd.random())
        s.blob(1 + math.cos(a) * r, 1 + math.sin(a) * r, 0.36 + s.rnd.random() * 0.26,
               0.09 + s.rnd.random() * 0.05, mix(base, hexc('#86ad54'), s.rnd.random() * 0.5), squash=0.85)


def poplar(s):
    """Kavak: ince uzun, açık yeşil sütun."""
    s.rnd.seed(44)
    s.cylinder(1, 1, 0, 0.12, 0.022, hexc('#8a7a62'), 'wood', n=8)
    for i in range(14):
        z = 0.1 + i * 0.06
        w = 0.07 + 0.05 * math.sin(min(1, (i + 1) / 13) * math.pi)
        s.blob(1 + (s.rnd.random() - 0.5) * 0.03, 1 + (s.rnd.random() - 0.5) * 0.03, z, w,
               mix(hexc('#6f9a3e'), hexc('#b3c264'), s.rnd.random() * 0.6), squash=0.9)


def fruit_tree(s):
    """Portakal / nar ağacı: küçük yuvarlak taç, turuncu ve kızıl meyveler."""
    s.rnd.seed(55)
    s.cylinder(1, 1, 0, 0.16, 0.024, hexc('#6e5236'), 'wood', n=8)
    for i in range(12):
        a = s.rnd.random() * 2 * math.pi
        r = 0.12 * math.sqrt(s.rnd.random())
        s.blob(1 + math.cos(a) * r, 1 + math.sin(a) * r, 0.18 + s.rnd.random() * 0.1,
               0.065 + s.rnd.random() * 0.03, mix(hexc('#3f7a34'), hexc('#6d9c45'), s.rnd.random() * 0.5), squash=0.85)
    for i in range(11):
        a = s.rnd.random() * 2 * math.pi
        r = 0.15 * math.sqrt(s.rnd.random())
        s.sphere(1 + math.cos(a) * r, 1 + math.sin(a) * r, 0.2 + s.rnd.random() * 0.1, 0.017,
                 hexc('#e8892b') if i % 3 else hexc('#b8322a'), n=8, rings=5)


def haystack(s):
    """Saman yığını: altın sarısı kubbe, tepesinde çubuk."""
    col = hexc('#d9b45a')
    s.cylinder(1, 1, 0, 0.1, 0.16, col, 'canvas', n=20)
    s.dome(1, 1, 0.1, 0.16, mix(col, hexc('#f0d58a'), 0.3), 'canvas', hscale=1.3, n=20, rings=7, ribs=False, finial=False)
    s.cylinder(1, 1, 0.28, 0.36, 0.008, PAL['wooddark'], 'wood', n=6)


def well(s):
    """Kuyu: taş bilezik, iki direk, kiremit çatı, kova."""
    s.cylinder(1, 1, 0, 0.1, 0.1, PAL['stone'], 'stone', n=18, top=PAL['water'], topmat='flat')
    for dx in (-0.1, 0.1):
        s.box(1 + dx - 0.012, 1 - 0.012, 0.1, 1 + dx + 0.012, 1 + 0.012, 0.3, PAL['wood2'], 'wood')
    s.box(1 - 0.11, 1 - 0.01, 0.26, 1 + 0.11, 1 + 0.01, 0.28, PAL['wood'], 'wood')
    s.gable(0.86, 0.9, 1.14, 1.1, 0.3, 0.08, PAL['roof'], axis='x', over=0.02)
    s.cylinder(1.03, 1.03, 0.1, 0.15, 0.022, PAL['wood'], 'wood', n=10)


def woodpile(s):
    """Odun yığını: kesik kütükler."""
    s.rnd.seed(8)
    for row, z in ((0, 0), (1, 0.05), (2, 0.1)):
        for i in range(4 - row):
            x = 0.86 + row * 0.03 + i * 0.075
            s.box(x, 0.94, z, x + 0.065, 1.12, z + 0.05, mix(PAL['wood'], PAL['wood2'], s.rnd.random()), 'wood',
                  top=mix(hexc('#e6c08a'), hexc('#c9a06a'), s.rnd.random()))
    s.box(1.18, 0.98, 0, 1.24, 1.04, 0.07, PAL['wooddark'], 'wood')


def beehives(s):
    """Arı kovanları: üç küçük boyalı kutu."""
    cols = [hexc('#e8d6a0'), hexc('#d9b45a'), hexc('#c9a06a')]
    for i, (x, y) in enumerate(((0.9, 0.95), (1.06, 0.92), (0.98, 1.1))):
        s.box(x, y, 0, x + 0.09, y + 0.09, 0.09, cols[i], 'wood')
        s.hip(x - 0.01, y - 0.01, x + 0.1, y + 0.1, 0.09, 0.035, PAL['roof2'], over=0.0)


def tulip_bed(s):
    """Lale tarhı: taş bordürlü toprak, kırmızı ve sarı lale sıraları."""
    s.box(0.8, 0.9, 0, 1.2, 1.1, 0.025, PAL['stone2'], 'stone', top=hexc('#7a5a3a'), topmat='ground')
    s.rnd.seed(12)
    for i in range(8):
        for j in range(3):
            x, y = 0.83 + i * 0.048, 0.94 + j * 0.06
            s.cylinder(x, y, 0.025, 0.07, 0.004, hexc('#4f7d3a'), 'leaf', n=5)
            s.sphere(x, y, 0.08, 0.014, [hexc('#c9302c'), hexc('#f2c230'), hexc('#d94f7a')][(i + j) % 3], n=8, rings=5)


# ---------------------------------------------------------------- MAHALLE (V2 Faz 4.4)

def cesme(s):
    """Meydan çeşmesi: sekiz köşe mermer havuz, ortada kubbeli taş sebil, su."""
    s.cylinder(1, 1, 0, 0.07, 0.24, PAL['marble'], 'marble', n=8, top=PAL['water'], topmat='flat')
    s.cylinder(1, 1, 0.0, 0.24, 0.07, PAL['stone'], 'stone', n=8)
    s.cylinder(1, 1, 0.24, 0.27, 0.095, PAL['stone2'], 'stone', n=8)
    s.dome(1, 1, 0.27, 0.08, PAL['lead'], 'lead', n=16, rings=6)
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        s.cylinder(1 + math.cos(ang) * 0.08, 1 + math.sin(ang) * 0.08, 0.12, 0.14, 0.012, PAL['gold'], 'flat', n=6)


def tezgah(s):
    """Pazar tezgâhı: tahta sergi, dört direk, kırmızı-beyaz çizgili tente, meyve sepetleri."""
    s.box(0.8, 0.9, 0, 1.2, 1.1, 0.12, PAL['wood'], 'wood', deco_y=[('planks', 3)])
    for x, y in ((0.8, 0.9), (1.18, 0.9), (0.8, 1.08), (1.18, 1.08)):
        s.box(x, y, 0, x + 0.02, y + 0.02, 0.34, PAL['wood2'], 'wood')
    for i in range(5):
        x0 = 0.77 + i * 0.094
        s.gable(x0, 0.86, x0 + 0.094, 1.14, 0.34, 0.07, PAL['red'] if i % 2 == 0 else PAL['white'], axis='y', over=0.0, mat='canvas')
    s.rnd.seed(21)
    fruit = [hexc('#e07b26'), hexc('#c9302c'), hexc('#e8c337'), hexc('#7aa13c')]
    for i in range(4):
        x = 0.86 + i * 0.09
        s.cylinder(x, 1.0, 0.12, 0.15, 0.035, hexc('#c8a165'), 'wood', n=10)
        for k in range(3):
            s.sphere(x - 0.012 + k * 0.012, 1.0 + (k % 2) * 0.01, 0.165, 0.016, fruit[i], n=8, rings=5)
    s.crate(1.22, 1.12, 0.09)


def bostan(s):
    """Bostan: çit içinde toprak tarhlar, sıra sıra sebze, bir korkuluk."""
    s.box(0.72, 0.84, 0, 1.28, 1.16, 0.02, hexc('#8a6440'), 'ground', top=hexc('#7a5434'), topmat='ground')
    s.rnd.seed(33)
    greens = [hexc('#5f8c3e'), hexc('#7aa64a'), hexc('#4a7a36')]
    for r in range(4):
        y = 0.88 + r * 0.075
        for i in range(7):
            x = 0.76 + i * 0.075
            s.blob(x, y, 0.04, 0.028, greens[(r + i) % 3])
            if r == 1 and i % 2 == 0:
                s.sphere(x, y, 0.06, 0.016, hexc('#c9302c'), n=8, rings=5)
    for x in (0.7, 1.3):
        for k in range(5):
            y = 0.82 + k * 0.085
            s.box(x - 0.008, y, 0, x + 0.008, y + 0.012, 0.09, PAL['wood2'], 'wood')
    s.box(0.7, 0.82, 0.06, 0.712, 1.18, 0.07, PAL['wood'], 'wood')
    s.box(1.29, 0.82, 0.06, 1.302, 1.18, 0.07, PAL['wood'], 'wood')
    s.box(0.99, 0.99, 0, 1.01, 1.01, 0.26, PAL['wood2'], 'wood')
    s.box(0.94, 0.99, 0.18, 1.06, 1.01, 0.2, PAL['wood2'], 'wood')
    s.sphere(1.0, 1.0, 0.29, 0.03, PAL['canvas'], n=8, rings=6)


def mezarlik(s):
    """Mezarlık: alçak taş duvar, kavuklu ve sade mezar taşları, servi."""
    s.box(0.72, 0.84, 0, 1.28, 0.86, 0.06, PAL['stone2'], 'stone')
    s.box(0.72, 0.84, 0, 0.74, 1.16, 0.06, PAL['stone2'], 'stone')
    s.flat([(0.74, 0.86, 0.001), (1.28, 0.86, 0.001), (1.28, 1.16, 0.001), (0.74, 1.16, 0.001)], hexc('#6f8a4a'))
    s.rnd.seed(41)
    for r in range(2):
        for i in range(4):
            x, y = 0.84 + i * 0.11, 0.94 + r * 0.12
            h = 0.07 + s.rnd.random() * 0.04
            s.box(x, y, 0, x + 0.04, y + 0.014, h, PAL['marble'], 'marble')
            if (i + r) % 2 == 0:
                s.cylinder(x + 0.02, y + 0.007, h, h + 0.03, 0.024, PAL['white'], 'marble', n=10)
                s.cylinder(x + 0.02, y + 0.007, h + 0.03, h + 0.04, 0.012, hexc('#c9302c'), 'flat', n=8)
    s.tree(1.24, 0.9, 0.45, kind='cypress')


def degirmen(s):
    """Yel değirmeni: taş gövde, ahşap külah, dört kanat."""
    s.cylinder(1, 1, 0, 0.5, 0.13, PAL['stone'], 'stone', n=14)
    s.cone(1, 1, 0.5, 0.16, 0.15, PAL['wood2'], 'wood', n=14)
    s.box(0.98, 1.12, 0.3, 1.02, 1.16, 0.38, PAL['wooddark'], 'wood')
    hub_x, hub_y, hub_z = 1.0, 1.17, 0.36
    s.box(hub_x - 0.012, hub_y, hub_z - 0.012, hub_x + 0.012, hub_y + 0.02, hub_z + 0.33, PAL['wood'], 'wood')
    s.box(hub_x - 0.012, hub_y, hub_z - 0.33, hub_x + 0.012, hub_y + 0.02, hub_z - 0.0, PAL['wood'], 'wood')
    s.box(hub_x - 0.33, hub_y, hub_z - 0.012, hub_x, hub_y + 0.02, hub_z + 0.012, PAL['wood'], 'wood')
    s.box(hub_x, hub_y, hub_z - 0.012, hub_x + 0.33, hub_y + 0.02, hub_z + 0.012, PAL['wood'], 'wood')
    for dx, dz, w, h in ((0.014, 0.08, 0.07, 0.24), (-0.084, -0.32, 0.07, 0.24)):
        s.box(hub_x + dx, hub_y + 0.004, hub_z + dz, hub_x + dx + w, hub_y + 0.016, hub_z + dz + h, PAL['canvas'], 'canvas')
    for dx, dz, w, h in ((-0.32, 0.014, 0.24, 0.07), (0.08, -0.084, 0.24, 0.07)):
        s.box(hub_x + dx, hub_y + 0.004, hub_z + dz, hub_x + dx + w, hub_y + 0.016, hub_z + dz + h, PAL['canvas'], 'canvas')
    s.box(0.95, 0.86, 0, 1.05, 0.88, 0.16, PAL['door'], 'wood')


def mahalle():
    """Yalnız mahalle dekorlarını çiz: python3 tools/art/decor.py mahalle"""
    render_crop(cesme, os.path.join(DECOR, 'cesme.png'), 260)
    render_crop(tezgah, os.path.join(DECOR, 'tezgah.png'), 300)
    render_crop(bostan, os.path.join(DECOR, 'bostan.png'), 340)
    render_crop(mezarlik, os.path.join(DECOR, 'mezarlik.png'), 340)
    render_crop(degirmen, os.path.join(DECOR, 'degirmen.png'), 300)


def tower(s):
    col = hexc('#dcc69a')
    s.cylinder(1, 1, 0, 1.25, 0.16, col, 'stone', n=24)
    s.cylinder(1, 1, 1.18, 1.26, 0.19, mix(col, hexc('#ffffff'), 0.15), 'stone', n=24)
    for i in range(10):
        a = 2 * math.pi * i / 10
        s.box(1 + math.cos(a) * 0.16 - 0.025, 1 + math.sin(a) * 0.16 - 0.025, 1.26,
              1 + math.cos(a) * 0.16 + 0.025, 1 + math.sin(a) * 0.16 + 0.025, 1.33, col, 'stone')
    s.cone(1, 1, 1.3, 0.42, 0.17, PAL['roof'], 'roof', n=24)
    s.sphere(1, 1, 1.74, 0.018, PAL['gold'])


def texture(path, colors, seed, pebbles=None, blades=None, size=(1116, 775)):
    rng = np.random.default_rng(seed)
    W, H = size
    base = np.zeros((H, W, 3), np.float32)
    lo = np.asarray(Image.fromarray((rng.random((H // 40, W // 40)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    mid = np.asarray(Image.fromarray((rng.random((H // 10, W // 10)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    c0, c1, c2 = [np.array(c, np.float32) for c in colors]
    t = lo[..., None]
    base = c0 * (1 - t) + c1 * t
    base = base * (0.9 + mid[..., None] * 0.2)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    r = random.Random(seed)
    if blades:
        for _ in range(9000):
            x, y = r.random() * W, r.random() * H
            L = 4 + r.random() * 7
            col = tuple(int(v) for v in mix(c2, colors[r.randrange(2)], r.random()))
            d.line([(x, y), (x + (r.random() - 0.5) * 3, y - L)], fill=col + (150,), width=1)
    if pebbles:
        for _ in range(pebbles):
            x, y = r.random() * W, r.random() * H
            rr = 1.5 + r.random() * 3
            col = tuple(int(v) for v in mix(c2, (240, 228, 200), r.random() * 0.5))
            d.ellipse([x - rr, y - rr * 0.7, x + rr, y + rr * 0.7], fill=col + (200,))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    img.save(path, optimize=True)
    print('yazıldı', os.path.relpath(path, ROOT), img.size)


def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'yeni':
        return yeni()
    if len(sys.argv) > 1 and sys.argv[1] == 'mahalle':
        return mahalle()
    os.makedirs(DECOR, exist_ok=True); os.makedirs(TERRAIN, exist_ok=True); os.makedirs(WALLS, exist_ok=True)
    render_crop(olive, os.path.join(DECOR, 'olive-tree.png'), 420)
    render_crop(bush, os.path.join(DECOR, 'bush.png'), 300)
    render_crop(flower, os.path.join(DECOR, 'flower.png'), 300)
    render_crop(rock, os.path.join(DECOR, 'rock.png'), 320)
    render_crop(lambda s: cypress(s, 1.0), os.path.join(DECOR, 'cypress.png'), 150)
    render_crop(lambda s: cypress(s, 0.75), os.path.join(DECOR, 'cypress-b.png'), 160)
    render_crop(pine, os.path.join(DECOR, 'pine.png'), 360)
    render_crop(plane_tree, os.path.join(DECOR, 'plane-tree.png'), 400)
    render_crop(poplar, os.path.join(DECOR, 'poplar.png'), 150)
    render_crop(fruit_tree, os.path.join(DECOR, 'fruit-tree.png'), 240)
    render_crop(haystack, os.path.join(DECOR, 'haystack.png'), 220)
    render_crop(well, os.path.join(DECOR, 'well.png'), 220)
    render_crop(woodpile, os.path.join(DECOR, 'woodpile.png'), 260)
    render_crop(beehives, os.path.join(DECOR, 'beehives.png'), 240)
    render_crop(tulip_bed, os.path.join(DECOR, 'tulip-bed.png'), 300)
    # Sur kulesi: taban tuvalin alt kenarında (phaser-city origin 0.5, 1).
    render_crop(tower, os.path.join(WALLS, 'tower-round.png'), 222, base_frac=0.97, contact=False)
    texture(os.path.join(TERRAIN, 'grass.png'), [(120, 158, 84), (150, 176, 96), (86, 124, 58)], 7, blades=True)
    texture(os.path.join(TERRAIN, 'dirt.png'), [(196, 168, 118), (176, 146, 98), (128, 104, 70)], 8, pebbles=900, size=(1144, 820))



def yeni():
    """Yalnızca 0.26 dekorlarını çiz (eskiler aynen kalsın)."""
    render_crop(pine, os.path.join(DECOR, 'pine.png'), 360)
    render_crop(plane_tree, os.path.join(DECOR, 'plane-tree.png'), 400)
    render_crop(poplar, os.path.join(DECOR, 'poplar.png'), 150)
    render_crop(fruit_tree, os.path.join(DECOR, 'fruit-tree.png'), 240)
    render_crop(haystack, os.path.join(DECOR, 'haystack.png'), 220)
    render_crop(well, os.path.join(DECOR, 'well.png'), 220)
    render_crop(woodpile, os.path.join(DECOR, 'woodpile.png'), 260)
    render_crop(beehives, os.path.join(DECOR, 'beehives.png'), 240)
    render_crop(tulip_bed, os.path.join(DECOR, 'tulip-bed.png'), 300)


if __name__ == '__main__':
    main()
