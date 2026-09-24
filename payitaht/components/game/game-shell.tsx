'use client'

import { useState } from 'react'
import { Hammer, Download, RotateCcw, HardDrive, WifiOff, Skull, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { CityScene } from './city-scene'
import { BuildingDetails, BuildingList, ResearchPanel, JournalPanel, PlotPicker, PeoplePanel, CitiesPanel, ArmyPanel, DiplomacyPanel, IslandPanel } from './game-panels'
import { ObjectiveCard, EconomyDetails } from './game-widgets'
import { IslandView, NpcPanel, ReportsPanel } from './island-view'
import { BuildingPage, IkaPage } from './building-page'
import { CityAdmin, DailyPanel, DemolishRow, DeployPanel, ExperimentPanel, ForestPanel, MissionList, TavernPanel, WorldPanel, type Op } from './world-panels'
import { dispatchBlockade, dispatchRaid, targetName } from '@/lib/game/expeditions'
import { DefenseSummary, ExchangePanel, FuturePanel, PiracyPanel, TemplePanel, ThreatBanner, UpgradePanel } from './ikariam-panels'
import { IkaNav, IkaTopBar, AdvisorSpeech, advisorNews, type AdvisorSeen, type IkaNavKey } from './ika-hud'
import { ArmyAdvisor, CityAdvisor, diploAdvice, researchAdvice } from './advisor-pages'
import type { AdvisorId } from './advisor-portraits'
import { NPC_SETTLEMENTS } from '@/lib/game/expeditions'
import { useGame } from '@/hooks/use-game'
import { usePwa } from '@/hooks/use-pwa'
import { BUILDINGS, OBJECTIVES, objectiveDone, type BuildingId, type Command } from '@/lib/game/engine'
import { cn } from '@/lib/utils'
import { asset, buildingImage } from '@/lib/asset'
import { activeCity, islandOf, type IslandId } from '@/lib/game/empire'
import type { Cargo } from '@/lib/game/empire'

type Panel = 'build' | 'research' | 'journal' | 'settings' | 'economy' | 'objectives' | 'people' | 'cities' | 'army' | 'diplomacy' | 'island' | 'reports' | 'advisor-city' | null
export default function GameShell() {
  const { game, empire, command, selectCity, colonize, sendCargo, spy, raid, piracy, run, warning, reset } = useGame()
  /** Danışman sayfalarının sahne görseli (Ikariam'daki gibi her ekranın bir resmi var). */
  function panelHero(): string | null | undefined {
    if (!game) return undefined
    if (npc) return npc.startsWith('r-') ? buildingImage('divan', 12) : asset(`/images/game/buildings/npc-${npc.split('-').pop()}.webp`)
    if (plot !== null) return asset('/images/game/buildings/site.webp')
    const map: Partial<Record<Exclude<Panel, null>, string>> = {
      army: buildingImage('kisla', Math.max(1, game.buildings.kisla)),
      cities: buildingImage('saray', Math.max(1, game.buildings.saray || 3)), people: buildingImage('konut', Math.max(1, game.buildings.konut)),
      objectives: buildingImage('divan', Math.max(1, game.buildings.divan)),
      island: asset(`/images/game/buildings/mine-${game.mine.specialty}.webp`), build: buildingImage('mimar', 2),
    }
    return panel ? map[panel] ?? undefined : undefined
  }
  function runOp(op: Op, ok?: string) { const e = run(op); if (e) toast.error(e); else if (ok) toast.success(ok) }
  function openRival(id: string) { setPanel(null); setSelected(null); setPlot(null); setNpc(id) }
  /** Şehir sahnesi ya da ada görünümü. */
  const [view, setView] = useState<'city' | 'island'>('city')
  /** Ada görünümünde açılan bağımsız yerleşim. */
  const [npc, setNpc] = useState<string | null>(null)
  /** Ada görünümünde gösterilen ada (boşsa aktif şehrin adası). */
  const [viewIsland, setViewIsland] = useState<IslandId | null>(null)
  const { install, installAvailable, installed, offlineReady } = usePwa()
  const [panel, setPanel] = useState<Panel>(null)
  const [selected, setSelected] = useState<BuildingId | null>(null)
  /** Oyuncunun haritada dokundugu BOS arsa; yapi secimi buradan yapilir. */
  const [plot, setPlot] = useState<number | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const currentCityName = empire ? activeCity(empire).name : 'Sahilhisar'
  /*
   * İNŞA KİPİ.
   *
   * "İnşa" artik once bir liste acmiyor, HARITAYI insa kipine sokuyor: bos
   * arsalar beliriyor, oyuncu yerini secip yapisini oradan kuruyor. Liste
   * kaybolmadi - ipucu cubugundaki "Listeden seç" onu aciyor - ama varsayilan
   * akis artik haritanin uzerinde geciyor.
   */
  const [buildMode, setBuildMode] = useState(false)
  /** TAŞIMA kipi: hangi bina taşınıyor + o an hedeflenen arsa (✓ ile onaylanır). */
  const [moving, setMoving] = useState<BuildingId | null>(null)
  const [movePlot, setMovePlot] = useState<number | null>(null)
  function openPanel(value: Panel) { if (value === 'island' && view === 'city') { setView('island'); return } setNpc(null); setSelected(null); setPlot(null); setMoving(null); setPanel(value); setConfirmReset(false); setBuildMode(false) }
  function openBuilding(id: BuildingId) { setPanel(null); setPlot(null); setMoving(null); setSelected(id) }
  function openPlot(index: number) { setPanel(null); setSelected(null); setMoving(null); setPlot(index) }
  function startMove(id: BuildingId) { if (!game) return; setPanel(null); setSelected(null); setPlot(null); setBuildMode(false); setMoving(id); setMovePlot(game.placement[id]) }
  function confirmMove() { if (moving !== null && movePlot !== null) act({ type: 'move', id: moving, plot: movePlot }); setMoving(null); setMovePlot(null) }
  function cancelMove() { setMoving(null); setMovePlot(null) }
    function act(action: Command) {
    const error = command(action)
    if (error) { toast.error(error); return }
    /*
     * Isci atamasi SESSIZ yapilir: kaydirma cubugunu her oynatista bildirim
     * cikmasi kullanilamaz hale getirirdi.
     */
    // Isci, yol ve aynalama SESSIZ: her dokunusta bildirim cikmasi kullanilamaz.
    if (action.type === 'workers' || action.type === 'miners' || action.type === 'road' || action.type === 'flip' || action.type === 'priests') return
    const quick: Partial<Record<Command['type'], string>> = {
      wonder: 'Kereste harikaya ulaştı.', miracle: 'Mucize başladı!', upgrade: 'Tophane ustaları işini bitirdi.',
      future: 'Gelecek araştırması ilerledi.', exchange: 'Kara Pazar\'da takas yapıldı.',
    }
    if (quick[action.type]) { toast.success(quick[action.type]); return }
    if (action.type === 'donate') { toast.success('Bağış madene ulaştı.'); return }
    if (action.type === 'trade') { toast.success(action.side === 'buy' ? 'Tüccarla anlaşıldı. Mal ambarda.' : 'Mal satıldı.'); return }
    if (action.type === 'move') { toast.success('Bina yeni yerine taşındı.'); return }
    if (action.type === 'build') setBuildMode(false)
    toast.success(action.type === 'build' ? 'Ustalar iş başında. İnşaat başladı!' : action.type === 'research' ? 'Yeni bir keşfe doğru. Araştırma başladı!' : action.type === 'recruit' ? 'Talim meydanı açıldı. Eğitim başladı!' : 'Ödül hazinene eklendi.')
  }
  function visitCity(id: string) {
    const error = selectCity(id)
    if (error) { toast.error(error); return }
    setPanel(null); setSelected(null); setPlot(null); setBuildMode(false); setMoving(null); setMovePlot(null)
  }
  function foundIsland(islandId: IslandId) {
    const error = colonize(islandId)
    if (error) { toast.error(error); return }
    setPanel(null); setSelected(null); setBuildMode(false); setPlot(null)
    toast.success('Yeni şehir kuruldu. Şimdi bu şehri geliştirebilirsin.')
  }
  function dispatchCargo(to: string, resource: Cargo, amount: number) {
    const error = sendCargo(to, resource, amount)
    if (error) { toast.error(error); return }
    toast.success('Nakliye gemileri yola çıktı.')
  }
  function target() { if (!game) return; if (game.buildings.divan < 2) openBuilding('divan'); else if (!game.buildings.medrese) openBuilding('medrese'); else openPanel('research') }
  /** Danışmanların son bakılma zamanı (haber rozetleri için, cihazda hatırlanır). */
  const [seen, setSeen] = useState<AdvisorSeen>(() => {
    const base: AdvisorSeen = { city: 0, army: 0, research: 0, diplo: 0 }
    try { return { ...base, ...JSON.parse(localStorage.getItem('payitaht-advisors-seen') ?? '{}') } } catch { return base }
  })
  function openAdvisor(id: AdvisorId) {
    const next = { ...seen, [id]: Date.now() }
    setSeen(next)
    try { localStorage.setItem('payitaht-advisors-seen', JSON.stringify(next)) } catch { /* yalnızca bu oturum */ }
    setSelected(null); setPlot(null); setNpc(null); setBuildMode(false); setMoving(null)
    setPanel(id === 'city' ? 'advisor-city' : id === 'army' ? 'reports' : id === 'research' ? 'research' : 'diplomacy')
  }
  const news = game ? advisorNews(game, empire, seen) : { city: 0, army: 0, research: 0, diplo: 0 }
  const claimable = game ? OBJECTIVES.filter(o => !game.claimed.includes(o.id) && objectiveDone(game, o.id)).length : 0
  const navActive: IkaNavKey | null = buildMode ? 'build' : panel === 'cities' ? 'map' : panel === 'objectives' ? 'objectives'
    : view === 'island' ? 'island' : !panel && !selected && plot === null && !npc ? 'city' : null
  const titles: Record<Exclude<Panel, null>, string> = { build: 'Şehrini büyüt', research: 'Âlim · Araştırma', journal: 'Şehir günlüğü', settings: 'Oyun ayarları', economy: 'Hazine ve üretim', objectives: 'Bir şehrin doğuşu', people: 'Şehrin halkı', cities: 'Şehirlerin', army: 'Ordu ve donanma', diplomacy: 'Elçi · Diplomasi', island: 'Ada ve maden', reports: 'Serasker · Ordu danışmanı', 'advisor-city': 'Vezir · Şehir danışmanı' }
  return <main className={cn('game-shell', view === 'island' && 'game-island')}>
    {/*
      * ÜST ŞERİT (ika-hud.tsx): şehir seçici, dört danışman ve kaynaklar.
      */}
    {game && <IkaTopBar game={game} empire={empire} news={news} onCity={() => openPanel('cities')} onEconomy={() => openPanel('economy')} onAdvisor={openAdvisor} />}
    {game ? <>{empire && <ThreatBanner empire={empire} now={game.updatedAt} onOpen={() => openPanel('army')} />}<div className="game-body"><div className="city-column"><CityScene key={empire?.activeCityId} game={game} placing={buildMode || plot !== null || moving !== null} onBuilding={openBuilding} onPlot={openPlot} onRoad={cell => act({ type: 'road', cell })} moving={moving} movePlot={movePlot} onMine={() => { setSelected(null); setPlot(null); setPanel('island') }} onMovePlot={setMovePlot} onExitBuild={() => setBuildMode(false)} onOpenList={() => openPanel('build')} />{view === 'island' && empire && <IslandView empire={empire} islandId={viewIsland ?? activeCity(empire).islandId} onIsland={setViewIsland} now={game.updatedAt} onCity={() => { setView('city'); setViewIsland(null) }} onMine={() => { setNpc(null); setPanel('island') }} onNpc={id => { setPanel(null); setSelected(null); setPlot(null); setNpc(id) }} onReports={() => openAdvisor('army')} />}</div></div>
      {/* TAŞIMA ONAY ŞERİDİ — referanstaki yeşil ✓/✗. */}
      {moving && <div className="move-confirm">
        <span className="move-confirm-title">{BUILDINGS[moving].name} taşınıyor</span>
        <span className="move-confirm-hint">Binayı sürükle ya da boş arsaya dokun</span>
        <div className="move-confirm-actions">
          <button className="move-cancel" onClick={cancelMove} aria-label="Vazgeç"><X /></button>
          <button className="move-ok" onClick={confirmMove} aria-label="Onayla"><Check /></button>
        </div>
      </div>}
      {/*
        * YAN AKSIYON DUGMELERI — referanstaki gibi sagda yuzen buyuk yuvarlak
        * dugmeler: ust'te tehdit/ordu, altta insa cekici.
        */}
      {/* ALT LOG ŞERİDİ — referanstaki sohbet gibi, en son şehir günlüğü satırı. */}
      <button className="hud-ticker" onClick={() => openAdvisor('city')} aria-label="Şehir olayları">
        <span className="hud-ticker-tag">OLAY</span>
        <span className="hud-ticker-text">{game.log[0]?.text ?? `${currentCityName} sessiz.`}</span>
      </button></> : <div className="game-loading"><img src={buildingImage('divan', 8)} alt="" width={150} height={150} /><h1>Şehrin uyanıyor…</h1><p>Sahilhisar kapılarını açıyor.</p></div>}
    <IkaNav active={navActive} badges={{ objectives: claimable }} onSelect={key => {
      setSelected(null); setPlot(null); setNpc(null)
      if (key === 'city') { setPanel(null); setBuildMode(false); setMoving(null); setView('city'); setViewIsland(null) }
      else if (key === 'island') { setPanel(null); setBuildMode(false); setView('island') }
      else if (key === 'build') { setPanel(null); setView('city'); setBuildMode(v => !v) }
      else openPanel(key === 'map' ? 'cities' : 'objectives')
    }} />
    {game && selected && <BuildingPage game={game} empire={empire} id={selected} onClose={() => setSelected(null)}
      onBuild={() => act({ type: 'build', id: selected })} onFlip={() => act({ type: 'flip', id: selected })} onMove={() => startMove(selected)}
      onCommand={act} onRecruit={(id, count) => act({ type: 'recruit', id, count })} onBuildingNav={openBuilding}
      onNav={p => { setSelected(null); if (p === 'island') { setView('island'); setPanel('island') } else openPanel(p) }}>{selected === 'divan' && empire && <CityAdmin empire={empire} game={game} now={game.updatedAt} onCommand={act} run={runOp} />}{selected === 'kahvehane' && <TavernPanel game={game} onCommand={act} />}{selected === 'medrese' && <ExperimentPanel game={game} onCommand={act} />}{selected === 'cami' && <TemplePanel game={game} now={game.updatedAt} onCommand={act} />}{selected === 'tophane' && <UpgradePanel game={game} onCommand={act} />}{selected === 'kara_pazar' && <ExchangePanel game={game} onCommand={act} />}{selected === 'korsan_kalesi' && empire && <PiracyPanel empire={empire} now={game.updatedAt} onPiracy={(id, units) => { const e = piracy(id, units); if (e) toast.error(e); else toast.success('Filo denize açıldı.') }} />}</BuildingPage>}
    {(panel || plot !== null || npc) && <IkaPage onClose={() => { setPanel(null); setPlot(null); setNpc(null) }}
      title={npc ? targetName(npc) : plot !== null ? 'Boş arsa' : panel ? titles[panel] : 'Şehrin'}
      subtitle={npc ? (npc.startsWith('r-') ? 'Yapay rakip hükümdar' : 'Bağımsız yerleşim') : plot !== null ? 'Bu arsaya hangi yapıyı kuracaksın?' : panel === 'build' ? 'Her yapı, yeni bir başlangıç.' : panel === 'research' ? 'İlim, şehrinin en değerli hazinesidir.' : panel === 'people' ? 'Emeği nereye ayıracağına sen karar ver.' : panel === 'army' ? 'Asker halktan çıkar. Bedelini bilerek öde.' : panel === 'cities' ? 'Hükmünün altındaki her şehir.' : panel === 'diplomacy' ? 'Yapay rakipler: sıralama, anlaşmalar, pazar, mektuplar' : panel === 'island' ? 'Adanın madeni, ormanı, harikası ve tüccarı' : currentCityName}
      hero={panelHero()}>{game && <>{plot !== null && <PlotPicker game={game} plot={plot} onBuild={(id, at) => { act({ type: 'build', id, plot: at }); setPlot(null) }} />}{panel === 'people' && <PeoplePanel game={game} onAssign={(id, value) => act({ type: 'workers', id, value })} />}{panel === 'cities' && empire && <CitiesPanel game={game} empire={empire} onBuilding={openBuilding} onSelectCity={visitCity} onColonize={foundIsland} onCargo={dispatchCargo} onViewIsland={id => { setViewIsland(id); setPanel(null); setView('island') }} />}{panel === 'army' && <ArmyPanel game={game} onRecruit={(id, count) => act({ type: 'recruit', id, count })} onBuild={openBuilding} />}{panel === 'army' && empire && <><DefenseSummary empire={empire} /><MissionList empire={empire} now={game.updatedAt} run={runOp} /><DeployPanel empire={empire} run={runOp} /></>}{panel === 'diplomacy' && empire && <><AdvisorSpeech id="diplo">{diploAdvice(empire)}</AdvisorSpeech><WorldPanel empire={empire} now={game.updatedAt} run={runOp} onRival={openRival} initial={(empire.world?.messages ?? []).some(m => !m.read) ? 'mail' : 'rank'} /></>}{panel === 'island' && empire && <IslandPanel game={game} islandName={islandOf(activeCity(empire)).name} onMiners={value => act({ type: 'miners', value })} onDonate={amount => act({ type: 'donate', amount })} onTrade={(id, side, amount) => act({ type: 'trade', id, side, amount })} />}{panel === 'island' && <ForestPanel game={game} onCommand={act} />}{panel === 'island' && <TemplePanel game={game} now={game.updatedAt} onCommand={act} />}{npc && empire && <NpcPanel empire={empire} npcId={npc} now={game.updatedAt} onSpy={count => { const e = spy(npc, count); if (e) toast.error(e); else toast.success('Casuslar yola çıktı.') }} onRaid={units => { const e = raid(npc, units); if (e) toast.error(e); else { toast.success('Ordu sefere çıktı.'); setNpc(null) } }} onOccupy={units => runOp((e, t) => dispatchRaid(e, npc, units, t, 'occupy'), 'Ordu işgale çıktı.')} onBlockade={units => runOp((e, t) => dispatchBlockade(e, npc, units, t), 'Filo ablukaya çıktı.')} run={runOp} />}{panel === 'reports' && empire && <ArmyAdvisor empire={empire} game={game} run={runOp} onArmy={() => openPanel('army')} />}{panel === 'advisor-city' && empire && <CityAdvisor empire={empire} game={game} onCity={visitCity} onBuilding={openBuilding} onCities={() => openPanel('cities')} />}{panel === 'build' && <BuildingList game={game} onSelect={openBuilding} />}{panel === 'research' && <><AdvisorSpeech id="research">{researchAdvice(game)}</AdvisorSpeech><ResearchPanel game={game} onResearch={id => act({ type: 'research', id })} /><FuturePanel game={game} onCommand={act} /></>}{panel === 'journal' && <JournalPanel game={game} />}{panel === 'economy' && <EconomyDetails game={game} />}{panel === 'objectives' && <ObjectiveCard game={game} onClaim={id => act({ type: 'claim', id })} onBuild={target} />}{panel === 'objectives' && empire && <DailyPanel empire={empire} run={runOp} />}{panel === 'settings' && <div className="settings-panel"><section><h3><HardDrive /> Cihazda kayıt</h3><p>İlerlemen otomatik kaydedilir. Tarayıcı verilerini silersen şehrin de silinir. Hesap ve bulut kaydı bu prototipte yoktur.</p>{warning && <p role="alert" className="storage-warning">{warning}</p>}</section><section><h3><Download /> Şehrin hep yanında</h3><p>{installed ? 'Oyun ana ekranından çalışıyor.' : 'Ana ekrana ekle, uygulama gibi oyna. Safari’de Paylaş → Ana Ekrana Ekle; Android’de tarayıcı menüsü → Uygulamayı yükle.'}</p>{installAvailable && <Button onClick={install}><Download data-icon="inline-start" /> Uygulamayı yükle</Button>}<p className="fine-print"><WifiOff className="size-3" />{offlineReady ? 'Çevrimdışı oyun hazır. Bu cihazda internetsiz açabilirsin.' : 'Çevrimdışı açılış, yayınlanan uygulama ilk kez tamamen yüklendiğinde hazırlanır.'}</p></section><section><h3>Yeni bir hikâye</h3><p>Şehrin, kaynakların ve araştırmaların sıfırlanır. Bu işlem geri alınamaz.</p>{confirmReset ? <div className="flex gap-3"><Button variant="destructive" onClick={() => { reset(); setConfirmReset(false); toast.success('Yeni şehrin kuruldu.') }}>Evet, şehrimi sıfırla</Button><Button variant="outline" onClick={() => setConfirmReset(false)}>Vazgeç</Button></div> : <Button variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw data-icon="inline-start" /> Yeni oyun başlat</Button>}</section></div>}</>}</IkaPage>}
    {warning && <button className="save-warning" onClick={() => openPanel('settings')}>Kayıt uyarısı · Ayrıntıları gör</button>}<Toaster theme="light" position="top-center" richColors closeButton />
  </main>
}
