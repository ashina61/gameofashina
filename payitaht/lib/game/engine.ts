/**
 * OYUN MOTORU — tek giriş kapısı.
 *
 * Motor V2 Faz 7.2'de lib/game/core/ altına bölündü; bu dosya yalnız
 * dışa aktarılanları toplar, böylece `@/lib/game/engine` içe aktaranlar
 * değişmedi:
 *   core/types.ts     kimlikler, Game tipi, ilah/yönetim/orman kuralları
 *   core/data.ts      bina, birim, araştırma ve hedef katalogları
 *   core/economy.ts   başlangıç, işçi, ordu gücü, üretim, nüfus, lüks, maliyet
 *   core/rules.ts     zaman ilerletme (advance), arsa ve "yapılabilir mi" kuralları
 *   core/commands.ts  oyuncu komutları (execute)
 *   core/save.ts      kayıt göç zinciri ve doğrulama (parseSave)
 *   core/format.ts    sayı ve süre biçimleri
 */
export { RESOURCE_IDS, TRADE_GOODS, LUXURY_IDS, LUXURY_NAMES, MIRACLE_IDS, MIRACLES, WONDER_MAX, wonderCost, miracleCost, miracleMinutes, MIRACLE_COOLDOWN_MS, FAITH_CAP, priestCapacity, miracle, GOVERNMENT_IDS, GOVERNMENTS, ANARCHY_MS, GOVERNMENT_COOLDOWN_MS, governmentCost, anarchy, FOREST_MAX_LEVEL, FOREST_WORKERS_PER_LEVEL, forestCapacity, forestUpgradeCost, BUILDING_IDS, COAST_FACING_IDS, RESEARCH_IDS, RESEARCH_BRANCHES, PLOTS, WORKER_IDS, WORKERS_PER_LEVEL, QUEUE_LIMIT, takesPlot, zoneOf, activeJob, RESOURCE_NAMES } from './core/types'
export type { Resource, TradeGood, Resources, Luxury, LuxuryStock, IslandMine, Good, MiracleId, Temple, GovernmentId, Government, IslandForest, BuildingId, CoastBuildingId, CoastFacing, CoastFacings, ResearchId, ResearchBranch, Job, WorkerId, Workers, Game } from './core/types'
export { BUILDINGS, BUILDING_EFFECTS, UNIT_IDS, UNITS, RESEARCH, GUIDED_STEPS, OBJECTIVES } from './core/data'
export type { BuildingDef, UnitId, Army, UnitRole, Unit, ObjectiveGo } from './core/data'
export { initialGame, workerCapacity, assignedWorkers, idleWorkers, garrisonLimit, inGarrison, garrisonUsed, trainingPop, DRILL_QUEUE_LIMIT, drillsAt, soldiers, unitBonus, power, wallDefense, cityDefense, might, cargoCapacity, tradeCapacity, loadingSpeed, clampWorkers, clampForest, clampPriests, clampMiners, capacity, corruption, armyUpkeep, travelFactor, actionPoints, SCIENTIST_UPKEEP_PER_HOUR, scientistCount, scientistUpkeepPerMinute, rates, forestProduction, housing, contentment, MINERS_PER_LEVEL, MINE_MAX_LEVEL, mineCapacity, mineUpgradeCost, tavernLevel, wineServed, wineConsumption, luxuryProduction, luxuryRates, luxuryCost, UNIT_LUX, UNIT_SULFUR, unitLuxuryCost, upgradeCap, upgradeCost, upgradeReason, futureCost, futureReason, GOOD_NAMES, goodAmount, addGood, exchangeRate, exchangeLimit, MERCHANT_BUY, MERCHANT_SELL, merchantLimit, merchantBuyPrice, merchantSellPrice, maxPopulation, population, growthRate, unhousedByUnrest, fullResources, nearlyFullResources, BUILDING_GROWTH, constructionDiscount, cost, LATE_PACE, MAX_BUILD_SECONDS, duration, logEvent, groupLog } from './core/economy'
export { offlineCapHours, advance, freePlots, freePlotsFor, plotFits, LAND_PLOTS, landPlotsOpen, plotOpen, nextPlotDivan, MAX_LEVEL, buildReason, unitCost, unitDuration, spyCapacity, spyBonus, counterSpy, drillBonus, recruitReason, researchReason, objectiveDone } from './core/rules'
export { execute } from './core/commands'
export type { Command } from './core/commands'
export { GAME_SCHEMA, GAME_MIGRATIONS, migrateGame, NEWER_SAVE, parseSave } from './core/save'
export { formatNumber, formatShort, formatRate, timeLeft } from './core/format'
