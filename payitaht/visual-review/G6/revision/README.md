# G5 HUD + G6 gemi düzeltmesi

2026-10-04. G6 onayı sonrası istenen düzeltmeler; sonraki faz G7.

- Altı kaynak kutusu tek dokunuşla üretim defterini açar; Çarşı düğmesi defterdedir. Dört üretim kaynağında stok altında gerçek net `/dk` hızı, nüfusta büyüme hızı; negatif hız kırmızı. Sefer hakkı kapasitesi korunur. Ayrı `+` düğmeleri kaldırıldı.
- 390 ve 360 px kaynak barı tek satır; %130 yazıda iki satır. Kanıt: `after/hud-390x844.webp`, `hud-360x844.webp`, `hud-360x844-text130.webp`.
- Faaliyetler varsayılan tek çip: iş sayısı + en yakın süre. Dokununca en fazla dört kart; haritaya dokununca kapanır. `activity-390x844.webp` / `activity-expanded-390x844.webp`.
- Elçi mektubu mühürlü zarf; haftalık olay hilalli takvim. Gün sayısı madalyon içinde. Harita araçları tek açılır madalyonda.
- Bank/küp çiftleri yarıdan fazla azaltıldı; yalnız bina olan cadde ve meydan çevresinde. Servi çiftleri korundu. Terrain QA bütün görünür dekoru yol/meydan/rıhtım ayak izi ve çift simetrisi açısından denetler; boş yol bank/küp izin koşulu da raporlanır.
- Nakliye geniş sandık/çuval yığını; ikmal yuvarlak variller ve yeşil flama; karamürsel tek büyük latin yelken ve küreksiz gövde; humbara kısa havan ve duman; mancınık yüksek kol; zemberek pruvada büyük arbalet; ateş gemisi koyu gövde ve alevli pruva.

`before/` önceki onaylı G5/G6 kanıtlarının aynısını içerir. `after/` gerçek 390×844 başlangıç şehri, büyümüş şehir, liman ve tersane ekranlarıdır. `ships-56px.webp` yedi gemiyi hem parşömen hem koyu ceviz üzerinde gerçek 56 px boyunda yan yana gösterir.

Her kanıt WebP ve ≤200.000 bayt; kaynak PNG depoya eklenmez. Kaynak tarifleri `tools/art/prompts/g6-revision.md`; hak kayıtları `public/images/game/CREDITS.md`. 29 birlik toplam 850.730 bayt; telefon görsel envanteri (iki yeni ikon dahil) 14.954.852 / 15.000.000 bayt.

Oyun kuralları, ekonomi hesapları, kayıt biçimi ve slot koordinatları değişmedi. SW v35.

Kontrol çıktıları `checks/` altında; yerleşim ve eksik görsel/JS hata raporları ayrıca JSON olarak bulunur.

## Son kontrol sonucu

Bölüm 6'nın tamamı geçti: TypeScript, 319/319 test, ESLint sıfır uyarı,
CSS/kullanılmayan CSS, kullanılmayan görsel (0), küçük kopya denetimi,
V2 ölçütleri ve statik derleme. 360×740 / %130 yazı turunda altı yerleşim
kuralının tamamı 0 ihlal; 390×844 görsel QA'da eksik varlık ve JS hatası 0.
HUD, terrain ve birlik sayfalarının ek kontrolleri geçti. İlk sekiz rehber
hedefi son koşuda 4,1 oyun dakikasında tamamlandı. Yazılımla çizilen QA
ortamında açılış 6.244 ms / JS belleği 73 MB; bu gerçek cihaz ölçümü değildir.
