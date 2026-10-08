# Son düzeltme — 0.71.0 / SW81 (9 Ekim)

Kullanıcı halk ve âlimin her yerde aynı olmasını istedi: `PersonArt` halk için `public/images/game/ui/people/citizens.webp`, âlim için `scholar.webp` döndürür. Halk sıradan Osmanlı şehir sakinleri, âlim beyaz sarık/mavi cübbe/elyazmasıdır. Medreseye özel öğrenci veya eski portre kullanılmaz; öneri kutusu da aynı âlimi kullanır. Medrese portreleri 64×64, diğer kullanımlar kendi bağlam boyutuyla aynı resim/çerçeve.

Bütün bina detaylarından yapı görünümü/seviye galerileri kaldırıldı; üst bilgi düğmesi yok. Gelişim’in altında açıklama ve görselsiz yapı işlemleri bulunur. Medrese başlığının iki yanında aynı altın süs; yükseltme gereksinim başlığı ortalı. Onayla/Geri al eşit iki sütun; iç ikonlar metin ve atlas süslerini sıkıştırmasın.

Kristal deneyleri eski üç sayı düğmesi değildir: optik deneyin açıklaması, mevcut kristal, her seçenekte harcanan kristal ve kapasiteye göre gerçek ilim kazanımı, ortak kırmızı Deney yap düğmesi. İlim hazinesi doluyken düğme kapalıdır; kristal harcanmaz. Mevcut motor 100 kristal→150 ilim, kapasite sınırıyla aynı kalır.

Âlimin önerisi `lib/game/research-advice.ts`: halkın huzur/barınması, ambar doluluğu, eksi gelir, inşaat kuyruğu, ordu/liman ve ilim üretimine göre uygun tamamlanmamış araştırma seçer. Medrese seviyesi/ön koşul/başka şehirde sürme kontrol edilir; ilim eksikse miktarı ve üretim adımı anlatılır. Aktif çalışma gerçek adı/etkisiyle; ağaç bitince Gelecek yönüyle açıklanır. Otomatik emir veya yeni ekonomi kuralı yok.

Beş dalın mevcut boyalı G9 motifleri: Usta Elleri / Âlimler Meclisi / Çelik Tavı / Pusula / Ongun Töresi. Dallar yatay kayar; listeler dikeydir. İlim ve süre için yeni alfa korunmuş ortak boyalı görseller `res-ilim-v2.webp` ve `res-sure.webp`; bütün `IlimArt`/`KumSaatiArt` çağrıları bu kaynakları kullanır. Kullanıcının bütün oyuna yayma talebiyle üst HUD’da da yalnız âlim portresi ve ilim simgesi ortak kaynakla örtülür; 41 numaralı atlas/yerleşim ve bütün üst/alt menü eylemleri korunur.

Yeni dört görsel dahili imagegen ile ayrı üretildi. Portreler için onaylı kışla yalnız ressam/palet referansı, yazı/çerçeve resme gömülmedi. İstemler: üç sıradan şehir sakini/sade kumaş/avlu; yaşlı beyaz sarıklı mavi cübbeli âlim/elyazması/kitaplık; şeffaf açık parşömen kitap/pirinç hokka/tüy; şeffaf ceviz-pirinç cam kum saati. Sıcak sol üst ışık, gerçekçi boyalı strateji sanatı. Portreler 192px, kaynak simgeleri 128px WebP. Ortak işlemeli atlas çerçeveleri canlı HTML üzerinde kalır.

---

# Medrese ve araştırma defteri — 0.70.0 / SW80

Yetkili genel standart `MASTER-UI-STANDARD.md`; yeni bir tema yok. Âlim atama, araştırma, deney, gelecekteki araştırma ve bina gelişimi mevcut komut hesaplarını kullanır.

Medrese: kısa yazısız ilim meclisi sahnesi → İlim meclisi/Gelişim sekmeleri → Âlimler, başta Araştırmalara git → boyalı boşta halk/âlim, aynı madalyonlu adet barı, gerçek onay/geri al → açılır üretim ve maaş defteri → aktif/boş araştırma → varsa Deneyler. 0.70.0 tarihindeki avlu/önizleme akışı 0.71.0 kullanıcı düzeltmesiyle kaldırıldı; yukarıdaki son talimat geçerlidir.

Araştırma: kapalı Âlimin önerisi; dört canlı özet; Ekonomi/Bilim/Askerî/Denizcilik/Mitoloji dal şeridi; seçili araştırmanın gerçek koşul, ilim/süre ve eylemi; altında etkisi; aşağıda dikey işlemeli araştırma defteri. Ön koşulların metni ve kilitleri korunur. Eski çok derin girintili ağaç düz satırlara geçirilir; seçme/dal kaydırması ve tüm araştırma komutları aynıdır. Gelecek araştırmaları da aynı çerçeve/düğmelerde kalır. Mevcut boyalı 76 araştırma motifi korunur, aynı altın çerçeveyle sunulur.

Yeni yazısız sahne ve portreler: `public/images/game/ui/medrese/library.webp`, `scholar.webp`, `student.webp`. Dahili imagegen; kaynak onaylı kışla çizimi yalnız ressam/ışık/malzeme referansıdır. İstem: Osmanlı–Ege medrese kütüphanesi; solda beyaz sarıklı yaşlı âlim, ceviz masa ve elyazması; arkada fildişi kemerler, ilim meclisi, pirinç gökküre ve eski teleskop, servi/Ege. Sıcak sol üst ışık; metin/UI yok. Portreler aynı sahneden dilimlenir; parşömen, çerçeve, kırmızı eylem, +/−, sürgü, ikon ve süsler mevcut onaylı kışla atlasındandır.
