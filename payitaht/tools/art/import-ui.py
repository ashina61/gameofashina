"""
BOYALI ARAYÜZ PAKETİNİ OYUNA HAZIRLA.

    python3 tools/art/import-ui.py

Kaynak: assets/source/painted/*.png (saydam PNG'ler). Bu betik:
  * gömülü DEĞİŞKEN yazıları (sayılar, şehir adı, tarih, rozet rakamları)
    siler; boşluk çevresinden onarılır (biharmonik iç boyama), canlı değer
    oyunda HTML/Phaser ile üstüne yazılır,
  * parçaları kırpar (ikonlar, düğmeler, etiket plakası, süre çubuğu...),
  * boyalı binaları oyunun 2x2 footprint kalıbına oturtur (600 px tuval,
    480 px elmas, alt kenar = elmasın alt köşesi).
Çıktı: public/images/ui/*.webp ve public/images/game/buildings/*.webp.
Deterministiktir; kaynak değişmedikçe aynı dosyaları üretir.
"""
import os

import numpy as np
from PIL import Image, ImageFilter
from skimage.restoration import inpaint_biharmonic

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SRC = os.path.join(ROOT, 'assets', 'source', 'painted')
UI = os.path.join(ROOT, 'public', 'images', 'ui')
BLD = os.path.join(ROOT, 'public', 'images', 'game', 'buildings')


def load(name):
    return Image.open(os.path.join(SRC, name)).convert('RGBA')


def save(im, path, max_w=None, q=90):
    if max_w and im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)
    print('yazıldı', os.path.relpath(path, ROOT), im.size, os.path.getsize(path) // 1024, 'KB')
    return im


def erase_text(im, box, pred=None, grow=3):
    """Kutudaki açık renkli yazıyı sil, çevresinden iç boyama ile onar."""
    x0, y0, x1, y1 = box
    arr = np.asarray(im).astype(np.float64) / 255
    sub = arr[y0:y1, x0:x1].copy()
    rgb = sub[..., :3]
    lum = rgb @ np.array([0.3, 0.59, 0.11])
    mask = pred(rgb, lum) if pred else lum > 0.55
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(grow * 2 + 1))
    mask = np.asarray(m) > 0
    if mask.any():
        rgb_f = inpaint_biharmonic(rgb, mask, channel_axis=-1)
        sub[..., :3] = np.where(mask[..., None], rgb_f, rgb)
    out = arr.copy()
    out[y0:y1, x0:x1] = sub
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA')


def fill_panel(im, box, feather=4, seed=0):
    """Koyu panel içindeki bir dikdörtgeni yazısız zeminle doldur.

    Her satır, kutudaki KOYU piksellerin (zemin + yazı gölgesi) medyanıyla
    boyanır; zemin dokusu için hafif gürültü eklenir, kenarlar yumuşatılır.
    Gömülü yazının gölgesi dahil hiçbir iz kalmaz.
    """
    x0, y0, x1, y1 = box
    arr = np.asarray(im).astype(np.float64)
    sub = arr[y0:y1, x0:x1, :3]
    lum = sub @ np.array([0.3, 0.59, 0.11])
    rows = []
    for r in range(sub.shape[0]):
        m = (lum[r] < 70) & (lum[r] > 8)
        rows.append(np.median(sub[r][m], axis=0) if m.sum() > 3 else np.median(sub[r], axis=0))
    rows = np.array(rows)
    # Satır renklerini yumuşat (dikey geçiş)
    k = np.ones(9) / 9
    rows = np.stack([np.convolve(np.pad(rows[:, c], 4, mode='edge'), k, mode='valid') for c in range(3)], axis=1)
    rng = np.random.default_rng(seed)
    fill = rows[:, None, :] + rng.normal(0, 2.2, (sub.shape[0], sub.shape[1], 1))
    h, w = sub.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([xx, w - 1 - xx, yy, h - 1 - yy]).astype(np.float64)
    t = np.clip(edge / max(1, feather), 0, 1)[..., None]
    arr[y0:y1, x0:x1, :3] = sub * (1 - t) + fill * t
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')


def fill_disc(im, cx, cy, r):
    arr = np.asarray(im).astype(np.float64)
    yy, xx = np.mgrid[0:arr.shape[0], 0:arr.shape[1]]
    d = np.hypot(xx - cx, yy - cy)
    ring = (d > r * 0.55) & (d < r)
    lum = arr[..., :3] @ np.array([0.3, 0.59, 0.11])
    base = np.median(arr[ring & (lum < 70) & (lum > 6)][:, :3], axis=0)
    t = np.clip((r - d) / 3, 0, 1)[..., None]
    arr[..., :3] = arr[..., :3] * (1 - t) + base * t
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')


def trim(im, pad=2):
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 8)
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad + 1), min(im.height, ys.max() + pad + 1)))


def text_or_green(rgb, lum):
    return (lum > 0.55) | ((rgb[..., 1] > 0.55) & (rgb[..., 1] > rgb[..., 0] + 0.15))


# ------------------------------------------------------------------ ÜST PANEL
def hud():
    im = load('hud-top.png')
    im = erase_text(im, (262, 346, 338, 420))          # seviye rozeti rakamları (kırmızı daire)
    im = fill_panel(im, (452, 286, 676, 366))          # kudret sayısı
    im = fill_panel(im, (1822, 196, 2034, 258))        # şehir adı (cami ikonu kalır)
    im = fill_panel(im, (1730, 298, 1990, 364))        # tarih (güneş kalır)
    for i, box in enumerate(((206, 492, 350, 556), (610, 492, 792, 556), (1004, 492, 1178, 556), (1392, 492, 1562, 556), (1794, 492, 2118, 556))):
        im = fill_panel(im, box, seed=i)               # kaynak değerleri (etiketler kalır)
    crop = im.crop((8, 68, 2166, 592))
    save(crop, os.path.join(UI, 'hud-top.webp'), max_w=1400)


# ------------------------------------------------------------------ KAYNAK İKONLARI
def resource_icons():
    im = load('resource-icons.png')
    boxes = {'gold': (16, 404, 302, 704), 'wood': (300, 402, 604, 702), 'stone': (588, 402, 880, 706),
             'knowledge': (880, 406, 1182, 724), 'people': (1158, 400, 1440, 712)}
    for key, b in boxes.items():
        save(trim(im.crop(b)), os.path.join(UI, f'res-{key}.webp'), max_w=160)


# ------------------------------------------------------------------ ALT MENÜ
def nav():
    im = load('nav-bar.png')
    save(im.crop((6, 128, 2168, 598)), os.path.join(UI, 'nav-bar.webp'), max_w=1400)


# ------------------------------------------------------------------ YAN DÜĞMELER
def side_buttons():
    """Posta/Etkinlikler/Ödüller. Kırmızı rozet kalır, İÇİNDEKİ rakam silinir;
    canlı sayı oyunda üstüne yazılır. Rozetin konumu (yüzde) konsola basılır."""
    im = load('side-buttons.png')
    tiles = {'posta': (190, 30, 700, 570), 'etkinlik': (182, 590, 706, 1130), 'odul': (186, 1150, 704, 1710)}
    for key, box in tiles.items():
        c = trim(im.crop(box))
        a = np.asarray(c).astype(np.int32)
        red = (a[..., 0] > 140) & (a[..., 1] < 60) & (a[..., 2] < 60) & (a[..., 3] > 200)
        H, W = red.shape
        red[:, : W // 2] = False
        red[H // 2:, :] = False
        if key != 'etkinlik' and red.sum() > 200:
            ys, xs = np.nonzero(red)
            cx, cy = xs.mean(), ys.mean()
            r = np.sqrt(red.sum() / np.pi)
            arr = a.astype(np.float64)
            yy, xx = np.mgrid[0:H, 0:W]
            d = np.hypot(xx - cx, yy - cy)
            inside = d < r * 0.78
            base = np.median(arr[red & (d > r * 0.55)][:, :3], axis=0)
            # Kırmızı dairenin hafif küresel ışığı korunur: yukarısı açık, aşağısı koyu.
            shade = 1 + 0.18 * np.clip((cy - yy) / r, -1, 1)
            t = np.clip((r * 0.78 - d) / 2.5, 0, 1)[..., None]
            arr[..., :3] = arr[..., :3] * (1 - t) + (base[None, None, :] * shade[..., None]) * t
            c = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
            print(f'  rozet {key}: merkez %{cx / W * 100:.1f} %{cy / H * 100:.1f}, çap %{2 * r / W * 100:.1f}')
        save(c, os.path.join(UI, f'side-{key}.webp'), max_w=260)


# ------------------------------------------------------------------ ARAYÜZ KİTİ
def kit():
    im = load('ui-kit.png')
    # Etiket plakası: Kışla plakası; rakam, yazı ve ikon silinir.
    plate = im.crop((628, 68, 1030, 208))
    plate = fill_disc(plate, 64, 63, 42)                               # "20"
    plate = fill_panel(plate, (132, 38, 384, 109), feather=2)          # "Kışla" + kubbe ikonu
    # Kubbenin üst çerçeveye taşan tepesi: temiz çerçeve şeridiyle örtülür.
    band = plate.crop((200, 26, 262, 41))
    for x in (288, 330):
        plate.paste(band, (x, 26))
    save(trim(plate), os.path.join(UI, 'plate.webp'), max_w=402)
    # Seviye dairesi: "1" dairesi, rakam silinir.
    circle = im.crop((1080, 966, 1182, 1074))
    circle = fill_disc(circle, 51, 54, 36)
    save(trim(circle), os.path.join(UI, 'level-circle.webp'))
    # Süre çubuğu: çekiçli çubuk; çekiç kalır, yazı + yeşil + ok silinir (canlı çizilir).
    bar = im.crop((940, 358, 1418, 458))
    save(trim(bar.crop((0, 0, 110, 100))), os.path.join(UI, 'icon-hammer.webp'))
    save(trim(im.crop((770, 888, 852, 966))), os.path.join(UI, 'icon-up.webp'))
    frame = fill_panel(bar, (94, 15, 444, 84))
    save(trim(frame), os.path.join(UI, 'timer-frame.webp'))
    # Görev kartları: yazı silinir, ok ve portre/gemi kalır.
    for key, b, tb in (('quest-research', (30, 560, 720, 764), (215, 36, 632, 174)), ('quest-ship', (744, 564, 1420, 760), (160, 26, 620, 176))):
        card = fill_panel(im.crop(b), tb)
        save(trim(card), os.path.join(UI, f'{key}.webp'), max_w=520)
    # Yuvarlak danışman ikonları.
    for key, b in (('adv-book', (38, 900, 206, 1072)), ('adv-hammer', (216, 902, 382, 1072)), ('adv-swords', (388, 902, 556, 1072)), ('adv-ship', (562, 902, 726, 1072))):
        save(trim(im.crop(b)), os.path.join(UI, f'{key}.webp'), max_w=120)


# ------------------------------------------------------------------ BİNALAR
def fit_building(name, out_names):
    """Boyalı binayı footprint kalıbına oturt: elmas genişliği 480 px, alt kenar = elmas alt köşesi."""
    im = trim(load(name), pad=0)
    a = np.asarray(im)[..., 3] > 40
    rows = np.nonzero(a.any(axis=1))[0]
    bottom = rows.max()
    # Elmasın genişliği = en geniş opak satır (taban köşeleri).
    widths = [(np.nonzero(a[y])[0].max() - np.nonzero(a[y])[0].min()) for y in range(im.height) if a[y].any()]
    diamond = max(widths)
    scale = 480 / diamond
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (600, im.height + 4), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((600 - im.width) // 2, canvas.height - round((bottom + 1) * scale)))
    for n in out_names:
        save(canvas, os.path.join(BLD, n), q=88)


def painted_buildings():
    """assets/source/painted/buildings/<id>-<aşama>.png -> oyun kalıbı.

    ASSET_PROMPTS.md ile üretilen her bina görseli buraya konur; eksik
    aşamalar en yakın boyalı aşamayla doldurulur, hiç boyalısı olmayan bina
    kod çizimiyle (tools/art/buildings.py) kalır.
    """
    folder = os.path.join(SRC, 'buildings')
    if not os.path.isdir(folder):
        return
    found = {}
    for f in sorted(os.listdir(folder)):
        if not f.endswith('.png'):
            continue
        bid, _, st = f[:-4].rpartition('-')
        if st in ('1', '2', '3'):
            found.setdefault(bid, {})[int(st)] = os.path.join('buildings', f)
        else:  # aşamasız (maden, bağımsız yerleşim): aynı adla
            fit_building(os.path.join('buildings', f), [f[:-4] + '.webp'])
    for bid, stages in found.items():
        for st in (1, 2, 3):
            src = stages.get(st) or stages[min(stages, key=lambda k: abs(k - st))]
            fit_building(src, [f'{bid}-{st}.webp'])


if __name__ == '__main__':
    hud(); resource_icons(); nav(); side_buttons(); kit()
    fit_building('konut-houses.png', ['konut-1.webp', 'konut-2.webp', 'konut-3.webp'])
    fit_building('surlar-gate.png', ['surlar-1.webp', 'surlar-2.webp', 'surlar-3.webp'])
    painted_buildings()
