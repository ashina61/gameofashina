'use client'

import { useState } from 'react'
import { MoonStar, Settings2, Bell, Crown, House, Hammer, BookOpen, Ship, ScrollText, ShieldCheck, Download, RotateCcw, HardDrive, WifiOff, Users, Sprout, Swords, Skull, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { CityScene } from './city-scene'
import { BuildingDetails, BuildingList, ResearchPanel, JournalPanel, PlotPicker, PeoplePanel, CitiesPanel, ArmyPanel, DiplomacyPanel } from './game-panels'
import { ResourceBar, ObjectiveCard, EconomyDetails, AdvisorBar } from './game-widgets'
import { useGame } from '@/hooks/use-game'
import { usePwa } from '@/hooks/use-pwa'
import { BUILDINGS, cityDefense, contentment, idleWorkers, might, population, soldiers, formatNumber, type BuildingId, type Command } from '@/lib/game/engine'
import { cn } from '@/lib/utils'
import { buildingImage } from '@/lib/asset'
import { activeCity, type IslandId } from '@/lib/game/empire'
import type { Resource } from '@/lib/game/engine'

type Panel = 'build' | 'research' | 'journal' | 'settings' | 'economy' | 'objectives' | 'people' | 'cities' | 'army' | 'diplomacy' | null
/*
 * ALT MENU DORT OGE.
 *
 * Bes ogeyi tam genislige yaymak, ekranin altindan bir serit kesiyordu.
 * Referansta alt menu ekranin yarisi kadar, ORTADA duran kucuk bir hap.
 * Gunluk, zaten bildirim dugmesi olan can kulaginin arkasina tasindi.
 */
const navigation = [
  { id: null, label: 'Şehir', icon: House },
  { id: 'build', label: 'İnşa', icon: Hammer },
  { id: 'army', label: 'Kışla', icon: Swords },
  { id: 'research', label: 'Araştırma', icon: BookOpen },
  { id: 'cities', label: 'Ticaret', icon: Ship },
  { id: 'objectives', label: 'Görevler', icon: ScrollText },
] as const
export default function GameShell() {
  const { game, empire, command, selectCity, colonize, sendCargo, warning, reset } = useGame()
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
  function openPanel(value: Panel) { setSelected(null); setPlot(null); setMoving(null); setPanel(value); setConfirmReset(false); setBuildMode(false) }
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
    if (action.type === 'workers' || action.type === 'road' || action.type === 'flip') return
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
  function dispatchCargo(to: string, resource: Resource, amount: number) {
    const error = sendCargo(to, resource, amount)
    if (error) { toast.error(error); return }
    toast.success('Nakliye gemileri yola çıktı.')
  }
  function target() { if (!game) return; if (game.buildings.divan < 2) openBuilding('divan'); else if (!game.buildings.medrese) openBuilding('medrese'); else openPanel('research') }
  const titles: Record<Exclude<Panel, null>, string> = { build: 'Şehrini büyüt', research: 'İlim ve keşif', journal: 'Şehir günlüğü', settings: 'Oyun ayarları', economy: 'Hazine ve üretim', objectives: 'Bir şehrin doğuşu', people: 'Şehrin halkı', cities: 'Şehirlerin', army: 'Ordu ve donanma', diplomacy: 'Diplomasi' }
  return <main className="game-shell">
    <div className="imperial-brand" aria-hidden="true">Payitaht</div>
    {/*
      * OYUNCU KARTI, sol ustte yuzer.
      *
      * Eskiden burada tam genislikte bir baslik seridi vardi ve altinda yine
      * tam genislikte bir kaynak seridi: ikisi ekranin %16'sini yiyordu ve
      * dunyayi bir bant gibi kesiyordu. Referans oyunlarin hepsinde arayuz
      * KOSELERDE yuzen kutulardir; dunya kenardan kenara gorunur.
      */}
    <div className="player-card">
      <button className="player-face" onClick={() => openPanel('objectives')} aria-label="Şehir hedefleri">
        <Crown strokeWidth={1.5} />
        <span>{game?.buildings.divan ?? 1}</span>
      </button>
      <div className="player-copy">
        <strong>{currentCityName}</strong>
        <span>{game ? `${population(game)} nüfus · ${game.claimed.length}/3 hedef` : 'Şehrin uyanıyor'}</span>
      </div>
      {game && <button className="player-power" onClick={() => openPanel('army')} aria-label={`Şehir gücü ${formatNumber(might(game))}`}><Swords aria-hidden="true" /><span>{formatNumber(might(game))}</span></button>}
      <button className="player-icon" aria-label="Şehir bildirimleri" onClick={() => openPanel('journal')}><Bell /><i /></button>
      <button className="player-icon" aria-label="Oyun ayarları" onClick={() => openPanel('settings')}><Settings2 /></button>
    </div>
    {game ? <><ResourceBar game={game} onSelect={() => openPanel('economy')} /><AdvisorBar game={game} active={panel} onSelect={openPanel} /><div className="game-body"><div className="city-column"><CityScene key={empire?.activeCityId} game={game} placing={buildMode || plot !== null || moving !== null} onBuilding={openBuilding} onPlot={openPlot} onRoad={cell => act({ type: 'road', cell })} moving={moving} movePlot={movePlot} onMovePlot={setMovePlot} onExitBuild={() => setBuildMode(false)} onOpenList={() => openPanel('build')} /></div></div>
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
      <div className="side-actions">
        <button className="side-action side-threat" onClick={() => openPanel('army')} aria-label="Ordu ve tehditler"><Skull aria-hidden="true" /></button>
        <button className={cn('side-action side-build', buildMode && 'side-active')} onClick={() => { setPanel(null); setSelected(null); setPlot(null); setBuildMode(v => !v) }} aria-label="İnşa kipi"><Hammer aria-hidden="true" /></button>
      </div>
      {/* ALT LOG ŞERİDİ — referanstaki sohbet gibi, en son şehir günlüğü satırı. */}
      <button className="hud-ticker" onClick={() => openPanel('journal')} aria-label="Şehir günlüğü">
        <span className="hud-ticker-tag">GÜNLÜK</span>
        <span className="hud-ticker-text">{game.log[0]?.text ?? `${currentCityName} sessiz.`}</span>
      </button></> : <div className="game-loading"><img src={buildingImage('divan', 8)} alt="" width={150} height={150} /><h1>Şehrin uyanıyor…</h1><p>Sahilhisar kapılarını açıyor.</p></div>}
    <nav className="bottom-navigation" aria-label="Oyun menüsü"><div className="nav-items">{navigation.map(item => { const Icon = item.icon; const active = item.id === 'build' ? buildMode : item.id === panel && !selected; return <button key={item.label} className={cn('nav-item', active && 'nav-active')} aria-current={active ? 'page' : undefined} onClick={() => { if (item.id === 'build') { setPanel(null); setSelected(null); setPlot(null); setBuildMode(v => !v) } else openPanel(item.id) } }><Icon strokeWidth={1.6} /><span>{item.label}</span>{active && <span className="nav-indicator" />}</button> })}</div></nav>
    <Sheet open={!!panel || !!selected || plot !== null} onOpenChange={open => { if (!open) { setPanel(null); setSelected(null); setPlot(null) } }}><SheetContent side="bottom" className="game-sheet"><SheetHeader><span className="eyebrow">PAYİTAHT ADALARI</span><SheetTitle>{selected ? BUILDINGS[selected].name : plot !== null ? 'Boş arsa' : panel ? titles[panel] : 'Şehrin'}</SheetTitle><SheetDescription>{selected ? 'Şehrine değer katan bir adım daha.' : plot !== null ? 'Bu arsaya hangi yapıyı kuracaksın?' : panel === 'build' ? 'Her yapı, yeni bir başlangıç.' : panel === 'research' ? 'İlim, şehrinin en değerli hazinesidir.' : panel === 'people' ? 'Emeği nereye ayıracağına sen karar ver.' : panel === 'army' ? 'Asker halktan çıkar. Bedelini bilerek öde.' : panel === 'cities' ? 'Hükmünün altındaki her şehir.' : panel === 'diplomacy' ? 'Komşularınla konuşmanın kapısı.' : `${currentCityName} · Kendi hikâyeni inşa et.`}</SheetDescription></SheetHeader><div className="sheet-body">{game && <>{selected && <BuildingDetails game={game} id={selected} onBuild={id => act({ type: 'build', id })} onFlip={id => act({ type: 'flip', id })} onMove={startMove} />}{plot !== null && <PlotPicker game={game} plot={plot} onBuild={(id, at) => { act({ type: 'build', id, plot: at }); setPlot(null) }} />}{panel === 'people' && <PeoplePanel game={game} onAssign={(id, value) => act({ type: 'workers', id, value })} />}{panel === 'cities' && empire && <CitiesPanel game={game} empire={empire} onBuilding={openBuilding} onSelectCity={visitCity} onColonize={foundIsland} onCargo={dispatchCargo} />}{panel === 'army' && <ArmyPanel game={game} onRecruit={(id, count) => act({ type: 'recruit', id, count })} onBuild={openBuilding} />}{panel === 'diplomacy' && <DiplomacyPanel game={game} onBuild={openBuilding} />}{panel === 'build' && <BuildingList game={game} onSelect={openBuilding} />}{panel === 'research' && <ResearchPanel game={game} onResearch={id => act({ type: 'research', id })} />}{panel === 'journal' && <JournalPanel game={game} />}{panel === 'economy' && <EconomyDetails game={game} />}{panel === 'objectives' && <ObjectiveCard game={game} onClaim={id => act({ type: 'claim', id })} onBuild={target} />}{panel === 'settings' && <div className="settings-panel"><section><h3><HardDrive /> Cihazda kayıt</h3><p>İlerlemen otomatik kaydedilir. Tarayıcı verilerini silersen şehrin de silinir. Hesap ve bulut kaydı bu prototipte yoktur.</p>{warning && <p role="alert" className="storage-warning">{warning}</p>}</section><section><h3><Download /> Şehrin hep yanında</h3><p>{installed ? 'Oyun ana ekranından çalışıyor.' : 'Ana ekrana ekle, uygulama gibi oyna. Safari’de Paylaş → Ana Ekrana Ekle; Android’de tarayıcı menüsü → Uygulamayı yükle.'}</p>{installAvailable && <Button onClick={install}><Download data-icon="inline-start" /> Uygulamayı yükle</Button>}<p className="fine-print"><WifiOff className="size-3" />{offlineReady ? 'Çevrimdışı oyun hazır. Bu cihazda internetsiz açabilirsin.' : 'Çevrimdışı açılış, yayınlanan uygulama ilk kez tamamen yüklendiğinde hazırlanır.'}</p></section><section><h3>Yeni bir hikâye</h3><p>Şehrin, kaynakların ve araştırmaların sıfırlanır. Bu işlem geri alınamaz.</p>{confirmReset ? <div className="flex gap-3"><Button variant="destructive" onClick={() => { reset(); setConfirmReset(false); toast.success('Yeni şehrin kuruldu.') }}>Evet, şehrimi sıfırla</Button><Button variant="outline" onClick={() => setConfirmReset(false)}>Vazgeç</Button></div> : <Button variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw data-icon="inline-start" /> Yeni oyun başlat</Button>}</section></div>}</>}</div></SheetContent></Sheet>
    {warning && <button className="save-warning" onClick={() => openPanel('settings')}>Kayıt uyarısı · Ayrıntıları gör</button>}<Toaster theme="dark" position="top-center" richColors closeButton />
  </main>
}
