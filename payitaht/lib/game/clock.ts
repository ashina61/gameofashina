/**
 * OYUN SAATİ (V2 Faz 5.4) — cihaz saatine körü körüne güvenmez.
 *
 *  • Oyun saati hiç geri gitmez. Cihaz saati geri alınırsa oyun, son görülen
 *    andan GERÇEK geçen süre kadar (monoton sayaçla) ilerler; geri alınan
 *    saatle kazanç olmaz, oyuncu uyarılır.
 *  • İleri atlama, telefonun uyuması ya da oyunun kapalı kalmasıyla aynı
 *    görünür; sunucusuz ayırt edilemez. Bunun kazancını çevrimdışı üretim
 *    sınırı (engine.offlineCapHours) keser.
 *
 * Saf fonksiyonlar: `wall` Date.now(), `mono` performance.now() verilir.
 */
export type ClockState = { wall: number; mono: number; game: number }

/** Duvar saati monoton sayaçtan bu kadar geride kalırsa "geri alındı" sayılır. */
export const CLOCK_BACK_SLACK_MS = 2_000

/** Açılış: kayıttaki son görülen an, cihaz saatinden ilerideyse oradan başlar. */
export function startClock(lastSeen: number, wall: number, mono: number): { state: ClockState; rewound: boolean } {
  const rewound = wall + CLOCK_BACK_SLACK_MS < lastSeen
  return { state: { wall, mono, game: Math.max(wall, lastSeen) }, rewound }
}

/** Bir sonraki oyun anı. Duvar saati geri giderse gerçek geçen süre (mono) kullanılır. */
export function tickClock(s: ClockState, wall: number, mono: number): { state: ClockState; now: number; rewound: boolean } {
  const dWall = wall - s.wall
  const dMono = Math.max(0, mono - s.mono)
  const rewound = dWall < -CLOCK_BACK_SLACK_MS
  const step = rewound ? dMono : Math.max(0, dWall)
  const now = s.game + step
  return { state: { wall, mono, game: now }, now, rewound }
}
