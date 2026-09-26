"""
ADA GÖRÜNÜMÜ ARKAPLANLARI — her ada için boyalı bir kuşbakışı harita.

    python3 tools/art/islands.py

lib/game/island-layout.json'daki yerleri (şehir, maden, orman, üç bağımsız
yerleşim) kara üstünde tutar, aralarına patika çizer, ormanı dekor
sprite'larıyla (tools/art/decor.py) doldurur. Deterministik: ada kimliği tohum.
Çıktı: public/images/game/islands/<ada>.webp (900x1200).
"""
import json
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
LAYOUT = json.load(open(os.path.join(ROOT, 'lib', 'game', 'island-layout.json')))
W, H = LAYOUT['size']
SS = 2
DECOR = os.path.join(ROOT, 'public', 'images', 'game', 'decor')
OUT = os.path.join(ROOT, 'public', 'images', 'game', 'islands')
ISLANDS = ['sahil', 'zeytin', 'akcam', 'kizil', 'akdeniz', 'yalcin', 'baglik', 'atessiz',
           'mercan', 'sakiz', 'lodos', 'kartal', 'poyraz', 'fener', 'hisarada', 'lalezar']
# Adanın kaynağına göre hafif renk karakteri.
MOOD = {
    'sahil': (0, 0, 0), 'akdeniz': (4, 2, -4), 'zeytin': (-6, 8, -6), 'baglik': (-4, 6, -8),
    'akcam': (-8, -2, 10), 'yalcin': (-6, -2, 8), 'kizil': (14, 2, -12), 'atessiz': (16, 0, -14),
    'mercan': (-4, 6, -6), 'sakiz': (2, 2, -2), 'lodos': (-8, -2, 12), 'kartal': (12, 0, -10),
    'poyraz': (-2, 8, -8), 'fener': (-6, -4, 10), 'hisarada': (14, -2, -12), 'lalezar': (6, 2, -2),
}


def shape(seed):
    """Gürültülü radyal ada kıyısı (tam çözünürlükte nokta listesi)."""
    rnd = random.Random(seed)
    phases = [(rnd.uniform(0, 6.28), k, rnd.uniform(0.02, 0.06) / (k ** 0.35)) for k in range(2, 9)]
    pts = []
    for i in range(240):
        a = 2 * math.pi * i / 240
        r = 1 + sum(amp * math.sin(k * a + ph) for ph, k, amp in phases)
        pts.append((W * SS * (0.5 + 0.41 * r * math.cos(a)), H * SS * (0.5 + 0.37 * r * math.sin(a))))
    return pts


def mask_of(pts, grow=0.0):
    cx, cy = W * SS / 2, H * SS / 2
    m = Image.new('L', (W * SS, H * SS), 0)
    ImageDraw.Draw(m).polygon([(cx + (x - cx) * (1 + grow), cy + (y - cy) * (1 + grow)) for x, y in pts], fill=255)
    return m


def tile(path, size):
    t = Image.open(path).convert('RGB')
    out = Image.new('RGB', size)
    for y in range(0, size[1], t.height):
        for x in range(0, size[0], t.width):
            out.paste(t, (x, y))
    return out


def island(iid):
    seed = sum(map(ord, iid)) * 97
    rnd = random.Random(seed)
    WS, HS = W * SS, H * SS
    # Deniz: dikey degrade + dalga çizgileri.
    sea = np.zeros((HS, WS, 3), np.float32)
    t = np.linspace(0, 1, HS)[:, None]
    sea[..., 0] = 38 - 12 * t; sea[..., 1] = 126 - 30 * t; sea[..., 2] = 142 - 26 * t
    img = Image.fromarray(sea.astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    for _ in range(420):
        x, y = rnd.uniform(0, WS), rnd.uniform(0, HS)
        L = rnd.uniform(14, 34) * SS
        d.arc([x, y, x + L, y + L * 0.35], 200, 340, fill=(190, 230, 228, 60), width=SS)
    pts = shape(seed)
    land = mask_of(pts)
    # Sığ su ve kum.
    shallow = mask_of(pts, 0.08).filter(ImageFilter.GaussianBlur(26 * SS))
    img.alpha_composite(Image.merge('RGBA', [Image.new('L', (WS, HS), v) for v in (98, 184, 176)] + [shallow.point(lambda v: int(v * 0.75))]))
    beach = mask_of(pts, 0.035).filter(ImageFilter.GaussianBlur(3 * SS))
    img.alpha_composite(Image.merge('RGBA', [Image.new('L', (WS, HS), v) for v in (226, 207, 152)] + [beach]))
    # Çim: doku + ada karakteri tonu + büyük lekeler.
    grass = tile(os.path.join(ROOT, 'public', 'images', 'game', 'terrain', 'grass.png'), (WS, HS))
    mood = MOOD[iid]
    arr = np.asarray(grass, np.float32) + np.array(mood, np.float32)
    lo = np.asarray(Image.fromarray((np.random.default_rng(seed).random((12, 9)) * 255).astype(np.uint8)).resize((WS, HS), Image.BICUBIC), np.float32) / 255
    arr *= (0.86 + 0.24 * lo)[..., None]
    grass = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
    grass.putalpha(land.filter(ImageFilter.GaussianBlur(2 * SS)))
    img.alpha_composite(grass)
    spots = {k: (v[0] * WS, v[1] * HS) for k, v in LAYOUT['spots'].items()}
    landarr_pre = np.asarray(land)
    # Tepeler: kale ve madenin arkasında yumuşak yeşil sırt + kaya kümeleri.
    rock = Image.open(os.path.join(DECOR, 'rock.png')).convert('RGBA')
    hills = Image.new('L', (WS, HS), 0)
    dh = ImageDraw.Draw(hills)
    rocks = []
    for key in ('kale', 'mine'):
        sx, sy = spots[key]
        for _ in range(7):
            rx, ry = rnd.uniform(60, 110) * SS, rnd.uniform(30, 55) * SS
            x, y = sx + rnd.uniform(-120, 120) * SS, sy - rnd.uniform(40, 100) * SS
            dh.ellipse([x - rx, y - ry, x + rx, y + ry], fill=255)
        for _ in range(16):
            x, y = sx + rnd.uniform(-150, 150) * SS, sy - rnd.uniform(55, 120) * SS
            if landarr_pre[int(min(HS - 1, y)), int(max(0, min(WS - 1, x)))] > 200:
                rocks.append((y, x, rnd.uniform(0.8, 1.6)))
    hills = hills.filter(ImageFilter.GaussianBlur(28 * SS))
    shade = Image.new('RGBA', (WS, HS), (58 + mood[0], 86 + mood[1], 44 + mood[2], 0))
    shade.putalpha(Image.fromarray((np.asarray(hills, np.float32) * 0.45 * (np.asarray(land, np.float32) / 255)).astype(np.uint8)))
    img.alpha_composite(shade)
    for y, x, sc in sorted(rocks):
        w = int(46 * SS * sc)
        spr = rock.resize((w, int(rock.height * w / rock.width)), Image.LANCZOS)
        img.alpha_composite(spr, (int(x - w / 2), int(y - spr.height * 0.9)))
    # Patikalar: şehirden her yere yumuşak eğri.
    path = Image.new('L', (WS, HS), 0)
    dp = ImageDraw.Draw(path)
    cx, cy = spots['city']
    for key, (x, y) in spots.items():
        if key == 'city':
            continue
        mx, my = (cx + x) / 2 + rnd.uniform(-60, 60) * SS, (cy + y) / 2 + rnd.uniform(-40, 40) * SS
        prev = (cx, cy)
        for i in range(1, 25):
            u = i / 24
            p = ((1 - u) ** 2 * cx + 2 * (1 - u) * u * mx + u * u * x, (1 - u) ** 2 * cy + 2 * (1 - u) * u * my + u * u * y)
            dp.line([prev, p], fill=255, width=9 * SS)
            prev = p
    path = path.filter(ImageFilter.GaussianBlur(2.5 * SS))
    img.alpha_composite(Image.merge('RGBA', [Image.new('L', (WS, HS), v) for v in (196, 170, 118)] + [path.point(lambda v: int(v * 0.8))]))
    # Orman ve serpme ağaçlar (yerlerin çevresi boş kalır).
    olive = Image.open(os.path.join(DECOR, 'olive-tree.png')).convert('RGBA')
    cyp = Image.open(os.path.join(DECOR, 'cypress.png')).convert('RGBA')
    bush = Image.open(os.path.join(DECOR, 'bush.png')).convert('RGBA')
    landarr = np.asarray(land)
    trees = []
    fx, fy = spots['forest']
    for _ in range(3200):
        x, y = rnd.uniform(0, WS), rnd.uniform(0, HS)
        if landarr[int(min(HS - 1, y + 10 * SS)), int(x)] < 200 or landarr[int(max(0, y - 30 * SS)), int(x)] < 200:
            continue
        if any(math.hypot(x - sx, (y - sy) * 1.3) < 105 * SS for sx, sy in spots.values()):
            continue
        near_forest = math.hypot(x - fx, (y - fy) * 1.2) < 240 * SS
        if not near_forest and rnd.random() > 0.3:
            continue
        kind = cyp if rnd.random() < 0.18 else bush if rnd.random() < 0.2 else olive
        trees.append((y, x, kind, rnd.uniform(0.7, 1.15)))
    trees.sort(key=lambda t: t[0])
    for y, x, kind, sc in trees:
        w = int((42 if kind is olive else 15 if kind is cyp else 24) * SS * sc)
        h = int(kind.height * w / kind.width)
        spr = kind.resize((w, h), Image.LANCZOS)
        img.alpha_composite(spr, (int(x - w / 2), int(y - h * 0.92)))
    # Kenar karartması.
    vig = Image.new('L', (WS, HS), 0)
    ImageDraw.Draw(vig).ellipse([-WS * 0.25, -HS * 0.2, WS * 1.25, HS * 1.2], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(80 * SS))
    dark = Image.new('RGBA', (WS, HS), (8, 30, 36, 0))
    dark.putalpha(vig.point(lambda v: int((255 - v) * 0.45)))
    img.alpha_composite(dark)
    out = img.convert('RGB').resize((W, H), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    path_out = os.path.join(OUT, f'{iid}.webp')
    out.save(path_out, 'WEBP', quality=84, method=6)
    print('yazıldı', os.path.relpath(path_out, ROOT), out.size, os.path.getsize(path_out) // 1024, 'KB')


if __name__ == '__main__':
    import sys
    for iid in (sys.argv[1:] or ISLANDS):
        island(iid)
