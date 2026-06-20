// Calcul XP / niveau — serverless, autorité côté Convex.
// Volontairement sans import Convex pour rester pur et testable.
// (Le client a une copie miroir dans src/progression.ts pour l'XP « offline ».)

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export interface RunInput {
  game: string
  wpm: number
  accuracy: number
  consistency: number
  ide: boolean
  input: string
  chars: number
}

export function xpForRun(r: RunInput): number {
  const volume = Math.max(r.chars, 30)
  const base = volume * 0.35
  const speed = r.game === 'rewrite' ? clamp(r.wpm / 40, 0.5, 2.6) : 1
  const acc = Math.pow(Math.max(r.accuracy, 0), 2)
  const pure = r.ide ? 1 : 1.28 // taper « à la main » vaut plus que l'assisté
  const vim = r.input === 'vim' ? 1.15 : 1
  const cons = 0.85 + 0.3 * clamp(r.consistency, 0, 1)
  return Math.max(1, Math.round(base * speed * acc * pure * vim * cons))
}

// XP nécessaire pour passer de `level` à `level + 1`.
export function xpForLevel(level: number): number {
  return Math.round(60 * Math.pow(level, 1.5))
}

// Niveau atteint pour un total d'XP, + progression dans le niveau courant.
export function levelFromXp(totalXp: number): {
  level: number
  into: number
  span: number
} {
  let level = 1
  let remaining = Math.max(0, totalXp)
  for (;;) {
    const need = xpForLevel(level)
    if (remaining < need) return { level, into: remaining, span: need }
    remaining -= need
    level++
  }
}
