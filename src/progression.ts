// =============================================================================
// Moteur de progression — copie client (offline-first) du calcul Convex.
// XP, niveaux, rangs. Marche sans backend ; le serveur reste l'autorité une
// fois lié (les valeurs cloud écrasent le local à la synchro).
// =============================================================================
import type { RunResult } from './types'

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** Nombre de caractères « utiles » tapés dans un run. */
export function runChars(r: RunResult): number {
  if (r.game === 'rewrite') {
    // wpm = chars/5/min → chars ≈ wpm * 5 * minutes
    return Math.round((r.wpm * 5 * r.timeMs) / 60000) || r.keystrokes
  }
  return r.keystrokes
}

export function xpForRun(r: RunResult): number {
  const volume = Math.max(runChars(r), 30)
  const base = volume * 0.35
  const speed = r.game === 'rewrite' ? clamp(r.wpm / 40, 0.5, 2.6) : 1
  const acc = Math.pow(Math.max(r.accuracy, 0), 2)
  const pure = r.ide ? 1 : 1.28
  const vim = r.input === 'vim' ? 1.15 : 1
  const cons = 0.85 + 0.3 * clamp(r.consistency, 0, 1)
  return Math.max(1, Math.round(base * speed * acc * pure * vim * cons))
}

export function coinsForXp(xp: number): number {
  return Math.max(1, Math.round(xp / 8))
}

/** XP pour passer de `level` à `level + 1`. */
export function xpForLevel(level: number): number {
  return Math.round(60 * Math.pow(level, 1.5))
}

export interface LevelInfo {
  level: number
  into: number // xp accumulée dans le niveau courant
  span: number // xp total requis pour finir le niveau courant
  pct: number // 0..1
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, Math.floor(totalXp))
  for (;;) {
    const need = xpForLevel(level)
    if (remaining < need) {
      return { level, into: remaining, span: need, pct: remaining / need }
    }
    remaining -= need
    level++
  }
}

// --- Rangs : titres de carrière dev, débloqués par paliers de niveau. --------

export interface Rank {
  at: number
  name: string
  glyph: string
}

export const RANKS: Rank[] = [
  { at: 1, name: 'hello_world', glyph: '◦' },
  { at: 4, name: 'script kiddie', glyph: '›' },
  { at: 8, name: 'junior dev', glyph: '»' },
  { at: 13, name: 'developer', glyph: '▸' },
  { at: 19, name: 'senior dev', glyph: '◆' },
  { at: 26, name: '10x engineer', glyph: '✦' },
  { at: 34, name: 'architect', glyph: '❖' },
  { at: 43, name: 'wizard', glyph: '✲' },
  { at: 53, name: 'kernel hacker', glyph: '⬢' },
  { at: 65, name: 'singularity', glyph: '∞' },
]

export function rankFor(level: number): Rank {
  let r = RANKS[0]
  for (const rank of RANKS) if (level >= rank.at) r = rank
  return r
}

export function nextRank(level: number): Rank | null {
  for (const rank of RANKS) if (rank.at > level) return rank
  return null
}
