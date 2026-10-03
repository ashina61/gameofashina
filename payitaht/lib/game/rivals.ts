/**
 * YAPAY RAKİP HÜKÜMDARLAR — Ikariam'ın çok oyunculu dünyasının tek oyunculu karşılığı.
 *
 * Bunlar GERÇEK OYUNCU DEĞİLDİR; arayüzde her yerde "yapay rakip" diye anılır.
 * Her birinin adası, şehri, huyu (tüccar, savaşçı, âlim, denizci) ve bir
 * ittifakı (Doğu / Batı Birliği) vardır. Güçleri dünya yaşıyla büyür.
 *
 * Oyuncu onlarla Ikariam'daki gibi her şeyi yapar: casus gönderir, yağmalar,
 * şehrini işgal eder, limanını abluka altına alır, sıralamada yarışır, pazarda
 * alışveriş eder, kültür / ticaret / barış anlaşması yapar, ittifaka katılır ve
 * mesajlaşır. Hepsi deterministiktir: aynı kayıt aynı dünyayı üretir.
 *
 * YAPAY RAKİPLER — tek giriş kapısı (0.41'de bölündü).
 *
 *   rivals/core.ts       rakipler, dünya durumu, anılar, güç ve sıralama
 *   rivals/diplomacy.ts  antlaşma, hediye, mektup, ittifak, savaş, casus kovma
 *   rivals/market.ts     pazar, paralı asker, teklifler, dünyanın ilerlemesi, kayıt okuma
 */
export { STYLE_NAMES, FACTIONS, RIVALS, rivalById, TREATIES, BONDS, friendOf, enemyOf, MEMO_KINDS, MEMO_MS, isAlly, MAX_FOREIGN_SPIES, MAX_DELIVERIES, EXPEL_COOLDOWN_MS, roll, initialWorld, world, rivalState, peek, mail, relate, remember, recall, rivalLevel, rivalGarrison, rivalFleet, rivalWallHp, rivalTreasury, rivalLoot, rivalScore, playerScore, rankings } from './rivals/core'
export type { RivalStyle, FactionId, Rival, TreatyId, MemoKind, Memo, RivalState, Message, Offer, Delivery, World, ForeignSpy, Score, RankKey } from './rivals/core'
export { embassyLevel, treatyCost, culturalTreaties, proposeTreaty, cancelTreaty, sendGift, writeLetter, factionMembers, factionStanding, joinAlliance, leaveAlliance, allyHelp, pacified, onRivalRaided, declareWar, expelSpies, stationTribute } from './rivals/diplomacy'
export type { Letter } from './rivals/diplomacy'
export { FAIR_PRICE, MARKET_GOODS, marketOffers, addGood, stockOf, mercenaryOffers, buyMercenaries, seaMinutes, acceptOffer, offerSlots, postOffer, cancelOffer, fillRate, advanceWorld, parseWorld, rivalIntel, rivalAttackMul, readMessages } from './rivals/market'
export type { MarketOffer, MercOffer } from './rivals/market'
