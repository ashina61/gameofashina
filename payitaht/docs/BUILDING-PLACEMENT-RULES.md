17 Ekim 2026, 16:37 İstanbul — **Kullanıcı genel tasarım standardını onayladı:** “mantık böyle çalışacak her bina ayırt edici şekilde böyle çizilecek”. Güncel görsel referans, çalışan boyalı kışla ve arsa sahnesidir: `PAINTED-PARCEL.md`, `mockups/painted-parcel/live-final.jpg`, `public/images/game/buildings/parcel-v1/kisla.webp`.

Bütün bina türleri için ortak kurallar:

- Aynı izometrik kamera, yön, ölçek, ışık ve malzeme dili kullanılır.
- Her bina doğrudan gerçek ortak arsaya göre çizilir; mimari ve işlevsel avlu arsayı dolu gösterir. Kenar boşluğu ayrı bir zemin plakasıyla kapatılmaz.
- Bina görseli yalnız mimari ve işlevsel eşyaları içerir. Avlu, giriş ve eşya araları gerçek alfa ile ortak arka planı gösterir. Çayır, toprak, döşeme, kaide veya platform bina varlığına gömülmez.
- Her tür ilk bakışta tanınan farklı kütle, silüet, çatı ve işlevsel ayrıntıya sahip olur. Aynı L/U planını ve kuleli avluyu bütün binalara kopyalamak kabul edilmez. Renk veya tabela değiştirmek tek başına ayrım değildir.
- Kışla: koğuş, nöbet kulesi ve talim düzeni. Medrese: belirgin kubbeli ilim mekânı ve derslikler. Hamam: alçak çoklu kubbeler ve havalandırma fenerleri. Çarşı: açık dükkânlar, farklı örtüler ve tezgâhlar. Depo: yükleme kapıları ve sandık düzeni. Bunlar işlev ayrımı örnekleridir; henüz üretilmiş varlık listesi değildir.
- Yollar açık kalır. Çatı, duvar, eşya ve görünen gölge dahil bütün çizim arsa içinde kalır; kırpma veya projektif esnetme ile uyumsuzluk saklanmaz. Kaynak en-boy oranı korunur.
- Her yeni bina boş arsa / bina ve ortak zemin değişimiyle çalışan sahnede gösterilir; kullanıcı değerlendirmesi yapılmadan bütün katalog tamamlandı denmez.

Bu, yöntem ve görsel dil onayıdır. Kalan bina türleri ve ana şehrin bu sisteme aktarımı henüz tamamlanmış değildir. Aşağıdaki eski tarihli kurallarla çatışmada bu standart önceliklidir.

16 Ekim son düzeltme: **Binaların kendi zemini olmayacak.** Bina görselinde avlu toprağı, düz zemin döşemesi veya dış zemin plakası bulunmaz. Açık avlu ve eşya araları gerçek alfa ile şehrin mevcut zeminini gösterir. Runtime'da ikinci bir arsa dolgusu çizilmez. Arsa doluluğu ayrı bir zemin ekleyerek sağlanmaz; bu kural önceki ortak avlu dolgusu tarifinin önündedir.

13 Ekim güncel onay: kullanıcı son harita/belediye tasarımını kabul etti; bütün binalar belediye ölçeğinde, arsayı bütünüyle kaplayacak ve şehirle uyumlu olacak. Doğrudan canlı yayın açıkça yetkilendirildi. Aşağıdaki eski yayın yasağı bu yeni izinle kaldırılmıştır.

# Bina yerleşimi — kesin kullanıcı kuralları

12 Ekim 2026, 13:29 (İstanbul). Bu kurallar önceki prototip tariflerinin ve yaklaşık doluluk hedeflerinin önündedir.

1. **Yollar kapanmayacak.** Mevcut sokaklar, kavşaklar ve arsa sınırları korunur. Bina, çatı, merdiven, kapı, dekor veya gölge yol alanına girmez. Binayı sığdırmak için yol daraltılmaz, taşınmaz ya da yeniden çizilmez.
2. **Bina boşluğa tam oturacak.** Tasarım doğrudan gerçek arsanın şekli, genişliği, derinliği ve bakış açısıyla yapılır. Arsa, bina ve işlevsel avlusuyla dolar. Dolu görünmesi için arsaya özel yabancı bir zemin plakası eklenmez. Giriş, sınırdaki mevcut yola bağlanır.
3. **Taşma olmayacak.** Bina, avlu, çatı/kubbe, merdiven, dekor ve görünen gölgenin tamamı kendi arsa sınırında kalır; komşu arsa veya yola taşmaz. Yalnız zemin temasını kontrol etmek yeterli değildir. Kırparak, bir kısmını gizleyerek veya yolu boyayarak taşma saklanmaz; mimari çizim ve yerleşim düzeltilir.

Bu şartlar bütün bina türlerine, bütün seviye görsellerine ve binanın kurulabildiği bütün uygun arsalara uygulanır. Liman/korsan yapıları kendi uygun kıyı/ada alanlarıyla sınanır; kara arsası şablonu onlara zorlanmaz.

## Mimari ayrım

Kullanıcı 12 Ekim 12:55'te binaların aynı mimari stilde olmasını zorunlu tutmadı; tek bakışta ayırt edilmelerini istedi. Her binaya aynı U biçimli avlu, çatı ve süslü kapı kopyalanmaz. İşlev, silüet ve mimari farklı olabilir; zeminin kamera açısı, ölçeği ve ışığıyla uyum korunur.

Onaylanan yön: binayı tek başına üretip boş arsanın ortasına küçültmek yerine doğrudan arsa üzerinde tasarlamak. İlk bağımsız belediye/kışla/medrese prototipleri kullanıcı tarafından küçük kaldıkları ve zeminle uyuşmadıkları için reddedildi; `MASTER-BUILDING-PROTOTYPES.md` üretim geçmişidir, güncel onay standardı değildir.

## Çizimin kabulü

Önce gerçek zemin üzerinde gösterilir. Arsa sınırının içinde bütün görünen öğeleriyle kaldığı, yolların açık olduğu ve komşu alanı işgal etmediği kontrol edilir. Sonraki binalara geçerken de aynı kontrol uygulanır. Önceki konsept çizimleri, bu sınırlar ayrıca doğrulanmadan oyuna hazır varlık kabul edilmez.

Bu kayıt yalnız görsel tasarım kuralıdır. Mevcut ekonomi, kayıt biçimi, arsa açılma koşulları ve HUD değişmez. 13 Ekim tarihli açık kullanıcı izniyle doğrulanan sürüm doğrudan yayınlanır.
