#!/usr/bin/env python3
"""
TELEFON BOYU BİNA GÖRSELLERİ (V2 Faz 6.1)

Boyalı bina tuvalleri ~1774 px genişlikte. Telefonda bina en çok ~900 cihaz
pikseli kaplar; arayüzdeki kahraman görseli ise 300 CSS pikseli. Her
`*-painted-N.webp` için yarı boyda `*-painted-N-sm.webp` üretilir.
Oyun ölçeği dosyanın GERÇEK genişliğinden okuduğu için (phaser-city.ts)
iki boy aynı büyüklükte çizilir.

    python3 tools/art/half-size.py          # eksik ya da eskimiş kopyaları üret
    python3 tools/art/half-size.py --check  # kopyası olmayan varsa 1 döner (CI)
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / 'public' / 'images' / 'game' / 'buildings'
QUALITY = 82


def sources():
    return sorted(p for p in ROOT.glob('*-painted-[0-9].webp'))


def small_of(src: Path) -> Path:
    return src.with_name(src.stem + '-sm.webp')


def stale(src: Path) -> bool:
    dst = small_of(src)
    return not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime


def make(src: Path):
    from PIL import Image  # yalnız üretirken gerekir; --check PIL'siz çalışır
    with Image.open(src) as im:
        im = im.convert('RGBA')
        w, h = im.size
        small = im.resize((max(1, round(w / 2)), max(1, round(h / 2))), Image.LANCZOS)
        small.save(small_of(src), 'WEBP', quality=QUALITY, method=6)


def main():
    check = '--check' in sys.argv
    # Denetimde yalnız varlık sorulur: git checkout dosya saatlerini korumaz.
    todo = [s for s in sources() if (not small_of(s).exists() if check else stale(s))]
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
