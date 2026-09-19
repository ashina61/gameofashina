'use client'

import { useRef, useState } from 'react'
import { Settings2, Bell, Crown, House, Hammer, BookOpen, Download, RotateCcw, HardDrive, WifiOff, Users, Swords, X, Check, Landmark, Handshake, ChevronRight, ScrollText } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { CityScene } from './city-scene'
import { BuildingDetails, BuildingList, ResearchPanel, JournalPanel, PlotPicker, PeoplePanel, CitiesPanel, ArmyPanel, DiplomacyPanel } from './game-panels'
import { ResourceBar, ObjectiveCard, EconomyDetails, QueueCard } from './game-widgets'
import { useGame } from '@/hooks/use-game'
import { usePwa } from '@/hooks/use-pwa'
import { BUILDINGS, OBJECTIVES, activeJob, population, type BuildingId, type Command } from '@/lib/game/engine'
import { cn } from '@/lib/utils'
import { buildingImage } from '@/lib/asset'

type Panel = 'build' | 'research' | 'journal' | 'settings' | 'economy' | 'objectives' | 'people' | 'cities' | 'army' | 'diplomacy' | 'council' | null
const navigation = [
  { id: null, label: 'Şehir', icon: House },
  { id: 'people', label: 'Halk', icon: Users },
  { id: 'build', label: 'İnşa', icon: Hammer },
  { id: 'research', label: 'İlim', icon: BookOpen },
  { id: 'council', label: 'Divan', icon: Landmark },
] as const
export default function GameShell() {
  const { game, command, warning, reset, restore } = useGame()
  const { install, installAvailable, installed, offlineReady } = usePwa()
  const backupInput = useRef<HTMLInputElement>(null)
  const [pendingBackup, setPendingBackup] = useState<string | null>(null)
  function downloadBackup() {
    if (!game) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(game)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = `payitaht-${new Date().toISOString().slice(0, 10)}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function restoreBackup() {
    if (!pendingBackup) return
    try { restore(pendingBackup); setPendingBackup(null); toast.success('Şehir yedeğin yüklendi.') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Yedek okunamadı.'); setPendingBackup(null) }
  }
  const [panel, setPanel] = useState<Panel>(null)
  const [selected, setSelected] = useState<BuildingId | null>(null)
  /** Oyuncunun haritada dokundugu BOS arsa; yapi secimi buradan yapilir. */
  const [plot, setPlot] = useState<number | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
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
  function openPanel(value: Panel) { setSelected(null); setPlot(null); setMoving(null); setPanel(value); setConfirmReset(false); setPendingBackup(null); setBuildMode(false) }
  function openBuilding(id: BuildingId) { setPanel(null); setPlot(null); setMoving(null); setSelected(id) }
  function openPlot(index: number) { setPanel(null); setSelected(null); setMoving(null); setPlot(index) }
  function startMove(id: BuildingId) { if (!game) return; setPanel(null); setSelected(null); setPlot(null); setBuildMode(false); setMoving(id); setMovePlot(game.placement[id]) }
  function confirmMove() { if (moving !== null && movePlot !== null) { if (!act({ type: 'move', id: moving, plot: movePlot })) return }; setMoving(null); setMovePlot(null) }
  function cancelMove() { setMoving(null); setMovePlot(null) }
    function act(action: Command) {
    const error = command(action)
    if (error) { toast.error(error); return false }
    /*
     * Isci atamasi SESSIZ yapilir: kaydirma cubugunu her oynatista bildirim
     * cikmasi kullanilamaz hale getirirdi.
     */
    // Isci, yol ve aynalama SESSIZ: her dokunusta bildirim cikmasi kullanilamaz.
    if (action.type === 'workers' || action.type === 'road' || action.type === 'flip') return true
    if (action.type === 'move') { toast.success('Bina yeni yerine taşındı.'); return true }
    if (action.type === 'build') setBuildMode(false)
    toast.success(action.type === 'build' ? 'Ustalar iş başında. İnşaat başladı!' : action.type === 'research' ? 'Yeni bir keşfe doğru. Araştırma başladı!' : action.type === 'recruit' ? 'Talim meydanı açıldı. Eğitim başladı!' : 'Ödül hazinene eklendi.')
    return true
  }
  function target() { if (!game) return; if (game.buildings.divan < 2) openBuilding('divan'); else if (!game.buildings.medrese) openBuilding('medrese'); else openPanel('research') }
  const titles: Record<Exclude<Panel, null>, string> = { build: 'Şehrini büyüt', research: 'İlim ve keşif', journal: 'Şehir günlüğü', settings: 'Oyun ayarları', economy: 'Hazine ve üretim', objectives: 'Bir şehrin doğuşu', people: 'Şehrin halkı', cities: 'Şehirlerin', army: 'Ordu ve donanma', diplomacy: 'Diplomasi', council: 'Şehir divanı' }
  return <main className="game-shell">
    <header className="mobile-header">
      <button className="city-identity" onClick={() => openPanel('cities')} aria-label="Sahilhisar şehir bilgileri">
        <span className="city-seal"><Crown strokeWidth={1.4} /></span>
        <span><small>PAYİTAHT</small><strong>Sahilhisar <ChevronRight /></strong></span>
      </button>
      <span className="city-level">SEVİYE <b>{game?.buildings.divan ?? 1}</b></span>
      <button className="header-action" aria-label="Şehir günlüğü" onClick={() => openPanel('journal')}><Bell /></button>
      <button className="header-action" aria-label="Oyun ayarları" onClick={() => openPanel('settings')}><Settings2 /></button>
    </header>
    {game ? <><ResourceBar game={game} onSelect={() => openPanel('economy')} /><div className="game-body"><div className="city-column"><CityScene game={game} placing={buildMode || plot !== null || moving !== null} onBuilding={openBuilding} onPlot={openPlot} onRoad={cell => act({ type: 'road', cell })} moving={moving} movePlot={movePlot} onMovePlot={setMovePlot} onExitBuild={() => setBuildMode(false)} onOpenList={() => openPanel('build')} /></div></div>
      {/* TAŞIMA ONAY ŞERİDİ — referanstaki yeşil ✓/✗. */}
      {moving && <div className="move-confirm">
        <span className="move-confirm-title">{BUILDINGS[moving].name} taşınıyor</span>
        <span className="move-confirm-hint">Binayı sürükle ya da boş arsaya dokun</span>
        <div className="move-confirm-actions">
          <button className="move-cancel" onClick={cancelMove} aria-label="Vazgeç"><X /></button>
          <button className="move-ok" onClick={confirmMove} aria-label="Onayla"><Check /></button>
        </div>
      </div>}
      {!moving && !buildMode && <div className="city-bottom-hud">
        {activeJob(game) || game.study ? <div className="active-work">
          {activeJob(game) && <QueueCard game={game} kind="build" onClick={() => openBuilding(activeJob(game)!.id as BuildingId)} />}
          {game.study && <QueueCard game={game} kind="research" onClick={() => openPanel('research')} />}
        </div> : <button className="city-objective" onClick={() => openPanel('objectives')}>
          <span className="objective-seal"><ScrollText /></span>
          <span><small>{game.claimed.length === OBJECTIVES.length ? 'ŞEHRİN BÜYÜYOR' : 'SIRADAKİ HEDEF'}</small><strong>{OBJECTIVES.find(o => !game.claimed.includes(o.id))?.title ?? 'Sahilhisar’ın geleceğini şekillendir'}</strong></span>
          <ChevronRight />
        </button>}
        <div className="city-pulse"><span><i /> Şehir yaşıyor</span><button onClick={() => openPanel('people')}><Users /> {population(game)} nüfus</button></div>
      </div>}
      </> : <div className="game-loading"><img src={buildingImage('divan')} alt="" width={150} height={150} /><h1>Şehrin uyanıyor…</h1><p>Sahilhisar kapılarını açıyor.</p></div>}
    <nav className="bottom-navigation" aria-label="Oyun menüsü"><div className="nav-items">{navigation.map(item => { const Icon = item.icon; const active = item.id === 'build' ? buildMode || plot !== null || panel === 'build' : item.id === panel && !selected && !buildMode && plot === null && !moving; return <button key={item.label} className={cn('nav-item', item.id === 'build' && 'nav-build', active && 'nav-active')} aria-current={active ? 'page' : undefined} onClick={() => { if (item.id === 'build') { setPanel(null); setSelected(null); setPlot(null); setMoving(null); setBuildMode(v => !v) } else openPanel(item.id) } }><Icon strokeWidth={1.6} /><span>{item.label}</span>{active && <span className="nav-indicator" />}</button> })}</div></nav>
    <Sheet open={!!panel || !!selected || plot !== null} onOpenChange={open => { if (!open) { setPanel(null); setSelected(null); setPlot(null) } }}><SheetContent side="bottom" className="game-sheet"><SheetHeader><span className="eyebrow">PAYİTAHT ADALARI</span><SheetTitle>{selected ? BUILDINGS[selected].name : plot !== null ? 'Boş arsa' : panel ? titles[panel] : 'Şehrin'}</SheetTitle><SheetDescription>{selected ? 'Şehrine değer katan bir adım daha.' : plot !== null ? 'Bu arsaya hangi yapıyı kuracaksın?' : panel === 'build' ? 'Her yapı, yeni bir başlangıç.' : panel === 'research' ? 'İlim, şehrinin en değerli hazinesidir.' : panel === 'people' ? 'Emeği nereye ayıracağına sen karar ver.' : panel === 'army' ? 'Asker halktan çıkar. Bedelini bilerek öde.' : panel === 'cities' ? 'Hükmünün altındaki her şehir.' : panel === 'diplomacy' ? 'Komşularınla konuşmanın kapısı.' : 'Sahilhisar · Kendi hikâyeni inşa et.'}</SheetDescription></SheetHeader><div className="sheet-body">{game && <>{selected && <BuildingDetails game={game} id={selected} onBuild={id => act({ type: 'build', id })} onFlip={id => act({ type: 'flip', id })} onMove={startMove} />}{plot !== null && <PlotPicker game={game} plot={plot} onBuild={(id, at) => { if (act({ type: 'build', id, plot: at })) setPlot(null) }} />}{panel === 'people' && <PeoplePanel game={game} onAssign={(id, value) => act({ type: 'workers', id, value })} />}{panel === 'cities' && <CitiesPanel game={game} onBuilding={openBuilding} />}{panel === 'army' && <ArmyPanel game={game} onRecruit={(id, count) => act({ type: 'recruit', id, count })} onBuild={openBuilding} />}{panel === 'diplomacy' && <DiplomacyPanel game={game} onBuild={openBuilding} />}{panel === 'build' && <BuildingList game={game} onSelect={openBuilding} />}{panel === 'research' && <ResearchPanel game={game} onResearch={id => act({ type: 'research', id })} />}{panel === 'journal' && <JournalPanel game={game} />}{panel === 'economy' && <EconomyDetails game={game} />}{panel === 'objectives' && <ObjectiveCard game={game} onClaim={id => act({ type: 'claim', id })} onBuild={target} />}{panel === 'council' && <div className="council-grid">{[
      { id: 'army' as const, title: 'Ordu ve donanma', text: 'Birlikler, talim ve savunma', icon: Swords },
      { id: 'economy' as const, title: 'Hazine', text: 'Üretim ve ambar kapasitesi', icon: Crown },
      { id: 'cities' as const, title: 'Şehir yönetimi', text: 'Yapılar ve gelişim', icon: Landmark },
      { id: 'diplomacy' as const, title: 'Diplomasi', text: 'Elçilik ve ilişkiler', icon: Handshake },
      { id: 'objectives' as const, title: 'Hedefler', text: 'Şehrinin bir sonraki adımı', icon: ScrollText },
      { id: 'journal' as const, title: 'Şehir günlüğü', text: 'Tamamlanan işler ve haberler', icon: Bell },
    ].map(item => <button key={item.id} onClick={() => openPanel(item.id)}><item.icon /><span><strong>{item.title}</strong><small>{item.text}</small></span><ChevronRight /></button>)}</div>}{panel === 'settings' && <div className="settings-panel"><section><h3><HardDrive /> Cihazda kayıt</h3><p>İlerlemen otomatik kaydedilir. Tarayıcı verilerini silersen şehrin de silinir. Hesap ve bulut kaydı bu prototipte yoktur.</p>{warning && <p role="alert" className="storage-warning">{warning}</p>}</section><section><h3><Download /> Şehrin hep yanında</h3><p>{installed ? 'Oyun ana ekranından çalışıyor.' : 'Ana ekrana ekle, uygulama gibi oyna. Safari’de Paylaş → Ana Ekrana Ekle; Android’de tarayıcı menüsü → Uygulamayı yükle.'}</p>{installAvailable && <Button onClick={install}><Download data-icon="inline-start" /> Uygulamayı yükle</Button>}<p className="fine-print"><WifiOff className="size-3" />{offlineReady ? 'Çevrimdışı oyun hazır. Bu cihazda internetsiz açabilirsin.' : 'Çevrimdışı açılış, yayınlanan uygulama ilk kez tamamen yüklendiğinde hazırlanır.'}</p></section><section><h3><HardDrive /> Şehir yedeği</h3><p>Şehrini dosyaya kaydet. Başka bir cihazda aynı yedeği yükleyerek devam edebilirsin.</p><div className="backup-actions"><Button variant="outline" onClick={downloadBackup}>Yedeği indir</Button><Button variant="outline" onClick={() => backupInput.current?.click()}>Yedek yükle</Button></div><input className="sr-only" ref={backupInput} type="file" accept="application/json,.json" aria-label="Şehir yedek dosyası" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > 2_000_000) { toast.error('Yedek dosyası çok büyük.'); return }; try { setPendingBackup(await file.text()) } catch { toast.error('Dosya okunamadı.') } }} />{pendingBackup && <div className="backup-confirm"><p>Mevcut şehrin, seçtiğin yedekle değiştirilecek. Önce mevcut şehrinin yedeğini indirmeni öneririz.</p><Button onClick={restoreBackup}>Yedeği geri yükle</Button><Button variant="outline" onClick={() => setPendingBackup(null)}>Vazgeç</Button></div>}</section><section><h3>Yeni bir hikâye</h3><p>Şehrin, kaynakların ve araştırmaların sıfırlanır. Bu işlem geri alınamaz.</p>{confirmReset ? <div className="flex gap-3"><Button variant="destructive" onClick={() => { reset(); setConfirmReset(false); toast.success('Yeni şehrin kuruldu.') }}>Evet, şehrimi sıfırla</Button><Button variant="outline" onClick={() => setConfirmReset(false)}>Vazgeç</Button></div> : <Button variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw data-icon="inline-start" /> Yeni oyun başlat</Button>}</section></div>}</>}</div></SheetContent></Sheet>
    {warning && <button className="save-warning" onClick={() => openPanel('settings')}>Kayıt uyarısı · Ayrıntıları gör</button>}<Toaster theme="dark" position="top-center" richColors closeButton />
  </main>
}
