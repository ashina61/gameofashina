# Deniz ve kuzey kenarı — 0.104.1 / SW119

Kullanıcının 12 Ekim ekranlarında iki hata: açık denizde aynalanıp tekrar eden küçük iskele parçaları; yukarı kaydırıldığında görünen bulanık orman şeridi ve keskin birleşimi. İkisi 0.104.0'ın uzantı çiziminden kaynaklanıyordu.

Deniz için seçilen güneydoğu kesiti korsan adasının iskele ucunu içeriyordu. Küçük kesiti aynalayan `TileSprite` kaldırıldı. Açık deniz artık tek bir `Image` ve tek bir su görselidir: `public/images/game/terrain/master-open-sea-v1.webp`. Görsel bir kez çizilir; tile veya aynalama kullanılmaz. Eski su/orman uzantı dokuları üretilmez. Yeni su, haritanın alt kenarına renk açısından eşlenir; son 32 kaynak pikselindeki yalnız açık suda alpha geçişi uygulanır. Arazi/arsa/bina kırpılmaz.

Haritanın kuzeyinde yapay orman yok. Kamera sınırı mevcut HUD'un ölçülen yüksekliğinden hesaplanır. HUD'un kıvrımlı alt kenarının dışında boş mavi çizgi kalmaması için gerçek harita, HUD yüksekliğinin %90'ından itibaren görünür. Yakınlaştırma ve ekran boyutu değişince bu sınır güncellenir. Dünya güneyde açık denize devam eder; arsalar, kayıt, ekonomi, yapı görselleri ve HUD değişmez.

## Deniz görseli

Built-in imagegen; referans `master-detail-v1/se.webp` içindeki yalnız su malzemesi. Çıktı 1024×1536, WebP kalite 90. Prompt:

> Create a SINGLE portrait open-sea painting, 1024x1536. Reference WATER MATERIAL ONLY. Extend the sea south of the existing Ottoman-Aegean game map as ONE non-repeating backdrop, NOT tiled or mirrored. ONLY deep Aegean blue open water, fully opaque edge to edge, identical high downward orthographic view, realistic stylized painterly game material. Top approximately #086b9e; subtly deepen toward #075887. Tiny irregular sunlit ripples, upper-left warm daylight, calm water. No land, islands, cliffs, buildings, docks, piers, boats, people, sea creatures, rocks, objects, white foam, circular swirls, large bright streaks, repeated motifs, grid, seams, text, border, horizon or sky. Organic uneven small-scale ripples, restrained contrast, sparse fine highlights. Do not reproduce the reference island or dock. Upper edge should blend into the map's deep blue sea without a bright strip or color jump.

## Doğrulama

351 test, TypeScript, ESLint, CSS ve V2 ölçütleri geçti. Pages alt yoluyla statik üretim derlemesi geçti. `tools/master-edge-qa.cjs`: 360/390/430px ekranlarda minimum zoom, art arda kuzey ve güney kaydırma; dokuz kontrol geçti. Kuzey görünür sınırı 0.78–0.80 dünya pikseli içeride, tek deniz görüntüsü, eski uzantı dokuları yok. JavaScript hatası ve eksik varlık sıfır. Ekran kanıtları ve rapor `docs/mockups/master-edges/` içinde.

Şehir yapı/seçim/kaydırma/zoom denetimi `tools/master-release-qa.cjs` ile ayrı geçti: yeni oyun, üç genişlikte yedi modül, inşaat iskelesi ve belediye seçimi. Görsel taşma sıfır; rapor `city-qa.json`. `MASTER_QA_OUT` çıktıyı farklı klasöre yönlendirir. Genel tüm-sayfa layout betiğinin önceki öz-denetim sorunu bu çalışmada düzeltilmedi.
