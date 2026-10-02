"""
DÜNYA HARİTASI ADA SİMGELERİ — ada görselindeki (islands/<id>.webp) denizi
renkten ayıklar; kıyıyı yumuşatır, adayı kırpıp küçük şeffaf bir simge yazar.

    python3 tools/art/island-thumbs.py

Çıktı: public/images/game/islands/map-<id>.webp (genişlik 160 px).
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DIR = os.path.join(ROOT, 'public', 'images', 'game', 'islands')


def thumb(path, out, width=160):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Deniz: mavi/turkuaz baskın. Kara: yeşil, kum, kaya (mavi geride kalır).
    sea = (b > r + 18) & (b > g - 25)
    land = ~sea
    m = Image.fromarray((land * 255).astype(np.uint8))
    # Dalga çizgileri ve köpük gibi küçük adacıkları at: kapanış + en büyük kitle.
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    arr = np.asarray(m) > 127
    ys, xs = np.nonzero(arr)
    if not len(xs):
        raise SystemExit(f'kara bulunamadı: {path}')
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = 6
    box = (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))
    alpha = m.filter(ImageFilter.GaussianBlur(2.2)).crop(box)
    rgba = im.crop(box).convert('RGBA')
    rgba.putalpha(alpha)
    h = round(rgba.height * width / rgba.width)
    rgba = rgba.resize((width, h), Image.LANCZOS)
    rgba.save(out, quality=88, method=6)
    print('yazıldı', os.path.relpath(out, ROOT), rgba.size)


for f in sorted(os.listdir(DIR)):
    if f.endswith('.webp') and not f.startswith('map-'):
        thumb(os.path.join(DIR, f), os.path.join(DIR, 'map-' + f))
