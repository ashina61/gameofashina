# G3 — danışman portreleri

G2 onayı ve istenen düzeltmeler/0.42.0 merge sonrası dört danışman üretildi:
Vezir (beyaz sarık/bordo), Serasker (çelik miğfer), Âlim (ak sakal/yeşil),
Elçi (kırmızı fes/lacivert). Onaylı G0 stil sayfasıyla ayrı üretim, gerçek kişi
ve başka oyun karakteri kullanılmadı. Promptlar `tools/art/prompts/g3.md`,
dosya kayıtları CREDITS.md. 512×512 şeffaf WebP kalite 82; her biri ≤60 KB.

AdvisorPortrait aynı id/size imzasıyla img döndürür. Daire ve pirinç çerçeve
CSS'te; yüz büyük, iki göz görünür, omuzlar daire içinde kırpılır. Arayüz
etiketleri/dokunma alanları ve haber parlaması (azaltılmış hareket dahil) korunur.
42 px üst bar ve 84 px konuşma boyları denendi. SW v30, dört portre cache'te.

before/after: gerçek bileşenler 42 px koyu/parşömen dairede ve 84 px konuşma
boyunda; aynı 390×844 şehir/araştırma ekranı. Kanıtlar ≤200 KB WebP, PNG yok.

Bölüm 6: TypeScript, 316 test, ESLint sıfır uyarı, CSS/unused CSS strict,
unused assets 0, half-size, V2 (telefon bina seti 9.6 MB), statik Pages derlemesi,
layout 360×740/%130 tüm kategoriler 0, visual 390×844 sayfa/asset hatası 0,
rehber 8 hedef / 3.7 oyun dakikası geçti. Ortamın tsx IPC EPERM kısıtlaması
için aynı testler `node --import tsx --test` ile çalıştırıldı.

Oyun kuralları, ekonomi, kayıt, slot koordinatları ve bina ölçekleri değişmedi.
