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
    os.makedirs(DECOR, exist_ok=True); os.makedirs(TERRAIN, exist_ok=True); os.makedirs(WALLS, exist_ok=True)
    render_crop(olive, os.path.join(DECOR, 'olive-tree.png'), 420)
    render_crop(bush, os.path.join(DECOR, 'bush.png'), 300)
    render_crop(flower, os.path.join(DECOR, 'flower.png'), 300)
    render_crop(rock, os.path.join(DECOR, 'rock.png'), 320)
    render_crop(lambda s: cypress(s, 1.0), os.path.join(DECOR, 'cypress.png'), 150)
    render_crop(lambda s: cypress(s, 0.75), os.path.join(DECOR, 'cypress-b.png'), 160)
    # Sur kulesi: taban tuvalin alt kenarında (phaser-city origin 0.5, 1).
    render_crop(tower, os.path.join(WALLS, 'tower-round.png'), 222, base_frac=0.97, contact=False)
    texture(os.path.join(TERRAIN, 'grass.png'), [(120, 158, 84), (150, 176, 96), (86, 124, 58)], 7, blades=True)
    texture(os.path.join(TERRAIN, 'dirt.png'), [(196, 168, 118), (176, 146, 98), (128, 104, 70)], 8, pebbles=900, size=(1144, 820))


if __name__ == '__main__':
    main()
