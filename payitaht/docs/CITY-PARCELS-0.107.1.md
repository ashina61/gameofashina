# Güncel karolara göre yerleşim — 0.107.1 / SW123

13 Ekim 2026. Kullanıcı gerçek telefon ekranında binaların karolara oturmadığını bildirdi. Önceki doğrudan yayın izni geçerlidir.

Eski dört köşe ölçüleri şehir küçük resmine bağlıydı; ekranda unified-detail-v3 ayrıntıları çiziliyor. Alt sağ kara arsasında sol üst sınır 835 yerine 854 piksel; eski doku yolun içine giriyordu. 25 kara arsası güncel birleşik ayrıntılı zeminde incelendi, 21 tanesinin dört köşe sınırı düzeltildi. Kuzeyde doğru olan dört arsa ve kıyı/korsan sınırları korundu. Köşelerden merkez ve boyut yeniden hesaplandı; motor/kayıtlı arsa kimlikleri değişmedi.

İnşa/taşıma çerçeveleri dikdörtgen yerine aynı arsa poligonunu çizer. Bina ve boş arsa dokunma alanları da poligondur; dikdörtgenin yol üstündeki köşesi artık etkileşime girmez. Tam bina dokusu mevcut Mesh/Canvas yöntemiyle bu sınırların içine yerleşir; kırpma veya yeni zemin plakası kullanılmadı.

Bu düzeltme mevcut resimlerin kamera açısını yeniden çizmez ve yeni 36 üstten bakış asseti sağlamaz. Şehirle sanat uyumunun bütünüyle tamamlandığı iddia edilmez. Belediye, yollar, HUD, ekonomi, kayıt biçimi ve bina mimarisi korunur.

Doğrulama: 354 test, tip kontrolü, ESLint/CSS, V2 ve statik Pages derlemesi geçti. Gerçek telefon yakın/uzak ekranları kontrol edildi. Ek tarama sonuçları yayın öncesi aşağıya eklenir.

Ek sonuçlar: 36 bina türü, 360/390/430 px ve masaüstünde 25 Phaser senaryosu geçti; ölçülen köşelerde eksik kapsama/taşma yok. 24 sur parçasında arsa çakışması yok. DPR2 ve Canvas başlangıcı eksik asset/sayfa hatası olmadan geçti. Genel 78 senaryo taraması: taşma 0, kesik 0, çakışma 0, isimsiz 0, sayfa hatası 0; önceki HUD küçük hedef 312 ve minik yazı 663 uyarısı aynı kaldı (betik çıkışı 1). Bütün tarama yeşil diye raporlanmaz.
