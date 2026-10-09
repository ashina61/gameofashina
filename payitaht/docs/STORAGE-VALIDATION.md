# Ambar/Depo — 0.75.0 / SW87

- 335 test, TypeScript, ESLint, strict CSS ve V2 ölçütleri başarılı.
- Chromium 360/390/430×844: Ambar ve Depo ana ekranı, açıklamalar ve açık Gelişim taşma/kesik/küçük/minik/çakışma/isimsiz kontrol taramalarında temiz.
- Yedi stok satırı; İlim Yağmalanmaz etiketi, boş kahve, dolu akçe ve karışık miktarlar doğrulandı. Kapasite toplam havuz olarak sunulmaz.
- Her iki yapıda yükseltme ilk Gelişim bloğudur; mevcut oyun komutuyla yükseltme başlatıldı ve aktif ilerleme görüntüleri kaydedildi. Ambar son seviye ve Depo kurulmamış durum taramaları temiz.
- Gerçek atlaslar, ayrı kısa ortam bantları ve şeffaf ortak stok simgesi. Ekonomi, baskın, kayıt, HUD ve şehir bina görselleri değişmedi.
- Kanıtlar: docs/mockups/storage-{ambar,depo}-{360,390,430}.webp; development/active; ambar-maxed ve depo-unbuilt.

- Tam genel layout-qa 360×740 ve %130: exit 1. Eski HUD küçük/minik kayıtları sürüyor. Ambar/Depo ana sekmesinde gizli Gelişim dock’unu ölçen eski kontrol canvas çakışması sayıyor; açık Gelişim’in odaklı taraması temiz. Genel kontrol tamamen yeşil diye raporlanmaz.
- Pages statik export başarılı. Önceki Turbopack önbelleği ayrı tutuldu; temiz derleme yapıldı.
- Yayın öncesi gelen Kahvehane 0.74.1 düzeltmesi korunarak entegre edildi; sürüm 0.75.0, yeni önbellek SW87.
