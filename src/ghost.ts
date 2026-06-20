// =============================================================================
// « Ghost » — rejoue ton meilleur run en course. On enregistre la progression
// (caractères justes au fil du temps) du meilleur run par exercice+config, puis
// on l'affiche comme un adversaire fantôme pendant le run suivant.
// =============================================================================
import type { Config } from './types'

export interface GhostPoint {
  t: number // ms depuis le début
  m: number // caractères justes (préfixe correct)
}

export interface GhostTimeline {
  points: GhostPoint[]
  targetLen: number
  wpm: number
  timeMs: number
}

const KEY = 'monkeycode.ghosts.v1'

/** Clé stable : un ghost « pur » (sans IDE) ne se compare qu'à du pur. */
export function ghostKey(config: Config, snippetId: string): string {
  return `${config.lang}:${config.input}:${config.ide ? 'ide' : 'raw'}:${snippetId}`
}

type Store = Record<string, GhostTimeline>

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function loadGhost(key: string): GhostTimeline | null {
  return load()[key] ?? null
}

/** Sauve le timeline s'il bat le ghost existant (wpm supérieur) ou s'il n'y en a pas. */
export function saveGhostIfBest(key: string, ghost: GhostTimeline): boolean {
  const store = load()
  const cur = store[key]
  if (cur && cur.wpm >= ghost.wpm) return false
  store[key] = ghost
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // quota plein : on ignore silencieusement
  }
  return true
}

/** Caractères justes du ghost à l'instant `elapsed` (interpolation linéaire). */
export function ghostMatchedAt(g: GhostTimeline, elapsed: number): number {
  const pts = g.points
  if (pts.length === 0) return 0
  if (elapsed <= pts[0].t) return pts[0].m
  const last = pts[pts.length - 1]
  if (elapsed >= last.t) return last.m
  // recherche linéaire (timelines courtes, ~quelques dizaines de points)
  for (let i = 1; i < pts.length; i++) {
    if (elapsed <= pts[i].t) {
      const a = pts[i - 1]
      const b = pts[i]
      const r = (elapsed - a.t) / Math.max(b.t - a.t, 1)
      return a.m + (b.m - a.m) * r
    }
  }
  return last.m
}
