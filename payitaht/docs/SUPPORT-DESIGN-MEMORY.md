# Yardımcı defterler ve son tutarlılık denetimi — 0.99.0 / SW111

11 Ekim 2026. Ana sayfaların ve bütün yapı gruplarının önceki geçişleri tamamlandı. Son taramada ortak atlasların dışında kalan ilk açılış rehberi, çevrimdışı dönüş özeti ve modeless bina önizlemesi tamamlanır. `76-support-register.css` yalnız bu üç pencereye uygulanır; `MASTER-UI-STANDARD.md` geçerlidir.

## Bulunan ve giderilen eksikler

- Rehber ve dönüş kartı eski yuvarlak düz renk panellerdi. Ortak gerçek kışla parşömeni, dört işlemeli köşe, ceviz ikincil düğme ve kırmızı eğitim eylemi kullanılır.
- Dönüş kartı üç kaynak gösterirken dört sütun ayırıyordu. Üç eşit sütun, okunur sayılar ve dikey tamamlanan işler sicili kullanılır.
- Rehber konumlandırması 220 px varsayımsal yüksekliğe dayanıyordu. Hedefin karşı tarafındaki gerçek kullanılabilir alan sınırlanır; uzun/büyük metin kart içinde kayar. Hedef kutusu örtülmez.
- Uzun dönüş özetinin altındaki düğmeler gerçek dokunma testinde HUD menüsünün arkasında kalıyordu. Özet ve rehberin katmanı HUD'un üzerine alınır; HUD'un kendisi değişmez. Rapor ve şehre dönüş düğmeleri gerçek tıklamayla sınanır.
- Parşömendeki rapor kazanma/kaybetme yazıları koyu yeşil/kızıl mürekkeple okunur.
- Bina önizlemesi ortak atlas çerçevesi, gerçek yuvarlak kapatma düğmesi ve okunur metinlerle tamamlanır. Modeless davranış, Escape, yönetim geçişi ve yükseltme aynı kalır.

## Korunan sınırlar

Rehberin dört hedefi, görüldü bayrağı, atlama/ilerleme; çevrimdışı özet hesapları, inşa/araştırma/eğitim/kaynak/rapor/haber listeleri ve üretim sınırı; bina eylemleri ve kayıt biçimi değiştirilmez. Oyun motoru, ekonomi, dört ada açıklığı, koordinatlar ve onaylı HUD korunur.

## Kanıt

`tools/support-qa.cjs` gerçek kayıtların çevrimdışı ilerlemesini kullanır. İlk rehber, sakin dönüş, kaynak/eğitim dönüşü, 30 günlük yoğun dönüş ve beş bina önizlemesi 360/390/430 px ve %130 yazıyla kontrol edilir. Atlasın hesaplanan çerçevesi, pencerenin ekran içinde olması, rehberin hedefi örtmemesi ve işlemler ayrıca doğrulanır. Sonuç `support-qa-report.json`; gerçek ekran görüntüleri `mockups/support-*.webp`.

Genel `layout-qa.cjs` ana sayfa, yapı, arsa ve önizleme taramasıdır. HUD'un mevcut küçük hedef/minik yazı uyarıları ayrı tutulur; genel taramayı tamamen temiz diye raporlama. Yeni ihlaller giderilmeden yayınlama.

Yayın sonrası kullanıcının değerlendirmesinde dur. Ana sayfalar için yeni bir yeniden tasarım sırası uydurma; kalan işler yeni kullanıcı değerlendirmesi veya somut bulunan hata üzerinden belirlenir.

## Son doğrulama

345/345 oyun testi; TypeScript, ESLint, CSS ve kullanılmayan sınıf denetimleri, V2 ölçütleri, yarım boyut asset kontrolü ve statik üretim derlemesi geçti. Yardımcı pencerelerde 72 tarama ve 15 gerçek işlem sonucu temiz; eksik görsel veya sayfa hatası yok. Genel tarama 196 görünüm: taşma/kesilme/çakışma/isimsiz kontrol 0. Önceki sürümle aynı 312 küçük hedef ve 665 minik yazı uyarısı danışman/HUD ve mevcut ada araç düğmesindedir; genel QA bu yüzden çıkış 1 verir. `consistency-qa-summary.json` bu ayrımı saklar.
