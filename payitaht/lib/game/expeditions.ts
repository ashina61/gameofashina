/**
 * SEFER VE CASUSLUK — adadaki bağımsız yerleşimler (NPC) üzerine.
 *
 * Her adada üç bağımsız yerleşim vardır: Barbar Köyü, Korsan İni, Asi
 * Kalesi. Bunlar GERÇEK OYUNCU DEĞİLDİR ve öyle gösterilmez. Oyuncu:
 *   - Elçilik'te yetişen casusları gönderip garnizonu, suru ve hazineyi öğrenir,
 *   - kara birlikleriyle sefere çıkıp yağmalar.
 *
 * Savaş DETERMİNİSTİKTİR: aynı ordu aynı hedefe karşı hep aynı sonucu verir,
 * rapor her sayının nereden geldiğini yazar. Casusluğun başarısı bir olasılıktır
 * ama zar da deterministik (görev kimliğinden türetilir): kayıt yeniden
 * yüklenince sonuç değişmez.
 *
 * Birlikler seferdeyken şehrin ordusunda SAYILMAYA devam eder (halktan
 * düşmüş vatandaşlardır); yalnızca yeni bir sefere tekrar gönderilemezler.
 * Kayıplar çarpışma anında ordudan silinir, ganimet dönüşte ambara iner.
 *
 * SEFERLER — tek giriş kapısı (V2 Faz 7, 0.41'de bölündü).
 *
 * Görev, rapor, savaş ve tehdit kuralları lib/game/missions/ altında:
 *   missions/world.ts    köyler, korsan hedefleri, raporlar, canlı savaş, hedef ve yol süresi
 *   missions/dispatch.ts casus, yağma, korsanlık ve abluka gönderimi, geri çağırma
 *   missions/resolve.ts  varış, dönüş, destek, casus görevleri, konuşlanma, kayıt okuma
 *   missions/threats.ts  korsan baskınları, kuşatmalar, şehir savunması
 * İçe aktaranlar bu dosyadan almayı sürdürür.
 */
export { NPC_KINDS, NPC_SETTLEMENTS, MAX_NPC_LEVEL, RAID_UNITS, WARSHIPS, TROOPS_PER_SHIP, npcFleet, PIRACY_TARGETS, piracyTarget, SPY_TYPES, SPY_TYPE_IDS, MAX_REPORTS, MAX_THREATS, MAX_MISSIONS, trimReports, deleteReport, clearReports, keepReport, liveBattleAt, underSiege, npcById, targetInfo, targetIsland, targetName, npcState, garrison, npcWall, npcWallHp, npcField, rivalField, LOOT_REFILL_MS, lootPool, committedUnits, availableUnits, shipCargo, shipmentShips, totalMerchants, idleMerchants, merchantShipPrice, strikeForce, npcDefense, raidTravelMs, spyTravelMs, seaTravelMs, targetTravelMs, UNIT_PACE, slowest, transportsNeeded, actionsInUse } from './missions/world'
export type { NpcKind, NpcSettlement, PiracyTarget, NpcState, Loot, Mission, SpyType, Report, StoredBattle, LiveBattle, Target } from './missions/world'
export { spyChance, dispatchSpies, dispatchRaid, dispatchPiracy, dispatchBlockade, recallMission } from './missions/dispatch'
export { resolveArrival, SUPPORT_WATCH_MS, dispatchSupport, spyTaskChance, spyMission, rivalResearch, retreatMission, dispatchDeploy, resolveReturn, advanceMissions, parseMissionState } from './missions/resolve'
export { SIEGE_MAX_MS, siegeAt, siegeBlock, PROTECTION_DIVAN, THREAT_WARNING_MS, pirateBand, safeStock, cityGuards, cityWallHp, siegeTribute, advanceSieges, liberateCity, advanceThreats } from './missions/threats'
export type { Threat, WarIntent, Siege } from './missions/threats'
