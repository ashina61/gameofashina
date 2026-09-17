'use client'

import { SLOTS, COLS, ROWS, TILE_W, TILE_H, QUAY_Y, DRAWN_PAD, cellCenter, cityBounds, cityOutline, diamond, polygon } from '@/lib/game/layout'
import type { Game } from '@/lib/game/engine'

/*
 * ŞEHİR ZEMİNİ.
 *
 * Arsalar, sokaklar, surlar ve rihtim BURADA cizilir - arkaplan resminde
 * degil. Tek bir SVG, tuvalin yuzdeleriyle ayni koordinat sisteminde
 * (viewBox 0 0 100 100) durur, yani binalarla PIKSEL PIKSEL ayni izgarayi
 * paylasir. Hizalama sorunu, hizalanacak iki ayri gercek olmadigi icin yok.
 *
 * Vektor secilmesinin nedeni yalnizca keskinlik degil: sur seviyesi
 * degistiginde ya da izgaraya bir sira eklendiginde yeni bir resim
 * gerekmemesi.
 */

/** Surun seviyeye gore kalinligi (tuval yuzdesi). */
const wallThickness = (level: number) => 1.1 + level * 0.38

/*
 * SOKAKLAR.
 *
 * Karolarin arasindaki bosluk zaten sokaktir, ama bos birakildiginda duzluk
 * karton gibi goruruyordu. Seritler o boslugu GORUNUR kilar: sehir bir
 * duzlukten cok bir PLANA benzer. Konumlari izgaradan turer - sutun ya da
 * satir eklendiginde sokaklar da kendiliginden gelir.
 */
const STREET_W = 2.6
const streets = (() => {
  const b = cityBounds()
  const vertical = Array.from({ length: COLS - 1 }, (_, c) => (cellCenter(c, 0).x + cellCenter(c + 1, 0).x) / 2)
  const horizontal = Array.from({ length: ROWS - 1 }, (_, r) => (cellCenter(0, r).y + cellCenter(0, r + 1).y) / 2)
  return { vertical, horizontal, bounds: b }
})()

export function CityGround({ game }: { game: Game }) {
  const platform = cityOutline(DRAWN_PAD.platform)
  const walls = game.buildings.surlar
  const wallInner = cityOutline(DRAWN_PAD.wallInner)
  const wallOuter = cityOutline(DRAWN_PAD.wallInner + wallThickness(walls))
  const cityPlots = SLOTS.filter(slot => slot.zone === 'sehir')
  const quays = SLOTS.filter(slot => slot.zone === 'liman')
  const occupied = new Set(Object.values(game.placement).filter((p): p is number => p !== null))
  // Burclar sekizgenin kirpilmis dort kosesinde; kapi limana bakan kenarda.
  const towers = [wallOuter[2], wallOuter[3], wallOuter[6], wallOuter[7]]
  const gate = { x: 50, y: wallOuter[4].y }

  return <svg className="city-ground" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="cg-platform" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a49a72" /><stop offset="100%" stopColor="#7f7752" />
      </linearGradient>
      <linearGradient id="cg-pad" x1="0" y1="0" x2=".35" y2="1">
        <stop offset="0%" stopColor="#e3d3a8" /><stop offset="100%" stopColor="#b6a076" />
      </linearGradient>
      <linearGradient id="cg-pad-free" x1="0" y1="0" x2=".35" y2="1">
        <stop offset="0%" stopColor="#c3b78f" /><stop offset="100%" stopColor="#9a9070" />
      </linearGradient>
      <linearGradient id="cg-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e6dabb" /><stop offset="45%" stopColor="#c0b18c" /><stop offset="100%" stopColor="#867a5d" />
      </linearGradient>
      <linearGradient id="cg-quay" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c2b492" /><stop offset="100%" stopColor="#8d8166" />
      </linearGradient>
    </defs>

    {/* Sehrin uzerinde durdugu duzluk. */}
    <polygon points={polygon(platform)} fill="url(#cg-platform)" stroke="#5f5940" strokeWidth=".4" />
    <polygon points={polygon(cityOutline(2))} fill="none" stroke="#6d6549" strokeWidth=".3" opacity=".55" />

    {/* Sokak agi. Ortadaki dusey sokak kapiya ve limana baglanir. */}
    <g className="city-streets">
      {streets.vertical.map(x => <rect key={`v${x}`} x={x - STREET_W / 2} y={streets.bounds.top - 2.5}
        width={STREET_W} height={streets.bounds.bottom - streets.bounds.top + 5} fill="#b5ab85" opacity=".55" />)}
      {streets.horizontal.map(y => <rect key={`h${y}`} x={streets.bounds.left - 2.5} y={y - STREET_W / 2}
        width={streets.bounds.right - streets.bounds.left + 5} height={STREET_W} fill="#b5ab85" opacity=".55" />)}
    </g>

    {/* Rihtim: yamactan ayri, denize uzanan tas bir dil. */}
    <polygon
      points={polygon([
        { x: quays[0].x - TILE_W / 2 - 3, y: QUAY_Y - TILE_H / 2 - 3 },
        { x: quays[quays.length - 1].x + TILE_W / 2 + 3, y: QUAY_Y - TILE_H / 2 - 3 },
        { x: quays[quays.length - 1].x + TILE_W / 2 - 1, y: QUAY_Y + TILE_H / 2 + 3.5 },
        { x: quays[0].x - TILE_W / 2 + 1, y: QUAY_Y + TILE_H / 2 + 3.5 },
      ])}
      fill="url(#cg-quay)" stroke="#5f5940" strokeWidth=".4" />
    {/* Sehri limana baglayan yol. */}
    <polygon points={polygon([
      { x: 45.5, y: platform[5].y - 1 }, { x: 54.5, y: platform[5].y - 1 },
      { x: 56.5, y: QUAY_Y - TILE_H / 2 - 2.5 }, { x: 43.5, y: QUAY_Y - TILE_H / 2 - 2.5 },
    ])} fill="#9a9070" stroke="#5f5940" strokeWidth=".3" />

    {/*
      * SURLAR.
      *
      * Iki cokgen ve evenodd ile HALKA: ici bos kalir, sehir gorunur. Seviye
      * arttikca dis cokgen disari acilir, yani sur KALINLASIR - oyuncu
      * savunmasinin buyudugunu sayidan once siluetten anlar.
      */}
    {walls > 0 && <g className="city-walls">
      <path d={`M${polygon(wallOuter).replace(/ /g, 'L')}Z M${polygon(wallInner).replace(/ /g, 'L')}Z`}
        fillRule="evenodd" fill="url(#cg-wall)" stroke="#6b6049" strokeWidth=".35" />
      {towers.map((tower, i) => <g key={i}>
        <polygon points={diamond(tower.x, tower.y + 0.8, 6.2, 3.1)} fill="#9c8f6f" stroke="#5d543f" strokeWidth=".3" />
        <polygon points={diamond(tower.x, tower.y - 1.4, 6.2, 3.1)} fill="#e6dabb" stroke="#5d543f" strokeWidth=".3" />
      </g>)}
      <g>
        <polygon points={diamond(gate.x, gate.y, 8.5, 4.2)} fill="#9c8f6f" stroke="#5d543f" strokeWidth=".3" />
        <path d={`M${gate.x - 2},${gate.y + 0.8} v-1.4 a2,2.2 0 0 1 4,0 v1.4 z`} fill="#3f3828" />
      </g>
    </g>}

    {/* Arsalar. Dolu olan tas doseli, bos olan kesik cizgili ve daha sonuk. */}
    {cityPlots.map(slot => <polygon
      key={slot.index}
      points={diamond(slot.x, slot.y)}
      fill={occupied.has(slot.index) ? 'url(#cg-pad)' : 'url(#cg-pad-free)'}
      stroke={occupied.has(slot.index) ? '#6f5f44' : '#6f6a4e'}
      strokeWidth=".35"
      strokeDasharray={occupied.has(slot.index) ? undefined : '1.6 1.2'} />)}

    {/* İskeleler. */}
    {quays.map(slot => <polygon
      key={slot.index}
      points={diamond(slot.x, slot.y, TILE_W - 1.5, TILE_H - 0.8)}
      fill={occupied.has(slot.index) ? 'url(#cg-pad)' : 'url(#cg-pad-free)'}
      stroke="#6b5f45" strokeWidth=".35"
      strokeDasharray={occupied.has(slot.index) ? undefined : '1.6 1.2'} />)}
  </svg>
}
