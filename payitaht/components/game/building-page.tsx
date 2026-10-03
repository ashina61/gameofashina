'use client'
import { KumSaatiArt } from './resource-art'
import { Term } from './term'
import { flyGoods } from '@/lib/fx'

/**
 * BİNA SAYFASI — Ikariam'daki bina görünümünün mobil karşılığı.
 *
 * Ikariam'da bir binaya basınca ekranın ortasını o binanın sayfası kaplar:
 * üstte adı, solda görseli ve "Genişlet" kutusu (gereken kaynaklar, süre,
 * yeşil yükseltme oku), ortada binanın kendi işini yapan kutular (Akademi'de
 * bilim adamı kaydırıcısı, Surda savunma tablosu, Ambarda korunan mal
 * tablosu...). Mobilde aynı sıra alt alta dizilir; kutular parşömen gövdeli,
 * kahverengi başlık şeritlidir.
 */
import { Hint } from './hint'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowUp, Info, LockKeyhole, FlipHorizontal2, RotateCw, Move, Hammer, ChevronRight, Plus, Trash2, X } from './ui-art'
import { GameButton } from './game-button'
import { CostTokens } from './stat-kit'
import { BottomSheet } from './bottom-sheet'
import { buildingImage, buildingStage } from '@/lib/asset'
import {
  BUILDINGS, BUILDING_EFFECTS, constructionDiscount, LUXURY_IDS, LUXURY_NAMES, MAX_LEVEL, RESEARCH, RESOURCE_IDS, RESOURCE_NAMES,
  actionPoints, activeJob, armyUpkeep, buildReason, capacity, contentment, corruption, cost, counterSpy, duration,
  forestProduction, growthRate, housing, idleWorkers, loadingSpeed, luxuryCost, luxuryProduction, maxPopulation, population, rates,
  scientistUpkeepPerMinute, soldiers, spyBonus, spyCapacity, takesPlot, tavernLevel, tradeCapacity, travelFactor, wallDefense,
  wineConsumption, wineServed, workerCapacity, type BuildingId, type Command, type Game, type Luxury, type Resource, type UnitId, type WorkerId, formatRate,
} from '@/lib/game/engine'
import { GUILDS, guildBonus } from '@/lib/game/guilds'
import { activeCity, type Empire } from '@/lib/game/empire'
import { cityGuards, cityWallHp, safeStock } from '@/lib/game/expeditions'
import { culturalTreaties } from '@/lib/game/rivals'
import { luxuryIcons, resourceIcons, JobProgress } from './game-widgets'
import { ResearchEmblem } from './research-art'
import { BuildingArt } from './building-art'
import { PersonArt } from './workforce'
import type { ResearchId } from '@/lib/game/engine'
import { ArmyPanel, BuildingEffects } from './game-panels'
import { DemolishConfirm, type Run } from './world-panels'
import { UnitFigure } from './unit-art'
import { DivanOverview } from './divan-overview'
import { buyMerchantShip } from '@/lib/game/empire'
import { idleMerchants, merchantShipPrice, shipCargo, totalMerchants } from '@/lib/game/expeditions'
import { WorkforceSlider, type Figure } from './workforce'
import { t } from '@/lib/i18n/tr'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const RES_ICON = resourceIcons
const time = (s: number) => s >= 3600 ? `${Math.floor(s / 3600)} sa ${Math.floor(s / 60) % 60} dk` : s >= 60 ? `${Math.floor(s / 60)} dk ${s % 60} sn` : `${s} sn`

/** Ikariam'ın içerik kutusu: kahverengi başlık şeridi + parşömen gövde. */
export function Box({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`bp-box${className ? ` ${className}` : ''}`}><h2 className="bp-box-title">{title}</h2><div className="bp-box-body">{children}</div></section>
}
/** İki ya da üç sütunlu, satırları çizgili tablo (Ikariam table01). */
function Table({ head, rows }: { head?: ReactNode[]; rows: ReactNode[][] }) {
  return <table className="bp-table">
    {head && <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>}
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
  </table>
}
function ResIcon({ id }: { id: Resource | Luxury }) {
  if ((LUXURY_IDS as readonly string[]).includes(id)) { const Icon = luxuryIcons[id as Luxury]; return <Icon className="bp-res-icon bp-lux" aria-hidden="true" /> }
  const Icon = RES_ICON[id as Resource]
  return <Icon className={`bp-res-icon bp-res-${id}`} aria-hidden="true" />
}
const stock = (g: Game, id: Resource | Luxury) => (LUXURY_IDS as readonly string[]).includes(id) ? g.luxury[id as Luxury] : g.resources[id as Resource]
const name = (id: Resource | Luxury) => (LUXURY_IDS as readonly string[]).includes(id) ? LUXURY_NAMES[id as Luxury] : RESOURCE_NAMES[id as Resource]

/**
 * YÜKSELTME DOKU (V2 Faz 2.1): sayfanın altında sabit, başparmak bölgesinde.
 * Üstte maliyet jetonları (eksik olan kırmızı) ve süre, altında Yükselt.
 * İnşaat sürüyorsa ilerleme çubuğu; en yüksek seviyede kısa not.
 */
function UpgradeDock({ game, id, onBuild }: { game: Game; id: BuildingId; onBuild: () => void }) {
  const level = game.buildings[id], max = MAX_LEVEL[id]
  const active = activeJob(game)?.id === id ? activeJob(game) : null
  const queued = game.queue.findIndex(job => job.id === id)
  const reason = buildReason(game, id)
  if (level >= max) return <div className="bp-dock is-max"><p className="bp-note">En yüksek seviyeye ulaşıldı.</p></div>
  if (active) return <div className="bp-dock"><JobProgress job={active} now={game.updatedAt} /></div>
  const c = cost(game, id), lux = luxuryCost(game, id)
  const needs: [Resource | Luxury, number][] = [
    ...RESOURCE_IDS.filter(r => c[r] > 0).map(r => [r, c[r]] as [Resource, number]),
    ...LUXURY_IDS.filter(r => (lux[r] ?? 0) > 0).map(r => [r, lux[r]!] as [Luxury, number]),
  ]
  return <div className="bp-dock" aria-label={level ? `Genişlet · Sv. ${level} → ${level + 1}` : 'İnşa et'}>
    <CostTokens items={needs.map(([r, n]) => ({ key: r, icon: <ResIcon id={r} />, name: name(r), need: n, have: stock(game, r) }))} />
    {queued > 0 && <p className="bp-note"><KumSaatiArt className="size-4" /> İnşaat sırasında {queued + 1}. sırada.</p>}
    {reason && queued < 0 && <p className="bp-warn"><LockKeyhole className="size-4" /> {reason}</p>}
    <button type="button" className="bp-upgrade-button" disabled={!!reason}
      onClick={e => { flyGoods(e.currentTarget, Object.fromEntries(needs), true); onBuild() }}>
      <span className="bp-up-arrow"><ArrowUp aria-hidden="true" /></span>{level ? `Yükselt · Sv. ${level + 1}` : 'İnşa et'}
      <span className="bp-up-time"><KumSaatiArt aria-hidden="true" />{time(duration(game, id))}</span>
    </button>
  </div>
}

/** Bir üretim yapısının işçi kaydırıcısı (Ikariam'daki "işçi" kutusu). */
const WORK: Record<WorkerId, { figure: Figure; res: Resource; unit: string }> = {
  kereste: { figure: 'oduncu', res: 'wood', unit: 'kereste' }, tas: { figure: 'tasci', res: 'stone', unit: 'taş' },
  medrese: { figure: 'alim', res: 'knowledge', unit: 'ilim' }, carsi: { figure: 'esnaf', res: 'gold', unit: 'akçe (net)' },
}
function Workers({ game, id, unit, perWorker, onCommand }: { game: Game; id: WorkerId; unit: string; perWorker: string; onCommand: (c: Command) => void }) {
  const w = WORK[id]
  const Icon = RES_ICON[w.res]
  const at = (n: number) => rates({ ...game, workers: { ...game.workers, [id]: n } })[w.res]
  return <WorkforceSlider label={unit} figure={w.figure} value={game.workers[id]} cap={workerCapacity(game, id)} idle={idleWorkers(game)}
    preview={n => { const v = at(n); return { amount: v, icon: <Icon className="workforce-icon" />, text: <><b>{w.res === 'knowledge' ? formatRate(v) : num(v)}</b> {w.unit}/dk</> } }}
    onCommit={n => onCommand({ type: 'workers', id, value: n })} note={perWorker} />
}

/** TİCARET FİLOSU (Ikariam gibi): gemiler satın alınır, bütün şehirler ortak kullanır. */
function MerchantFleet({ empire, game, run }: { empire: Empire; game: Game; run: Run }) {
  const total = totalMerchants(empire), idle = idleMerchants(empire), price = merchantShipPrice(total)
  return <Box title={`Ticaret filosu · ${total} gemi`}>
    <div className="fleet-row">
      <span className="fleet-ship"><UnitFigure id="nakliye" size={64} /></span>
      <Table rows={[
        ['Limanda boş', `${idle} gemi`],
        ['Seferde ya da yükte', `${total - idle} gemi`],
        ['Gemi başına yük', `${num(shipCargo(game))} mal`],
      ]} />
    </div>
    <button type="button" className="bp-upgrade-button" disabled={game.resources.gold < price}
      onClick={() => run((e, t) => buyMerchantShip(e, t), 'Yeni ticaret gemisi limana katıldı.')}>
      <span className="bp-up-arrow"><Plus aria-hidden="true" /></span>Gemi satın al · {num(price)} akçe
    </button>
    <p className="bp-note">Gemiler bütün şehirlerin ortak filosudur: nakliye, deniz aşırı sefer ve koloni için limanda boş olan gemiler kullanılır. Her yeni gemi bir öncekinden pahalıdır.</p>
  </Box>
}

/**
 * MALİYET DÖKÜMÜ (Ikariam marangoz sayfası): temel maliyetten araştırma,
 * lonca ve bu yapının indirimleri düşülür; kalan yüzde çubukla gösterilir.
 */
function CostBreakdown({ game, id }: { game: Game; id: BuildingId }) {
  const E = BUILDING_EFFECTS
  const research = constructionDiscount(game), guild = guildBonus(game, 'dulger') * GUILDS.dulger.per
  const rows: Record<string, { title: string; icon: ReactNode; parts: [string, number][] }[]> = {
    marangoz: [{ title: 'Binaların kereste bedeli', icon: <ResIcon id="wood" />, parts: [['Araştırmalar', research], ['Dülgerler loncası', guild], ['Marangozhane', game.buildings.marangoz * E.marangozWood]] }],
    mimar: [{ title: 'Binaların taş ve mermer bedeli', icon: <ResIcon id="stone" />, parts: [['Araştırmalar', research], ['Dülgerler loncası', guild], ['Mimarbaşı', game.buildings.mimar * E.mimarStone]] }],
    mahzen: [{ title: 'Kahvehanenin kahve tüketimi', icon: <ResIcon id="kahve" />, parts: [['Kahve Kileri', game.buildings.mahzen * E.mahzenWine]] }],
    gozlukcu: [{ title: 'Binaların kristal bedeli', icon: <ResIcon id="kristal" />, parts: [['Gözlükçü', game.buildings.gozlukcu * E.gozlukcuCrystal]] }],
    barutane: [
      { title: 'Birliklerin kükürt bedeli', icon: <ResIcon id="kukurt" />, parts: [['Barut Deneme Alanı', game.buildings.barutane * E.barutaneSulfur]] },
      { title: 'Topçu ve humbaracı kükürdü', icon: <ResIcon id="kukurt" />, parts: [['Top Dökümü araştırması', game.research.includes('top_dokum') ? 0.25 : 0], ['Barut Deneme Alanı', game.buildings.barutane * E.barutaneSulfur]] },
    ],
  }
  return <>{(rows[id] ?? []).map(r => {
    let left = 1
    return <Box key={r.title} title={<span className="cb-title">{r.icon}{r.title}</span>}>
      <div className="cost-breakdown">
        <div className="cb-row"><span>Temel maliyet</span><b>%100</b><i style={{ width: '100%' }} /></div>
        {r.parts.map(([label, cut]) => { left = Math.max(0.5, left - cut); return <div key={label} className={cut > 0 ? 'cb-row' : 'cb-row is-zero'}>
          <span>− {label} (%{(cut * 100).toFixed(cut * 100 % 1 ? 1 : 0)})</span><b>%{(left * 100).toFixed(left * 100 % 1 ? 1 : 0)}</b><i style={{ width: `${left * 100}%` }} />
        </div> })}
      </div>
      <p className="bp-note">İndirimler toplanır; bedel temel değerin %50'sinin altına inmez.</p>
    </Box>
  })}</>
}

/** Binaya özel kutular. */
function BuildingView({ game, empire, id, onCommand, onRecruit, onNav, onBuildingNav, run }: {
  game: Game; empire: Empire | undefined; id: BuildingId; onCommand: (c: Command) => void; run?: Run
  onRecruit: (id: UnitId, count: number) => void; onNav: (panel: 'research' | 'diplomacy' | 'island' | 'forest' | 'people' | 'cities') => void
  onBuildingNav: (id: BuildingId) => void
}) {
  const r = rates(game)
  switch (id) {
    case 'divan': {
      const content = contentment(game)
      const parts: [string, number][] = [
        ['Taban huzur', 120], ['Hamam', game.buildings.hamam * 60],
        ['Kahvehane', game.buildings.kahvehane * BUILDING_EFFECTS.kahvehaneContentment + (wineServed(game) ? tavernLevel(game) * BUILDING_EFFECTS.kahvehaneWineBonus * (game.research.includes('mutfak') ? 1.2 : 1) : 0)],
        ['Cami', game.buildings.cami * BUILDING_EFFECTS.camiContentment],
        ['Müze ve kültür', game.buildings.muze * BUILDING_EFFECTS.muzeContentment * (game.research.includes('kultur') ? 1.5 : 1) + (game.culture ?? 0) * 50],
      ]
      const other = content - parts.reduce((s, [, n]) => s + n, 0)
      const gross = r.gold + scientistUpkeepPerMinute(game) + armyUpkeep(game)
      return <>
        <DivanOverview game={game} empire={empire} run={run} />
        <Box title="Şehrin halkı">
          <Table rows={[
            ['Nüfus', <strong key="p">{num(population(game))} / {num(maxPopulation(game))}</strong>],
            ['Büyüme', growthRate(game) > 0 ? `+${formatRate(growthRate(game))} kişi/dk` : 'Tavanda'],
            ['Barınma (Konaklar)', num(housing(game))],
            ['Boşta halk', num(idleWorkers(game))],
            ['Asker', num(soldiers(game))],
          ]} />
        </Box>
        <Box title={`Huzur · ${num(content)}`}>
          <Table rows={[...parts.filter(([, n]) => n).map(([l, n]) => [l, `+${num(n)}`]), ...(other ? [['Araştırma, mucize, yönetim', `${other > 0 ? '+' : ''}${num(other)}`]] : [])]} />
          <p className="bp-note">Nüfus, barınma ile huzurdan küçük olanına doğru büyür.</p>
        </Box>
        <Box title="Hazine">
          <Table rows={[
            [<Term key="t" label="Vergi ve esnaf" />, `+${num(gross)} akçe/dk`],
            [<Term key="t" label="Âlim maaşları" />, `${formatRate(-scientistUpkeepPerMinute(game))} akçe/dk`],
            [<Term key="t" label="Ordu bakımı" />, `${formatRate(-armyUpkeep(game))} akçe/dk`],
            [<strong key="n"><Term label="Net gelir" /></strong>, <strong key="v">{num(r.gold)} akçe/dk</strong>],
            [<Term key="t" label="Yolsuzluk" />, `%${Math.round(corruption(game) * 100)}`],
            [<Term key="t" label="Sefer hakkı" />, `aynı anda ${actionPoints(game)} sefer`],
          ]} />
        </Box>
      </>
    }
    case 'medrese': {
      const study = game.study
      return <>
        <Box title="Âlimler">
          <Workers game={game} id="medrese" unit="Âlim" perWorker="Her âlim saatte 9 akçe maaş alır." onCommand={onCommand} />
          <Table rows={[
            ['İlim üretimi', <strong key="k">{formatRate(r.knowledge)} /dk</strong>],
            ['Âlim maaşı', `${num(scientistUpkeepPerMinute(game) * 60)} akçe/saat`],
            ['Tamamlanan araştırma', `${game.research.length}`],
          ]} />
        </Box>
        <Box title="Araştırma">
          {study ? <div className="bp-study">
            <ResearchEmblem id={study.id as ResearchId} size={76} state="active" />
            <div><span className="eyebrow">ŞU AN ARAŞTIRILIYOR</span><strong>{RESEARCH[study.id as ResearchId].name}</strong>
              <JobProgress job={study} now={game.updatedAt} /></div>
          </div>
            : <div className="bp-study is-idle"><PersonArt kind="alim" size={52} /><p className="bp-note">Şu an araştırma yok. Âlimler yeni bir konu bekliyor.</p></div>}
          <GameButton size="sm" onClick={() => onNav('research')}>Araştırmalara git<ChevronRight data-icon="inline-end" /></GameButton>
        </Box>
      </>
    }
    case 'kereste': return <Box title="Oduncular"><Workers game={game} id="kereste" unit="Oduncu" perWorker="Her oduncu şehrin kerestesine katkı verir; boştaki halk üretim yapmaz." onCommand={onCommand} />
      <p className="bp-note">Adanın ormanında da oduncu çalıştırabilirsin (ada ormanı: {num(forestProduction(game))} kereste/dk).</p>
      <GameButton size="sm" variant="outline" onClick={() => onNav('forest')}>Ada ormanına git<ChevronRight data-icon="inline-end" /></GameButton></Box>
    case 'tas': return <Box title="Taşçılar"><Workers game={game} id="tas" unit="Taşçı" perWorker="Taş ocağında çalışan her taşçı taş üretir." onCommand={onCommand} /></Box>
    case 'carsi': return <Box title="Esnaf"><Workers game={game} id="carsi" unit="Esnaf" perWorker="Esnaf çarşıda akçe kazandırır." onCommand={onCommand} />
      <p className="bp-note">Çarşı'daki tüccarla lüks mal alıp satmak için Ada paneline git.</p>
      <GameButton size="sm" variant="outline" onClick={() => onNav('island')}>Tüccara git<ChevronRight data-icon="inline-end" /></GameButton></Box>
    case 'surlar': return <Box title="Şehir savunması">
      <Table rows={[
        ['Sur seviyesi', `${game.buildings.surlar}`],
        ['Sur canı (savaşta)', <strong key="h">{num(cityWallHp(game))}</strong>],
        ['Asker gerektirmeyen savunma', num(wallDefense(game))],
        ['Sur muhafızı', `${cityGuards(game)} mızrakçı`],
        ['Yağmadan korunan mal', `${num(safeStock(game))} / tür`],
      ]} />
      <Hint>Saldırıda önce sur hasar emer: kuşatma birlikleri sura üç kat, diğerleri yarım vurur. Sur yıkılınca savunanın morali sarsılır. Sur her seviyede savunmaya 4 muhafız ekler.</Hint>
    </Box>
    case 'ambar': case 'depo': {
      const cap = capacity(game), safe = safeStock(game)
      const goods: (Resource | Luxury)[] = [...RESOURCE_IDS, ...LUXURY_IDS]
      return <Box title={`Depolama · kapasite ${num(cap)}`}>
        <Table head={['Mal', 'Stok', 'Korunan']} rows={goods.map(g => [
          <span key="n" className="bp-good"><ResIcon id={g} />{name(g)}</span>,
          <span key="s" className="bp-fill"><span style={{ width: `${Math.min(100, stock(game, g) / cap * 100)}%` }} /><em>{num(stock(game, g))}</em></span>,
          num(Math.min(safe, stock(game, g))),
        ])} />
        <p className="bp-note">Ambar ve Depo her malın tavanını belirler; dolu ambarda üretim boşa gider. Baskında her malın {num(safe)} birimi korunur.</p>
      </Box>
    }
    case 'kisla': case 'tersane': case 'liman': case 'elcilik':
      return <>
        {id === 'liman' && <Box title="Liman">
          <Table rows={[
            ['Ticaret kapasitesi', num(tradeCapacity(game))],
            ['Yükleme hızı', `${num(loadingSpeed(game))} mal/dk`],
            ['Yolculuk süresi', `%${Math.round(travelFactor(game) * 100)}`],
          ]} />
          <GameButton size="sm" variant="outline" onClick={() => onNav('cities')}>Nakliye gönder<ChevronRight data-icon="inline-end" /></GameButton>
        </Box>}
        {id === 'liman' && empire && run && <MerchantFleet empire={empire} game={game} run={run} />}
        {id === 'elcilik' && <Box title="Casusluk ve diplomasi">
          <Table rows={[
            ['Casus', `${game.army.casus} / ${spyCapacity(game)}`],
            ['Casusluk başarısı', `+%${Math.round(spyBonus(game) * 100)}`],
            ['Yabancı casus yakalama', `%${Math.round(counterSpy(game) * 100)}`],
          ]} />
          <GameButton size="sm" variant="outline" onClick={() => onNav('diplomacy')}>Dünya ve diplomasi<ChevronRight data-icon="inline-end" /></GameButton>
        </Box>}
        {id !== 'liman' && <Box title={id === 'tersane' ? 'Gemi yapımı' : id === 'elcilik' ? 'Casus eğitimi' : 'Asker eğitimi'} className="bp-army">
          <ArmyPanel game={game} onRecruit={onRecruit} onBuild={onBuildingNav} home={id} />
        </Box>}
      </>
    case 'konut': case 'hamam': return <Box title="Halk">
      <Table rows={[['Nüfus', `${num(population(game))} / ${num(maxPopulation(game))}`], ['Barınma', num(housing(game))], ['Huzur', num(contentment(game))],
        ['Büyüme', growthRate(game) > 0 ? `+${formatRate(growthRate(game))} kişi/dk` : 'Tavanda']]} />
      <GameButton size="sm" variant="outline" onClick={() => onNav('people')}>Halk paneli<ChevronRight data-icon="inline-end" /></GameButton>
    </Box>
    case 'kahvehane': return <Box title="Kahve ikramı">
      <Table rows={[['İkram seviyesi', `${tavernLevel(game)} / ${game.buildings.kahvehane}`], ['Kahve tüketimi', `${formatRate(wineConsumption(game))} /dk`],
        ['Ambardaki kahve', num(game.luxury.kahve)], ['İkram ediliyor mu', wineServed(game) ? 'Evet' : 'Hayır (kahve yok)']]} />
    </Box>
    case 'muze': return <Box title="Kültür">
      <Table rows={[['Müze huzuru', `+${num(game.buildings.muze * BUILDING_EFFECTS.muzeContentment * (game.research.includes('kultur') ? 1.5 : 1))}`],
        ['Kültür anlaşması (bu şehirde)', `${game.culture ?? 0} / ${game.buildings.muze}`], ['İmparatorluktaki anlaşma', `${empire ? culturalTreaties(empire) : 0}`]]} />
      <Hint>Her kültür anlaşması Müze seviyesi kadar şehirde +50 huzur verir. Anlaşmalar Dünya panelinden yapılır.</Hint>
      <GameButton size="sm" variant="outline" onClick={() => onNav('diplomacy')}>Anlaşma yap<ChevronRight data-icon="inline-end" /></GameButton>
    </Box>
    case 'saray': case 'valilik': return empire ? <Box title="İmparatorluk">
      <Table head={['Şehir', 'Divanhane', 'Yolsuzluk']} rows={empire.cities.map(c => [c.name, `${c.game.buildings.divan}`, `%${Math.round(corruption(c.game) * 100)}`])} />
      <p className="bp-note">Saray seviyesi kurabileceğin koloni sayısını belirler; kolonide Valilik yolsuzluğu siler.</p>
      <GameButton size="sm" variant="outline" onClick={() => onNav('cities')}>Şehirler ve atlas<ChevronRight data-icon="inline-end" /></GameButton>
    </Box> : null
    case 'marangoz': case 'mimar': case 'mahzen': case 'gozlukcu': case 'barutane': return <CostBreakdown game={game} id={id} />
    case 'bagci': case 'simyahane': case 'camci': case 'tasci': case 'ormanci': {
      const lux = luxuryProduction(game)
      const out: Record<string, string> = {
        bagci: `${formatRate(lux.kahve)} kahve/dk`, simyahane: `${formatRate(lux.kukurt)} kükürt/dk`, camci: `${formatRate(lux.kristal)} kristal/dk`,
        tasci: `${num(r.stone)} taş/dk · ${formatRate(lux.mermer)} mermer/dk`, ormanci: `${num(r.wood)} kereste/dk`,
      }
      return <Box title="Üretim"><Table rows={[['Şehrin üretimi', out[id]], ['Maden işçisi', `${game.mine.miners}`]]} />
        <GameButton size="sm" variant="outline" onClick={() => onNav('island')}>Ada madenine git<ChevronRight data-icon="inline-end" /></GameButton></Box>
    }
    default: return null
  }
}

/**
 * Ikariam sayfa çerçevesi: üst şerit (geri, başlık, rozet), isteğe bağlı sahne
 * görseli ve parşömen kaydırma alanı. Bina sayfaları ve bütün danışman
 * panelleri (Kışla, Araştırma, Dünya...) bu çerçeveyi kullanır.
 */
export function IkaPage({ title, subtitle, badge, hero, onClose, children, label, sheet, footer, className }: {
  title: string; subtitle?: string; badge?: ReactNode; hero?: string | null; onClose: () => void; children: ReactNode; label?: string
  /** Sayfanın altında sabit kalan alan (bina sayfasında Yükselt doku). */
  footer?: ReactNode
  className?: string
  /** Haritada seçilen şey: tam sayfa yerine alt çekmece (harita arkada görünür). */
  sheet?: boolean
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  if (sheet) return <BottomSheet label={label ?? title} onClose={onClose}>
    <header className="bp-bar">
      <div className="bp-title"><h1>{title}</h1>{subtitle && <small>{subtitle}</small>}</div>
      {badge}
      <button type="button" className="bp-back" onClick={onClose} aria-label={t.action.close}><X /></button>
    </header>
    <div className="bp-scroll">{children}</div>
  </BottomSheet>
  return <div className={className ? `bp ${className}` : 'bp'} role="dialog" aria-modal="true" aria-label={label ?? title}>
    <header className="bp-bar">
      <button type="button" className="bp-back" onClick={onClose} aria-label={t.action.back}><ArrowLeft /></button>
      <div className="bp-title"><h1>{title}</h1>{subtitle && <small>{subtitle}</small>}</div>
      {badge}
      <button type="button" className="bp-back bp-close" onClick={onClose} aria-label={t.action.close}><X /></button>
    </header>
    <div className="bp-scroll">
      {hero !== undefined && <section className="bp-hero bp-hero-small">{hero ? <img src={hero} alt="" /> : null}</section>}
      {children}
    </div>
    {footer}
  </div>
}

export function BuildingPage({ game, empire, id, onClose, onBuild, onFlip, onMove, onCommand, onRecruit, onNav, onBuildingNav, run, children }: {
  game: Game; empire: Empire | undefined; id: BuildingId; run?: Run
  onClose: () => void; onBuild: () => void; onFlip: () => void; onMove: () => void
  onCommand: (c: Command) => void; onRecruit: (id: UnitId, count: number) => void
  onNav: (panel: 'research' | 'diplomacy' | 'island' | 'forest' | 'people' | 'cities') => void; onBuildingNav: (id: BuildingId) => void
  children?: ReactNode
}) {
  const b = BUILDINGS[id], level = game.buildings[id], max = MAX_LEVEL[id]
  const forecast = Array.from({ length: Math.min(4, max - level) }, (_, step) => {
    const projected: Game = { ...game, buildings: { ...game.buildings, [id]: level + step } }
    return { level: level + step + 1, price: cost(projected, id), seconds: duration(projected, id) }
  })
  const city = empire ? activeCity(empire).name : ''
  const [razing, setRazing] = useState(false)
  // ⓘ: açıklamanın tamamı ve "Nasıl işler?" kutuları yalnız istenince görünür.
  const [help, setHelp] = useState(false)
  // Sekmeler: binanın kendi işi (Yapı) ve gelişim bilgisi (Gelişim).
  const [tab, setTab] = useState<'yapi' | 'gelisim'>('yapi')
  const workRef = useRef<HTMLDivElement>(null)
  const [hasWork, setHasWork] = useState(true)
  useLayoutEffect(() => { setHasWork(!!workRef.current?.childElementCount) }, [id, level, children])
  // Başka binaya geçince sayfa baştan: binanın kendi işi, açıklama kapalı.
  useEffect(() => { setTab('yapi'); setHelp(false); setPeek(null); setRazing(false) }, [id])
  // Görünüm önizlemesi: 1 = Sv. 1-3, 2 = Sv. 4-7, 3 = Sv. 8+ (null = şu anki).
  const [peek, setPeek] = useState<1 | 2 | 3 | null>(null)
  const stage = buildingStage(Math.max(1, level))
  const shown = peek ?? stage
  const stages = ([[1, 1, 'Sv. 1–3'], [2, 4, 'Sv. 4–7'], [3, 8, 'Sv. 8+']] as const).filter(([, from]) => from <= max)
  const movable = level > 0 && takesPlot(id)
  const coastId = id === 'liman' || id === 'tersane' ? id : null
  const coast = coastId !== null
  const facing = coastId ? game.coastFacing[coastId] : undefined
  const facingLabel = facing === 'left' ? 'Sol' : facing === 'right' ? 'Sağ' : 'Düz'
  const nextFacing = facing === 'straight' ? 'right' : facing === 'right' ? 'left' : 'straight'
  const showTab = hasWork ? tab : 'gelisim'
  return <IkaPage title={b.name} subtitle={`${city} · ${b.category.toLocaleLowerCase('tr')}`} label={`${b.name} sayfası`} onClose={onClose}
    className={`bp-building bp-of-${id}${help ? ' show-help' : ''}`}
    badge={<button type="button" className="bp-help" aria-pressed={help} onClick={() => setHelp(v => !v)} aria-label={help ? 'Açıklamaları gizle' : 'Nasıl işler? Açıklamaları göster'}><Info /></button>}
    footer={<UpgradeDock game={game} id={id} onBuild={onBuild} />}>
      <section className="bp-hero">
        {b.art ? <BuildingArt key={`${shown}-${facing ?? 'default'}`} className="bp-hero-art" id={id} level={shown === 1 ? 1 : shown === 2 ? 4 : 8} facing={facing} alt={`${b.name} görünümü`} /> : <span className="bp-pending"><Hammer /></span>}
        {b.art && stages.length > 1 && <div className="bp-stages" role="group" aria-label="Seviyeye göre görünüm">
          {stages.map(([st, from, label]) => <button key={st} type="button" aria-pressed={shown === st} onClick={() => setPeek(st === stage ? null : st)}
            className={st === stage ? 'is-current' : level >= from ? 'is-reached' : 'is-locked'} aria-label={`${label} görünümü${st === stage ? ' (şu anki)' : ''}`}>
            <img src={buildingImage(id, from, facing)} alt="" loading="lazy" decoding="async" style={facing === 'right' ? { transform: 'scaleX(-1)' } : undefined} /><span>{label}</span>
          </button>)}
        </div>}
        {peek && peek !== stage && <span className="bp-stage-note">{peek > stage ? 'Yükselttikçe böyle görünecek' : 'Eski görünümü'}</span>}
        {!peek && <div className="bp-plaque" aria-label={`Seviye ${level}, en fazla ${max}`}>
          <span className="bp-plaque-level" aria-hidden="true">{level}</span>
          <span className="bp-plaque-text"><b>{level ? `Seviye ${level}` : 'Kurulmadı'}</b><small>en fazla {max}</small></span>
        </div>}
        {level > 0 && <div className="bp-hero-tools" role="group" aria-label="Yapı araçları">
          {movable && b.art && coast && <button type="button" onClick={() => coastId && onCommand({ type: 'face', id: coastId, facing: nextFacing })} aria-label={`Yön: ${facingLabel}. Dokunarak değiştir`}><RotateCw /><span>Yön: {facingLabel}</span></button>}
          {movable && b.art && !coast && <button type="button" onClick={onFlip} aria-label={game.flips.includes(id) ? 'Yönü geri çevir' : 'Yönünü çevir'}><FlipHorizontal2 /><span>Çevir</span></button>}
          {movable && id !== 'divan' && <button type="button" onClick={onMove} aria-label="Başka arsaya taşı"><Move /><span>Taşı</span></button>}
          {id !== 'divan' && <button type="button" className="is-danger" aria-pressed={razing} onClick={() => setRazing(v => !v)} aria-label="Yık"><Trash2 /><span>Yık</span></button>}
        </div>}
      </section>
      {razing && <DemolishConfirm game={game} id={id} onCommand={onCommand} onClose={() => setRazing(false)} />}
      <p className="bp-desc" onClick={() => setHelp(true)}>{b.description}</p>
      {hasWork && <div className="bp-tabs" role="tablist" aria-label={`${b.name} bölümleri`}>
        <button type="button" role="tab" aria-selected={showTab === 'yapi'} onClick={() => setTab('yapi')}>{b.name}</button>
        <button type="button" role="tab" aria-selected={showTab === 'gelisim'} onClick={() => setTab('gelisim')}>Gelişim</button>
      </div>}
      <div ref={workRef} className="bp-tabpanel" hidden={showTab !== 'yapi'}>
        <BuildingView game={game} empire={empire} id={id} onCommand={onCommand} onRecruit={onRecruit} onNav={onNav} onBuildingNav={onBuildingNav} run={run} />
        {children}
      </div>
      <div className="bp-tabpanel" hidden={showTab !== 'gelisim'}>
      <Box title="Seviye etkisi"><BuildingEffects game={game} id={id} level={level} max={max} /></Box>
      {forecast.length > 0 && <Box title="Sonraki seviyeler">
        <Table head={['Sv.', 'Maliyet', 'Süre']} rows={forecast.map(f => [
          `${f.level}`,
          <span key="c" className="bp-mini-costs">{RESOURCE_IDS.filter(r => f.price[r] > 0).map(r => <span key={r}><ResIcon id={r} />{num(f.price[r])}</span>)}</span>,
          time(f.seconds),
        ])} />
      </Box>}
      </div>
  </IkaPage>
}
