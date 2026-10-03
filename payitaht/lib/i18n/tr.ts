/**
 * ARAYÜZ METİNLERİ (V2 Faz 8.4).
 *
 * Birden çok ekranda tekrar eden düğme, ekran okuyucu etiketi ve kısa durum
 * metinleri burada toplanır. Oyun içeriği (bina, birim, araştırma adları ve
 * açıklamaları) kendi veri dosyasında kalır; çevrilecekse oradan çevrilir.
 *
 * İngilizce V2'ye zorunlu değil. Yolu açık: `Strings` biçimine uyan ikinci
 * bir sözlük (ör. `en.ts`) yazılır ve `t` onu gösterecek şekilde değiştirilir.
 */

export type Strings = {
  action: {
    close: string
    back: string
    cancel: string
    confirm: string
    send: string
    watch: string
    edit: string
    increase: string
    decrease: string
  }
  city: {
    map: string
    occupied: string
    blockaded: string
    asList: string
    labelsShow: string
    labelsHide: string
    harbour: string
    recenter: string
    dragHint: string
    rivalOffers: (n: number) => string
  }
  building: {
    level: (n: number) => string
    founding: string
    upgrading: string
  }
  hud: {
    storageFull: (resource: string) => string
    housingFull: string
    population: string
  }
}

export const tr: Strings = {
  action: {
    close: 'Kapat',
    back: 'Geri',
    cancel: 'Vazgeç',
    confirm: 'Onayla',
    send: 'Gönder',
    watch: 'İzle',
    edit: 'Düzenle',
    increase: 'Bir artır',
    decrease: 'Bir azalt',
  },
  city: {
    map: 'Şehir haritası',
    occupied: 'işgal altında',
    blockaded: 'liman abluka altında',
    asList: 'Şehri liste olarak gör',
    labelsShow: 'Bina etiketlerini göster',
    labelsHide: 'Bina etiketlerini gizle',
    harbour: 'Donanma ve limana git',
    recenter: 'Belediyeye dön',
    dragHint: 'Sürükle · iki parmakla yakınlaş',
    rivalOffers: n => `${n} yapay rakip teklifi bekliyor`,
  },
  building: {
    level: n => `${n}. seviye`,
    founding: 'temeli atılıyor',
    upgrading: 'yükseltiliyor',
  },
  hud: {
    storageFull: resource => `${resource} (ambar dolu)`,
    housingFull: 'Nüfus (konut dolu)',
    population: 'Nüfus',
  },
}

/** Etkin dil. Şimdilik yalnız Türkçe. */
export const t: Strings = tr
