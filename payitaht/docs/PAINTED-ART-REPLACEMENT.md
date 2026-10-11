# Boyalı görseller ve sur düzeltmesi — 0.102.0 / SW116

11 Ekim 2026. Kullanıcı mevcut tasarımı koruyup kalan eski SVG çizimleri boyalı görsellerle değiştirmeyi ve sur sorununu düzeltmeyi istedi. Yeni master şehir önerisi uygulanmadı.

89 ortak arayüz ikonunun her biri şeffaf WebP çizim kullanır. Sekiz şehir nişanı, beş halk ifadesi, taşçı, madenci ve rehber oku da boyalıdır. Sancak ve arma önizlemeleri mevcut onaylı ipek/sırma görsellerini kullanır. Eski taç simgesi kavukla değiştirildi. SVG yalnız dünya haritasının dinamik koordinat, rota, metin ve seçim katmanı olarak kalır; savaş işaretleri boyalıdır.

## Sur

Eski Canvas yolu yüksekliği `spanY` üzerinden hesaplıyor; yatay kenarda sıfırlıyor, dik kenarda uzatıyordu. `wallArtTransform` kaynak görselin iki zemin noktasını temel halkasının uçlarına eşler, yüksekliği seviyeden hesaplar. Boyalı parçalar bir kez CanvasTexture olarak pişirilir; WebGL/Canvas aynı dokuyu kullanır. Yükseklik değişince eski ara dokular temizlenir. Dik kenarlar yan taş yüzeyi ve kesintisiz üst yürüyüş yüzeyi taşır. Kapı/liman/su kemeri açıklıkları ve tıklama alanları aynı kalır.

## Sanat kaynağı

Built-in ImageGen ile iki şeffaf atlas üretildi: 10×9 ikon atlası (son hücre boş), 4×4 nişan/insan atlası. Üretim brifi: premium gerçekçi stilize Osmanlı–Ege sanatı; sıcak sol üst ışık, pirinç/ceviz/parşömen/taş, al ipek ve altın sırma; koyu çizgi film konturu, neon, yazı ve filigran yok. Her hücre eşit ölçüde, tek okunur simge; 24 px kullanım. İkon sırası `ui-art.tsx` export sırası; nişan ve insan sırası dosya adlarıyla kayıtlıdır. Üretim PNG'leri sohbet görselinde korunur, oyun yalnız sıkıştırılmış hücre WebP'lerini kullanır.

## Sınırlar

Bina/arsa/ada koordinatları, ekonomi, kaydetme biçimi, savunma ve inşa kuralları değişmedi. Onaylı üst/alt HUD kodu ve resimleri aynıdır; boyalı ikonlara geçişte eski ikon gizleme ve boyut kuralları korunmuştur. Yayına alınmadan inceleme dalına hazırlanır.

## Doğrulama

Rapor ve gerçek ekran görüntüleri `mockups/painted-replacements/` altında. 346 oyun testi, tip kontrolü, ESLint/CSS, V2 ölçütleri ve üretim derlemesi. Genel düzen taraması mevcut küçük hedef/yazı uyarılarıyla ayrıca raporlanır.

Genel düzen taraması: taşma/kesik/çakışma/isimsiz/sayfa hatası 0. Onaylı HUD dâhil 312 küçük hedef ve 664 minik yazı uyarısı var; genel betik bu nedenle exit 1 verir. Bu uyarıları susturmak için kurallar gevşetilmedi. Üç telefon genişliği (360, 390, 430) ve üç sur kademesi ayrıca gerçek oyun karesiyle kontrol edilir.
