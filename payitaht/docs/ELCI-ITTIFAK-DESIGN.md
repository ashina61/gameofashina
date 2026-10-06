# Elçi / İttifak — 0.58.0 / SW55

Kullanıcının Vezir sonrası ‘devam’ yetkisiyle ortak resimli saray dilinin ikinci bölümü. Referanslar PROFILE-SETTINGS-DESIGN.md ve VEZIR-DESIGN.md. Ceviz ahşap, pirinç, açık parşömen, serif metin, resimli nesneler, tam genişlik ve 44px kontroller.

## Elçi

Yeni hariciye odası, gerçek okunmamış mektup / aktif teklif / hükümdar sayıları. Mektuplar, Teklifler, Hükümdarlar, Pazar, Haberler, Sıralama. Öncelikli teklifler ve okunmamış mektuplar ilk açılan defteri belirler. Elçinin mevcut öğüdü görünür kalır. Pazarın mal, asker, anlaşma ve kendi teklifleri bölümleri korunur. Hükümdarlar gerçek portre atlasıyla listelenir. Boş mektup sandığı için resimli durum vardır. Yapay rakip bilgisi açıkça belirtilir.

## İttifak

Kuruluş ve katılım ayrı defterler. Kuruluşta en yüksek Elçilik seviyesi, gerçek gereksinimler, ad ve kısaltma. Elçilik yoksa yapıya geçiş. Kurulu birlik: gerçek lider sancağı, birlik adı/kısaltması/düsturu, üye sınırı, itibar ve yeni genelgeler; Birlik, Üyeler, Görevler, Genelge, Diplomasi.

Üye/rütbe/davet, haftalık görev/ödül, genelge, tanıtım/iç duyuru/düstur, diplomatik tutum ve dağıtma onayı mevcut motoru kullanır. Sancak, lider profilindeki ortak kayıt alanını kullanmaya devam eder. Yeni düzenleyici: 10 gerçek ipek kesimi, 12 sırma arma ve kayıtlı renkler; açık kaydet/vazgeç. SVG sancak veya arma kullanılmaz. Bir yapay birliğe katılmış üyelik ekranı da aynı dilde gösterilir.

Oyun motoru, ekonomi, kayıt biçimi ve kurallar değişmedi. Diplo öğüdü ayrı sunum modülüne taşındı; yalnız döngüsel bileşen bağımlılığını önler.

## Sanat

Yeni varlık: `public/images/game/ui/divan/envoy-scene.webp`. Yerel diplomat portresi ve Vezir sahnesi referans alınarak yerleşik imagegen ile üretildi. İttifak loggiası, nesneler, kumaşlar ve armalar onaylı kitteki aynı gerçek görsellerdir.

Üretim istemi: “Use case: historical-scene. New wide landscape mobile strategy game header illustration, Ottoman Aegean embassy chancery. Image 1 character identity reference: same handsome bearded diplomat wearing a red fez and deep blue gold embroidered Ottoman coat. Image 2 exact painterly realism, rich walnut, warm brass, ivory stone, parchment and coastal daylight art direction. Create a distinct diplomatic office: diplomat left third at walnut table receiving a sealed blank parchment letter, several folded letters with red wax seals, brass ink and scroll on table. Open colonnaded window on right shows Aegean harbour and a galleon; warm sunlight upper-left. Human proportions and believable historical material detail. Premium game illustration as one painter with reference2. Wide 3:1 composition with character face visible in mobile crop. No lettering, no UI, no border, no modern objects.”

## Kontrol

328 test, TypeScript, ESLint, CSS ve V2 kontrolleri; Pages taban yoluyla üretim dışa aktarımı. Elçinin altı defteri ve pazar alt bölümleri; ittifak kuruluş/katılım/üyelik ve beş yönetim defteri, 390px ve 360px/%130 yazıda kontrol edildi. Kurma, katılma, ayrılma, davet, genelge ve sancak kaydet/vazgeç test edildi. Bütün sayfa/bina taraması: sıfır taşma, kesik, küçük hedef, minik metin, çakışma, isimsiz kontrol veya sayfa hatası. Çevrimdışı test ortamında font zamanlamasından doğan yanlış sonuçları önlemek için önceki derlemedeki aynı font ikilileri kullanıldı. Gerçek tarayıcı ekranları `visual-review/Elci-Ittifak/` altında.

Sonraki bölüm: yönetim bina sayfaları; Divanhane ve Elçilik. Yayın ve ekranlarla kullanıcı değerlendirmesinde durulur.
