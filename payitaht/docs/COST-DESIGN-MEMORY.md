# Maliyet azaltan yapılar — 0.77.0 / SW89

Geçerli standart MASTER-UI-STANDARD.md. Marangozhane, Mimarbaşı Odası, Kahve Kileri, Gözlükçü ve Barut Deneme Alanı; ortak Kışla/Medrese atlasları, ceviz, parşömen, altın işlemeler ve kırmızı ipek. Beş ayrı yazısız 80px atölye sahnesi, Tasarruf/Gelişim. Yükseltme ilk Gelişim bloğudur. Yapı görünümü galerisi veya üst bilgi düğmesi yoktur. HUD ve şehir görselleri korunur.

Ana defterde temel bedelden kalan oran, toplam tasarruf, gerçek atlas ilerleme çubuğu ve indirim kaynakları vardır. Yapının yüzdesi, toplam uygulanmış indirimle karıştırılmaz. İkinci defter gerçek motor bedelini bu yapı varken/yokken karşılaştırır; diğer mevcut etkiler korunur. Bina örneği sonraki Medrese seviyesidir; mal istenmeyen erken seviyelerde sıfır açıkça açıklanır. Son seviyedeki Medrese örneği yükseltme başlatmaz.

Marangoz: araştırmalar, etkin Dülgerler loncası ve yapı toplanır, kalan kereste en az %50. Mimar: araştırmalar ve yapı toplanır, mermer en az %50; lonca mermerde uygulanmaz. Gözlükçü: yalnız bina kristal bedeli, hekim/deney/araştırma harcaması kapsam dışı.

Kahve Kileri: yapı tüketim çarpanı en az 0,50, Mutfak ayrıca 0,90 ile çarpar. Toplam %45’e inebilir; genel %50 sınırı diye yanlış anlatılmaz. Örnek seçili ikramın wineConsumption talebidir, sıfır kahvede de fiilî ikramdan açıkça ayrılır. İkram kapalıysa tüketim sıfır.

Barut: yapı kükürt çarpanı en az 0,50. Top Dökümü yalnız topçu ve humbaracıda ayrıca 0,75; bu oranlar toplanmaz. İki kalan oran ayrı gösterilir. Örnek 10 topçunun gerçek unitLuxuryCost bedelidir; yuvarlama motorundur. Kışla, Medrese ve Kahvehane bağlantıları mevcut bina önizleme/yönetim akışını kullanır.

Uygulama: components/game/cost-panel.tsx; lib/game/cost-register.ts yalnız görüntü modeli; 55-cost-register.css. Ortak 47/50 kapsamına yalnız bp-cost eklenir; eski kullanılmayan maliyet çubuk stilleri kaldırılır. Motor, maliyet, süre, komut ve kayıt biçimi değiştirilmez. Görsel kaynak/prompt: cost-art.json; gerçek ekranlar mockups/cost-*.

Bu bölüm yayınlanınca kullanıcı değerlendirmesinde dur. Sonraki önerilen bölüm: Çarşı ve Ticaret Merkezi (ticaret ve esnaf).
