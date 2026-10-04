# H2 — 16 ayrı silüetli ada küçük resmi

Her ada yerleşik imagegen ile ayrı kaynak resim olarak üretildi. Yapay oval/üçgen kesme maskesi uygulanmadı. Tarifi ve 16 ayrı konu: `tools/art/prompts/h2.md`; kodlama: `tools/art/h2-normalize.py`.

Bütün görseller 160×180, gerçek alfa, ≤12000 bayt. Kara kütlesinin ölçülen merkezi tuval merkezine 2 pikselden yakın (haritadaki 50×60 ölçekte 1 pikselden az). Koordinatlar, tıklama alanları, sancak ve isim katmanları değiştirilmedi.

`contact-sheet.webp`: isimli 16 ada; isimler sadece kanıt sayfasındadır. `before-390x844.webp` / `after-390x844.webp`: oyunun gerçek tarayıcı ekranları; 16 ada düğmesi, sayfa hatası ve eksik görsel 0 (`after-browser.json`). Her dosyanın boyutu/merkezi `checks.json` içindedir.

H1 kontrol paketindeki 324 test, TypeScript/build, lint/CSS, sıfır hata yerleşim, şehir/kuşatma ve rehber denetimleri bu fazda korundu. Değişiklik resimler ve üretim/kanıt dosyalarıyla sınırlıdır. Telefon toplamı 14912205 / 15000000 bayt. SW v42.
