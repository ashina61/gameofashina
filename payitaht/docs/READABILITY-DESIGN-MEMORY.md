# Dar ekran okunurluğu — 0.90.0 / SW102

10 Ekim 2026: Ordu/Donanma sonrasında genel yerleşim raporundaki gerçek küçük hedef ve başlık sorunları ele alındı. MASTER-UI-STANDARD.md ve onaylı profil atlası geçerlidir.

- Ortak boyalı sayfa başlıkları geri/kapat düğmelerinin arasında iki satıra bölünebilir; taşarak düğmelerin üstüne gelmez.
- Profil sekmeleri ve Ayarlar/Arşiv alt düğmeleri en az 44px yüksekliğindedir. Şeref rafı 112px alt sınırı ve 11px yazılarla okunur; durum yazısı kısa “Kilitli”, erişilebilir düğme adı ayrıntılı kalır.
- Şimdi/Sonra açıklama düğmesinin gerçek kutusu 44px yüksekliğindedir.
- Eski bina sayfalarının kaydırma alanı küçülebilir (`min-height: 0`); eski sabit alt düğme için bırakılmış fazla kaydırma dolgusu 24px olur; kaynak yetersizliği uyarısı ve %130 yazı boyutunda yükseltme alt menünün üstünde kalır.
- Motor, ekonomi, kayıt biçimi, dört ada yerleşim açıklığı ve onaylı HUD görselleri değişmez.

## Doğrulama

345 motor/PWA testi, typecheck, ESLint, CSS kontrolleri, V2 ölçütleri, görsel yarım boyut kontrolü ve statik üretim geçti. Profil/Karagöz/Saray hedefli 12 tarama (360/390/430px ve 360px %130): sıfır bulgu, sıfır tarayıcı hatası. Gerçek görüntüler docs/mockups/readability-*.webp; ölçümler docs/readability-qa-report.json.

Saray/Valilik ayrıca 360×740, %130 ve yetersiz kaynak durumunda yeniden tarandı: iki bina sıfır bulgu; eski fazla alt dolgu kaldırıldıktan sonra yükseltme alt menünün üstündedir.

Genel tarama, kapalı Gelişim sekmelerinin sıfır boyutlu yükseltme dokunu artık ölçmez; görünür düğmeyi kaydırıp üstündeki engelleri kontrol eder. Ekran değişiminde önceki yazı büyütmesi geri alınır: tekrar kullanılan DOM ve yeni çocuklarda birikerek sahte çakışma oluşmaz. Öz-denetim bilerek bozuk taşma/küçük yazı/hedef/çakışma/adsız düğmeyi yakalamaya devam eder.

Genel rapor tamamen temiz ilan edilmez: onaylı HUD’un 360px danışman hedefleri ve kompakt canlı sayaçları ayrıca raporlanır. HUD değiştirilmeden bu bulgular kapatılmaz.
