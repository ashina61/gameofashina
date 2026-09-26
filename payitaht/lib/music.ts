/**
 * ARKA PLAN MÜZİĞİ — Hicaz makamında, oyunun içinde üretilen bir fasıl.
 *
 * Ses dosyası yok: her şey WebAudio ile anında çalınır.
 *  • Ud: Karplus-Strong tel sentezi; uzun notalarda ud tremolosu.
 *  • Ney: yumuşak nefesli ton, hafif vibrato ve nefes sesi.
 *  • Dem: Re ve La'da alçak, sürekli bir drone.
 *  • Darbuka: Düyek usulü (düm · tek tek · düm tek).
 * Ezgi, tohumlu bir kurallar dizisiyle bir kez bestelenir (basamaklı ilerler,
 * cümleler durak Re'de ya da güçlü La'da biter) ve yaklaşık iki dakikalık
 * bir döngü olarak çalınır. Aynı kayıt, her açılışta aynı parçayı çalar.
 */

const BPM = 72
const BEAT = 60 / BPM
/** Hicaz (Re karar): bir oktavın yedi basamağı, cent olarak. Mib biraz pes, Fa# biraz tiz. */
const DEGREES = [0, 114, 386, 498, 702, 814, 996]
const D4 = 293.66
/** Basamak -> Hz; eksi ve yedinin üstü komşu oktavlara taşar (-3 = La3, 7 = Re5). */
export const hz = (step: number) => {
  const oct = Math.floor(step / 7), deg = ((step % 7) + 7) % 7
  return D4 * 2 ** ((DEGREES[deg] + 1200 * oct) / 1200)
}

type Ev = { t: number; kind: 'oud' | 'ney' | 'dum' | 'tek' | 'ka'; step?: number; dur?: number; vol?: number }

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** Bir cümle (4 ölçü = 16 vuruş): ritim kalıpları + basamaklı ezgi, hedef notada biter. */
function phrase(r: () => number, start: number, target: number, lo = -3, hi = 8) {
  const bars = [[1, 1, 1, 1], [0.5, 0.5, 1, 2], [1.5, 0.5, 1, 1], [2, 1, 1], [0.5, 0.5, 0.5, 0.5, 2], [1, 0.5, 0.5, 2], [1, 1, 2]]
  const rhythm: number[] = []
  for (let b = 0; b < 3; b++) rhythm.push(...bars[Math.floor(r() * bars.length)])
  rhythm.push(...(r() < 0.5 ? [1, 1, 2] : [2, 2]))
  const notes: { step: number; dur: number }[] = []
  let cur = start
  for (let i = 0; i < rhythm.length; i++) {
    const left = rhythm.length - 1 - i
    if (left === 0) cur = target
    else if (left <= 2) cur += Math.sign(target - cur) * Math.min(2, Math.abs(target - cur))
    else {
      const x = r()
      const step = x < 0.36 ? -1 : x < 0.66 ? 1 : x < 0.76 ? -2 : x < 0.86 ? 2 : x < 0.92 ? 0 : x < 0.96 ? 3 : -3
      cur = Math.max(lo, Math.min(hi, cur + step))
    }
    notes.push({ step: cur, dur: rhythm[i] })
  }
  return notes
}

/** Bütün döngüyü besteler: 8 cümle × 16 vuruş = 128 vuruş (~107 sn). */
export function compose(seed = 1453): { events: Ev[]; length: number } {
  const r = rng(seed)
  const events: Ev[] = []
  const plan: { oud: boolean; ney: boolean; drums: 'none' | 'light' | 'full'; target: number; from: number }[] = [
    { oud: true, ney: false, drums: 'none', target: 4, from: 3 },
    { oud: true, ney: false, drums: 'light', target: 0, from: 4 },
    { oud: true, ney: false, drums: 'full', target: 4, from: 2 },
    { oud: true, ney: true, drums: 'full', target: 0, from: 5 },
    { oud: false, ney: true, drums: 'light', target: 4, from: 4 },
    { oud: false, ney: true, drums: 'light', target: 3, from: 6 },
    { oud: true, ney: false, drums: 'full', target: 4, from: 7 },
    { oud: true, ney: true, drums: 'full', target: 0, from: 4 },
  ]
  plan.forEach((p, i) => {
    const t0 = i * 16
    const tune = phrase(r, p.from, p.target)
    let t = t0
    for (const n of tune) {
      if (p.oud) {
        // Uzun notada ud tremolosu: aynı tel, sekizlik vuruşlarla, sönerek.
        if (n.dur >= 1.5) for (let k = 0; k < n.dur * 2; k++) events.push({ t: t + k * 0.5, kind: 'oud', step: n.step, dur: 0.5, vol: k ? 0.55 - k * 0.05 : 0.9 })
        else events.push({ t, kind: 'oud', step: n.step, dur: n.dur, vol: 0.85 })
      }
      if (p.ney) events.push({ t, kind: 'ney', step: p.oud ? n.step + 7 : n.step, dur: n.dur, vol: p.oud ? 0.5 : 0.8 })
      t += n.dur
    }
    if (p.drums !== 'none') for (let b = 0; b < 4; b++) {
      const bt = t0 + b * 4
      // Düyek: düm . tek tek . düm tek .
      events.push({ t: bt, kind: 'dum' })
      if (p.drums === 'full') {
        events.push({ t: bt + 1, kind: 'tek' }, { t: bt + 1.5, kind: 'tek' }, { t: bt + 2.5, kind: 'dum' }, { t: bt + 3, kind: 'tek' })
        if (r() < 0.5) events.push({ t: bt + 3.5, kind: 'ka' })
      } else events.push({ t: bt + 2.5, kind: 'dum', vol: 0.6 })
    }
  })
  events.sort((a, b) => a.t - b.t)
  return { events, length: plan.length * 16 }
}

/* ------------------------------------------------------------------ SES */

const plucks = new Map<string, AudioBuffer>()
/** Karplus-Strong tel: gürültüyle vurulan, ortalamayla sönen dalga. */
export function pluck(ctx: AudioContext, freq: number, seconds = 1.6, bright = 0.5): AudioBuffer {
  const key = `${Math.round(freq * 10)}-${seconds}-${bright}`
  const hit = plucks.get(key)
  if (hit) return hit
  const sr = ctx.sampleRate
  const n = Math.max(2, Math.round(sr / freq))
  const len = Math.floor(sr * seconds)
  const buf = ctx.createBuffer(1, len, sr)
  const d = buf.getChannelData(0)
  const ring = new Float32Array(n)
  let prev = 0
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; prev = prev * (1 - bright) + w * bright; ring[i] = prev }
  let idx = 0
  const decay = 0.996
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % n
    const v = ring[idx]
    d[i] = v
    ring[idx] = (v + ring[next]) * 0.5 * decay
    idx = next
  }
  // Başı hafif yumuşat (tık sesini keser).
  for (let i = 0; i < 64 && i < len; i++) d[i] *= i / 64
  plucks.set(key, buf)
  return buf
}

export function playPluck(ctx: AudioContext, out: AudioNode, at: number, freq: number, vol: number, seconds = 1.6) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = pluck(ctx, freq, seconds)
  f.type = 'lowpass'; f.frequency.value = 2600
  g.gain.value = vol
  src.connect(f).connect(g).connect(out)
  src.start(at)
}

function ney(ctx: AudioContext, out: AudioNode, at: number, freq: number, dur: number, vol: number) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter()
  const vib = ctx.createOscillator(), vg = ctx.createGain()
  o.type = 'triangle'; o.frequency.value = freq
  o2.type = 'sine'; o2.frequency.value = freq * 2
  vib.frequency.value = 5.2; vg.gain.value = freq * 0.004
  vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency)
  f.type = 'lowpass'; f.frequency.value = 1800
  const end = at + dur * BEAT
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(vol, at + Math.min(0.18, dur * BEAT * 0.4))
  g.gain.setValueAtTime(vol, Math.max(at + 0.2, end - 0.12))
  g.gain.linearRampToValueAtTime(0.0001, end + 0.05)
  const m2 = ctx.createGain(); m2.gain.value = 0.25
  o.connect(f); o2.connect(m2).connect(f); f.connect(g).connect(out)
  // Nefes: bant geçiren gürültü.
  const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * (dur * BEAT + 0.1)), ctx.sampleRate)
  const nd = nb.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  const ns = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain()
  ns.buffer = nb; nf.type = 'bandpass'; nf.frequency.value = freq * 2.5; nf.Q.value = 2
  ng.gain.setValueAtTime(0.0001, at); ng.gain.linearRampToValueAtTime(vol * 0.12, at + 0.1); ng.gain.linearRampToValueAtTime(0.0001, end)
  ns.connect(nf).connect(ng).connect(out)
  for (const x of [o, o2, vib, ns]) { x.start(at); x.stop(end + 0.1) }
}

export function drum(ctx: AudioContext, out: AudioNode, at: number, kind: 'dum' | 'tek' | 'ka', vol = 1) {
  if (kind === 'dum') {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(120, at); o.frequency.exponentialRampToValueAtTime(58, at + 0.22)
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.55 * vol, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.34)
    o.connect(g).connect(out); o.start(at); o.stop(at + 0.36)
    return
  }
  const len = Math.floor(ctx.sampleRate * 0.07)
  const b = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = kind === 'tek' ? 3400 : 2400; f.Q.value = 1.4
  g.gain.value = (kind === 'tek' ? 0.5 : 0.28) * vol
  s.connect(f).connect(g).connect(out); s.start(at)
}

/** Döngüyü çalar; durdurma fonksiyonu döndürür. */
export function startMusic(ctx: AudioContext, dest: AudioNode, volume = 0.18): () => void {
  const { events, length } = compose()
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(0.0001, ctx.currentTime)
  bus.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3)
  // Yumuşak oda yankısı: kısa gecikmeli geri besleme.
  const delay = ctx.createDelay(), fb = ctx.createGain(), wet = ctx.createGain()
  delay.delayTime.value = 0.23; fb.gain.value = 0.28; wet.gain.value = 0.3
  bus.connect(dest); bus.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(dest)
  // Dem: Re2 + La2.
  const droneF = ctx.createBiquadFilter(), droneG = ctx.createGain()
  droneF.type = 'lowpass'; droneF.frequency.value = 380; droneG.gain.value = 0.05
  const d1 = ctx.createOscillator(), d2 = ctx.createOscillator()
  d1.type = 'sawtooth'; d1.frequency.value = D4 / 4; d2.type = 'triangle'; d2.frequency.value = hz(4) / 4
  d1.connect(droneF); d2.connect(droneF); droneF.connect(droneG).connect(bus)
  d1.start(); d2.start()

  const loopSec = length * BEAT
  let origin = ctx.currentTime + 0.3, i = 0
  const tick = () => {
    const horizon = ctx.currentTime + 0.35
    for (;;) {
      if (i >= events.length) { i = 0; origin += loopSec }
      const e = events[i]
      const at = origin + e.t * BEAT
      if (at > horizon) break
      if (at >= ctx.currentTime - 0.05) {
        if (e.kind === 'oud') playPluck(ctx, bus, at, hz(e.step!), 0.5 * (e.vol ?? 1), Math.min(2.2, 0.6 + (e.dur ?? 1) * BEAT * 1.4))
        else if (e.kind === 'ney') ney(ctx, bus, at, hz(e.step!), e.dur ?? 1, 0.13 * (e.vol ?? 1))
        else drum(ctx, bus, at, e.kind, e.vol ?? 1)
      }
      i++
    }
  }
  tick()
  const timer = setInterval(tick, 90)
  return () => {
    clearInterval(timer)
    const t = ctx.currentTime
    bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0.0001, t + 0.8)
    setTimeout(() => { try { d1.stop(); d2.stop() } catch { /* durdu */ } bus.disconnect(); wet.disconnect() }, 1000)
  }
}
