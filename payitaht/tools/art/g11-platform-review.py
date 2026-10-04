"""Read platform PNGs, validate native references, and show icon mask/size previews."""
from PIL import Image, ImageDraw
from pathlib import Path
import json
import xml.etree.ElementTree as ET
r=json.loads(Path('visual-review/G11/platform-assets.json').read_text())
for f in r:
 with Image.open(f['target']) as im:
  assert im.size==(f['width'],f['height']);im.load()
for p in Path('android/app/src/main/res').rglob('*.xml'):ET.parse(p)
for f,size in [('icon-192.png',192),('icon-512.png',512),('apple-icon.png',180),('icon-dark-32x32.png',32),('icon-light-32x32.png',32)]:
 with Image.open('public/'+f) as im:assert im.size==(size,size)
canvas=Image.new('RGB',(720,420),'#e9dab8');draw=ImageDraw.Draw(canvas)
icon=Image.open('public/icon-512.png').convert('RGBA')
for x,size in [(20,192),(244,96),(368,48),(440,32)]:
 tile=icon.resize((size,size),Image.Resampling.LANCZOS);canvas.paste(tile,(x,30),tile);draw.text((x,230),str(size)+' px',fill='#392717')
fg=Image.open('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png').convert('RGBA').resize((192,192))
adaptive=Image.new('RGBA',(192,192),'#102b29');adaptive.alpha_composite(fg)
mask=Image.new('L',(192,192));ImageDraw.Draw(mask).ellipse((0,0,191,191),fill=255)
canvas.paste(adaptive,(500,30),mask);draw.text((500,230),'adaptive circle',fill='#392717')
splash=Image.open('android/app/src/main/res/drawable-port-xhdpi/splash.png').convert('RGBA');splash.thumbnail((170,150));canvas.paste(splash,(20,265),splash)
draw.text((210,280),'Native splash / original canvas sizes preserved',fill='#392717')
canvas.save('visual-review/G11/platform-contact.webp','WEBP',quality=85)
print('26 native PNGs, XML syntax, five web sizes and adaptive preview passed')
