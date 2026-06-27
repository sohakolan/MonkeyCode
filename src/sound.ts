// =============================================================================
// Retour sonore synthétisé (Web Audio, zéro asset). Au lieu de simples blips
// d'oscillateur, chaque touche est rendue comme une vraie frappe mécanique :
// un transitoire de « clic » (bruit filtré en bande étroite, décroissance très
// rapide) + un corps « thock » (impulsion basse résonante). Une légère
// randomisation de hauteur, de niveau et de timbre évite l'effet mitraillette.
//
// Le contexte audio est créé paresseusement à la première frappe (les
// navigateurs exigent un geste utilisateur).
// =============================================================================

export type SoundPack =
  | 'click'
  | 'soft'
  | 'thock'
  | 'typewriter'
  | 'blue'
  | 'cream'

export interface SoundPackDef {
  id: SoundPack
  label: string
  hint: string
  minLevel: number
}

// Catalogue ordonné. Les premiers packs sont offerts ; les suivants se
// débloquent en montant de niveau (récompense de progression, comme les thèmes).
export const SOUND_PACKS: SoundPackDef[] = [
  { id: 'click', label: 'clic feutré', hint: 'membrane douce, discret', minLevel: 1 },
  { id: 'soft', label: 'doux', hint: 'frappe arrondie, feutrée', minLevel: 1 },
  { id: 'thock', label: 'thock profond', hint: 'clavier custom, grave et plein', minLevel: 1 },
  { id: 'typewriter', label: 'machine à écrire', hint: 'frappe métallique + tintement', minLevel: 4 },
  { id: 'blue', label: 'switch clicky', hint: 'clic sec et aigu, à la bleue', minLevel: 8 },
  { id: 'cream', label: 'creamy', hint: 'linéaire crémeux, profond', minLevel: 12 },
]

export const SOUND_PACK_BY_ID: Record<SoundPack, SoundPackDef> = Object.fromEntries(
  SOUND_PACKS.map((p) => [p.id, p]),
) as Record<SoundPack, SoundPackDef>

/** Le pack est-il débloqué au niveau donné ? */
export function soundPackUnlocked(id: SoundPack, level: number): boolean {
  return level >= (SOUND_PACK_BY_ID[id]?.minLevel ?? 1)
}

// --- paramètres par pack -----------------------------------------------------
// click  : transitoire bandpass aigu + corps court. Décroché « laptop ».
// body    : impulsion sinus basse (le « thock »).
// ring    : harmonique métallique brève (machine à écrire).
// noiseLP : bruit grave filtré passe-bas pour le creux d'une linéaire.
interface PackParams {
  click: { freq: number; q: number; gain: number; decay: number } | null
  body: { freq: number; gain: number; decay: number } | null
  noiseLP: { freq: number; gain: number; decay: number } | null
  ring: boolean
  releaseGain: number // niveau du « relâchement » de touche (petit écho aigu)
}

const PACKS: Record<SoundPack, PackParams> = {
  click: {
    click: { freq: 2400, q: 1.1, gain: 0.16, decay: 0.03 },
    body: { freq: 168, gain: 0.1, decay: 0.05 },
    noiseLP: null,
    ring: false,
    releaseGain: 0.04,
  },
  soft: {
    click: { freq: 1300, q: 0.8, gain: 0.08, decay: 0.045 },
    body: { freq: 130, gain: 0.12, decay: 0.07 },
    noiseLP: { freq: 900, gain: 0.05, decay: 0.04 },
    ring: false,
    releaseGain: 0,
  },
  thock: {
    click: { freq: 1700, q: 1.4, gain: 0.07, decay: 0.025 },
    body: { freq: 96, gain: 0.22, decay: 0.11 },
    noiseLP: { freq: 520, gain: 0.08, decay: 0.06 },
    ring: false,
    releaseGain: 0.03,
  },
  typewriter: {
    click: { freq: 3200, q: 2.2, gain: 0.2, decay: 0.022 },
    body: { freq: 150, gain: 0.12, decay: 0.05 },
    noiseLP: null,
    ring: true,
    releaseGain: 0.06,
  },
  blue: {
    click: { freq: 3600, q: 3.0, gain: 0.22, decay: 0.018 },
    body: { freq: 190, gain: 0.08, decay: 0.04 },
    noiseLP: null,
    ring: false,
    releaseGain: 0.08,
  },
  cream: {
    click: { freq: 1100, q: 0.7, gain: 0.06, decay: 0.05 },
    body: { freq: 88, gain: 0.24, decay: 0.13 },
    noiseLP: { freq: 600, gain: 0.1, decay: 0.07 },
    ring: false,
    releaseGain: 0,
  },
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let volume = 0.5
let pack: SoundPack = 'click'

/** Réglages live depuis les préférences (volume 0→1, ambiance). */
export function setSoundPrefs(v: number, p: SoundPack) {
  volume = Math.max(0, Math.min(1, v))
  pack = PACKS[p] ? p : 'click'
  if (master) master.gain.value = volume
}

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)
    // Bruit blanc court réutilisé par toutes les frappes (créé une seule fois).
    const len = Math.floor(ctx.sampleRate * 0.2)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    noiseBuf = buf
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Bruit filtré avec enveloppe percussive — la « matière » d'un clic. */
function noiseHit(
  ac: AudioContext,
  type: BiquadFilterType,
  freq: number,
  q: number,
  gain: number,
  decay: number,
  t: number,
) {
  if (!noiseBuf || !master) return
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  src.playbackRate.value = rand(0.92, 1.12)
  const filt = ac.createBiquadFilter()
  filt.type = type
  filt.frequency.value = freq
  filt.Q.value = q
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.0012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  src.connect(filt)
  filt.connect(g)
  g.connect(master)
  // démarre à un offset aléatoire dans le bruit → texture différente à chaque coup
  src.start(t, rand(0, 0.1))
  src.stop(t + decay + 0.03)
}

/** Impulsion sinus basse — le « corps » de la frappe (thock). */
function thump(
  ac: AudioContext,
  freq: number,
  gain: number,
  decay: number,
  t: number,
) {
  if (!master) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq * rand(0.96, 1.06), t)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + decay)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  osc.connect(g)
  g.connect(master)
  osc.start(t)
  osc.stop(t + decay + 0.03)
}

/** Clic de touche — assemble clic + corps + texture selon l'ambiance. */
export function playKey() {
  const ac = ensure()
  if (!ac || !master) return
  const p = PACKS[pack] ?? PACKS.click
  const t = ac.currentTime
  const lvl = rand(0.82, 1)

  if (p.click) {
    noiseHit(ac, 'bandpass', p.click.freq * rand(0.88, 1.14), p.click.q, p.click.gain * lvl, p.click.decay, t)
  }
  if (p.noiseLP) {
    noiseHit(ac, 'lowpass', p.noiseLP.freq * rand(0.9, 1.1), 0.7, p.noiseLP.gain * lvl, p.noiseLP.decay, t)
  }
  if (p.body) {
    thump(ac, p.body.freq, p.body.gain * lvl, p.body.decay, t)
  }
  if (p.ring) {
    // tintement métallique de la machine à écrire, très bref et aigu
    thump(ac, 2100 * rand(0.95, 1.08), 0.03, 0.05, t + 0.004)
  }
  if (p.releaseGain > 0) {
    // léger « relâchement » de touche, décalé (le ressort qui remonte)
    noiseHit(ac, 'bandpass', 3000 * rand(0.9, 1.1), 2, p.releaseGain * lvl, 0.012, t + rand(0.05, 0.08))
  }
}

/** Erreur — thock sourd et désaccordé, immédiatement identifiable. */
export function playError() {
  const ac = ensure()
  if (!ac || !master) return
  const t = ac.currentTime
  thump(ac, 150, 0.16, 0.12, t)
  thump(ac, 98, 0.12, 0.14, t + 0.012)
  noiseHit(ac, 'bandpass', 320, 1.4, 0.06, 0.06, t)
}

/** Fin de run — petit arpège ascendant satisfaisant (do · mi · sol · do). */
export function playFinish() {
  const ac = ensure()
  if (!ac || !master) return
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    setTimeout(() => {
      const a = ensure()
      const out = master
      if (!a || !out) return
      const t = a.currentTime
      const osc = a.createOscillator()
      const g = a.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, t)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
      osc.connect(g)
      g.connect(out)
      osc.start(t)
      osc.stop(t + 0.36)
    }, i * 85)
  })
}

/** Bip court de confirmation (déblocage, action UI). */
export function playUnlock() {
  const ac = ensure()
  const out = master
  if (!ac || !out) return
  const t = ac.currentTime
  ;[659.25, 987.77].forEach((f, i) => {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, t + i * 0.07)
    g.gain.setValueAtTime(0.0001, t + i * 0.07)
    g.gain.exponentialRampToValueAtTime(0.14, t + i * 0.07 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.18)
    osc.connect(g)
    g.connect(out)
    osc.start(t + i * 0.07)
    osc.stop(t + i * 0.07 + 0.2)
  })
}
