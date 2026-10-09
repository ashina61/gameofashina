'use client'

import { Box } from './building-page'
import { GameButton } from './game-button'
import { AtlasArt } from './deep-art'
import { BUILDING_EFFECTS, contentment, type Command, type Game } from '@/lib/game/engine'
import type { Empire } from '@/lib/game/empire'
import { culturalTreaties, embassyLevel, rivalById } from '@/lib/game/rivals'
import { lutufCap } from '@/lib/game/gods'
import { SHOWS, SHOW_IDS, showLength, showCooldownMs, showFavor } from '@/lib/game/theatre'

const num = (n: number) => Math.floor(n).toLocaleString('tr-TR')
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 3600)} sa ${Math.floor(s / 60) % 60} dk ${s % 60} sn` }

export function MuseumPanel({ game, empire, onDiplomacy }: { game: Game; empire?: Empire; onDiplomacy: () => void }) {
  const level = game.buildings.muze
  const building = level * BUILDING_EFFECTS.muzeContentment * (game.research.includes('kultur') ? 1.5 : 1)
  const displayed = game.culture ?? 0
  const total = empire ? culturalTreaties(empire) : 0
  const capacity = empire ? empire.cities.reduce((n, c) => n + c.game.buildings.muze, 0) : level
  const agreements = Object.entries(empire?.world?.rivals ?? {}).filter(([, s]) => s.treaties.includes('kultur'))
  const reason = !empire ? 'İmparatorluk kaydı gerekli.' : embassyLevel(empire) < 1 ? 'Önce Elçilik kur.' : !empire.cities.some(c => c.game.research.includes('kultur')) ? 'Kültür Alışverişi araştırması gerekli.' : total >= capacity ? 'Kültür anlaşması sınırı dolu. Bir Müze’yi yükselt.' : null
  return <div className="culture-register">
    <Box title="Kültürün huzuru">
      <dl className="culture-facts">
        <div><dt>Müzenin katkısı</dt><dd>+{num(building)}</dd></div>
        <div><dt>Sergilenen anlaşmaların katkısı</dt><dd>+{num(displayed * 50)}</dd></div>
        <div><dt>Müze ve kültür toplamı</dt><dd>+{num(building + displayed * 50)}</dd></div>
        <div><dt>Şehrin toplam huzuru</dt><dd>{num(contentment(game))}</dd></div>
      </dl>
      {level < 1 && <p className="culture-reason">Bu şehirde Müze henüz kurulmadı.</p>}
      {game.research.includes('kultur') && <p className="culture-note">Kültür Alışverişi, Müzenin kendi huzur katkısını %50 artırıyor.</p>}
    </Box>
    <Box title="Kültür anlaşmaları">
      <dl className="culture-facts">
        <div><dt>Bu şehirde sergilenen</dt><dd>{displayed} / {level}</dd></div>
        <div><dt>İmparatorluk anlaşmaları</dt><dd>{total} / {capacity}</dd></div>
        <div><dt>Yeni anlaşmaya açık yer</dt><dd>{Math.max(0, capacity - total)}</dd></div>
      </dl>
      <GameButton disabled={!!reason} onClick={onDiplomacy}>Anlaşma görüşmelerine git</GameButton>
      {reason && <p className="culture-reason">{reason}</p>}
      <p className="culture-note">Her anlaşma bu şehirde +50 huzur verir; sergilenen sayı Müze seviyesiyle sınırlıdır. Anlaşmalar imparatorlukta ortak olup birden fazla şehirde sergilenebilir.</p>
      <details className="culture-help"><summary>Anlaşma defteri · {total}</summary>
        {agreements.length ? agreements.map(([id]) => { const r = rivalById(id); return <article className="culture-entry" key={id}><AtlasArt atlas="culture" index={0} size={48} /><span><strong>{r?.ruler ?? id}</strong><small>{r?.city ?? 'Şehir'} · Kültür anlaşması yürürlükte</small></span></article> }) : <p className="culture-note">Henüz kültür anlaşması yok.</p>}
        <p className="culture-note">Elçilik masrafı ve hükümdarın kabul şartları görüşme ekranında okunur. Müze yükseltmesi sergileme sınırını artırır.</p>
      </details>
    </Box>
  </div>
}

export function TheatrePanel({ game, now, onCommand }: { game: Game; now: number; onCommand: (c: Command) => void }) {
  const level = game.buildings.karagoz
  const sh = game.shows
  const active = level > 0 && sh?.active && now < sh.active.until ? sh.active : null
  const wait = Math.max(0, (sh?.readyAt ?? 0) - now)
  const hours = showLength(game) / 3600_000
  const favor = Math.min(showFavor(level), Math.max(0, lutufCap(game) - game.gods.lutuf))
  return <div className="culture-register">
    <Box title="Perdenin gündemi">
      {level < 1 ? <p className="culture-reason">Önce Karagöz Perdesi kur.</p> : active ? <>
        <p className="culture-status"><b>{SHOWS[active.id].play}</b> oynanıyor.</p>
        <p className="culture-note">{active.id === 'tanrisal' ? 'Lütuf gösteri başlarken verildi; süre boyunca yeniden eklenmez.' : SHOWS[active.id].effect(level)}</p>
        <dl className="culture-facts"><div><dt>Gösterinin kalan süresi</dt><dd>{clock(active.until - now)}</dd></div><div><dt>Yeni gösteriye kalan bekleme</dt><dd>{clock(Math.max(active.until, sh?.readyAt ?? 0) - now)}</dd></div></dl>
      </> : <p className="culture-status">{wait > 0 ? `Perde dinleniyor · ${clock(wait)}` : 'Perde hazır. Oyununu seç ve sahnele.'}</p>}
      <p className="culture-note">Gösteri {hours} saat sürer. Perdenin {showCooldownMs(level) / 3600_000} saatlik beklemesi sahneleme ile başlar.</p>
    </Box>
    <Box title="Gösteri defteri"><div className="culture-shows">{SHOW_IDS.map(id => {
      const s = SHOWS[id]
      const reason = level < 1 ? 'Önce Karagöz Perdesi kur.' : active ? 'Aynı anda tek gösteri oynar.' : wait > 0 ? `Perde dinleniyor · ${clock(wait)}` : id === 'tanrisal' && game.buildings.mabet < 1 ? 'Ongun Mabedi gerekli.' : null
      return <details className="culture-show" key={id}><summary><AtlasArt atlas="culture" index={14 + SHOW_IDS.indexOf(id)} size={56} /><span><strong>{s.name}</strong><small>{s.play}</small></span>{active?.id === id && <em>Oynanıyor</em>}</summary>
        <p className="culture-note">{id === 'tanrisal' ? `Hemen +${favor.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} lütuf; temel kazanım ${showFavor(level)}, Mabet’te boş yer ${Math.max(0, lutufCap(game) - game.gods.lutuf).toLocaleString('tr-TR', { maximumFractionDigits: 3 })}.` : `${s.effect(level)} · ${hours} saat`}</p>
        {id === 'tanrisal' && favor < showFavor(level) && <p className="culture-note">Mabet kapasitesi kazanımı sınırlıyor. Gösteri yine sahnelenebilir.</p>}
        <GameButton disabled={!!reason} onClick={() => onCommand({ type: 'show', show: id })}>{s.play} sahnele</GameButton>
        {reason && <p className="culture-reason">{reason}</p>}
      </details>
    })}</div></Box>
    <details className="culture-help"><summary>Perde nasıl işler?</summary><p className="culture-note">Seviye yükseldikçe yeniden açılış süresi kısalır; en az 12 saattir. Destanlar araştırması gösteriyi 18 saate çıkarır. Yeni gösteri için hem süren oyun bitmeli hem açılış zamanı gelmelidir. Tanrısal gösterim lütfü yalnız başlangıçta verir.</p></details>
  </div>
}
