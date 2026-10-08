# Kışla 0.66.0 doğrulama

8 Ekim 2026. Yerel gerçek Next uygulaması, Chromium ve sentetik deneme kaydı. Oyuncu kaydı değiştirilmedi.

- TypeScript, ESLint, CSS lint, strict unused CSS ve v2 kriterleri geçti.
- 328 oyun testi geçti, 0 hata.
- 360/390/430/864 px genişliklerde yatay taşma yok, başlık kontrolleri kare ve en az 48 px.
- Projenin layout tarayıcısı Kara ordusu, kilitli birlik, sıra/ordu durumu, Gelişim ve yardım durumlarını normal ve %130 yazıyla denedi. Kışla kapsamındaki altı hata kategorisi boş. Tüm uygulama için genel tarama iddiası değildir.
- Yeniçeri adedi 2'ye değiştirildi; 2 eğit eylemi ve eğitim sırasına eklenmesi doğrulandı. Tüfekçi kilidi ve devre dışı eğitim düğmesi korundu. Gelişim sekmesi, yardım/yapı araçları, seviye görünümü, kapatma çalıştı.
- Kaynakları yeterli ikinci deneme kaydında yükseltme düğmesi etkin; tıklamadan sonra Ustalar çalışıyor ilerleme alanı açıldı.
- HUD kaynak dosyaları SHA256 ile aynı; üst/alt ölçüler sayfa öncesi/sonrası aynı. Birlikler, kurallar, fiyatlar, süreler ve kayıt bileşenleri değiştirilmedi.
- Gerçek 390×844 ekranlar: avlu, birlik galerisi, eğitim, kilitli birlik, ordu sicili ve Gelişim. Uzun içerik dikey kaydırılır; yükseltme alanı ayrı sabit alandadır.

Canlı sürüm yayın sonrası ayrıca kontrol edilir.

## 0.66.1 — alan düzeltmesi

Ana eğitim kaydırıcısı 390×844 ölçüsünde 584 px. Sabit yükseltme kaldırıldı; aynı bileşen/işleyici Gelişim sekmesine taşındı. Avlu yalnız Gelişim içinde açılır. Galeri 108 px plaka; metin ve dokunma boyları korunur. Yapı/birlik açıklamaları yardım düğmesiyle erişilir.

Güncel kanıtlar `docs/mockups/barracks-roomy-*.webp` içinde. 360/390/430/864 px, normal/%130 metin, eğitim adedi/sıra, kilitli birlik, ordu sicili, Gelişim, avlu/yardım, görünüm ve kapatma yeniden kontrol edildi. Kaynakları yeterli ikinci deneme kaydında yükseltme Gelişim'den başlatıldı; Ustalar çalışıyor durumu doğrulandı. TypeScript, ESLint, CSS/unused CSS ve 328 test geçti. HUD dosyaları değişmez.

390×844 ilk açılışta eğitim düğmesinin altı 735,78 px, kaydırıcı altı 744,70 px: düğme tamamıyla görünür. İki eşzamanlı yazılım GPU sayfasındaki otomasyon zaman aşımı, ilk test sayfası kapatılarak giderildi; normal kullanıcı kaydırması sonrası yükseltme tıklaması geçti.

## 0.67.0 — onaylı dikey defter ve adet barı

- 328 oyun/kayıt/arayüz testi, TypeScript, ESLint, CSS renk/unused CSS ve V2 kriterleri geçti. Yerelde tsx IPC kısıtı nedeniyle testler aynı tsx yükleyicisiyle `node --import tsx --test` üzerinden koştu.
- Gerçek Chromium, temiz sentetik oyun kaydı: 360/390/430 ×844. Kışla ve 390px Gelişim'de altı layout tarama kategorisi boş: taşma, kesik, küçük hedef, minik metin, çakışma, isimsiz kontrol.
- Adet barına dokunma 1→16 değiştirdi. Sayı girişinde 2 seçildi; 2 Yeniçeri Eğit düğmesiyle eğitim sırasına gerçek emir eklendi. Maliyet/süre mevcut hesaplardan gelir.
- Gerçek ekranlar: `mockups/barracks-approved-live-{360,390,430}.webp`, `mockups/barracks-approved-development.webp`. Onaylı tasarım `mockups/approved-barracks-vertical-slider.webp`; aynı tasarımın referansıdır, canlı screenshot olarak sunulmaz.
- Genel `tools/layout-qa.cjs` de çalıştırıldı fakat tüm uygulama için yeşil değildir: değişmeyen HUD danışmanı/dar yapı önizlemeleri ve eski sabit yükseltme beklentileri hata verir. Kışla için bildirdiği dok hatası, Gelişim sekmesindeki gizli yükseltmenin eğitim ekranında görünmesini bekleyen eski kontroldür. Yeni kışlanın kendi taramasında hata yoktur; genel HUD bu işte değiştirilmedi.
- Mockup'taki örnek sayılar veya sıra iptal düğmesi eklenmedi. Ekonomi, birlik şartları, eğitim süresi, araştırma/garnizon, kayıt biçimi ve kabul edilmiş HUD kaynakları değişmedi.

## 0.68.0 — çizimin gerçek parçaları

0.67.0 görsel benzerliği kullanıcı tarafından reddedildi. Yeni metinsiz atlas, yakın plan üç portre, temiz parşömen, işlemeli pirinç dokuz parçalı kart çerçevesi ve kırmızı kumaş eğitim düğmesi kullanıldı. Bina ve HUD oyun kuralları korunur; mevcut alt menünün beş sekmesine dokunulmadı.

328 test geçti. TypeScript, ESLint, CSS/unused CSS, V2 kriterleri ve Pages için statik üretim geçti. Sentetik kayıtla 360/390/430×844 ilk eğitim, 390×844 eğitim sırası, açılan ordu durumu/savaş meydanı, Gelişim ve yükseltme kontrolleri: altı layout kategorisi boş. Adet barı 1→17; sayı girişinden 2 Yeniçeri eğitim emri gerçek sıraya eklendi. Kışla kapsamı için kontrol, bütün uygulama için yeni bir yeşil tarama iddiası değildir.

Güncel gerçek ekranlar `mockups/barracks-approved-live-{360,390,430}.webp`, `mockups/barracks-approved-development.webp`, `mockups/barracks-painted-{queue,army,upgrade}.webp`. Referans çizimle aynı veri veya boy oranı iddia edilmez: telefon ekranında gerçek HUD, tarayıcı alanı ve oyun verileri kullanılır. Eski sürümün yalnız renklerle benzerlik iddiası geçersizdir.

## 0.68.1 — yükseltme önce

Gelişim'in ilk çocuğu UpgradeDock; 390×844 gerçek tarayıcıda DOM sırası ve ilk ekran görüntüsü doğrulandı. Maliyet/süre ve yükseltme düğmesi en üstte; avlu/seviye etkisi/maliyet tablosu aşağıda. Kışla/Gelişim layout taramasının altı kategorisi boş. TypeScript, CSS/unused CSS ve iki PWA önbellek testi geçti. Önceki sürümün mekanikleri ve görsel parçaları aynıdır.
