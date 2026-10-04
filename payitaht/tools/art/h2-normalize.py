#!/usr/bin/env python3
"""Encode individually generated islands; preserve their painted alpha/coastline.

Usage: python3 tools/art/h2-normalize.py /path/to/generated-island-manifest.json
Manifest: {islandId: absolute PNG path}. Sources remain outside the repository.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/images/game/islands'
REVIEW = ROOT / 'visual-review/H2'
IDS = ['sahil', 'zeytin', 'akcam', 'kizil', 'akdeniz', 'yalcin', 'baglik',
       'atessiz', 'mercan', 'sakiz', 'lodos', 'kartal', 'poyraz', 'fener',
       'hisarada', 'lalezar']


def land_centroid(im):
    sx = sy = weight = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            # Exclude turquoise shallows/white foam from visual land mass.
            if a > 128 and r > b * .95 and g > b * .88 and max(r, g, b) - min(r, g, b) > 12:
                sx += x
                sy += y
                weight += 1
    if not weight:
        raise ValueError('No visible land mass')
    return sx / weight, sy / weight


def normalize(source):
    im = Image.open(source).convert('RGBA')
    assert im.getextrema()[3][0] == 0, 'ImageGen alpha must be genuine'
    im.thumbnail((600, 600), Image.Resampling.LANCZOS)
    bbox = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    im = im.crop(bbox)
    cx, cy = land_centroid(im)
    scale = min(70 / max(cx, im.width - cx), 80 / max(cy, im.height - cy))
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    cx, cy = land_centroid(im)
    canvas = Image.new('RGBA', (160, 180))
    canvas.alpha_composite(im, (round(80 - cx), round(90 - cy)))
    return canvas


def main():
    manifest = json.loads(Path(sys.argv[1]).read_text())
    assert set(manifest) == set(IDS), 'Exactly 16 individually generated sources required'
    REVIEW.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (800, 880), '#103c4b')
    font = ImageFont.truetype('DejaVuSans.ttf', 15)
    records = []
    for index, island in enumerate(IDS):
        im = normalize(manifest[island])
        path = OUT / f'map-{island}.webp'
        for quality in [82, 78, 74, 70, 66, 62, 58, 54]:
            im.save(path, 'WEBP', quality=quality, method=6)
            if path.stat().st_size <= 12000:
                break
        assert path.stat().st_size <= 12000
        decoded = Image.open(path).convert('RGBA')
        cx, cy = land_centroid(decoded)
        assert abs(cx - 80) < 2 and abs(cy - 90) < 2, (island, cx, cy)
        records.append({'id': island, 'bytes': path.stat().st_size, 'quality': quality,
                        'width': 160, 'height': 180, 'land_centroid': [cx, cy],
                        'alpha': True, 'source': Path(manifest[island]).name})
        left, top = index % 4 * 200, index // 4 * 220
        sheet.paste(decoded, (left + 20, top + 5), decoded)
        draw = ImageDraw.Draw(sheet)
        draw.text((left + 100, top + 198), island, anchor='mm', fill='#f9e9c2', font=font)
    sheet.save(REVIEW / 'contact-sheet.webp', 'WEBP', quality=85, method=6)
    (REVIEW / 'checks.json').write_text(json.dumps({'tool': 'imagegen', 'count': 16,
        'all_under_12kb': True, 'canvas_center': [80, 90], 'records': records}, indent=2) + '\n')


if __name__ == '__main__':
    main()
