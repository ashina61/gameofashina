"""
LALE ÇİZİMLERİ — şehir çevresi için iki dekor:

    python3 tools/art/tulips.py

  decor/tulip-bed.png   taş bordürlü toprak tarhta sıra sıra laleler
  decor/tulip-clump.png çimende kendiliğinden bitmiş lale öbeği

Her lale: iki kıvrık yaprak, sap ve üç taç yapraklı kadeh (gölgeli iç,
parlak kenar). 4 kat büyük çizilir, sonra küçültülür (yumuşak kenar).
Taban noktası yatayda ortada, yüksekliğin %92'sinde (terrain-builder 0.5, 0.92).
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DECOR = os.path.join(ROOT, 'public', 'images', 'game', 'decor')
K = 4  # süper örnekleme

COLORS = [
    ((200, 35, 28), (236, 92, 70)),    # al
    ((226, 58, 46), (250, 128, 96)),   # gelincik kırmızısı
    ((236, 186, 40), (252, 226, 120)), # sarı
    ((245, 238, 222), (255, 255, 250)),# beyaz
    ((166, 30, 80), (214, 86, 132)),   # erguvan
    ((222, 96, 140), (248, 168, 196)), # pembe
]


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def leaf(d, x, y, h, side, col):
    """Yere yakın, uca doğru kıvrılan geniş lale yaprağı."""
    pts = []
    for i in range(13):
        t = i / 12
        w = math.sin(t * math.pi) * h * 0.16
        cx = x + side * (t ** 1.6) * h * 0.38
        pts.append((cx - w, y - t * h))
    for i in range(12, -1, -1):
        t = i / 12
        w = math.sin(t * math.pi) * h * 0.16
        cx = x + side * (t ** 1.6) * h * 0.38
        pts.append((cx + w * 0.6, y - t * h))
    d.polygon(pts, fill=col + (255,))
    d.line([(x, y), (x + side * h * 0.38, y - h)], fill=mix(col, (20, 50, 20), 0.35) + (180,), width=max(1, K))


def tulip(d, x, y, h, colors, rnd):
    base, light = colors
    lean = (rnd.random() - 0.5) * h * 0.16
    green = (70 + rnd.randint(-8, 8), 128 + rnd.randint(-10, 10), 52)
    leaf(d, x, y, h * 0.62, -1, mix(green, (40, 90, 36), 0.25))
    leaf(d, x, y, h * 0.5, 1, green)
    top = (x + lean, y - h)
    d.line([(x, y), top], fill=(58, 104, 42, 255), width=int(K * 1.6))
    cw, ch = h * 0.22, h * 0.3
    cx, cy = top
    # Arka taç yaprağı (koyu), iki yan yaprak, ön yaprak (açık): kadeh biçimi.
    d.ellipse([cx - cw * 0.9, cy - ch * 1.05, cx + cw * 0.9, cy + ch * 0.25], fill=mix(base, (60, 0, 0), 0.25) + (255,))
    for s in (-1, 1):
        d.polygon([(cx + s * cw * 0.95, cy - ch * 0.15), (cx + s * cw * 1.05, cy - ch * 1.25), (cx + s * cw * 0.15, cy - ch * 0.55), (cx, cy + ch * 0.28)], fill=base + (255,))
    d.polygon([(cx - cw * 0.55, cy - ch * 0.2), (cx, cy - ch * 1.3), (cx + cw * 0.55, cy - ch * 0.2), (cx, cy + ch * 0.3)], fill=mix(base, light, 0.45) + (255,))
    d.line([(cx - cw * 0.12, cy - ch * 0.9), (cx - cw * 0.05, cy)], fill=light + (200,), width=max(1, K))


def tulip_bed(path, seed=7):
    W, H = 300 * K, 150 * K
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    cx, cy, rx, ry = W / 2, H * 0.68, W * 0.46, H * 0.27
    # Gölge, taş bordür, toprak tepeciği.
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([cx - rx + 20 * K, cy - ry + 10 * K, cx + rx + 20 * K, cy + ry + 14 * K], fill=(20, 34, 16, 90))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6 * K)))
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry + 6 * K], fill=(150, 132, 104, 255))
    for i in range(36):
        a = 2 * math.pi * i / 36
        sx, sy = cx + math.cos(a) * rx * 0.97, cy + math.sin(a) * ry * 0.97 + 3 * K
        g = rnd.randint(-14, 14)
        d.ellipse([sx - 9 * K, sy - 5 * K, sx + 9 * K, sy + 5 * K], fill=(196 + g, 182 + g, 150 + g, 255), outline=(120, 104, 80, 255), width=K)
    d.ellipse([cx - rx * 0.9, cy - ry * 0.85, cx + rx * 0.9, cy + ry * 0.8], fill=(104, 74, 46, 255))
    d.ellipse([cx - rx * 0.86, cy - ry * 0.82, cx + rx * 0.84, cy + ry * 0.55], fill=(124, 90, 58, 255))
    # Arkadan öne sıralar: renkler sıra sıra (Osmanlı bahçesi düzeni).
    rows = 5
    for r in range(rows):
        t = r / (rows - 1)
        y = cy - ry * 0.62 + t * ry * 1.15
        half = rx * 0.78 * math.sqrt(max(0.15, 1 - ((y - cy) / (ry * 1.05)) ** 2))
        n = max(3, int(half * 2 / (19 * K)))
        col = COLORS[(r * 2 + seed) % len(COLORS)]
        for i in range(n):
            x = cx - half + (i + 0.5) * half * 2 / n + rnd.uniform(-3, 3) * K
            tulip(d, x, y, (33 + rnd.randint(-3, 3)) * K, col if rnd.random() > 0.15 else COLORS[rnd.randrange(len(COLORS))], rnd)
    return finish(img, path, 300)


def tulip_clump(path, seed=11):
    W, H = 160 * K, 120 * K
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    cx, cy = W / 2, H * 0.86
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([cx - 58 * K, cy - 12 * K, cx + 66 * K, cy + 12 * K], fill=(20, 34, 16, 80))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5 * K)))
    # Çimen tutamı.
    for _ in range(70):
        x = cx + rnd.uniform(-55, 55) * K
        y = cy + rnd.uniform(-8, 6) * K
        d.line([(x, y), (x + rnd.uniform(-5, 5) * K, y - rnd.uniform(8, 16) * K)], fill=(92 + rnd.randint(-15, 15), 140 + rnd.randint(-15, 15), 62, 255), width=int(1.5 * K))
    spots = sorted([(cx + rnd.uniform(-44, 44) * K, cy + rnd.uniform(-10, 4) * K) for _ in range(9)], key=lambda p: p[1])
    pal = [COLORS[rnd.randrange(len(COLORS))], COLORS[rnd.randrange(len(COLORS))]]
    for i, (x, y) in enumerate(spots):
        tulip(d, x, y, (46 + rnd.randint(-8, 8)) * K, pal[i % 2], rnd)
    return finish(img, path, 160)


def finish(img, path, width):
    bbox = img.getbbox()
    W, H = img.size
    # Yatayda ortalı kalsın: kırpma simetrik.
    half = max(W / 2 - bbox[0], bbox[2] - W / 2)
    top = bbox[1]
    img = img.crop((int(W / 2 - half), max(0, top - 4 * K), int(W / 2 + half), H))
    h = round(img.height * width / img.width)
    img = img.resize((width, h), Image.LANCZOS)
    img.save(path, optimize=True)
    print('yazıldı', os.path.relpath(path, ROOT), img.size)


if __name__ == '__main__':
    tulip_bed(os.path.join(DECOR, 'tulip-bed.png'))
    tulip_clump(os.path.join(DECOR, 'tulip-clump.png'))
