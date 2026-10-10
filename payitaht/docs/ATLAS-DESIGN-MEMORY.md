# Dünya atlası ve imparatorluk defteri — 0.88.0 / SW100

10 Ekim 2026 kullanıcının “devam” talebiyle dünya haritası ve imparatorluk özeti ortak onaylı kışla/saray tasarımına geçirildi. Önce MASTER-UI-STANDARD.md okunur. Ceviz, parşömen, pirinç köşeler, gerçek yuvarlak geri/çarpı ve kırmızı ipek eylemler 47/50/66 stillerinden gelir.

- Dünya haritasında 16 ada gerçek ad ve koordinatlarıyla seçilir. Seçim, yalnız haritanın merkezini değiştirir. Harita sürükleme, parmak/pinch, tekerlek ve +/−/sıfırlama mevcut MapViewport üzerinden yürür; HUD ölçeklenmez.
- Adalar mevcut 16 boyalı görselden gelir. Coğrafya, deniz yolu ve gemi ilerlemesi hesapları korunur. En uzak ölçek .65; etiketler 17px, dokunma alanları 70×80 harita birimidir.
- Ada bilgisi modeless alt çekmecedir. Adayı gör/Şehre git/Koloni kur önce; gerçek koloni bedeli engel varken de görünür. Yatak, harika, kendi şehir, rakip hükümdarlar, bağımsız hedefler ve mevcut şehirden gerçek seyahat süresi dikey akar.
- İmparatorluk özeti Kaynaklar/Binalar/Ordu sekmelerindedir. Her şehir açılır defterdir, aktif şehir ilk açılır. Şehre git ayrı eylem. Yedi malın gerçek stok, ayrı mal kapasitesi ve net dakika üretimi, nüfus, inşaat ve kuşatma aynı defterde okunur. İnşaat kuşatma nedeniyle gizlenmez.
- Ordu sicili kayıtlı ve kullanılabilir askerleri ayırır. Nakliye gemileri ortak ticaret filosunda; şehir sicilindeki sayı ayrıca belirtilir. Kışla kara portreleri ve boyalı deniz/casus görselleri kullanılır; hiçbir görsel SVG fallback değildir.
- Özgün kısa haritacı/sicil sahnesi: public/images/game/ui/atlas/register.webp. Prompt ve kaynak: atlas-art.json. 960×320 WebP; görünüm yüksekliği 80px.

Motor, kayıt biçimi, stok bedelleri, seyahat, ada koordinatları, şehir arsaları, üst/alt HUD ve **dört ek boş ada yerleşim alanı** korunur. Reserve alanları ormanda değildir. Sıradaki bölüm Ordu ve donanma ana ekranı; bu bölüm test/yayından sonra kullanıcı değerlendirmesinde dur.
