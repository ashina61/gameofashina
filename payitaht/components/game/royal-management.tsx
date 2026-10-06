'use client'
import { useState, type ReactNode } from 'react'
import { asset } from '@/lib/asset'
import { BUILDINGS, MAX_LEVEL, counterSpy, spyBonus, spyCapacity, type Game } from '@/lib/game/engine'
import type { Empire } from '@/lib/game/empire'
import { ApprovedArt } from './approved-court-art'
import { CourtTabs } from './court-kit'
import { RoyalSection } from './royal-kit'
import { ScrollText } from './ui-art'
import { GameButton } from './game-button'

type ManagementTab = 'overview' | 'people' | 'administration' | 'spies' | 'development'
export function RoyalManagement({ game, empire, id, city, help, onNav, overview, people, administration, spies, development }: {
  game: Game; empire?: Empire; id: 'divan' | 'elcilik'; city: string; help: boolean
  onNav: (panel: 'research' | 'diplomacy' | 'alliance' | 'island' | 'forest' | 'people' | 'cities') => void
  overview: ReactNode; people: ReactNode; administration: ReactNode; spies: ReactNode; development: ReactNode
}) {
  const [tab, setTab] = useState<ManagementTab>('overview')
  const divan = id === 'divan'
  const items: { id: ManagementTab; label: string; Icon: typeof ScrollText }[] = divan
    ? [{ id: 'overview', label: 'Şehir', Icon: ScrollText }, { id: 'people', label: 'Halk', Icon: ScrollText }, { id: 'administration', label: 'İdare', Icon: ScrollText }, { id: 'development', label: 'Gelişim', Icon: ScrollText }]
    : [{ id: 'overview', label: 'Hariciye', Icon: ScrollText }, { id: 'spies', label: 'Casuslar', Icon: ScrollText }, { id: 'development', label: 'Gelişim', Icon: ScrollText }]
  const unread = (empire?.world?.messages ?? []).filter(m => !m.read).length
  return <div className={`management-page${divan ? ' is-divan' : ' is-embassy'}`}>
    <div className="management-scene"><img src={asset(divan ? '/images/game/ui/divan/civic-square.webp' : '/images/game/ui/divan/envoy-scene.webp')} alt={divan ? 'Divanhane önündeki Osmanlı–Ege şehir meydanı' : 'Elçilikte mektuplar ve kıyı limanına bakan hariciye odası'} width={1200} height={400} fetchPriority="high" /></div>
    <header className="management-identity"><div><small>{divan ? 'Şehrin yönetim merkezi' : 'Adalar arası ilişkiler'}</small><h2>{city || BUILDINGS[id].name}</h2></div><span>{game.buildings[id] ? `Seviye ${game.buildings[id]}` : 'Kurulmadı'}<small>En fazla {MAX_LEVEL[id]}</small></span></header>
    {help && <p className="management-intro">{BUILDINGS[id].description}</p>}
    <CourtTabs value={tab} onChange={setTab} items={items} illustrated={false} label={`${BUILDINGS[id].name} defterleri`}>
      {divan && tab === 'overview' && overview}
      {tab === 'people' && <>{people}<GameButton onClick={() => onNav('people')}>İşgücünü düzenle</GameButton></>}
      {tab === 'administration' && administration}
      {!divan && tab === 'overview' && <>
        <RoyalSection title="Hariciye defteri" art="seal" detail="Mektuplar, teklifler ve hükümdarlarla ilişkiler.">
          <p className="management-note">{unread ? `${unread} okunmamış mektubun var.` : 'Bütün mektupların okundu.'} Elçi, dış ilişkilerini kendi defterinde yürütür.</p>
          <GameButton onClick={() => onNav('diplomacy')}>Elçinin defterlerini aç</GameButton>
          <GameButton variant="outline" onClick={() => onNav('alliance')}>Birlik divanına git</GameButton>
        </RoyalSection>
        <RoyalSection title="İstihbarat" art="military" detail="Bu şehirdeki mevcut casusluk gücü.">
          <dl className="management-facts"><div><dt>Casus</dt><dd>{game.army.casus} / {spyCapacity(game)}</dd></div><div><dt>Başarı bonusu</dt><dd>+%{Math.round(spyBonus(game) * 100)}</dd></div><div><dt>Yabancı casus yakalama</dt><dd>%{Math.round(counterSpy(game) * 100)}</dd></div></dl>
          <button type="button" className="management-link" onClick={() => setTab('spies')}>Casus ocağını aç <span aria-hidden="true">›</span></button>
        </RoyalSection>
      </>}
      {tab === 'spies' && <RoyalSection title="Casus ocağı" art="military" detail="Eğitim, eğitim sırası ve şehir güvenliği.">{spies}</RoyalSection>}
      {tab === 'development' && <><div className="management-development-heading"><ApprovedArt name="construction" /><div><h3>Yapının gelişimi</h3><p>{game.buildings[id] >= MAX_LEVEL[id] ? 'En yüksek seviyeye ulaşıldı.' : `Sonraki hedef: Seviye ${game.buildings[id] + 1}`}</p></div></div>{development}</>}
    </CourtTabs>
  </div>
}
