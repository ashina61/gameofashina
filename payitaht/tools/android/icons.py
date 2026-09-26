"""
ANDROID SİMGELERİ VE AÇILIŞ GÖRSELİ

public/icon-512.png'den (Divanhane resmi) Capacitor projesinin bütün
başlatıcı simgelerini ve açılış (splash) görsellerini üretir:

    python3 tools/android/icons.py

Uyarlanabilir simgede ön plan 108dp'lik tuvalin ortasındaki 66dp güvenli
alana sığdırılır; arka plan simgenin kendi koyu yeşili (#123B37).
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / 'android/app/src/main/res'
SRC = Image.open(ROOT / 'public/icon-512.png').convert('RGBA')
BG = (18, 59, 55, 255)
DENSITY = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def fit(size: int, scale: float) -> Image.Image:
    """Arka planı dolu kare tuvale, ortalanmış ve ölçeklenmiş simge."""
    canvas = Image.new('RGBA', (size, size), BG)
    s = round(size * scale)
    icon = SRC.resize((s, s), Image.LANCZOS)
    canvas.alpha_composite(icon, ((size - s) // 2, (size - s) // 2))
    return canvas


for name, d in DENSITY.items():
    folder = RES / f'mipmap-{name}'
    legacy = round(48 * d)
    fit(legacy, 1.0).save(folder / 'ic_launcher.png')
    # Yuvarlak simge: aynı resim, daire maskeli.
    mask = Image.new('L', (legacy, legacy), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, legacy - 1, legacy - 1), fill=255)
    round_icon = Image.new('RGBA', (legacy, legacy), (0, 0, 0, 0))
    round_icon.paste(fit(legacy, 1.12), (0, 0), mask)
    round_icon.save(folder / 'ic_launcher_round.png')
    # Uyarlanabilir ön plan: 108dp tuval, resim güvenli alanda (~%72).
    fit(round(108 * d), 0.72).save(folder / 'ic_launcher_foreground.png')

(RES / 'values/ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    '    <color name="ic_launcher_background">#123B37</color>\n</resources>\n')

# Açılış görselleri: koyu yeşil zemin, ortada Divanhane.
for path in RES.glob('drawable*/splash.png'):
    w, h = Image.open(path).size
    canvas = Image.new('RGBA', (w, h), BG)
    s = round(min(w, h) * 0.55)
    icon = SRC.resize((s, s), Image.LANCZOS)
    canvas.alpha_composite(icon, ((w - s) // 2, (h - s) // 2))
    canvas.convert('RGB').save(path)
print('ok')
