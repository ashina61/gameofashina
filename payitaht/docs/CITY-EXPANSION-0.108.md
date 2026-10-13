# Karo sınırı, kuzey ormanı ve güney denizi — 0.108.0 / SW124

13 Ekim 2026. Kullanıcı bütün binaların karo sınırında kalmasını, üstte biraz daha orman ve altta daha açık deniz istedi. Mevcut doğrudan yayın yetkisi geçerlidir.

Bütün bina dokusu, çatı/avlu ve resmin içindeki gölgeler dahil, kaldırımın iç kenarına eşlenir. Kaldırım payı resim koordinatında 6 pikseldir; yalnız x/y boyutundan küçültme veya mimariden parça kesme uygulanmaz. Gerçek dört kenarın içe ötelenmiş doğrularının kesişimleri kullanılır. Kurulu modüllerde dışarıya ikinci yapay gölge eklenmez. İnşaat iskelesi ve başlangıç şantiyesi, dört köşesi de eğimli poligonun içinde kalan en büyük orantılı dikdörtgene sığar. Bu sürüm yeni üstten bakış bina kataloğu sağlamaz.

Kuzeyde 7 ağaçlı yeni boyalı koru görselinden altı küçük küme; kümelerin tamamı üstteki 55 pikselde kalır, kara arsaları ve yollarla kesişmez. Güneyde 180 resim pikseli (540 dünya pikseli) açık deniz eklendi. İskele, gemi veya korsan adası çoğaltılmaz; yeni su çiziminin dalga ayrıntısı dikey olarak ezilmez. Su birleşiminin ortalama rengi mevcut alt deniz kenarına eşlendi. Haritanın alt kamera sınırı 3072 yerine 3612 dünya pikselidir; şehir odağı ve kayıtlı arsa kimlikleri aynı kaldı.

Yeni proje varlıkları:
- public/images/game/terrain/north-grove-v1.webp
- public/images/game/terrain/open-sea-v2.webp

Görseller yerleşik imagegen ile üretildi; PNG kaynakları çalışma çıktısında, oyunun kullandığı WebP sürümleri bu depodadır. İki varlık da 200 KB altında. Orman üretim tarifi: gerçekçi boyalı Osmanlı–Ege referansıyla 7 zeytin/servi/çam ağacından organik koru; yüksek bakış, sol üst ışık, şeffaf dış alan, yapı/yol/yazı yok. Deniz üretim tarifi: referans kıyının ışığı ve dokusuyla 3:1 açık Ege suyu, ufuk/kara/iskele/gemi/yazı ve tekrarlı desen yok. Referanslar mevcut unified-detail-v3/nw.webp ve se.webp'dir.

356 test, tip kontrolü, ESLint/CSS ve statik Pages derlemesi geçti. V2 ve telefon görsel denetimi geçti. 36 tür, dört ekran genişliği ve yakın/uzak/kuzey/güney pan ile 25 Phaser senaryosu: karo poligonunun dışında çizim köşesi yok; 24 savunma parçasında arsa çakışması yok. Karo denetimi artık yalnız çevreleyen dikdörtgeni değil gerçek dört kenarı kullanır. DPR2 ve Canvas başlangıcında sayfa hatası/eksik varlık yok. Genel 78 senaryo taramasında taşma/kesik/çakışma/isimsiz/sayfa hatası 0; önceki HUD küçük hedef 312 ve minik yazı 663 uyarısı aynı kaldı, genel betik çıkışı 1. Bütün denetim yeşil diye raporlanmaz.

Son kuzey/deniz kamera senaryolarının sonuçları: docs/mockups/approved-city-108/edges/qa.json.
