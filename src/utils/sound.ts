const KEY = 'wd-report-sound'
const STYLE_KEY = 'wd-report-sound-style'

export type SoundStyle = 'crisp' | 'charge' | 'victory' | 'drum'

const STYLES: SoundStyle[] = ['crisp', 'charge', 'victory', 'drum']

type WebAudio = AudioContext

const AudioCtor = () => {
  const g = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }
  return g.AudioContext || g.webkitAudioContext
}

let ctx: WebAudio | null = null

export const soundStyles = STYLES

export const soundEnabled = () => uni.getStorageSync(KEY) !== '0'

export const setSoundEnabled = (on: boolean) => {
  uni.setStorageSync(KEY, on ? '1' : '0')
}

export const soundStyle = (): SoundStyle => {
  const saved = String(uni.getStorageSync(STYLE_KEY) || '')
  return STYLES.includes(saved as SoundStyle) ? (saved as SoundStyle) : 'crisp'
}

export const setSoundStyle = (style: SoundStyle) => {
  uni.setStorageSync(STYLE_KEY, style)
}

const context = () => {
  const Ctor = AudioCtor()
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Call from the submit click, before any await, so the browser allows later playback. */
export const unlockReportSound = () => {
  if (!soundEnabled()) return
  context()
}

const tone = (
  ac: AudioContext,
  now: number,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  slide?: number,
) => {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now + start)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slide), now + start + dur)
  gain.gain.setValueAtTime(0.0001, now + start)
  gain.gain.exponentialRampToValueAtTime(peak, now + start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(now + start)
  osc.stop(now + start + dur + 0.02)
}

const hit = (ac: AudioContext, now: number, start: number, dur: number, peak: number) => {
  const length = Math.max(1, Math.floor(ac.sampleRate * dur))
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1400
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, now + start)
  gain.gain.exponentialRampToValueAtTime(peak, now + start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  src.start(now + start)
  src.stop(now + start + dur + 0.02)
}

const playStyle = (ac: AudioContext, style: SoundStyle) => {
  const now = ac.currentTime
  if (style === 'charge') {
    tone(ac, now, 392, 0, 0.08, 'square', 0.08)
    tone(ac, now, 523, 0.08, 0.08, 'square', 0.09)
    tone(ac, now, 659, 0.16, 0.08, 'square', 0.1)
    tone(ac, now, 784, 0.24, 0.24, 'square', 0.11)
    tone(ac, now, 1568, 0.24, 0.24, 'triangle', 0.05)
    return
  }
  if (style === 'victory') {
    ;[523, 659, 784, 1046].forEach((freq, index) => {
      tone(ac, now, freq, index * 0.09, index === 3 ? 0.3 : 0.11, 'triangle', 0.18)
    })
    tone(ac, now, 1568, 0.27, 0.3, 'sine', 0.07)
    return
  }
  if (style === 'drum') {
    tone(ac, now, 160, 0, 0.16, 'sine', 0.4, 48)
    hit(ac, now, 0, 0.07, 0.16)
    tone(ac, now, 190, 0.16, 0.14, 'sine', 0.36, 55)
    hit(ac, now, 0.16, 0.06, 0.12)
    tone(ac, now, 988, 0.3, 0.18, 'square', 0.07)
    return
  }
  tone(ac, now, 784, 0, 0.12, 'sine', 0.2)
  tone(ac, now, 1175, 0.13, 0.2, 'sine', 0.2)
}

export const playReportSound = (edited = false) => {
  if (edited || !soundEnabled()) return
  const ac = context()
  if (!ac) return
  playStyle(ac, soundStyle())
}

export const previewSound = (style: SoundStyle) => {
  const ac = context()
  if (!ac) return
  playStyle(ac, style)
}
