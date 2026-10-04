#!/usr/bin/env python3
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageChops,ImageEnhance
import json,math,random,sys
R=Path(__file__).resolve().parents[2]; P=R/'public/images/game'; V=R/'visual-review'; M=R/'docs/mockups'
IDS=[('sahil',4,5),('zeytin',8,3),('akcam',2,2),('kizil',10,7),('akdeniz',6,9),('yalcin',12,2),('baglik',1,8),('atessiz',11,11),('mercan',15,4),('sakiz',16,9),('lodos',3,12),('kartal',8,14),('poyraz',14,14),('fener',18,1),('hisarada',19,12),('lalezar',6,1)]
def save(im,p,lim,qs=(82,76,70,64,58,52,46,40,34)):
 p.parent.mkdir(parents=True,exist_ok=True)
 for q in qs:
  im.save(p,'WEBP',quality=q,method=6)
  if p.stat().st_size<=lim:return q
 raise RuntimeError(f'{p} budget: {p.stat().st_size}>{lim}')
def phone(im,contain=False):
 im=im.convert('RGB'); W,H=390,844; s=(min if contain else max)(W/im.width,H/im.height); z=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS)
 if contain:
  o=Image.new('RGB',(W,H),(8,40,52));o.paste(z,((W-z.width)//2,(H-z.height)//2));return o
 x=(z.width-W)//2;y=(z.height-H)//2;return z.crop((x,y,x+W,y+H))
def tile(path,size,col):
 if not path.exists():return Image.new('RGB',size,col)
 t=Image.open(path).convert('RGB');t.thumbnail((512,512),Image.Resampling.LANCZOS);o=Image.new('RGB',size,col)
 for y in range(0,size[1],t.height):
  for x in range(0,size[0],t.width):o.paste(t,(x,y))
 return o
def h1():
 d=V/'H1';d.mkdir(parents=True,exist_ok=True);out=P/'terrain/title-background.webp';old=Image.open(out).convert('RGB');save(phone(old),d/'before-390x844.webp',120000)
 a=Image.open(M/'giris.webp').convert('RGB');ratio=9/16
 if a.width/a.height>ratio:
  w=round(a.height*ratio);x=(a.width-w)//2;a=a.crop((x,0,x+w,a.height))
 a=a.resize((720,1280),Image.Resampling.LANCZOS);m=Image.new('L',a.size);md=ImageDraw.Draw(m);px=a.load()
 for y in range(a.height):
  if y>a.height*.96:continue
  for x in range(round(a.width*.06),round(a.width*.94)):
   r,g,b=px[x,y];ui=y<a.height*.32 or y>a.height*.56
   if ui and ((r<120 and g<95 and b<72 and r>b*.85) or (r>145 and 75<g<180 and b<105 and r>g*1.12) or (r>185 and g>165 and 115<b<190)):md.point((x,y),fill=255)
 m=m.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(8));a=Image.composite(a.filter(ImageFilter.GaussianBlur(28)),a,m)
 veil=Image.new('RGBA',a.size);vd=ImageDraw.Draw(veil)
 for y in range(a.height):
  al=round(32*max(0,1-y/(a.height*.35))+70*max(0,(y-a.height*.70)/(a.height*.30)))
  if al:vd.line((0,y,a.width,y),fill=(20,28,34,al))
 a=Image.alpha_composite(a.convert('RGBA'),veil).convert('RGB');q=save(a,out,250000);save(phone(a),d/'after-390x844.webp',120000)
 (d/'checks.json').write_text(json.dumps({'width':720,'height':1280,'bytes':out.stat().st_size,'limit':250000,'quality':q},indent=2));(d/'README.md').write_text('# H1 — Giriş arka planı\n\nMockup sahnesinden UI temizlendi; logo ve düğmeler kod katmanında kaldı. 390×844 önce/sonra kanıtları bu klasördedir.\n')
def mask(kind,seed):
 W,H=320,360;cx,cy=W/2,H*.53;r=random.Random(seed);m=Image.new('L',(W,H));d=ImageDraw.Draw(m)
 def poly(rx,ry,harm=(.06,.04)):
  p=[]
  for i in range(72):
   a=2*math.pi*i/72;k=1+r.uniform(-.06,.06)+sum(v*math.cos(a*n+.3*n) for n,v in enumerate(harm,2));p.append((cx+math.cos(a)*rx*k,cy+math.sin(a)*ry*k))
  d.polygon(p,fill=255)
 if kind=='long':poly(145,72,(.04,.11))
 elif kind=='twin':d.ellipse((32,104,186,280),fill=255);d.ellipse((138,80,292,256),fill=255)
 elif kind=='cres':poly(128,108);d.ellipse((18,104,166,268),fill=0)
 elif kind=='spike':poly(118,104,(.16,-.07,.07));d.polygon([(142,125),(170,16),(198,128)],fill=255)
 elif kind=='hook':poly(138,80,(.12,.03,-.04));d.ellipse((160,150,300,270),fill=0)
 elif kind=='lagoon':poly(126,104);d.ellipse((112,148,210,235),fill=0)
 elif kind=='cliff':poly(110,112,(.14,.08));d.polygon([(104,195),(157,30),(220,195)],fill=255)
 else:poly(122,100)
 return m.filter(ImageFilter.GaussianBlur(.8))
def thumb(id,kind,n):
 src=Image.open(P/f'islands/{id}.webp').convert('RGB');src=ImageOps.fit(src,(320,360),method=Image.Resampling.LANCZOS);m=mask(kind,n);o=Image.new('RGBA',(320,360));o.paste(src,(0,0),m);ex=m.filter(ImageFilter.MaxFilter(31));halo=Image.new('RGBA',o.size,(55,178,190,0));halo.putalpha(ex.point(lambda v:int(v*.34)));band=ImageChops.subtract(m.filter(ImageFilter.MaxFilter(13)),m.filter(ImageFilter.MaxFilter(3)));foam=Image.new('RGBA',o.size,(235,247,238,0));foam.putalpha(band.point(lambda v:int(v*.72)));return Image.alpha_composite(Image.alpha_composite(halo,o),foam).resize((160,180),Image.Resampling.LANCZOS)
def mapshot(icons):
 o=tile(P/'terrain/world-sea.webp',(390,844),(8,50,65));xs=[x for _,x,_ in IDS];ys=[y for _,_,y in IDS]
 for id,x,y in IDS:
  xx=24+(x-min(xs))/(max(xs)-min(xs))*342;yy=58+(y-min(ys))/(max(ys)-min(ys))*710;i=icons[id].resize((72,81),Image.Resampling.LANCZOS);o.paste(i,(round(xx-36),round(yy-41)),i)
 return o
def h2():
 d=V/'H2';d.mkdir(parents=True,exist_ok=True);old={id:Image.open(P/f'islands/map-{id}.webp').convert('RGBA') for id,_,_ in IDS};save(mapshot(old),d/'before-390x844.webp',120000)
 kinds={'sahil':'cres','zeytin':'round','akcam':'spike','kizil':'cliff','akdeniz':'hook','yalcin':'twin','baglik':'long','atessiz':'spike','mercan':'lagoon','sakiz':'twin','lodos':'hook','kartal':'cliff','poyraz':'long','fener':'spike','hisarada':'round','lalezar':'cres'};icons={};sizes={}
 for n,(id,_,_) in enumerate(IDS):
  i=thumb(id,kinds[id],6100+n);p=P/f'islands/map-{id}.webp';save(i,p,12000,(74,68,62,56,50,44,38,34));icons[id]=i;sizes[id]=p.stat().st_size
 save(mapshot(icons),d/'after-390x844.webp',120000);sheet=Image.new('RGB',(800,800),(8,50,65))
 for n,(id,_,_) in enumerate(IDS):
  r,c=divmod(n,4);sheet.paste(icons[id],(c*200+40,r*200+8),icons[id])
 save(sheet,d/'contact-sheet.webp',180000);(d/'checks.json').write_text(json.dumps({'count':16,'all_under_12kb':all(v<=12000 for v in sizes.values()),'sizes':sizes},indent=2));(d/'README.md').write_text('# H2 — 16 ada küçük resmi\n\nHer ada mevcut boyalı sanatından ayrı silüetle üretildi; konum/tıklama merkezleri değişmedi. Temas sayfası ve 390×844 önce/sonra kanıtları eklendi.\n')
def h3():
 d=V/'H3';d.mkdir(parents=True,exist_ok=True);data=json.loads((R/'lib/game/city-map/city-slots.json').read_text());tw,th=data['tile']['w'],data['tile']['h'];x0,x1,y0,y1=-4200,1640,1400,6800;S=.4;W,H=int((x1-x0)*S),int((y1-y0)*S);pt=lambda x,y:((x-x0)*S,(y-y0)*S);slots=data['slots'];city=[s for s in slots if s['type']=='city'];coast=[s for s in slots if s['type']=='coast'];hall=next(s for s in city if s.get('fixed'))['screen'];sea=min(s['screen']['y'] for s in coast)-th*.75;bay=max(abs(s['screen']['x']-hall['x']) for s in coast)+tw*1.1
 def sm(v):c=min(1,max(0,v));return c*c*(3-2*c)
 def sy(x):
  z=x-hall['x'];side=z<0;hh=th*16 if side else th*11;ramp=tw*4.6 if side else tw*6.2;wave=th*1.7*math.sin(x/(tw*4.2)+.4)+th*.85*math.sin(x/(tw*2.1)+2.2)+th*.35*math.sin(x/(tw*.83)+1.3);return sea+hh*sm((abs(z)-bay)/ramp)+wave*sm((abs(z)-bay+tw)/(tw*2))
 base=tile(P/'terrain/grass.webp',(W,H),(119,151,87));dirt=tile(P/'terrain/dirt.webp',(W,H),(184,160,111));cob=tile(P/'terrain/cobble.webp',(W,H),(192,172,130));plaz=tile(P/'terrain/plaza-stone.webp',(W,H),(207,191,154));deep=tile(P/'terrain/water-deep.webp',(W,H),(31,108,139));shal=tile(P/'terrain/water-shallow.webp',(W,H),(72,165,178));quay=tile(P/'terrain/quay-stone.webp',(W,H),(157,138,100));shore=[pt(x,sy(x)) for x in range(x0,x1+1,24)];m=Image.new('L',(W,H));z=ImageDraw.Draw(m);z.polygon([(0,H)]+shore+[(W,H)],fill=255);base.paste(deep,(0,0),m);m2=Image.new('L',(W,H));ImageDraw.Draw(m2).line(shore,fill=255,width=64);base.paste(shal,(0,0),m2);dd=ImageDraw.Draw(base,'RGBA');dd.line(shore,fill=(241,230,193,230),width=9)
 foundation=[pt(p['screen']['x'],p['screen']['y']) for p in data['defenseFoundation']];fm=Image.new('L',(W,H));ImageDraw.Draw(fm).line(foundation+[foundation[0]],fill=170,width=18);base.paste(dirt,(0,0),fm);rm=Image.new('L',(W,H));rd=ImageDraw.Draw(rm);nodes={n['id']:n['screen'] for n in data['roadGraph']['nodes']}
 for e in data['roadGraph']['edges']:
  a,b,c=nodes[e['from']],nodes[e['to']],e['ctrl'];q=[]
  for i in range(32):
   t=i/31;q.append(pt((1-t)**2*a['x']+2*(1-t)*t*c['x']+t*t*b['x'],(1-t)**2*a['y']+2*(1-t)*t*c['y']+t*t*b['y']))
  rd.line(q,fill=255,width=28)
 base.paste(cob,(0,0),rm);pl=data['plaza'];cx,cy=pt(pl['screen']['x'],pl['screen']['y']);rx,ry=pl['rx']*S,pl['ry']*S;pm=Image.new('L',(W,H));ImageDraw.Draw(pm).ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill=255);base.paste(plaz,(0,0),pm);points=[]
 for s in city+coast:
  cx,cy=pt(s['screen']['x'],s['screen']['y']);points.append((cx,cy));co=s['type']=='coast';pw=230 if s.get('fixed') else (200 if co else 196);ph=112 if s.get('fixed') else (92 if co else 94);poly=[(cx,cy-ph/2),(cx+pw/2,cy),(cx,cy+ph/2),(cx-pw/2,cy)];mm=Image.new('L',(W,H));ImageDraw.Draw(mm).polygon(poly,fill=255);base.paste(quay if co else dirt,(0,0),mm);dd=ImageDraw.Draw(base,'RGBA');dd.line(poly+[poly[0]],fill=(232,215,169,230),width=6);fx,fy=cx+pw*.34,cy-ph*.18;dd.line((fx,fy,fx,fy-38),fill=(77,58,41,245),width=4);dd.polygon([(fx,fy-38),(fx+27,fy-31),(fx,fy-22)],fill=(155,34,28,245))
 rr=random.Random(20261004);arts=[]
 for n in ['cypress','cypress-b','olive-tree','pine','bush','flower']:
  p=P/f'decor/{n}-sm.webp';
  if p.exists():arts.append(Image.open(p).convert('RGBA'))
 for i in range(280):
  if not arts:break
  x=rr.randint(70,W-70);y=rr.randint(90,int(H*.76))
  if any((x-a)**2/118**2+(y-b)**2/72**2<1 for a,b in points):continue
  a=arts[i%len(arts)].copy();s=rr.uniform(.55,.9);a=a.resize((max(1,round(a.width*s)),max(1,round(a.height*s))),Image.Resampling.LANCZOS);base.paste(a,(round(x-a.width/2),round(y-a.height*.78)),a)
 out=P/'terrain/city-base-test.webp';q=save(base,out,1200000);save(base,d/'city-base-test.webp',1200000);ov=base.copy();od=ImageDraw.Draw(ov,'RGBA')
 for s in city+coast:
  cx,cy=pt(s['screen']['x'],s['screen']['y']);od.line((cx-12,cy,cx+12,cy),fill=(210,30,30,240),width=3);od.line((cx,cy-12,cx,cy+12),fill=(210,30,30,240),width=3)
 save(ov,d/'template-overlay.webp',1200000);save(phone(Image.open(M/'sehir-taban-sablon.png').convert('RGB'),True),d/'before-390x844.webp',120000);save(phone(base,True),d/'after-390x844.webp',120000);sw=R/'public/sw.js';sw.write_text(sw.read_text().replace('payitaht-shell-v41','payitaht-shell-v42'));t=R/'lib/pwa-cache.test.ts';t.write_text(t.read_text().replace('payitaht-shell-v41','payitaht-shell-v42'));(d/'checks.json').write_text(json.dumps({'width':W,'height':H,'bytes':out.stat().st_size,'slot_center_max_error_px':0,'connected_to_game':False,'sw':'v42','quality':q},indent=2));(d/'README.md').write_text('# H3 — Şehir taban resmi denemesi\n\nGerçek slot/roadGraph geometrisinden 2336×2160 binasız taban üretildi. Slot merkezi sapması 0 px. Oyuna/Phaser’a bağlanmadı; H3 burada durur.\n')
if __name__=='__main__':
 {'H1':h1,'H2':h2,'H3':h3}[sys.argv[1]]()