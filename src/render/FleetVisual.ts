import type { Fleet, MissionKind } from '@/types';

/**
 * Filo hareketinin paylasilan görsel mantigi.
 *
 * Ikariam'da filolar haritada GERCEKTEN yol alır: bir adadan digerine
 * giden gemi simgesi iki nokta arasında ilerler ve varisinda olay
 * cozulur. Bizde simulasyon zaten `remainingGameSeconds` ile ilerler;
 * bu modul o sayiyi ekrandaki bir konuma cevirir. Boylece sahneler
 * (dunya haritasi ve ada gorunumu) ayni ilerleme hesabini paylasir ve
 * ikisi arasinda "gemi nerede" sorusunun cevapi asla ayrismaz.
 */

/** Görevin haritadaki simgesi ve rengi. */
export function missionGlyph(mission: MissionKind): string {
  switch (mission) {
    case 'attack': return '⚔️';
    case 'trade': return '💰';
    case 'transport': return '📦';
    default: return '⛵';
  }
}

/** Görevin etiketi (arayuzde ve harita etiketinde). */
export function missionLabel(mission: MissionKind): string {
  switch (mission) {
    case 'attack': return 'Saldırı';
    case 'trade': return 'Ticaret';
    case 'transport': return 'Nakliye';
    case 'return': return 'Dönüş';
    case 'plunder': return 'Yağma';
    case 'garrison': return 'Garnizon';
    default: return 'Filo';
  }
}

/** Görev rengi: dusmanca eylemler kirmizi, ticaret yesil, donus notr. */
export function missionColor(mission: MissionKind): number {
  switch (mission) {
    case 'attack': return 0xd05038;
    case 'trade': return 0x4f8f3f;
    case 'transport': return 0xc9a92c;
    default: return 0x8fa3b8;
  }
}

/**
 * Filonun yolculuk ilerlemesi [0..1].
 *
 * Gidis bacaginda hedefe, donus bacaginda eve yaklasir. `duration`
 * bacagin toplam oyun saniyesidir; kalan sifirsa filo varmistir ve
 * simulasyon onu zaten listeden cikarmistir, bu yuzden burada 1'e
 * kisitlamak yalnizca ayni karedeki cizim icin guvenlik supabidir.
 */
export function fleetProgress(fleet: Fleet): number {
  const total = Math.max(1, fleet.durationGameSeconds);
  const done = total - Math.max(0, fleet.remainingGameSeconds);
  return Math.min(1, Math.max(0, done / total));
}

/**
 * Iki nokta arasinda, hafif yay cizen bir konum.
 *
 * Duz bir cizgi yerine yay kullanmamizin sebebi okunabilirlik: ayni
 * iki ada arasinda gidip gelen birden cok filo duz cizide ust uste
 * binerdi. Yay yuksekligi filo kimliginden turetilir ki ayni hattaki
 * filolar birbirinin icinden gecmesin ama yine de deterministik olsun.
 */
export function pointOnArc(
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress: number,
  arcSeed: number,
): { x: number; y: number } {
  const x = from.x + (to.x - from.x) * progress;
  const y = from.y + (to.y - from.y) * progress;
  // Yay: ortada en yuksek, uclarda sifir (sin(pid) egrisi).
  const lift = Math.sin(progress * Math.PI);
  // -1..1 arasi deterministik bir sapma; 46 piksele olceklenir.
  const bend = ((arcSeed % 97) / 97) * 2 - 1;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  // Hatta DIK yon: yay bu eksende buker.
  const nx = -dy / length;
  const ny = dx / length;
  const amount = bend * Math.min(70, length * 0.18) * lift;
  return { x: x + nx * amount, y: y + ny * amount };
}

/** Filo kimliginden gorsel sapma tohumu (deterministik). */
export function arcSeedOf(fleetId: string): number {
  let hash = 0;
  for (let i = 0; i < fleetId.length; i += 1) {
    hash = (hash * 31 + fleetId.charCodeAt(i)) >>> 0;
  }
  return hash;
}
