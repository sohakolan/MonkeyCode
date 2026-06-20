// =============================================================================
// Succès — récompenses débloquables. Chaque succès donne de l'XP + des pièces.
// L'évaluation se fait sur le contexte agrégé du joueur après chaque run.
// =============================================================================
import type { RunResult, Lang } from './types'

export interface AchievementContext {
  lastRun: RunResult
  totalRuns: number
  bestWpm: number
  perfectRuns: number
  pureRuns: number
  vimRuns: number
  langs: Lang[] // langages distincts déjà terminés
  streak: number
}

export interface Achievement {
  id: string
  name: string
  desc: string
  glyph: string
  xp: number
  coins: number
  test: (c: AchievementContext) => boolean
}

const isRewrite = (c: AchievementContext) => c.lastRun.game === 'rewrite'

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', name: 'premier run', desc: 'termine ton premier exercice', glyph: '◦', xp: 40, coins: 20, test: (c) => c.totalRuns >= 1 },
  { id: 'wpm_60', name: 'ça chauffe', desc: 'atteins 60 wpm', glyph: '›', xp: 60, coins: 30, test: (c) => isRewrite(c) && c.lastRun.wpm >= 60 },
  { id: 'wpm_80', name: 'rapide', desc: 'atteins 80 wpm', glyph: '»', xp: 120, coins: 60, test: (c) => isRewrite(c) && c.lastRun.wpm >= 80 },
  { id: 'wpm_100', name: 'centaure', desc: 'atteins 100 wpm', glyph: '▸', xp: 250, coins: 120, test: (c) => isRewrite(c) && c.lastRun.wpm >= 100 },
  { id: 'wpm_120', name: 'surhumain', desc: 'atteins 120 wpm', glyph: '✦', xp: 500, coins: 250, test: (c) => isRewrite(c) && c.lastRun.wpm >= 120 },
  { id: 'flawless', name: 'sans faute', desc: 'un run à 100 % de précision', glyph: '◆', xp: 150, coins: 80, test: (c) => isRewrite(c) && c.lastRun.accuracy >= 1 && c.lastRun.keystrokes > 40 },
  { id: 'steady', name: 'métronome', desc: 'régularité ≥ 95 % sur un run', glyph: '❖', xp: 120, coins: 60, test: (c) => isRewrite(c) && c.lastRun.consistency >= 0.95 },
  { id: 'vim_initiate', name: 'vim initié', desc: 'termine un run en mode vim', glyph: '✲', xp: 80, coins: 40, test: (c) => c.lastRun.input === 'vim' },
  { id: 'vim_warrior', name: 'vim warrior', desc: '25 runs en vim', glyph: '⬢', xp: 300, coins: 150, test: (c) => c.vimRuns >= 25 },
  { id: 'pure_25', name: 'à la main', desc: '25 runs sans assistance IDE', glyph: '☓', xp: 200, coins: 100, test: (c) => c.pureRuns >= 25 },
  { id: 'polyglot', name: 'polyglotte', desc: 'termine un run dans les 4 langages', glyph: '⌘', xp: 350, coins: 180, test: (c) => c.langs.length >= 4 },
  { id: 'streak_3', name: 'régulier', desc: 'série de 3 jours', glyph: '✸', xp: 100, coins: 50, test: (c) => c.streak >= 3 },
  { id: 'streak_7', name: 'discipliné', desc: 'série de 7 jours', glyph: '✹', xp: 250, coins: 120, test: (c) => c.streak >= 7 },
  { id: 'streak_30', name: 'inarrêtable', desc: 'série de 30 jours', glyph: '★', xp: 1000, coins: 500, test: (c) => c.streak >= 30 },
  { id: 'centurion', name: 'centurion', desc: '100 runs au total', glyph: '⊕', xp: 400, coins: 200, test: (c) => c.totalRuns >= 100 },
  { id: 'marathon', name: 'marathonien', desc: '500 runs au total', glyph: '∞', xp: 1500, coins: 750, test: (c) => c.totalRuns >= 500 },
]

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
)

/** Renvoie les succès satisfaits par le contexte (tous, déjà-acquis inclus). */
export function satisfiedAchievements(c: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(c)).map((a) => a.id)
}
