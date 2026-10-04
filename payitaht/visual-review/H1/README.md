# H1 — Giriş arka planı

Mockup sahnesi imagegen ile yeniden boyandı. Önceki bulanık plaka/düğme izleri kaldırıldı; resimde yazı, logo ve düğme yok. Logo ve düğmeler kod katmanındadır. Üst %35 gökyüzü; alt kısım çiçekli taş balkon ve su. Tarif: `tools/art/prompts/h1.md`.

`before-390x844.webp` ve `after-390x844.webp` gerçek tarayıcı ekranlarıdır: kayıtlı oyun, 390×844, servis worker kapalı. Tarayıcı hata/eksik asset raporları yanındadır.

SW ve testi zaten v42 idi; kullanıcının hedeflediği sürüm korunmuştur. Merge kontrolü: kaynak dal e888c22 hedef dalın atasıdır.

Kontroller: TypeScript ve statik build; 324/324 oyun testi; ESLint/CSS; kullanılmayan asset 0; half-size kontrolü; V2 ölçütleri; 360×740 + %130 yerleşim sıfır hata; 390×844 kapsamlı görsel turu (kuşatma dahil); ilk sekiz rehber hedefi 5.0 oyun dakikasında tamam. Günlükler `checks/` altında. Bu ortamda `pnpm check` içindeki tsx CLI Unix pipe açamadı; aynı test dosyaları `node --import tsx --test --test-concurrency=1` ile eksiksiz çalıştırıldı.
