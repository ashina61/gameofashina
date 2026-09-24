"""
PROSEDÜREL GEMİ ÜRETECİ — bina sanatıyla aynı ışık dilinde (sol-üst ışık).

    python3 tools/art/gen-procedural-assets.py

(Ağaç/kaya/kule: tools/art/decor.py, binalar: tools/art/buildings.py.)

Üretir (şeffaf PNG):
  public/images/game/ships/ship-a.png    tek direkli yelkenli (koyda demirli)
  public/images/game/ships/ship-b.png    iki direkli kalyon

Deterministiktir (sabit tohum). 4x süper-örnekleme ile çizilip LANCZOS ile
küçültülür; kenarlar yumuşak, oyun ölçeğinde boyalı sprite'larla uyumlu okunur.
"""
import math
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SS = 4  # süper-örnekleme


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(len(a)))


def paint_grain(img, strength=1.0):
    """Boyalı sprite'larla uyum: düz vektör yüzeyi fırça lekesi grenine çevirir."""
    W, H = img.size
    noise = Image.effect_noise((W, H), 38).filter(ImageFilter.GaussianBlur(1.6 * SS))
    alpha = img.getchannel('A')
    dark = noise.point(lambda v: int(max(0, 128 - v) * 0.9 * strength))
    light = noise.point(lambda v: int(max(0, v - 128) * 0.55 * strength))
    for rgb, a in (((34, 20, 10), dark), ((255, 246, 222), light)):
        layer = Image.new('RGBA', (W, H), rgb + (0,))
        layer.putalpha(ImageChops.multiply(a, alpha))
        img.alpha_composite(layer)
    # Hafif dikey ışık: üst daha aydınlık, alt daha koyu.
    grad = Image.linear_gradient('L').resize((W, H))
    shade = Image.new('RGBA', (W, H), (20, 14, 8, 0))
    shade.putalpha(ImageChops.multiply(grad.point(lambda v: int(v * 0.16)), alpha))
    img.alpha_composite(shade)
    return img


def finish(img, size, path):
    out = img.resize(size, Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path, optimize=True)
    print('yazıldı', os.path.relpath(path, ROOT), out.size)


# ------------------------------------------------------------------ SERVİ
def ship(path, seed, masts=1, w_out=360, h_out=330):
    rnd = random.Random(seed)
    W, H = w_out * SS, h_out * SS
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    wl = H * 0.80  # su hattı
    L, R = W * 0.12, W * 0.90  # kıç (sol) .. baş (sağ)

    # Suya düşen koyu yansıma/gölge ve köpük halkası.
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sdr = ImageDraw.Draw(sh)
    sdr.ellipse([L - 10 * SS, wl - 12 * SS, R + 18 * SS, wl + 26 * SS], fill=(14, 52, 60, 110))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(7 * SS)))
    foam = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(foam).ellipse([L - 4 * SS, wl - 7 * SS, R + 10 * SS, wl + 12 * SS], outline=(235, 245, 240, 120), width=3 * SS)
    img.alpha_composite(foam.filter(ImageFilter.GaussianBlur(1.5 * SS)))

    # Gövde: yüksek kıç, kalkık baş, kavisli omurga.
    def hull_pts(inset=0):
        pts = []
        n = 40
        for i in range(n + 1):  # üst güverte hattı (kıçtan başa)
            t = i / n
            x = L + (R - L) * t
            y = wl - 64 * SS + 26 * SS * math.sin(t * math.pi) ** 0.8 - 30 * SS * (1 - t) ** 3 - 12 * SS * t ** 4
            pts.append((x, y + inset))
        for i in range(n, -1, -1):  # omurga (baştan kıça)
            t = i / n
            x = L + 10 * SS + (R - L - 26 * SS) * t
            y = wl + 6 * SS - 4 * SS * math.sin(t * math.pi)
            pts.append((x, y))
        return pts

    d.polygon(hull_pts(), fill=(104, 66, 38, 255))
    # Tahta kaplamalar (yatay kuşaklar) + alt koyu kısım.
    for k, col in enumerate([(128, 84, 48), (112, 72, 42), (96, 60, 35), (82, 51, 30)]):
        band = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(band).polygon(hull_pts(inset=14 * SS * (k + 1)), fill=col + (255,))
        img.alpha_composite(band)
    d.line(hull_pts()[:41], fill=(186, 140, 84, 255), width=3 * SS)  # küpeşte ışığı
    # Kıç kasarası ve pencereler.
    d.polygon([(L - 2 * SS, wl - 96 * SS), (L + 58 * SS, wl - 92 * SS), (L + 58 * SS, wl - 58 * SS), (L + 2 * SS, wl - 60 * SS)], fill=(118, 76, 44, 255))
    for i in range(3):
        x0 = L + (10 + i * 15) * SS
        d.rectangle([x0, wl - 84 * SS, x0 + 8 * SS, wl - 74 * SS], fill=(236, 196, 104, 255))

    # Direk(ler) ve yelkenler (sol-üst ışık: sol kenar açık).
    mast_xs = [W * 0.56] if masts == 1 else [W * 0.40, W * 0.68]
    for mi, mx in enumerate(mast_xs):
        mtop = H * (0.06 if mi == len(mast_xs) - 1 else 0.14)
        d.rectangle([mx - 3 * SS, mtop, mx + 3 * SS, wl - 40 * SS], fill=(78, 50, 30, 255))
        for s_i, (sy0, sy1, sw) in enumerate(((0.17, 0.42, 0.26), (0.45, 0.66, 0.30))):
            y0, y1 = H * sy0 + (mtop - H * 0.06), H * sy1 + (mtop - H * 0.06)
            half = W * sw / 2 * (0.92 if masts == 2 else 1.0)
            sail = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            sdd = ImageDraw.Draw(sail)
            pts = []
            for i in range(21):  # rüzgârla şişkin alt kenar
                t = i / 20
                pts.append((mx - half + 2 * half * t, y1 + 10 * SS * math.sin(t * math.pi)))
            poly = [(mx - half * 0.92, y0), (mx + half * 0.92, y0)] + pts[::-1]
            sdd.polygon(poly, fill=(238, 228, 204, 255))
            # Gölge (sağ yarı) ve kıvrım çizgileri.
            sdd.polygon([(mx, y0), (mx + half * 0.92, y0)] + [p for p in pts if p[0] >= mx][::-1], fill=(208, 194, 166, 255))
            for k in range(1, 4):
                fx = mx - half + 2 * half * k / 4
                sdd.line([(fx, y0 + 2 * SS), (fx, y1 + 6 * SS * math.sin(k / 4 * math.pi))], fill=(190, 174, 146, 150), width=2 * SS)
            sdd.line([(mx - half * 0.95, y0), (mx + half * 0.95, y0)], fill=(96, 62, 36, 255), width=4 * SS)  # seren
            img.alpha_composite(sail)
        # Bayrak (kırmızı flama).
        d.polygon([(mx + 3 * SS, mtop), (mx + 42 * SS, mtop + 9 * SS), (mx + 3 * SS, mtop + 18 * SS)], fill=(170, 40, 34, 255))
    # Halatlar.
    for mx in mast_xs:
        d.line([(mx, H * 0.10), (R - 4 * SS, wl - 64 * SS)], fill=(60, 44, 30, 170), width=int(1.5 * SS))
        d.line([(mx, H * 0.12), (L + 20 * SS, wl - 94 * SS)], fill=(60, 44, 30, 170), width=int(1.5 * SS))
    finish(paint_grain(img), (w_out, h_out), path)


# ------------------------------------------------------------------ SUR KULESİ
if __name__ == '__main__':
    out = os.path.join(ROOT, 'public', 'images', 'game')
    ship(os.path.join(out, 'ships', 'ship-a.png'), seed=5, masts=1)
    ship(os.path.join(out, 'ships', 'ship-b.png'), seed=9, masts=2, w_out=420, h_out=360)
