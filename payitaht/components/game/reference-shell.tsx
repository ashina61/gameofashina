'use client'

import type { ReactNode } from 'react'
import type { Empire } from '@/lib/game/empire'
import { activeCity } from '@/lib/game/empire'
import { luxuryIcons } from './game-widgets'
import { AkceArt, IlimArt, KeresteArt, NufusArt } from './resource-art'
import { Bell, BookOpen, Castle, Coins, Flag, Mail, Settings, Shield, Ship, Swords, TreePalm, Trophy, Users } from './ui-art'

type Active = 'profile' | 'settings'

function compact(value: number) {
  const n = Math.max(0, Math.floor(value))
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.0', '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace('.0', '')}K`
  return n.toLocaleString('tr-TR')
}

export function ReferenceShell({ empire, active, children, onCity, onProfile, onSettings }: {
  empire?: Empire
  active: Active
  children: ReactNode
  onCity?: () => void
  onProfile?: () => void
  onSettings?: () => void
}) {
  const game = empire ? activeCity(empire).game : undefined
  const luxury = game?.mine.specialty
  const LuxuryIcon = luxury ? luxuryIcons[luxury] : Coins
  const resources = game ? [
    { key: 'gold', value: compact(game.resources.gold), icon: <AkceArt />, label: 'Akçe' },
    { key: 'wood', value: compact(game.resources.wood), icon: <KeresteArt />, label: 'Kereste' },
    { key: 'knowledge', value: compact(game.resources.knowledge), icon: <IlimArt />, label: 'İlim' },
    { key: 'luxury', value: compact(game.luxury[luxury!]), icon: <LuxuryIcon />, label: 'Lüks kaynak' },
    { key: 'population', value: compact(game.citizens ?? 0), icon: <NufusArt />, label: 'Nüfus' },
  ] : [
    { key: 'gold', value: '1.2M', icon: <AkceArt />, label: 'Akçe' },
    { key: 'wood', value: '850K', icon: <KeresteArt />, label: 'Kereste' },
    { key: 'knowledge', value: '640K', icon: <IlimArt />, label: 'İlim' },
    { key: 'luxury', value: '320K', icon: <Coins />, label: 'Lüks kaynak' },
    { key: 'population', value: '4.850', icon: <NufusArt />, label: 'Nüfus' },
  ]

  const items = [
    { key: 'city', label: 'Şehir', icon: <Castle painted />, action: onCity },
    { key: 'islands', label: 'Adalar', icon: <TreePalm painted /> },
    { key: 'army', label: 'Ordu', icon: <Swords /> },
    { key: 'research', label: 'Araştırma', icon: <BookOpen /> },
    { key: 'diplomacy', label: 'Diplomasi', icon: <Users /> },
    { key: 'market', label: 'Pazar', icon: <Coins /> },
    { key: 'alliance', label: 'İttifak', icon: <Shield painted /> },
    { key: 'messages', label: 'Mesajlar', icon: <Mail /> },
    { key: 'profile', label: 'Profil', icon: <Flag painted />, action: onProfile, selected: active === 'profile' },
    { key: 'ranking', label: 'Sıralama', icon: <Trophy /> },
  ]

  return <div className="ref-os-shell" data-active={active}>
    <aside className="ref-os-sidebar" aria-label="Payitaht menüsü">
      <div className="ref-os-brand"><Castle painted /><strong>PAYİTAHT</strong><small>ADALARI</small></div>
      <nav>{items.map(item => <button type="button" key={item.key} className={item.selected ? 'is-active' : undefined} onClick={item.action} aria-current={item.selected ? 'page' : undefined}>{item.icon}<span>{item.label}</span></button>)}</nav>
    </aside>

    <header className="ref-os-topbar">
      <div className="ref-os-resources" aria-label="Kaynaklar">{resources.map(resource => <span key={resource.key} title={resource.label}><i>{resource.icon}</i><b>{resource.value}</b></span>)}</div>
      <div className="ref-os-tools" aria-label="Hızlı işlemler"><button type="button" aria-label="Mesajlar"><Mail /></button><button type="button" aria-label="Bildirimler"><Bell /></button><button type="button" aria-label="Ayarlar" className={active === 'settings' ? 'is-active' : undefined} onClick={onSettings}><Settings /></button></div>
    </header>

    <main className="ref-os-main"><div className="ref-os-parchment"><div className="ref-os-content-scroll">{children}</div></div></main>
  </div>
}
