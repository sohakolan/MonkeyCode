// =============================================================================
// Retour sonore synthétisé (Web Audio, zéro asset). Clic de touche feutré, blip
// d'erreur, petit accord de fin. Le contexte est créé paresseusement à la
// première frappe (geste utilisateur requis par les navigateurs).
// =============================================================================

let ctx: AudioContext | null = null
let master: GainNode | null = null

function ensure(): AudioContext | null {
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

function blip(
  freq: number,
  durationMs: number,
  type: OscillatorType,
  gain: number,
  glideTo?: number,
) {
  const ac = ensure()
  if (!ac || !master) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + durationMs / 1000)
  // enveloppe percussive
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000)
  osc.connect(g)
  g.connect(master)
  osc.start(t)
  osc.stop(t + durationMs / 1000 + 0.02)
}

/** Clic de touche — légère variation de hauteur pour le réalisme. */
export function playKey() {
  // pseudo-aléatoire stable-friendly : on s'appuie sur currentTime
  const ac = ensure()
  const jitter = ac ? (ac.currentTime * 1000) % 40 : 0
  blip(150 + jitter, 28, 'triangle', 0.16)
}

export function playError() {
  blip(140, 110, 'sawtooth', 0.16, 70)
}

export function playFinish() {
  const ac = ensure()
  if (!ac) return
  const notes = [523.25, 659.25, 783.99] // do, mi, sol
  notes.forEach((f, i) => {
    setTimeout(() => blip(f, 220, 'sine', 0.18), i * 90)
  })
}
