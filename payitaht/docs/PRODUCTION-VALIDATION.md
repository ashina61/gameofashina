# Kereste ve kaynak üretimi — 0.76.0 / SW88

- 335 motor/kayıt testi başarılı; güncellenen SW88 testi ayrıca geçti. TypeScript, ESLint, strict CSS ve V2 ölçütleri temiz. Pages statik export başarılı. Yerel tsx CLI IPC açamadığı için testler aynı tsx loader ile node --import tsx --test üzerinden çalıştırıldı.
- Chromium 360/390/430×844: altı yapının ana sekmesi ve Gelişim; gerçek atlaslar ve ayrı altı ortam bandı doğrulandı. 42 ilk mobil ekran kaydı.
- Kereste sürgüsünde Geri al/Onayla, ada ormanı bağlantısı ve gerçek yükseltme; taslak ve aktif durumlar geçti. Açık Gelişim ilk bloğu yükseltmedir.
- 360 px %130 yazı: aynı altı sayfa ve işlemler. Uzun başlığın dar ekranda düğmeye yaklaşması başlık genişliği/yazı ölçüsüyle giderildi.
- Odaklı taramada görünen içerik için taşma/kesik/küçük/minik/çakışma/isimsiz yok. Aktif JobProgress içindeki Base UI gizli 1px x ölçüm öğesi ham raporda kesik sayılır; önceki Medrese kontrolünde de aynı istisna vardır.
- Genel tools/layout-qa.cjs tamamlandı; exit 1, toplam {"taşma":0,"kesik":0,"küçük":322,"minik":667,"çakışma":50,"isimsiz":0}. Eski HUD boyut ve metin kayıtları sürer. Kapalı Gelişim dock’unu canvas altında ölçen eski kontrol üretim sayfalarında çakışma sayar; açık Gelişim’in odaklı kontrolü temizdir. Genel denetim tamamen başarılı diye raporlanmaz.
- Ekonomi, kaydetme, maliyetler, süreler, işçi komutu ve HUD değişmedi.

- Son ek durum kontrolleri: dört kaynak kendi adasında pozitif üretim; sıfır çalışan ve Kereste son seviye; kurulmamış Ormancı; dolu kereste; kahve üretmeyen adada Kahvehane tüketimiyle negatif stok değişimi. Sekiz durum da gerçek UI üzerinde geçti. Sayfa/varlık hatası yok. Seçili 21 WebP ekran ve bütün odaklı ölçüm sonuçları docs altında tutulur.
