'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { X, Check } from './ui-art'

import { SettingsPanel } from './settings-panel'
import { QuestChip } from './quest-chip'
import { GuideSpot } from './guide-spot'
import { FirstRunGuide, shouldShowGuide } from './first-run-guide'
import { AwaySummaryCard } from './away-summary'
import type { AwaySummary } from '@/lib/game/away'
import { AlliancePanel } from './alliance-panel'
import { bannerLook } from '@/lib/game/banner'
import { citySiegeAppearance } from '@/lib/game/siege-appearance'
import { BannerContext } from './building-art'
import { play, wantAmbience, type Sfx } from '@/lib/sfx'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

import { CityScene } from './city-scene'
import { BuildingList, ResearchPanel, PlotPicker, IslandPanel, colonyBlocker, colonyCostText } from './game-panels'
import { ArmyRegister } from './army-register'
import { WorldMap } from './world-map'
import { PeoplePage, SettlementsPage } from './civic-pages'
import { PageStocks } from './page-stocks'
import { TreasuryPage } from './treasury-page'
import { IslandView, NpcPanel } from './island-view'
import { EmpireOverview } from './overview'
import { BuildingPage, IkaPage } from './building-page'
import { BuildingPreview } from './building-preview'
import { CityAdmin, TradeCenter, ExperimentPanel, ForestPanel, TavernPanel, WorldPanel, type Op } from './world-panels'
import { THREAT_WARNING_MS, dispatchBlockade, dispatchRaid, targetName } from '@/lib/game/expeditions'
import { ExchangePanel, ForeignSpies, FuturePanel, GuildPanel, PiracyPanel, TemplePanel, TheatrePanel, ThreatBanner, UpgradePanel } from './ikariam-panels'
import { badgeBudget } from '@/lib/game/badges'
import { IkaNav, IkaTopBar, CityActivity, CityShortcuts, advisorNews, type AdvisorSeen, type IkaNavKey } from './ika-hud'
import { PersonArt } from './workforce'
import { ArmyAdvisor, CityAdvisor, researchAdvice } from './advisor-pages'
import type { AdvisorId } from './advisor-portraits'

import { takeAwaySummary, useGame } from '@/hooks/use-game'
import { usePwa } from '@/hooks/use-pwa'
import { useAlerts, useNotifySetting } from '@/hooks/use-alerts'
import { BUILDINGS, BUILDING_IDS, GUIDED_STEPS, OBJECTIVES, PLOTS, RESEARCH, objectiveDone, type BuildingId, type Command } from '@/lib/game/engine'
import { cn } from '@/lib/utils'
import { SovereignPage } from './sovereign-page'
import { JournalPage, ChangelogPage } from './chronicle-pages'
import { GodsPanel } from './gods-panel'
import { ObjectivesPage } from './objectives-page'

import { asset, buildingImage } from '@/lib/asset'
import { activeCity, islandOf, type IslandId } from '@/lib/game/empire'
import type { Cargo } from '@/lib/game/empire'
import { t } from '@/lib/i18n/tr'

/** Android paketi (Capacitor): ana ekrana ekleme bölümü gereksiz. */
const native = process.env.NEXT_PUBLIC_NATIVE === '1'
/** Bildirim: aynı mesaj üst üste yığılmaz, eskisinin yerine geçer. */
const say = {
  ok: (m: string, sound: Sfx = 'ok') => { play(sound); toast.success(m, { id: m }) },
  no: (m: string) => { play('error'); toast.error(m, { id: m }) },
}
type Panel = 'alliance' | 'forest' | 'build' | 'research' | 'journal' | 'settings' | 'economy' | 'objectives' | 'people' | 'cities' | 'army' | 'diplomacy' | 'island' | 'reports' | 'advisor-city' | 'profile' | 'changelog' | 'map' | 'overview' | null
export default function GameShell({ onTitle }: { onTitle?: () => void } = {}) {
  const { game, empire, command, selectCity, colonize, sendCargo, spy, raid, piracy, run, warning, reset, exportSave, importSave } = useGame()
  /** Danışman sayfalarının sahne görseli (Ikariam'daki gibi her ekranın bir resmi var). */
  function panelHero(): string | null | undefined {
    if (!game) return undefined
    if (npc) return npc.startsWith('r-') ? buildingImage('divan', 12) : asset(`/images/game/buildings/npc-${npc.split('-').pop()}.webp`)
    if (plot !== null) return asset('/images/game/buildings/site.webp')
    const map: Partial<Record<Exclude<Panel, null>, string>> = {
      army: buildingImage('kisla', Math.max(1, game.buildings.kisla)),
      island: asset(`/images/game/buildings/mine-${game.mine.specialty}.webp`), forest: asset('/images/game/buildings/forest-hero.webp'), build: buildingImage('mimar', 2),
    }
    return panel ? map[panel] ?? undefined : undefined
  }
  function runOp(op: Op, ok?: string) { const e = run(op); if (e) say.no(e); else if (ok) say.ok(ok) }
  function openRival(id: string) { setPanel(null); setSelected(null); setPlot(null); setNpc(id) }
  /** Şehir sahnesi ya da ada görünümü. */
  const [view, setView] = useState<'city' | 'island'>('city')
  /** Ada görünümünde açılan bağımsız yerleşim. */
  const [npc, setNpc] = useState<string | null>(null)
  /** Ada görünümünde gösterilen ada (boşsa aktif şehrin adası). */
  const [viewIsland, setViewIsland] = useState<IslandId | null>(null)
  const { install, installAvailable, installed, offlineReady } = usePwa()
  useAlerts(empire)
  const notify = useNotifySetting()
  const [panel, setPanel] = useState<Panel>(null)
  // Yeni oyuncu: ilk açılışta ekranı tanıtan kısa rehber (bir kez).
  const [guide, setGuide] = useState(false)
  // Dönüşte "yokluğunda olanlar" özeti (kayıt ilk yüklendiğinde bir kez).
  const [away, setAway] = useState<AwaySummary | null>(null)
  const [selected, setSelected] = useState<BuildingId | null>(null)
  const [buildingDetails, setBuildingDetails] = useState(false)
  /** Oyuncunun haritada dokundugu BOS arsa; yapi secimi buradan yapilir. */
  const [plot, setPlot] = useState<number | null>(null)
  const saveImportRef = useRef<HTMLInputElement>(null)
  const currentCityName = empire ? activeCity(empire).name : 'Sahilhisar'
  // Aktif oturumda tamamlanan inşa/yükseltmeye ses + titreşim + kısa bildirim.
  // Şehir değiştirildiğinde farklı seviyeleri "yeni tamamlandı" sanmamak için cityId de tutulur.
  const completionRef = useRef<{ cityId: string; levels: Record<BuildingId, number> } | null>(null)
  useEffect(() => {
    if (!game || !empire) return
    const cityId = empire.activeCityId
    const prev = completionRef.current
    if (!prev || prev.cityId !== cityId) {
      completionRef.current = { cityId, levels: { ...game.buildings } }
      return
    }
    const completed = BUILDING_IDS.filter(id => game.buildings[id] > prev.levels[id])
    completionRef.current = { cityId, levels: { ...game.buildings } }
    if (!completed.length) return
    const id = completed[0]
    const lv = game.buildings[id]
    say.ok(`${BUILDINGS[id].name} tamamlandı · Seviye ${lv}`, 'fanfare')
  }, [game, empire])
  // V2 Faz 3.7 / 3.5: biten araştırmaya parşömen sesi, seferden dönen orduya davul yürüyüşü.
  const learnedRef = useRef<{ cityId: string; n: number } | null>(null)
  useEffect(() => {
    if (!game || !empire) return
    const prev = learnedRef.current
    learnedRef.current = { cityId: empire.activeCityId, n: game.research.length }
    if (!prev || prev.cityId !== empire.activeCityId || game.research.length <= prev.n) return
    const id = game.research[game.research.length - 1]
    say.ok(`${RESEARCH[id].name} keşfedildi.`, 'scroll')
  }, [game, empire])
  const missionCount = (empire?.missions ?? []).length
  const seenMissions = useRef(missionCount)
  useEffect(() => {
    const prev = seenMissions.current
    seenMissions.current = missionCount
    if (missionCount === prev) return
    if (missionCount < prev) play('march')
    window.dispatchEvent(new CustomEvent('payitaht-city-fx', { detail: missionCount > prev ? 'sail' : 'march' }))
  }, [missionCount])
  /*
   * İNŞA KİPİ.
   *
   * "İnşa" artik once bir liste acmiyor, HARITAYI insa kipine sokuyor: bos
   * arsalar beliriyor, oyuncu yerini secip yapisini oradan kuruyor. Liste
   * kaybolmadi - ipucu cubugundaki "Listeden seç" onu aciyor - ama varsayilan
   * akis artik haritanin uzerinde geciyor.
   */
  /** TAŞIMA kipi: hangi bina taşınıyor + o an hedeflenen arsa (✓ ile onaylanır). */
  const [moving, setMoving] = useState<BuildingId | null>(null)
  const [movePlot, setMovePlot] = useState<number | null>(null)
  /* SES: şehirde (isteğe bağlı) ortam sesi; yeni bir düşman ordusu yola çıkınca savaş davulu. */
  useEffect(() => { wantAmbience(true); return () => wantAmbience(false) }, [])
  const freshCity = !!game && game.claimed.length === 0 && game.buildings.divan <= 1
  useEffect(() => { if (freshCity && shouldShowGuide()) setGuide(true) }, [freshCity])
  useEffect(() => { if (game) { const a = takeAwaySummary(); if (a) setAway(a) } }, [!!game]) // eslint-disable-line react-hooks/exhaustive-deps
  const threatCount = (empire?.threats ?? []).length
  const seenThreats = useRef(threatCount)
  useEffect(() => { if (threatCount > seenThreats.current) play('war'); seenThreats.current = threatCount }, [threatCount])
  /*
   * GERİ TUŞU (Android ve tarayıcı): bir sayfa, ada görünümü ya da taşıma
   * kipi açılınca geçmişe bir adım eklenir; geri tuşu uygulamayı kapatmak
   * yerine en üstteki katmanı kapatır. Katman arayüzden kapanırsa eklenen
   * adım da geri alınır. Şehir ekranında geri tuşu uygulamadan çıkar.
   */
  const layered = !!(panel || selected || plot !== null || npc || moving || view === 'island')
  const pushed = useRef(false), skipPop = useRef(false)
  const closeTop = useRef<() => void>(() => {})
  closeTop.current = () => {
    if (moving) cancelMove()
    else if (npc || plot !== null || panel) { setNpc(null); setPlot(null); setPanel(null) }
    else if (selected) setSelected(null)
    else if (view === 'island') { setView('city'); setViewIsland(null) }
  }
  useEffect(() => {
    if (layered && !pushed.current) { history.pushState({ payitaht: 1 }, ''); pushed.current = true }
    else if (!layered && pushed.current) { pushed.current = false; skipPop.current = true; history.back() }
  }, [layered])
  useEffect(() => {
    const onPop = () => {
      if (skipPop.current) { skipPop.current = false; return }
      pushed.current = false
      closeTop.current()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  function openPanel(value: Panel) { if (value === 'island' && view === 'city') { setView('island'); return } setNpc(null); setSelected(null); setPlot(null); setMoving(null); setPanel(value) }
  function openBuilding(id: BuildingId) { setPanel(null); setPlot(null); setMoving(null); setView('city'); setBuildingDetails(false); setSelected(id) }
  function openPlot(index: number) { setPanel(null); setSelected(null); setMoving(null); setPlot(index) }
  function startMove(id: BuildingId) { if (!game) return; setPanel(null); setSelected(null); setPlot(null); setMoving(id); setMovePlot(game.placement[id]) }
  function confirmMove() { if (moving !== null && movePlot !== null) act({ type: 'move', id: moving, plot: movePlot }); setMoving(null); setMovePlot(null) }
  function cancelMove() { setMoving(null); setMovePlot(null) }
    function act(action: Command) {
    const error = command(action)
    if (error) { say.no(error); return }
    /*
     * Isci atamasi SESSIZ yapilir: kaydirma cubugunu her oynatista bildirim
     * cikmasi kullanilamaz hale getirirdi.
     */
    // Isci, yol ve aynalama SESSIZ: her dokunusta bildirim cikmasi kullanilamaz.
    if (action.type === 'workers' || action.type === 'miners' || action.type === 'road' || action.type === 'flip' || action.type === 'face' || action.type === 'priests') return
    const quick: Partial<Record<Command['type'], string>> = {
      wonder: 'Kereste harikaya ulaştı.', miracle: 'Mucize başladı!', upgrade: 'Tophane ustaları işini bitirdi.',
      future: 'Gelecek araştırması ilerledi.', exchange: 'Kara Pazar\'da takas yapıldı.',
      show: 'Perde açıldı: gösteri başladı!', demolish: 'Yapı yıkıldı.', god: 'Hami tanrı seçildi.', offering: 'Sunu kabul edildi.',
      invoke: 'Tanrının kudreti çağrıldı!', devote: 'Himmet loncaya adandı.', patron: 'Lonca himayesi değişti.', foresters: 'Oduncular ormanda.',
      tavern: 'İkram ayarlandı.', claim: 'Hedef tamamlandı: ödül hazinede.', government: 'Yeni yönetim ilan edildi.', experiment: 'Deney yapıldı.',
    }
    if (quick[action.type]) { say.ok(quick[action.type]!, action.type === 'claim' ? 'coin' : 'ok'); return }
    if (action.type === 'donate') { say.ok('Bağış madene ulaştı.'); return }
    if (action.type === 'trade') { say.ok(action.side === 'buy' ? 'Tüccarla anlaşıldı. Mal ambarda.' : 'Mal satıldı.'); return }
    if (action.type === 'move') { say.ok('Bina yeni yerine taşındı.'); return }
    say.ok(action.type === 'build' ? 'Ustalar iş başında. İnşaat başladı!' : action.type === 'research' ? 'Yeni bir keşfe doğru. Araştırma başladı!' : action.type === 'recruit' ? 'Talim meydanı açıldı. Eğitim başladı!' : 'Ödül hazinene eklendi.', action.type === 'build' ? 'build' : action.type === 'recruit' ? 'march' : 'ok')
  }
  function visitCity(id: string) {
    const error = selectCity(id)
    if (error) { say.no(error); return }
    setPanel(null); setSelected(null); setPlot(null); setMoving(null); setMovePlot(null)
  }
  function foundIsland(islandId: IslandId) {
    const error = colonize(islandId)
    if (error) { say.no(error); return }
    setPanel(null); setSelected(null); setPlot(null)
    say.ok('Yeni şehir kuruldu. Şimdi bu şehri geliştirebilirsin.')
  }
  function dispatchCargo(to: string, resource: Cargo, amount: number) {
    const error = sendCargo(to, resource, amount)
    if (error) { say.no(error); return }
    say.ok('Nakliye gemileri yola çıktı.', 'sail')
  }
  async function backupSaveFile() {
    try {
      const raw = exportSave()
      const stamp = new Date().toISOString().slice(0, 10)
      const file = new File([raw], `payitaht-yedek-${stamp}.json`, { type: 'application/json' })
      const shareData = { files: [file], title: 'Payitaht Adaları kayıt yedeği' }
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url; a.download = file.name; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      say.ok('Kayıt yedeği hazır.')
    } catch {
      say.no('Kayıt yedeği dışarı aktarılamadı.')
    }
  }
  async function restoreSaveFile(file?: File) {
    if (!file) return
    try {
      const error = importSave(await file.text())
      if (error) { say.no(error); return }
      say.ok('Kayıt yedeği geri yüklendi.')
      setPanel(null); setSelected(null); setPlot(null); setMoving(null); setMovePlot(null)
    } catch {
      say.no('Yedek dosyası okunamadı.')
    } finally {
      if (saveImportRef.current) saveImportRef.current.value = ''
    }
  }
  function target(objectiveId?: string) {
    if (!game) return
    const next = objectiveId ? OBJECTIVES.find(o => o.id === objectiveId) : OBJECTIVES.find(o => !game.claimed.includes(o.id))
    const go = next?.go ?? 'research'
    if (go === 'research' || go === 'people' || go === 'army') openPanel(go)
    // İlk sefer adadaki köyü ister: maden paneli açılırsa köyü örterdi.
    else if (go === 'island') { setView('island'); setPanel(next?.id === 'first-raid' ? null : 'island') }
    else openBuilding(go)
  }
  /** Danışmanların son bakılma zamanı (haber rozetleri için, cihazda hatırlanır). */
  const [seenByCity, setSeenByCity] = useState<Record<string, AdvisorSeen>>(() => {
    const base: AdvisorSeen = { city: 0, army: 0, research: 0, diplo: 0 }
    try {
      const saved = localStorage.getItem('payitaht-advisors-seen-by-city')
      if (saved) return JSON.parse(saved)
      // Eski tek şehirlik okundu bilgisi yalnızca kurucu şehre aittir.
      return { 'city-1': { ...base, ...JSON.parse(localStorage.getItem('payitaht-advisors-seen') ?? '{}') } }
    } catch { return {} }
  })
  const cityId = empire?.activeCityId ?? 'city-1'
  const seen: AdvisorSeen = Object.assign({ city: 0, army: 0, research: 0, diplo: 0 }, seenByCity[cityId] ?? {})
  function openAdvisor(id: AdvisorId) {
    const next = { ...seen, [id]: Date.now() }
    const byCity = { ...seenByCity, [cityId]: next }
    setSeenByCity(byCity)
    try { localStorage.setItem('payitaht-advisors-seen-by-city', JSON.stringify(byCity)) } catch { /* yalnızca bu oturum */ }
    setSelected(null); setPlot(null); setNpc(null); setMoving(null)
    setPanel(id === 'city' ? 'advisor-city' : id === 'army' ? 'reports' : id === 'research' ? 'research' : 'diplomacy')
  }
  const news = game ? advisorNews(game, empire, seen) : { city: 0, army: 0, research: 0, diplo: 0 }
  /*
   * QA KANCASI: yalnız localStorage 'payitaht-qa' = '1' iken (tools/layout-qa.cjs)
   * her sayfa ve bina sayfası menüden gezinmeden açılabilsin. Oyuncu görmez.
   */
  useEffect(() => {
    try { if (localStorage.getItem('payitaht-qa') !== '1') return } catch { return }
    const w = window as unknown as { __payitahtQa?: unknown }
    w.__payitahtQa = {
      panel: (p: Exclude<Panel, null>) => { setSelected(null); setNpc(null); setPlot(null); if (p === 'island' || p === 'forest') { setView('island'); setPanel(p) } else { setView('city'); openPanel(p) } },
      building: (id: BuildingId) => { setNpc(null); openBuilding(id); setBuildingDetails(true) },
      plot: (index: number) => { setNpc(null); openPlot(index) },
      buildingPreview: (id: BuildingId) => { setNpc(null); openBuilding(id) },
      advisor: (id: AdvisorId) => openAdvisor(id),
      island: () => { setPanel(null); setSelected(null); setView('island') },
      close: () => { setPanel(null); setSelected(null); setPlot(null); setNpc(null); setView('city') },
    }
  })
  const foundingCity = !empire || empire.activeCityId === empire.cities[0]?.id
  const claimable = game && foundingCity ? OBJECTIVES.filter(o => !game.claimed.includes(o.id) && objectiveDone(game, o.id)).length : 0
  const offerCount = game ? (empire?.world?.proposals ?? []).filter(p => p.until > game.updatedAt).length : 0
  const unreadCirculars = (empire?.world?.pact?.circulars ?? []).filter(c => !c.read).length
  // V2 2.10: aynı anda en çok iki sayılı rozet; kalanlar nokta.
  const badges = badgeBudget({ army: news.army, objectives: claimable, diplo: news.diplo, offers: offerCount, alliance: unreadCirculars, city: news.city, research: news.research })
  const navActive: IkaNavKey | null = panel === 'map' ? 'map' : panel === 'objectives' ? 'objectives' : panel === 'alliance' ? 'alliance'
    : view === 'island' ? 'island' : !panel && !(selected && buildingDetails) && plot === null && !npc ? 'city' : null
  const activeAdvisor: AdvisorId | null = panel === 'advisor-city' ? 'city' : panel === 'reports' || panel === 'army' ? 'army'
    : panel === 'research' ? 'research' : panel === 'diplomacy' ? 'diplo' : null
  const titles: Record<Exclude<Panel, null>, string> = { build: 'Şehrini büyüt', research: 'Âlim · Araştırma', journal: 'Şehir günlüğü', settings: 'Ayarlar', economy: 'Hazine ve üretim', objectives: 'Görev defteri', people: 'Şehrin halkı', cities: 'Şehirlerin', army: 'Ordu ve donanma', diplomacy: 'Elçi', alliance: 'İttifak', island: 'Ada madeni', forest: 'Ada ormanı', reports: 'Serasker', 'advisor-city': 'Vezir', profile: 'Hükümdarın Sarayı', changelog: 'Sürüm notları', map: 'Dünya haritası', overview: 'İmparatorluk özeti' }
  return <BannerContext.Provider value={bannerLook(empire)}><main style={Object.fromEntries(['wood', 'paper', 'back', 'close', 'nav-city', 'nav-island', 'nav-map', 'nav-alliance', 'nav-quests', 'page-frame', 'header-frame', 'gold-button-frame', 'tab-frame'].map(name => [`--royal-${name}`, `url("${asset(`/images/game/ui/approved-court/${name}.webp`)}")`]).concat(['header', 'summary', 'edit', 'tabs', 'title', 'ledger', 'honours', 'footer'].map(name => [`--profile-${name}`, `url("${asset(`/images/game/ui/profile-v2/${name}.webp`)}")`]))) as CSSProperties} className={cn('game-shell', !panel && plot === null && !npc && view === 'city' && !(selected && buildingDetails) && 'game-world', selected && !buildingDetails && 'has-building-preview', view === 'island' && 'game-island', ((!!selected && buildingDetails) || !!panel || plot !== null || !!npc) && 'has-page')}>
    {/*
      * ÜST ŞERİT (ika-hud.tsx): şehir seçici, dört danışman ve kaynaklar.
      */}
    {game && <IkaTopBar game={game} empire={empire} news={news} modes={{ army: badges.army, diplo: badges.diplo, city: badges.city, research: badges.research }} activeAdvisor={activeAdvisor} onProfile={() => openPanel('profile')} onCity={() => openPanel('cities')} onSelectCity={id => { visitCity(id); setView('city'); setViewIsland(null) }} onEconomy={() => openPanel('economy')} onAdvisor={openAdvisor} />}
    {game ? <>{empire && <ThreatBanner empire={empire} now={game.updatedAt} onOpen={() => openPanel('army')} />}<div className="game-body"><div className="city-column"><CityScene key={empire?.activeCityId} raid={(empire?.threats ?? []).some(t => t.cityId === empire?.activeCityId && (t.intent || t.arriveAt - game.updatedAt <= THREAT_WARNING_MS))} paused={view === 'island' || (!!selected && buildingDetails) || (!!panel && !moving)} siege={citySiegeAppearance(empire)} banner={bannerLook(empire)} activity={<CityActivity game={game} empire={empire} onBuilding={openBuilding} onArmy={() => openPanel('army')} onResearch={() => openPanel('research')} />} shortcuts={<CityShortcuts now={game.updatedAt} offers={offerCount} reports={(empire?.reports ?? []).filter(r => r.cityId === cityId && r.time > seen.army).length} daily={claimable + (empire?.daily && empire.daily.loginDay !== empire.daily.day ? 1 : 0)} onObjectives={() => openPanel('objectives')} onOffers={() => openAdvisor('diplo')} onReports={() => openAdvisor('army')} />} game={game} placing={plot !== null || moving !== null} onBuilding={openBuilding} onPlot={openPlot} onRoad={cell => act({ type: 'road', cell })} moving={moving} movePlot={movePlot} onMine={() => { setSelected(null); setPlot(null); setPanel('island') }} onMovePlot={setMovePlot} />{view === 'island' && empire && <IslandView empire={empire} islandId={viewIsland ?? activeCity(empire).islandId} onIsland={setViewIsland} now={game.updatedAt} onCity={() => { setView('city'); setViewIsland(null) }} onMine={() => { setNpc(null); setPanel('island') }} onForest={() => { setNpc(null); setPanel('forest') }} onNpc={id => { setPanel(null); setSelected(null); setPlot(null); setNpc(id) }} onReports={() => openAdvisor('army')} />}</div></div>
      {/* TAŞIMA ONAY ŞERİDİ — referanstaki yeşil ✓/✗. */}
      {moving && <div className="move-confirm">
        <span className="move-confirm-title">{BUILDINGS[moving].name} taşınıyor</span>
        <span className="move-confirm-hint">Binayı sürükle ya da boş arsaya dokun</span>
        <div className="move-confirm-actions">
          <button className="move-cancel" onClick={cancelMove} aria-label={t.action.cancel}><X /></button>
          <button className="move-ok" onClick={confirmMove} aria-label={t.action.confirm}><Check /></button>
        </div>
      </div>}
      {/*
        * YAN AKSIYON DUGMELERI — referanstaki gibi sagda yuzen buyuk yuvarlak
        * dugmeler: ust'te tehdit/ordu, altta insa cekici.
        */}
      {/* ALT LOG ŞERİDİ — referanstaki sohbet gibi, en son şehir günlüğü satırı. */}
      {guide && view === 'city' && !panel && !selected && <FirstRunGuide onDone={() => setGuide(false)} />}
      {away && !guide && <AwaySummaryCard summary={away} onClose={() => setAway(null)} onReports={() => { setAway(null); openPanel('reports') }} />}
      {view === 'city' && !selected && foundingCity && !(empire?.threats ?? []).some(t => t.cityId === empire?.activeCityId) && !(empire?.sieges ?? []).length && <QuestChip game={game} onOpen={() => openPanel('objectives')} onGo={target} onClaim={id => act({ type: 'claim', id })} />}
      {/* Rehber yeni oyuncu içindir: Divanhane 5'e varmış eski kayıtta, sonradan eklenen rehber hedefleri ok çıkarmaz. */}
      {!selected && foundingCity && game.buildings.divan < 5 && OBJECTIVES.slice(0, GUIDED_STEPS).some(o => !game.claimed.includes(o.id)) && <GuideSpot game={game} />}</> : <div className="game-loading"><img src={buildingImage('divan', 8)} alt="" width={150} height={150} /><h1>Şehrin uyanıyor…</h1><p>Sahilhisar kapılarını açıyor.</p></div>}
    {game && selected && !buildingDetails && <BuildingPreview key={`${cityId}-${selected}`} game={game} id={selected}
      onClose={() => setSelected(null)} onDetails={() => setBuildingDetails(true)}
      onBuild={() => act({ type: 'build', id: selected })} />}
    <IkaNav active={navActive} badges={{ objectives: claimable, alliance: unreadCirculars }} modes={{ objectives: badges.objectives, alliance: badges.alliance }} onSelect={key => {
      setSelected(null); setPlot(null); setNpc(null)
      if (key === 'city') { setPanel(null); setMoving(null); setView('city'); setViewIsland(null) }
      else if (key === 'island') { setPanel(null); setView('island') }
      else if (key === 'alliance') openPanel('alliance')
      else openPanel(key === 'map' ? 'map' : 'objectives')
    }} />
    {game && selected && buildingDetails && <BuildingPage toolbar={<PageStocks game={game} onOpen={() => openPanel('economy')} />} game={game} empire={empire} id={selected} onClose={() => setBuildingDetails(false)}
      onBuild={() => act({ type: 'build', id: selected })} onFlip={() => act({ type: 'flip', id: selected })} onMove={() => startMove(selected)}
      onCommand={act} run={runOp} onRecruit={(id, count) => act({ type: 'recruit', id, count })} onBuildingNav={openBuilding}
      onNav={p => { setSelected(null); if (p === 'island' || p === 'forest') { setView('island'); setPanel(p) } else openPanel(p) }}>{selected === 'divan' && empire && <CityAdmin empire={empire} game={game} now={game.updatedAt} onCommand={act} run={runOp} />}{selected === 'kahvehane' && <TavernPanel game={game} onCommand={act} />}{selected === 'medrese' && <ExperimentPanel game={game} onCommand={act} />}{(selected === 'siginak' || selected === 'elcilik') && empire && <ForeignSpies register={selected === 'siginak' || selected === 'elcilik'} empire={empire} game={game} now={game.updatedAt} run={runOp} />}{selected === 'ticaret_merkezi' && empire && <TradeCenter register empire={empire} now={game.updatedAt} run={runOp} onRival={openRival} />}{selected === 'karagoz' && <TheatrePanel game={game} now={game.updatedAt} onCommand={act} />}{selected === 'tekke' && <GuildPanel game={game} now={game.updatedAt} onCommand={act} />}{selected === 'mabet' && <GodsPanel game={game} now={game.updatedAt} onCommand={act} />}{selected === 'cami' && <TemplePanel game={game} now={game.updatedAt} onCommand={act} />}{selected === 'tophane' && <UpgradePanel game={game} onCommand={act} />}{selected === 'kara_pazar' && <ExchangePanel game={game} onCommand={act} />}{selected === 'korsan_kalesi' && empire && <PiracyPanel empire={empire} now={game.updatedAt} onPiracy={(id, units) => { const e = piracy(id, units); if (e) say.no(e); else say.ok('Filo denize açıldı.', 'sail') }} />}</BuildingPage>}
    {(panel || plot !== null || npc) && <IkaPage toolbar={!npc && panel !== 'economy' && panel !== 'people' && panel !== 'cities' && panel !== 'army' && panel !== 'reports' && panel !== 'map' && panel !== 'overview' && plot === null && panel !== 'build' && panel !== 'forest' && panel !== 'island' && panel !== 'profile' && panel !== 'settings' && panel !== 'changelog' && panel !== 'objectives' && panel !== 'advisor-city' && panel !== 'diplomacy' && panel !== 'alliance' && panel !== 'research' && game && <PageStocks game={game} onOpen={() => openPanel('economy')} />} sheet={false} onClose={() => { setPanel(null); setPlot(null); setNpc(null) }}
      title={npc ? targetName(npc) : plot !== null ? (PLOTS[plot]?.islet ? 'Korsan adası' : PLOTS[plot]?.zone === 'liman' ? 'Deniz arsası' : 'Boş arsa') : panel ? titles[panel] : 'Şehrin'}
      subtitle={npc ? (npc.startsWith('r-') ? 'Yapay rakip hükümdar' : 'Bağımsız yerleşim') : plot !== null ? 'Bu arsaya hangi yapıyı kuracaksın?' : panel === 'build' ? 'Her yapı, yeni bir başlangıç.' : panel === 'research' ? 'İlim, şehrinin en değerli hazinesidir.' : panel === 'people' ? 'Emeği nereye ayıracağına sen karar ver.' : panel === 'army' ? 'Asker halktan çıkar. Bedelini bilerek öde.' : panel === 'cities' ? 'Hükmünün altındaki her şehir.' : panel === 'map' ? 'Adalar, rakipler ve deniz yolları' : panel === 'overview' ? 'Şehirlerin kaynak, yapı ve ordu defterleri' : panel === 'diplomacy' ? 'Yapay rakipler: sıralama, anlaşmalar, pazar, mektuplar' : panel === 'island' ? 'Lüks mal yatağı, ada harikası ve tüccar' : panel === 'forest' ? 'Oduncular, kereste ve ormanın büyümesi' : panel === 'alliance' ? (empire?.world?.pact ? `${empire.world.pact.name} [${empire.world.pact.tag}]` : 'Birlikten kuvvet doğar') : currentCityName}
      hero={npc || panel === 'army' || panel === 'map' || panel === 'overview' || panel === 'reports' || panel === 'forest' || panel === 'island' || panel === 'research' || panel === 'build' || plot !== null ? undefined : panelHero()} className={panel === 'army' ? 'bp-muster bp-atlas bp-campaign bp-royal' : npc || panel === 'reports' ? 'bp-campaign bp-royal' : panel === 'forest' || panel === 'island' ? 'bp-island-register bp-royal' : plot !== null || panel === 'build' ? 'bp-construction bp-royal' : !npc && plot === null ? panel === 'people' || panel === 'cities' ? 'bp-population bp-royal' : panel === 'map' ? 'bp-mapview bp-atlas bp-royal' : panel === 'overview' ? 'bp-atlas bp-royal' : panel === 'objectives' ? 'bp-objectives bp-royal' : panel === 'changelog' ? 'bp-annals bp-royal bp-archive' : panel === 'journal' ? 'bp-annals' : panel === 'profile' ? 'bp-court bp-royal bp-profile' : panel === 'settings' ? 'bp-court bp-royal bp-settings' : panel === 'alliance' ? 'bp-court bp-royal bp-alliance' : panel === 'advisor-city' ? 'bp-vizier bp-royal' : panel === 'diplomacy' ? 'bp-court bp-royal' : panel === 'economy' ? 'bp-treasury bp-royal' : panel === 'research' ? 'bp-research bp-royal' : undefined : undefined}>{game && <>
      {plot !== null && <PlotPicker game={game} plot={plot} onBuild={(id, at) => { act({ type: 'build', id, plot: at }); setPlot(null) }} />}
      {panel === 'people' && <PeoplePage game={game} cityName={empire ? activeCity(empire).name : 'Şehir'} onAssign={(id, value) => act({ type: 'workers', id, value })} onBuilding={openBuilding} onForest={() => { setViewIsland(null); setView('island'); setPanel('forest') }} onIsland={() => { setViewIsland(null); setView('island'); setPanel('island') }} />}
      {panel === 'cities' && empire && <SettlementsPage run={runOp} game={game} empire={empire} onBuilding={openBuilding} onSelectCity={visitCity} onCargo={dispatchCargo} onMap={() => openPanel('map')} />}
      {panel === 'map' && empire && <WorldMap empire={empire} now={game.updatedAt} missing={colonyBlocker(empire)} colonyCost={colonyCostText}
        onSelectCity={visitCity} onColonize={foundIsland} onViewIsland={id => { setViewIsland(id); setPanel(null); setView('island') }} />}
      {panel === 'army' && empire && <ArmyRegister game={game} empire={empire} run={runOp} onRecruit={(id, count) => act({ type: 'recruit', id, count })} onBuild={openBuilding} onIsland={() => { setViewIsland(null); setView('island'); setPanel(null) }} />}
      {panel === 'diplomacy' && empire && <WorldPanel empire={empire} now={game.updatedAt} run={runOp} onRival={openRival} initial={(empire.world?.proposals ?? []).some(p => p.until > game.updatedAt) ? 'offers' : (empire.world?.messages ?? []).some(m => !m.read) ? 'mail' : 'diplo'} />}
      {panel === 'island' && empire && <IslandPanel game={game} islandName={islandOf(activeCity(empire)).name} onMiners={value => act({ type: 'miners', value })} onDonate={amount => act({ type: 'donate', amount })} onTrade={(id, side, amount) => act({ type: 'trade', id, side, amount })}><TemplePanel game={game} now={game.updatedAt} onCommand={act} /></IslandPanel>}
      {panel === 'forest' && <ForestPanel game={game} onCommand={act} />}
      {panel === 'alliance' && empire && <AlliancePanel empire={empire} now={game.updatedAt} run={runOp} onRival={openRival} onEmbassy={() => openBuilding('elcilik')} />}
      {npc && empire && <NpcPanel empire={empire} npcId={npc} now={game.updatedAt} onSpy={count => { const e = spy(npc, count); if (e) say.no(e); else say.ok('Casuslar yola çıktı.', 'sail') }} onRaid={units => { const e = raid(npc, units); if (e) say.no(e); else { say.ok('Ordu sefere çıktı.', 'sail'); setNpc(null) } }} onOccupy={units => runOp((e, t) => dispatchRaid(e, npc, units, t, 'occupy'), 'Ordu işgale çıktı.')} onBlockade={units => runOp((e, t) => dispatchBlockade(e, npc, units, t), 'Filo ablukaya çıktı.')} run={runOp} />}
      {panel === 'reports' && empire && <ArmyAdvisor empire={empire} game={game} run={runOp} onArmy={() => openPanel('army')} />}
      {panel === 'advisor-city' && empire && <CityAdvisor empire={empire} game={game} onCity={visitCity} onBuilding={openBuilding} onCities={() => openPanel('cities')} onBuildList={() => openPanel('build')} onOverview={() => openPanel('overview')} onJournal={() => openPanel('journal')} />}
      {panel === 'overview' && empire && <EmpireOverview empire={empire} onCity={visitCity} />}
      {panel === 'build' && <BuildingList game={game} onSelect={openBuilding} />}
      {panel === 'research' && <><details className="academy-advice"><summary>Âlimin önerisi</summary><div className="academy-counsel"><PersonArt kind="alim" size={64} /><p>{researchAdvice(game)}</p></div></details><ResearchPanel game={game} onResearch={id => act({ type: 'research', id })} /><FuturePanel game={game} onCommand={act} /></>}
      {panel === 'journal' && <JournalPage game={game} cityName={currentCityName} />}
      {panel === 'profile' && empire && <SovereignPage empire={empire} now={game.updatedAt} run={runOp} onCity={visitCity} onSettings={() => openPanel('settings')} onChangelog={() => openPanel('changelog')} />}
      {panel === 'changelog' && <ChangelogPage />}
      {panel === 'economy' && <TreasuryPage game={game} cityName={currentCityName} onBuilding={id => { setView('city'); setViewIsland(null); openBuilding(id) }} onPeople={() => { setView('city'); openPanel('people') }} onForest={() => { setViewIsland(null); setView('island'); setPanel('forest') }} onIsland={() => { setViewIsland(null); setView('island'); setPanel('island') }} />}
      {panel === 'objectives' && <ObjectivesPage game={game} empire={empire} foundingCity={foundingCity} cityName={currentCityName}
        onClaim={id => act({ type: 'claim', id })} onGo={target} onFoundingCity={() => visitCity(empire!.cities[0].id)} run={runOp} />}
      {panel === 'settings' && <SettingsPanel empire={empire} run={runOp} warning={warning} native={native}
        pwa={{ installed, installAvailable, install, offlineReady }} notify={notify}
        onBackup={() => void backupSaveFile()} onRestore={file => void restoreSaveFile(file)}
        onReset={() => { reset(); say.ok('Yeni şehrin kuruldu.') }} onTitle={onTitle} onChangelog={() => openPanel('changelog')} />}
    </>}</IkaPage>}
    {warning && <button className="save-warning" onClick={() => openPanel('settings')}>Kayıt uyarısı · Ayrıntıları gör</button>}<Toaster theme="light" position="top-center" visibleToasts={2} duration={2600} gap={6}
      offset={{ top: 'calc(var(--sa-top) + 8px)' }} mobileOffset={{ top: 'calc(var(--sa-top) + 8px)', left: '12px', right: '12px' }} />
  </main></BannerContext.Provider>
}
