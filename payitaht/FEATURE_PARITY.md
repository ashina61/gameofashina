# Payitaht — Ada stratejisi oyun sistemleri

Bu proje Ikariam'ın oyuncuya sunduğu şehir, ada, ticaret, deniz ve strateji döngülerini
özgün Payitaht evrenine uyarlamayı hedefler. Ikariam'ın özel görselleri, metinleri,
isimleri, kaynak kodu ve birebir dengesi kopyalanmayacak.

## Gerçek durum (2026-09-23)

- **Mevcut:** Ana şehir, modüler bina yerleşimi, bina seviyeleri/ücret/süre, üretim/işçi
  dağıtımı, halkın memnuniyeti, ambar kapasitesi, dört araştırma kolu, kara/deniz
  birliklerinin eğitimi, sur savunması, nakliye gemisi/kargo kapasitesi, offline
  üretim ve yerel save doğrulaması.
- **Bu PR:** 8 adalı atlas, göçle korunan çok şehirli save, Saray/Liman/gemi
  şartıyla yeni şehir, bağımsız şehir ekonomisi ve yerleşimleri, şehir değiştirme,
  şehirler arası süreli nakliye ve dolu ambarda bekleyen yük.
- **Henüz yok:** Ada lüks yatağına işçi atama ve lüks kaynak envanteri;
  lüks malların bina/ordu/araştırma fiyatlarına gerçek etkisi, ortak adadaki
  oyuncuların maden bağışları, çevrimiçi pazar, gerçek oyuncu kentleri,
  eşzamanlı PvP/abluka/yağma, ittifak ve anlaşmalar, casusluk, savaş raporları,
  dünya etkinlikleri.

## İnşa sırası

1. **Ada kaynak ekonomisi:** Her adanın odun dışında tek uzmanlaşmış kaynak
   yatağı olması; üzüm/mermer/kristal/kükürt için işçi, üretim ve stok;
   halk memnuniyeti/araştırma/ordu maliyetlerine kaynakların gerçekten etki etmesi.
2. **Liman ticareti:** Gemi sayısı, yükleme zamanı, rota, geri dönüş,
   kargo rezervasyonu, şehirler arası emtia/para transferi ve pazarda NPC emirleri.
   NPC işlemleri gerçek oyuncu işlemi olarak gösterilmez.
3. **Koloni yönetimi:** İsimlendirme, Saray/idare dengesi, ada maden kapasitesi,
   koloniye göre vergi, üretim ve yapı kilitleri, şehir listesi/kamera kolay geçişi.
4. **Savaş sistemi:** Kara/deniz birimlerinin rolleri, kuşatma/abluka,
   yola çıkma/dönüş, savunma ve kayıpları açıklayan deterministik savaş motoru.
5. **Çevrimiçi dünya:** Sunucuda doğrulanan kimlik, ortak ada/şehirler, gerçek
   oyuncuların pazar teklifleri, PvP seferleri, yağma ve ittifak/diplomasi.
   Bunun için mevcut localStorage prototipinden sunucu-otoriteli oyun durumuna
   geçiş ve hile/çift işlem/çatışma çözümü gerekir.
6. **İlerleme ve içerik:** Daha kapsamlı araştırma ağacı, bina ve birlik
   sınıfları, ticaret/savaş raporları, görevler, şehir ve donanma görselleri,
   mobil erişilebilirlik ve performans.

**Yayın kuralı:** Her paket eski kayıtları korumalı, oyun motoru ve mobil ekran
testlerinden geçmeli. Yerel simülasyon gerçek çok oyunculu deneyim diye
sunulmamalı.
