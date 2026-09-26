/**
 * SES VE TİTREŞİM — dosyasız, WebAudio ile anında üretilen efektler.
 *
 *  • Efektler: dokunuş tıkı, onay çınlaması (pentatonik), hata tokmağı,
 *    akçe şıngırtısı, inşaat çekici, savaş davulu.
 *  • Ortam: şehir ekranında hafif dalga uğultusu ve ara sıra kuş cıvıltısı.
 *  • Titreşim: Android'de kısa dokunsal geri bildirim (navigator.vibrate).
 * Ayarlar cihazda saklanır; tarayıcı sesi ilk dokunuşta açar (otomatik
 * oynatma kuralı), o yüzden ses bağlamı ilk etkileşimde kurulur.
 */
export type SoundPrefs = { sfx: boolean; ambient: boolean; haptics: boolean }
const KEY = 'payitaht-ses'
const DEFAULTS: SoundPrefs = { sfx: true, ambient: true, haptics: true }

let prefs: SoundPrefs = DEFAULTS
let loaded = false
let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambience: { stop: () => void } | null = null
let ambientWanted = false
const listeners = new Set<(p: SoundPrefs) => void>()

export function soundPrefs(): SoundPrefs {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true
    try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { prefs = DEFAULTS }
  }
  return prefs
}
export function setSoundPrefs(patch: Partial<SoundPrefs>) {
  prefs = { ...soundPrefs(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* kayıt yoksa oturumluk */ }
  if (!prefs.ambient) stopAmbience()
  else if (ambientWanted) startAmbience()
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
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Tek nota: saldırı-sönüm zarfı. */
function tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, glide?: number) {
  const a = audio()
  if (!a || !master) return
  const t = a.currentTime + at
  const o = a.createOscillator(), g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.02)
}
function noise(at: number, dur: number, vol: number, freq: number, q = 1) {
  const a = audio()
  if (!a || !master) return
  const t = a.currentTime + at
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain()
  src.buffer = buf
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q
  g.gain.value = vol
  src.connect(f).connect(g).connect(master)
  src.start(t)
}

export type Sfx = 'tap' | 'ok' | 'error' | 'coin' | 'build' | 'war' | 'open'
const SOUNDS: Record<Sfx, () => void> = {
  tap: () => tone(880, 0, 0.05, 'sine', 0.05, 660),
  open: () => { tone(523, 0, 0.09, 'triangle', 0.05); tone(784, 0.04, 0.12, 'triangle', 0.04) },
  ok: () => { tone(659, 0, 0.16, 'triangle', 0.09); tone(880, 0.07, 0.2, 'triangle', 0.08); tone(1175, 0.14, 0.28, 'sine', 0.06) },
  error: () => { tone(196, 0, 0.18, 'square', 0.05, 150); tone(147, 0.08, 0.22, 'square', 0.04, 110) },
  coin: () => { for (let i = 0; i < 4; i++) tone(1568 + i * 180, i * 0.055, 0.14, 'sine', 0.07) ; noise(0, 0.12, 0.05, 6000, 3) },
  build: () => { for (let i = 0; i < 3; i++) { noise(i * 0.16, 0.06, 0.35, 900, 2); tone(220, i * 0.16, 0.06, 'triangle', 0.07, 150) } },
  war: () => { for (let i = 0; i < 3; i++) { tone(90, i * 0.22, 0.25, 'sine', 0.22, 55); noise(i * 0.22, 0.08, 0.2, 300, 1) } },
}
const BUZZ: Partial<Record<Sfx, number | number[]>> = { tap: 6, ok: 14, error: [20, 40, 20], coin: [10, 30, 10], build: [12, 30, 12], war: [40, 60, 40] }

export function play(s: Sfx) {
  const p = soundPrefs()
  if (p.sfx) { try { SOUNDS[s]() } catch { /* ses yoksa sessiz */ } }
  if (p.haptics && BUZZ[s] && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(BUZZ[s]!) } catch { /* desteklenmiyor */ }
  }
}

/* ------------------------------------------------------------- ORTAM SESİ */

function startAmbience() {
  if (ambience || !soundPrefs().ambient) return
  const a = audio()
  if (!a || !master) return
  // Dalga: düşük geçiren gürültü, yavaş nefes alan ses seviyesi.
  const len = a.sampleRate * 4
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last * 3 }
  const src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain()
  const lfo = a.createOscillator(), lg = a.createGain()
  src.buffer = buf; src.loop = true
  lp.type = 'lowpass'; lp.frequency.value = 520
  g.gain.value = 0.05
  lfo.frequency.value = 0.12; lg.gain.value = 0.035
  lfo.connect(lg).connect(g.gain)
  src.connect(lp).connect(g).connect(master)
  src.start(); lfo.start()
  // Kuşlar: arada bir iki üç cıvıltı.
  const timer = window.setInterval(() => {
    if (Math.random() < 0.55) return
    const base = 2200 + Math.random() * 1400
    const n = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) tone(base, i * 0.11, 0.07, 'sine', 0.018, base * 1.35)
  }, 3200)
  ambience = { stop: () => { window.clearInterval(timer); try { src.stop(); lfo.stop() } catch { /* zaten durdu */ } } }
}
function stopAmbience() { ambience?.stop(); ambience = null }

/** Şehir ekranı açıkken ortam sesi istenir; sayfa gizlenince susar. */
export function wantAmbience(on: boolean) {
  ambientWanted = on
  if (on && ctx) startAmbience()
  else if (!on) stopAmbience()
}

let wired = false
/** Her düğmeye hafif tık sesi; ses bağlamı ilk dokunuşta kurulur. */
export function wireUiSounds() {
  if (wired || typeof document === 'undefined') return
  wired = true
  document.addEventListener('pointerdown', e => {
    const first = !ctx
    audio()
    if (first && ambientWanted) startAmbience()
    const el = (e.target as HTMLElement | null)?.closest('button, [role="button"], a')
    if (el && !(el as HTMLButtonElement).disabled) play('tap')
  }, { capture: true, passive: true })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopAmbience(); void ctx?.suspend() }
    else { void ctx?.resume(); if (ambientWanted) startAmbience() }
  })
}
