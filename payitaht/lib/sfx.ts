/**
 * SES, MÜZİK VE TİTREŞİM — dosyasız, WebAudio ile anında üretilir.
 *
 *  • Müzik: Hicaz makamında ud, ney, dem ve darbuka (lib/music.ts).
 *  • Efektler SEYREK ve yumuşak: her düğmede tık yok; yalnızca önemli
 *    anlarda ud teli (onay, ödül), tahta tokmak (inşaat), davul (savaş).
 *  • Ortam: isteğe bağlı hafif dalga uğultusu.
 *  • Titreşim: Android'de önemli anlarda kısa geri bildirim.
 * Tarayıcı sesi ancak ilk dokunuşta açar; bağlam o anda kurulur.
 */
import { drum, playPluck, startMusic } from './music'

export type SoundPrefs = { music: boolean; sfx: boolean; ambient: boolean; haptics: boolean }
const KEY = 'payitaht-ses'
const DEFAULTS: SoundPrefs = { music: true, sfx: true, ambient: false, haptics: true }

let prefs: SoundPrefs = DEFAULTS
let loaded = false
let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambience: { stop: () => void } | null = null
let music: (() => void) | null = null
let ambientWanted = false
let musicWanted = false
const listeners = new Set<(p: SoundPrefs) => void>()

export function soundPrefs(): SoundPrefs {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
      // 0.26 kaydında müzik yoktu; ortam sesi müzikle çakışmasın diye kapanır.
      prefs = { ...DEFAULTS, ...raw, ...(raw.music === undefined ? { ambient: false } : {}) }
    } catch { prefs = DEFAULTS }
  }
  return prefs
}
export function setSoundPrefs(patch: Partial<SoundPrefs>) {
  prefs = { ...soundPrefs(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* kayıt yoksa oturumluk */ }
  sync()
  for (const f of listeners) f(prefs)
}
export function onSoundPrefs(f: (p: SoundPrefs) => void) { listeners.add(f); return () => { listeners.delete(f) } }

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Müzik ve ortam sesini tercihe ve isteğe göre aç/kapat (bağlam varsa). */
function sync() {
  if (!ctx || !master) return
  const p = soundPrefs()
  if (musicWanted && p.music && !music) music = startMusic(ctx, master)
  if ((!musicWanted || !p.music) && music) { music(); music = null }
  if (ambientWanted && p.ambient && !ambience) startAmbience()
  if ((!ambientWanted || !p.ambient) && ambience) { ambience.stop(); ambience = null }
}

function knock(at: number, vol: number) {
  const a = ctx!, len = Math.floor(a.sampleRate * 0.09)
  const b = a.createBuffer(1, len, a.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain()
  s.buffer = b; f.type = 'lowpass'; f.frequency.value = 900
  g.gain.value = vol
  s.connect(f).connect(g).connect(master!)
  s.start(at)
  const o = a.createOscillator(), og = a.createGain()
  o.frequency.setValueAtTime(210, at); o.frequency.exponentialRampToValueAtTime(140, at + 0.08)
  og.gain.setValueAtTime(vol * 0.5, at); og.gain.exponentialRampToValueAtTime(0.0001, at + 0.1)
  o.connect(og).connect(master!); o.start(at); o.stop(at + 0.12)
}

/** Hicaz basamakları (Re4 = 293.66 Hz). */
const RE = 293.66, MIb = 311.1, SOL = 392, LA = 440, SIb = 466.2, RE5 = 587.3, FAd5 = 740, LA5 = 880

export type Sfx = 'ok' | 'error' | 'coin' | 'build' | 'war'
const SOUNDS: Record<Sfx, (t: number) => void> = {
  ok: t => { playPluck(ctx!, master!, t, RE, 0.35, 1.1); playPluck(ctx!, master!, t + 0.09, LA, 0.3, 1.3) },
  coin: t => { [RE5, FAd5, LA5].forEach((f, i) => playPluck(ctx!, master!, t + i * 0.07, f, 0.26, 1.2)) },
  error: t => { playPluck(ctx!, master!, t, SIb, 0.3, 0.9); playPluck(ctx!, master!, t + 0.12, MIb, 0.32, 1.1) },
  build: t => { knock(t, 0.5); knock(t + 0.2, 0.42); playPluck(ctx!, master!, t + 0.05, SOL / 2, 0.18, 0.8) },
  war: t => { for (let i = 0; i < 3; i++) drum(ctx!, master!, t + i * 0.26, 'dum', 1.2); drum(ctx!, master!, t + 0.13, 'tek', 0.6) },
}
const BUZZ: Partial<Record<Sfx, number | number[]>> = { ok: 12, error: [18, 40, 18], coin: [10, 30, 10], build: [12, 40, 12], war: [40, 60, 40] }
let lastAt = 0

export function play(s: Sfx) {
  const p = soundPrefs()
  // Aynı anda üst üste binen sesler tek sese iner.
  const now = typeof performance !== 'undefined' ? performance.now() : 0
  if (now - lastAt < 120) return
  lastAt = now
  if (p.sfx) { try { const a = audio(); if (a && master) SOUNDS[s](a.currentTime + 0.01) } catch { /* ses yoksa sessiz */ } }
  if (p.haptics && BUZZ[s] && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(BUZZ[s]!) } catch { /* desteklenmiyor */ }
  }
}

/* ------------------------------------------------------------- ORTAM SESİ */

function startAmbience() {
  const a = ctx
  if (!a || !master || ambience) return
  const len = a.sampleRate * 4
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last * 3 }
  const src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain()
  const lfo = a.createOscillator(), lg = a.createGain()
  src.buffer = buf; src.loop = true
  lp.type = 'lowpass'; lp.frequency.value = 480
  g.gain.value = 0.035
  lfo.frequency.value = 0.12; lg.gain.value = 0.025
  lfo.connect(lg).connect(g.gain)
  src.connect(lp).connect(g).connect(master)
  src.start(); lfo.start()
  ambience = { stop: () => { try { src.stop(); lfo.stop() } catch { /* zaten durdu */ } } }
}

/** Oyun ekranı açıkken müzik ve ortam istenir. */
export function wantMusic(on: boolean) { musicWanted = on; sync() }
export function wantAmbience(on: boolean) { ambientWanted = on; sync() }

let wired = false
/** Ses bağlamı ilk dokunuşta kurulur (tarayıcı kuralı); sekme gizlenince susar. */
export function wireUiSounds() {
  if (wired || typeof document === 'undefined') return
  wired = true
  const first = () => { audio(); sync() }
  document.addEventListener('pointerdown', first, { capture: true, passive: true })
  document.addEventListener('keydown', first, { capture: true })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void ctx?.suspend()
    else void ctx?.resume()
  })
}
