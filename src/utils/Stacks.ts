import type { ShipStack, UnitStack, UpgradeTier } from '@/types';

/**
 * Birlik/gemi yigini aritmetigi.
 *
 * Yiginlar `{id, count, tier}` uclusudur ve ayni kimlikten birden fazla
 * satir OLMAMALIDIR: aksi halde "sehirde kac sapanci var" sorusu tek bir
 * yerden okunamaz ve arayuz ile simulasyon farkli sayilar gorur. Bu
 * yardimcilarin varlik sebebi tam olarak bu tekiligi korumaktir.
 *
 * Uc ayri sistem (Military, Fleet, Combat) ayni islemi yaptigi icin burada
 * toplanir; her birinin kendi birlestirme mantigini yazmasi, kademe
 * (tier) uyusmazliginda farkli davranan kopyalar uretirdi.
 */

export interface Stack {
  id: string;
  count: number;
  tier: UpgradeTier;
}

/**
 * Yiginlari bir listeye ekler; ayni kimlik VE ayni kademe tek satirda
 * toplanir.
 *
 * Farkli kademeler AYRI satirda kalir: Bronz sapanci ile Altin sapanci
 * savasta farkli istatistikle carptigi icin birlestirilemez. Bu, kademe
 * gelistirmesinin yalnizca YENI uretilenleri etkilemesi halinde dogru
 * davranistir; mevcutlar topluca yukseltildigi icin pratikte tek satir
 * gorulur.
 */
export function mergeStacks<T extends Stack>(target: T[], incoming: readonly Stack[]): T[] {
  for (const stack of incoming) {
    if (!Number.isFinite(stack.count) || stack.count <= 0) continue;
    const existing = target.find(
      (s) => (s as Stack).id === stack.id && (s as Stack).tier === stack.tier,
    );
    if (existing) {
      existing.count += stack.count;
    } else {
      target.push({ id: stack.id, count: stack.count, tier: stack.tier } as unknown as T);
    }
  }
  return target.filter((s) => s.count > 0);
}

/**
 * Yiginlari bir listeden cikarir.
 *
 * Negatife dusmez: cikarilan miktar listedekinden fazlaysa liste sifirlanir.
 * Boyle bir durum yalnizca cift harcama hatasinda olur; sessizce negatif
 * sayi biriktirmek yerine kirpilir ki hata gorunur kalsin.
 */
export function subtractStacks(target: Stack[], losses: readonly Stack[]): void {
  for (const loss of losses) {
    if (loss.count <= 0) continue;
    let remaining = loss.count;
    for (const owned of target) {
      if (owned.id !== loss.id || remaining <= 0) continue;
      const taken = Math.min(owned.count, remaining);
      owned.count -= taken;
      remaining -= taken;
    }
  }
  for (let i = target.length - 1; i >= 0; i -= 1) {
    if (target[i].count <= 0) target.splice(i, 1);
  }
}

/** Toplam adet. */
export function totalStacks(stacks: readonly Stack[]): number {
  return stacks.reduce((sum, s) => sum + Math.max(0, s.count), 0);
}

/** Yigin listesini kopyalar (savas motoru girdiyi degistirmesin diye). */
export function cloneStacks<T extends UnitStack | ShipStack>(stacks: readonly T[]): T[] {
  return stacks.map((s) => ({ ...s }));
}

/** Bir yiginda belirli kimlikten kac adet var? */
export function countOf(stacks: readonly Stack[], id: string): number {
  return stacks.filter((s) => s.id === id).reduce((sum, s) => sum + s.count, 0);
}
