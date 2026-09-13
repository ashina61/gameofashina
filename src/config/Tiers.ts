import type { CombatStats, UpgradeTier } from '@/types';

/**
 * Atolye (Workshop) kademe gelistirmesi.
 *
 * Ikariam'da birlikler ve gemiler Bronz -> Gumus -> Altin kademelerinde
 * gelistirilir. Kademe orani TEK bir iliskidir ve hem kara hem deniz
 * birimleri icin aynidir; bu yuzden burada TEK yerde durur. Iki katalogda
 * ayri ayri tutmak, katsayiyi degistirdiginde kara ve deniz dengesinin
 * birbirinden kaymasi demekti.
 *
 * ORANLARIN KAYNAGI
 * Ikariam ekonomi analizindeki kademe tablosu:
 *   Sapanc hasari     7 -> 9 -> 11 -> 13   (x1.29 / x1.57 / x1.86)
 *   Sapanc savunmasi  6 -> 8 -> 10 -> 12   (x1.33 / x1.67 / x2.00)
 * Ayni oranlar tum birimlere uygulanir; zirh ise sabit EK olarak artar
 * cunku Ikariam'da zirh hasardan cikarilan sabit bir sayidir, carpan
 * degildir. Zirhi carpmak zirhi 0 olan birimi (Sapanc) sonsuza dek 0'da
 * birakirdi.
 */

/** Kademe basina hasar carpani. */
export const TIER_DAMAGE: Record<UpgradeTier, number> = {
  base: 1,
  bronze: 1.2857,
  silver: 1.5714,
  gold: 1.8571,
};

/** Kademe basina can carpani (savunma tablosu). */
export const TIER_HP: Record<UpgradeTier, number> = {
  base: 1,
  bronze: 1.3333,
  silver: 1.6667,
  gold: 2,
};

/** Kademe basina eklenen sabit zirh. */
export const TIER_ARMOR_BONUS: Record<UpgradeTier, number> = {
  base: 0,
  bronze: 10,
  silver: 25,
  gold: 50,
};

/** Kademe basina bakim ucreti carpani. */
export const TIER_UPKEEP_MULTIPLIER: Record<UpgradeTier, number> = {
  base: 1,
  bronze: 1.2,
  silver: 1.45,
  gold: 1.75,
};

/** Kademelerin sabit sirasi (arayuzde ve gelistirme akisinda). */
export const TIER_ORDER: UpgradeTier[] = ['base', 'bronze', 'silver', 'gold'];

/** Kademelerin kullaniciya gosterilen adlari. */
export const TIER_NAMES: Record<UpgradeTier, string> = {
  base: 'Temel',
  bronze: 'Bronz',
  silver: 'Gümüş',
  gold: 'Altın',
};

/** Bir kademenin sonraki kademesi; son kademede null. */
export function nextTier(tier: UpgradeTier): UpgradeTier | null {
  const index = TIER_ORDER.indexOf(tier);
  if (index < 0 || index >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[index + 1] ?? null;
}

/**
 * Taban istatistiklerden dort kademenin istatistiklerini uretir.
 *
 * Kataloglarda her birlik icin dort ayri istatistik blogu yazmak 4 kat veri
 * ve 4 kat hata yuzeyi demekti; kademe orani tek iliski oldugu icin
 * buradan turetilir.
 */
export function tiersShape(base: CombatStats): Record<UpgradeTier, CombatStats> {
  const out = {} as Record<UpgradeTier, CombatStats>;
  for (const tier of TIER_ORDER) {
    out[tier] = {
      ...base,
      hp: Math.round(base.hp * TIER_HP[tier]),
      damage: Math.round(base.damage * TIER_DAMAGE[tier]),
      armor: base.armor + TIER_ARMOR_BONUS[tier],
      secondaryDamage:
        base.secondaryDamage === undefined
          ? undefined
          : Math.round(base.secondaryDamage * TIER_DAMAGE[tier]),
      wallDamage:
        base.wallDamage === undefined ? undefined : Math.round(base.wallDamage * TIER_DAMAGE[tier]),
    };
  }
  return out;
}
