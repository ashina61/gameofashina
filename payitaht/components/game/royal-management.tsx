'use client'
import { useState, type ReactNode } from 'react'
import { asset } from '@/lib/asset'
import { BUILDINGS, MAX_LEVEL, counterSpy, spyBonus, spyCapacity, type Game } from '@/lib/game/engine'
import type { Empire } from '@/lib/game/empire'
import { CourtTabs } from './court-kit'
import { Box } from './building-page'
import { ScrollText, Users, Landmark, Swords } from './ui-art'
import { GameButton } from './game-button'

type ManagementTab = 'overview' | 'people' | 'administration' | 'spies' | 'development'
export function RoyalManagement({ game, empire, id, city, onNav, overview, people, administration, spies, development }: {
  game: Game; empire?: Empire; id: 'divan' | 'elcilik'; city: string; help: boolean
  onNav: (panel: 'research' | 'diplomacy' | 'alliance' | 'island' | 'forest' | 'people' | 'cities') => void
  overview: ReactNode; people: ReactNode; administration: ReactNode; spies: ReactNode; development: ReactNode
}) {
  const [tab, setTab] = useState<ManagementTab>('overview')
  const divan = id === 'divan'
  const items: { id: ManagementTab; label: string; Icon: typeof ScrollText; art?: string }[] = divan
    ? [{ id: 'overview', label: 'Şehir', Icon: Landmark, art: '/images/game/icons/ui-divan.webp' }, { id: 'people', label: 'Halk', Icon: Users, art: '/images/game/icons/res-nufus.webp' }, { id: 'administration', label: 'İdare', Icon: ScrollText, art: '/images/game/icons/ui-objectives.webp' }, { id: 'development', label: 'Gelişim', Icon: ScrollText, art: '/images/game/ui/barracks/development-icon.webp' }]
    : [{ id: 'overview', label: 'Hariciye', Icon: ScrollText, art: '/images/game/icons/ui-mail.webp' }, { id: 'spies', label: 'Casuslar', Icon: Swords, art: '/images/game/units/casus.webp' }, { id: 'development', label: 'Gelişim', Icon: ScrollText, art: '/images/game/ui/barracks/development-icon.webp' }]
  const unread = (empire?.world?.messages ?? []).filter(m => !m.read).length
  return <div className={`management-page${divan ? ' is-divan' : ' is-embassy'}`}>
    <figure className="academy-banner management-scene"><img src={asset(divan ? '/images/game/ui/divan/civic-square.webp' : '/images/game/ui/divan/envoy-scene.webp')} alt={divan ? 'Divanhane önündeki Osmanlı–Ege şehir meydanı' : 'Elçilikte mektuplar ve kıyı limanına bakan hariciye odası'} width={1200} height={400} fetchPriority="high" /><figcaption>{game.buildings[id] ? `Seviye ${game.buildings[id]}` : 'Kurulmadı'} / {MAX_LEVEL[id]}</figcaption></figure>
    <CourtTabs value={tab} onChange={setTab} items={items} label={`${BUILDINGS[id].name} defterleri`}>
      {divan && tab === 'overview' && <><p className="management-city">{city}</p><GameButton onClick={() => onNav('people')}>İşgücünü düzenle</GameButton>{overview}</>}
      {tab === 'people' && <><GameButton onClick={() => onNav('people')}>İşgücünü düzenle</GameButton>{people}</>}
      {tab === 'administration' && administration}
      {!divan && tab === 'overview' && <>
        <Box title="Hariciye defteri"><p className="management-note">Mektuplar, teklifler ve hükümdarlarla ilişkiler.</p>
          <p className="management-note">{unread ? `${unread} okunmamış mektubun var.` : 'Bütün mektupların okundu.'} Elçi, dış ilişkilerini kendi defterinde yürütür.</p>
          <GameButton onClick={() => onNav('diplomacy')}>Elçinin defterlerini aç</GameButton>
          <GameButton variant="outline" onClick={() => onNav('alliance')}>Birlik divanına git</GameButton>
        </Box>
        <Box title="İstihbarat"><p className="management-note">Bu şehirdeki mevcut casusluk gücü.</p>
          <dl className="management-facts"><div><dt>Casus</dt><dd>{game.army.casus} / {spyCapacity(game)}</dd></div><div><dt>Başarı bonusu</dt><dd>+%{Math.round(spyBonus(game) * 100)}</dd></div><div><dt>Yabancı casus yakalama</dt><dd>%{Math.round(counterSpy(game) * 100)}</dd></div></dl>
          <GameButton onClick={() => setTab('spies')}>Casus ocağını aç</GameButton>
        </Box>
      </>}
      {tab === 'spies' && <div className="management-spies">{spies}</div>}
      {tab === 'development' && development}
    </CourtTabs>
  </div>
}
