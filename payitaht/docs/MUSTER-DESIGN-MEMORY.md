# Ordu ve donanma sicili — 0.89.0 / SW101

10 Ekim 2026: önceki sohbetin son raporu 0.89.0 yayınlanıyor diyordu; gerçek dal başı f701a66 / 0.88.0 idi. İş bu sürümden tamamlandı. MASTER-UI-STANDARD.md geçerlidir.

- Kara ordusu, Donanma ve Seferler ayrı CourtTabs sekmeleri. Asıl oyun eylemi önce; halk/garnizon kısa satırda, uzun güç/bakım açıklaması açılır defterde.
- ArmyPanel mevcut eğitim komutunu ve aynı gerçek maksimum, bedel, süre, engelleri kullanır. Kara ve gemi birlikleri ortak kışla atlasıyla dikey; yalnız seçili satır açık. Casus resmi mevcut boyalı WebP'dir.
- Kayıtlı sayı seferdeki birlikleri içerir; kullanılabilir sayı availableUnits ile gelir. Toplam bakım bütün ordunundur. Savaş meydanı/kapasite ayrı açılır destek bölümüdür.
- Ortak ticaret filosu ile kayıtlı nakliye farklıdır; toplam ve boş gemiler Liman'a geçişle gösterilir. Nakliye için eğitim emri verilmez.
- Seferler aynı MissionList, DefenseSummary ve DeployPanel komutlarını kullanır. Boş sefer ve tek şehir durumları okunur. Ada hedef seçimi yalnız görünümü değiştirir.
- İşgal/abluka emirleri üstte açılır bölümde erişilebilir; ekonomi/ordu komutları aynı kalır.
- Ana Ordu ekranında eski büyük PageStocks ve otomatik dekor kaldırıldı. Kabul edilmiş üst/alt HUD değişmedi. Mekanik, kayıt, ada/şehir koordinatları ve dört ek ada yerleşim açıklığı korunur.

Kod: army-register.tsx, 67-muster-register.css. Ortak 49 numaralı kışla stilinin selector kapsamına yalnız bp-muster eklendi. Bina sayfalarının mevcut eğitim düzeni korunur.

Kontrol: docs/muster-qa-report.json ve mockups/muster-*.webp. Genel layout-qa taraması çalıştırıldı; mevcut HUD dokunma alanları ve bazı bina başlıkları genel taramayı kırmızı bırakıyor. Ordu ana sayfasında genel tarama bulgusu yok. Bu eski bulgular sonraki kapsamlı taramada ele alınmalı; bütün oyunun temiz olduğu iddia edilmez.

Yayın sonrası kullanıcı değerlendirmesinde dur. Sonraki çalışma: kalan ekranların tasarım envanteri ve genel taramadaki sorunların kullanıcı yetkisiyle sırayla düzeltilmesi.

## Son doğrulama

345 oyun testi, tip kontrolü, ESLint, CSS ve V2 ölçütleri geçti. Yayın derlemesi başarılı. 31 mobil ölçüm: 360/390/430 px, 360 px %130 yazı, kilitli ve kaynaksız durumlar; üç sekme, seçili asker ve casus defteri. Sıfır taşma/kesik/küçük hedef/minik yazı/çakışma/isimsiz kontrol; tarayıcı hatası yok. Eğitim emri kuyruğa girdi; kilitli ve kaynaksız eğitim engelleri doğrulandı. Eski v3 fixture'ın Taş Ocağı kaldırma iadesi, kaynaksız senaryoda sıfırlandı; üretim koduna dokunulmadı.
