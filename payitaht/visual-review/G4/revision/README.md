# G4 revizyon — entegrasyon onayı

Onaylı 42 çizim değişmedi. Dekor gösterimi büyütüldü: başlangıç kadrajında
ağaç yüksekliği 45–65 CSS px, çalı/çiçek yaklaşık ×1.8 ve tam opak.
Yoğun çayır/orman serpmesi kaldırıldı; en fazla 28 adet, 3–5 parçalık koru,
meyve bahçesi, bostan+kuyu, lavanta/lale ve kahve bahçesi kümeleri.
Aralarında geniş temiz çim; meydan/ana yol çevresinde servi, saksı ve bank.
Mevcut arsa/yol/dere korumaları daha büyük silüet payıyla uygulanır;
slot koordinatları, bina ölçekleri, ekonomi, oyun kuralları ve kayıt değişmedi.

Ana çim onaylı dokunun render tonlamasıyla taze/sıcak Akdeniz yeşili.
grass-dry ana karışımdan çıkarıldı; yalnız kenar/yamaçta 24 küçük soluk leke.
Büyük zemin lekeleri 420→220; başlangıç +%8 yakınlaştırma geri alındı.

31 dekorun 192 px (ağaç) / 128 px (diğer) `-sm.webp` kopyası var.
Telefon ve lite yalnız küçük kopyaları yükler; masaüstü tam kaynakları kullanır.
`python3 tools/art/half-size.py` üretir; `--check` boyut/alfa/tam çözümleme
kontrolü yapar. Node/sharp kullanır, CI denetimi Pillow gerektirmez.
İlk resample turunda bozuk çıkan kopyalar yeniden kodlandı; tüm 31 dosya
hem sharp hem gerçek tarayıcıda çözüldü. CREDITS.md türev kaydı tamamlandı.
SW v32 küçük kopyaları önbelleğe alır.

## Performans ve boyut

390×844, DPR 1, headless Chromium; her deneme yeni bağlam/soğuk cache,
service worker kapalı. Süre: başlat düğmesi→ilk tamamlanmış kare +400 ms.

| Mod | Üç açılış (ms) | Ortanca | Görünür dekor |
|---|---|---|---|
| Normal | 3190, 2320, 2325 | 2.325 sn | 151 |
| Hafif | 2315, 2384, 2259 | 2.315 sn | 78 |

Normal ağaçların ölçülen en küçük yüksekliği 45 px. Hafif mod görünür
dekoru yaklaşık yarıya indirir; ayar değişince aynı sahnede uygulanır.
Normal/lite fotoğrafları `after/city-normal-390x844.webp` ve
`after/city-lite-390x844.webp`; ayrıntılı ölçümler `performance.json`.

Standart görsel QA (DPR 2, diğer QA süreçleriyle eşzamanlı):
3485 ms / 82 MB heap.
Önceki G4 aynı QA raporunda 3787 ms idi; 0.42 için verilen yaklaşık 3500 ms
hedefine yakın. İzole soğuk ölçümler farklı yük koşuludur, doğrudan aynı
benchmark gibi karşılaştırılmamalı. Gerçek telefon CPU/ağ hızı ölçülmedi.
Telefon görsel envanteri: 13.433 MiB ≤15 MiB, eski G4 14.716 MiB.

## Kanıt

`before/` G4 fa7cae0, `after/` bu revizyon. Aynı 390×844 şehir merkezi,
büyümüş şehir (aynı late-game fixture), liman; ayrıca şehir merkezindeki
CSS x175/y355, 215×240 bölgesinin 430×480 (2×) kesiti iki tarafta var.
Bütün kanıtlar WebP ≤200 KB; PNG yok. Çizim kaynakları değişmedi.

Bölüm 6 tamamı geçti: TypeScript, 316 test, ESLint sıfır uyarı,
CSS/unused CSS strict, unused assets strict (0), half-size (31 dekor dahil),
V2, statik Pages derlemesi, layout 360×740/%130 (tüm kategoriler 0),
visual 390×844 (asset/sayfa hatası 0), rehber 8 hedef.
Ortamın tsx IPC EPERM kısıtlaması için aynı testler `node --import tsx --test`.

G4 revizyon onayı gelmeden G5’e geçilmeyecek.
