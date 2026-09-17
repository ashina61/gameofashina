'use client'

import { useState } from 'react'
import { MoonStar, Settings2, Bell, Crown, House, Hammer, BookOpen, ScrollText, ShieldCheck, ChevronRight, Sparkles, Download, RotateCcw, HardDrive, WifiOff, Users, Sprout } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { CityScene } from './city-scene'
import { BuildingDetails, BuildingList, ResearchPanel, JournalPanel, PlotPicker, PeoplePanel, CitiesPanel, ArmyPanel, DiplomacyPanel } from './game-panels'
import { ResourceBar, QueueCard, ObjectiveCard, EconomyDetails, AdvisorBar } from './game-widgets'
import { useGame } from '@/hooks/use-game'
import { usePwa } from '@/hooks/use-pwa'
import { BUILDINGS, activeJob, cityDefense, contentment, idleWorkers, population, soldiers, type BuildingId, type Command } from '@/lib/game/engine'
import { cn } from '@/lib/utils'
import { buildingImage } from '@/lib/asset'

type Panel = 'build' | 'research' | 'journal' | 'settings' | 'economy' | 'objectives' | 'people' | 'cities' | 'army' | 'diplomacy' | null
const navigation = [{ id: null, label: 'Şehrim', icon: House }, { id: 'build', label: 'İnşa', icon: Hammer }, { id: 'people', label: 'Halk', icon: Users }, { id: 'research', label: 'Araştırma', icon: BookOpen }, { id: 'journal', label: 'Günlük', icon: ScrollText }] as const
export default function GameShell() {
  const { game, command, warning, reset } = useGame()
  const { install, installAvailable, installed, offlineReady } = usePwa()
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
  function openPanel(value: Panel) { setSelected(null); setPlot(null); setPanel(value); setConfirmReset(false); setBuildMode(false) }
  function openBuilding(id: BuildingId) { setPanel(null); setPlot(null); setSelected(id) }
  function openPlot(index: number) { setPanel(null); setSelected(null); setPlot(index) }
    function act(action: Command) {
    const error = command(action)
    if (error) { toast.error(error); return }
    /*
     * Isci atamasi SESSIZ yapilir: kaydirma cubugunu her oynatista bildirim
     * cikmasi kullanilamaz hale getirirdi.
     */
    if (action.type === 'workers') return
    if (action.type === 'build') setBuildMode(false)
    toast.success(action.type === 'build' ? 'Ustalar iş başında. İnşaat başladı!' : action.type === 'research' ? 'Yeni bir keşfe doğru. Araştırma başladı!' : action.type === 'recruit' ? 'Talim meydanı açıldı. Eğitim başladı!' : 'Ödül hazinene eklendi.')
  }
  function target() { if (!game) return; if (game.buildings.divan < 2) openBuilding('divan'); else if (!game.buildings.medrese) openBuilding('medrese'); else openPanel('research') }
  const titles: Record<Exclude<Panel, null>, string> = { build: 'Şehrini büyüt', research: 'İlim ve keşif', journal: 'Şehir günlüğü', settings: 'Oyun ayarları', economy: 'Hazine ve üretim', objectives: 'Bir şehrin doğuşu', people: 'Şehrin halkı', cities: 'Şehirlerin', army: 'Ordu ve donanma', diplomacy: 'Diplomasi' }
  return <main className="game-shell">
    <header className="game-header"><a className="brand" href="/" aria-label="Payitaht Adaları ana ekran"><span className="brand-mark"><MoonStar strokeWidth={1.15} /></span><span>PAYİTAHT<small>A D A L A R I</small></span></a><span className="desktop-header-caption">Kendi hikâyeni inşa et.</span><div className="header-actions"><span className="prototype-label"><span className="live-dot" /> YEREL PROTOTİP</span><button aria-label="Şehir bildirimleri" onClick={() => openPanel('journal')} className="header-icon notification-button"><Bell /><span /></button><button aria-label="Oyun ayarları" onClick={() => openPanel('settings')} className="header-icon"><Settings2 /></button><button className="player-avatar" onClick={() => openPanel('objectives')} aria-label="Şehir hedefleri"><Crown strokeWidth={1.5} /><span>{game?.buildings.divan ?? 1}</span></button></div></header>
    {game ? <><ResourceBar game={game} onSelect={() => openPanel('economy')} /><AdvisorBar game={game} active={panel} onSelect={openPanel} /><div className="game-body"><div className="city-column"><CityScene game={game} placing={buildMode || plot !== null} onBuilding={openBuilding} onPlot={openPlot} onExitBuild={() => setBuildMode(false)} onOpenList={() => openPanel('build')} /><button className="mobile-objective" onClick={() => openPanel('objectives')}><span className="objective-emblem"><Sparkles /></span><span><strong>Bir şehrin doğuşu</strong><small>{game.claimed.length === 3 ? 'Tüm başlangıç hedefleri tamamlandı' : 'Büyük bir hikâye, küçük bir adımla başlar.'}</small></span><span className="objective-count">{game.claimed.length}/3</span><ChevronRight className="size-4" /></button><div className="queue-bar"><QueueCard game={game} kind="build" onClick={() => { const job = activeJob(game); return job ? openBuilding(job.id as BuildingId) : openPanel('build') }} /><QueueCard game={game} kind="research" onClick={() => openPanel('research')} /></div></div><aside className="city-sidebar"><div className="sidebar-heading"><span className="eyebrow">ŞEHİR REHBERİ</span><Sparkles className="size-4 text-primary" aria-hidden="true" /></div><div className="welcome-block"><span className="welcome-icon"><Crown /></span><h2>Hoş geldin, Beyim.</h2><p>Bir kıyı kasabası bugün.<br />Bir medeniyet yarın.</p></div><ObjectiveCard game={game} onClaim={id => act({ type: 'claim', id })} onBuild={target} /><div className="city-status"><span className="eyebrow">ŞEHRİNİN NABZI</span><div><Users /><span>Nüfus</span><strong>{population(game)}</strong></div><div><Sprout /><span>Boşta halk</span><strong>{idleWorkers(game)}</strong></div><div><Users /><span>Huzur</span><strong>{contentment(game)}</strong></div><div><Users /><span>Asker</span><strong>{soldiers(game)}</strong></div><div><ShieldCheck /><span>Savunma</span><strong>{cityDefense(game)}</strong></div></div><div className="sidebar-bottom"><HardDrive /><span>Hikâyen bu cihazda saklanır.<small>Çevrimdışı üretim · En fazla 8 saat</small></span></div></aside></div></> : <div className="game-loading"><img src={buildingImage('divan')} alt="" width={150} height={150} /><h1>Şehrin uyanıyor…</h1><p>Sahilhisar kapılarını açıyor.</p></div>}
    <nav className="bottom-navigation" aria-label="Oyun menüsü"><div className="nav-items">{navigation.map(item => { const Icon = item.icon; const active = item.id === 'build' ? buildMode : item.id === panel && !selected; return <button key={item.label} className={cn('nav-item', active && 'nav-active')} aria-current={active ? 'page' : undefined} onClick={() => { if (item.id === 'build') { setPanel(null); setSelected(null); setPlot(null); setBuildMode(v => !v) } else openPanel(item.id) } }><Icon strokeWidth={1.6} /><span>{item.label}</span>{active && <span className="nav-indicator" />}</button> })}</div><span className="desktop-footer-note"><ShieldCheck className="size-3" /> SENİN ŞEHRİN. SENİN HİKÂYEN.</span></nav>
    <Sheet open={!!panel || !!selected || plot !== null} onOpenChange={open => { if (!open) { setPanel(null); setSelected(null); setPlot(null) } }}><SheetContent side="bottom" className="game-sheet"><SheetHeader><span className="eyebrow">PAYİTAHT ADALARI</span><SheetTitle>{selected ? BUILDINGS[selected].name : plot !== null ? 'Boş arsa' : panel ? titles[panel] : 'Şehrin'}</SheetTitle><SheetDescription>{selected ? 'Şehrine değer katan bir adım daha.' : plot !== null ? 'Bu arsaya hangi yapıyı kuracaksın?' : panel === 'build' ? 'Her yapı, yeni bir başlangıç.' : panel === 'research' ? 'İlim, şehrinin en değerli hazinesidir.' : panel === 'people' ? 'Emeği nereye ayıracağına sen karar ver.' : panel === 'army' ? 'Asker halktan çıkar. Bedelini bilerek öde.' : panel === 'cities' ? 'Hükmünün altındaki her şehir.' : panel === 'diplomacy' ? 'Komşularınla konuşmanın kapısı.' : 'Sahilhisar · Kendi hikâyeni inşa et.'}</SheetDescription></SheetHeader><div className="sheet-body">{game && <>{selected && <BuildingDetails game={game} id={selected} onBuild={id => act({ type: 'build', id })} />}{plot !== null && <PlotPicker game={game} plot={plot} onBuild={(id, at) => { act({ type: 'build', id, plot: at }); setPlot(null) }} />}{panel === 'people' && <PeoplePanel game={game} onAssign={(id, value) => act({ type: 'workers', id, value })} />}{panel === 'cities' && <CitiesPanel game={game} onBuilding={openBuilding} />}{panel === 'army' && <ArmyPanel game={game} onRecruit={(id, count) => act({ type: 'recruit', id, count })} onBuild={openBuilding} />}{panel === 'diplomacy' && <DiplomacyPanel game={game} onBuild={openBuilding} />}{panel === 'build' && <BuildingList game={game} onSelect={openBuilding} />}{panel === 'research' && <ResearchPanel game={game} onResearch={id => act({ type: 'research', id })} />}{panel === 'journal' && <JournalPanel game={game} />}{panel === 'economy' && <EconomyDetails game={game} />}{panel === 'objectives' && <ObjectiveCard game={game} onClaim={id => act({ type: 'claim', id })} onBuild={target} />}{panel === 'settings' && <div className="settings-panel"><section><h3><HardDrive /> Cihazda kayıt</h3><p>İlerlemen otomatik kaydedilir. Tarayıcı verilerini silersen şehrin de silinir. Hesap ve bulut kaydı bu prototipte yoktur.</p>{warning && <p role="alert" className="storage-warning">{warning}</p>}</section><section><h3><Download /> Şehrin hep yanında</h3><p>{installed ? 'Oyun ana ekranından çalışıyor.' : 'Ana ekrana ekle, uygulama gibi oyna. Safari’de Paylaş → Ana Ekrana Ekle; Android’de tarayıcı menüsü → Uygulamayı yükle.'}</p>{installAvailable && <Button onClick={install}><Download data-icon="inline-start" /> Uygulamayı yükle</Button>}<p className="fine-print"><WifiOff className="size-3" />{offlineReady ? 'Çevrimdışı oyun hazır. Bu cihazda internetsiz açabilirsin.' : 'Çevrimdışı açılış, yayınlanan uygulama ilk kez tamamen yüklendiğinde hazırlanır.'}</p></section><section><h3>Yeni bir hikâye</h3><p>Şehrin, kaynakların ve araştırmaların sıfırlanır. Bu işlem geri alınamaz.</p>{confirmReset ? <div className="flex gap-3"><Button variant="destructive" onClick={() => { reset(); setConfirmReset(false); toast.success('Yeni şehrin kuruldu.') }}>Evet, şehrimi sıfırla</Button><Button variant="outline" onClick={() => setConfirmReset(false)}>Vazgeç</Button></div> : <Button variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw data-icon="inline-start" /> Yeni oyun başlat</Button>}</section></div>}</>}</div></SheetContent></Sheet>
    {warning && <button className="save-warning" onClick={() => openPanel('settings')}>Kayıt uyarısı · Ayrıntıları gör</button>}<Toaster theme="dark" position="top-center" richColors closeButton />
  </main>
}
