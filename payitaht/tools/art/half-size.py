#!/usr/bin/env python3
"""
TELEFON BOYU BİNA VE DEKOR GÖRSELLERİ (V2 Faz 6.1)

Boyalı bina tuvalleri ~1774 px genişlikte. Telefonda bina en çok ~900 cihaz
pikseli kaplar; arayüzdeki kahraman görseli ise 300 CSS pikseli. Her
`*-painted-N.webp` için yarı boyda `*-painted-N-sm.webp` üretilir.
Oyun ölçeği dosyanın GERÇEK genişliğinden okuduğu için (phaser-city.ts)
iki boy aynı büyüklükte çizilir.
Dekor: ağaçlar 192 px, diğerleri 128 px uzun kenar; şeffaf WebP.
--check dekorun boyutunu ve tam çözümlemesini Node/sharp ile denetler.

    python3 tools/art/half-size.py          # eksik ya da eskimiş kopyaları üret
    python3 tools/art/half-size.py --check  # kopyası olmayan varsa 1 döner (CI)
"""
import os
import sys
import subprocess
from pathlib import Path

GAME_ROOT = Path(__file__).resolve().parents[2] / 'public' / 'images' / 'game'
ROOT = GAME_ROOT / 'buildings'
QUALITY = 82


def sources():
    return sorted(ROOT.glob('*-painted-[0-9].webp')) + sorted(p for p in (GAME_ROOT / 'decor').glob('*.webp') if not p.stem.endswith('-sm'))


def small_of(src: Path) -> Path:
    return src.with_name(src.stem + '-sm.webp')


def valid_small(src: Path) -> bool:
    dst = small_of(src)
    if not dst.exists():
        return False
    if src.parent.name != 'decor':
        return True
    tree = any(name in src.stem for name in ['tree', 'cypress', 'pine', 'poplar'])
    return subprocess.run(['node', str(Path(__file__).with_name('decor-small.cjs')), '--check', str(dst), str(192 if tree else 128)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0


def stale(src: Path) -> bool:
    dst = small_of(src)
    return not valid_small(src) or dst.stat().st_mtime < src.stat().st_mtime


def make(src: Path):
    if src.parent.name == 'decor':
        tree = any(name in src.stem for name in ['tree', 'cypress', 'pine', 'poplar'])
        subprocess.run(['node', str(Path(__file__).with_name('decor-small.cjs')), str(src), str(small_of(src)), str(192 if tree else 128)], check=True)
        return
    from PIL import Image  # yalnız bina üretiminde gerekir
    with Image.open(src) as im:
        im = im.convert('RGBA')
        w, h = im.size
        small = im.resize((max(1, round(w / 2)), max(1, round(h / 2))), Image.LANCZOS)
        small.save(small_of(src), 'WEBP', quality=QUALITY, method=6)


def main():
    check = '--check' in sys.argv
    # Git checkout saatleri korunmaz; dekorun varlığı, boyutu ve çözümlemesi denetlenir.
    todo = [s for s in sources() if (not valid_small(s) if check else stale(s))]
    if check:
        for s in todo:
            print(f'eksik: {small_of(s).name}')
        return 1 if todo else 0
    for s in todo:
        make(s)
        print(f'{small_of(s).name}: {os.path.getsize(s) // 1024} KB → {os.path.getsize(small_of(s)) // 1024} KB')
    full = sum(os.path.getsize(s) for s in sources())
    half = sum(os.path.getsize(small_of(s)) for s in sources() if small_of(s).exists())
    print(f'{len(sources())} görsel · tam boy {full / 1e6:.1f} MB · telefon boyu {half / 1e6:.1f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
