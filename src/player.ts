// =============================================================================
// État joueur local (offline-first). Source de vérité tant que Convex n'est pas
// lié ; ensuite le cloud fait foi et écrase ce store à la synchro.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang, RunResult } from './types'
import { coinsForXp, levelFromXp, xpForRun } from './progression'
import {
  ACHIEVEMENT_BY_ID,
  satisfiedAchievements,
  type Achievement,
  type AchievementContext,
} from './achievements'
import { THEME_BY_ID, applyTheme } from './themes'

const KEY = 'monkeycode.player.v1'

export interface PlayerState {
  xp: number
  coins: number
  streak: number
  bestStreak: number
  lastPlayedDay: string | null
  totalRuns: number
  bestWpm: number
  perfectRuns: number
  pureRuns: number
  vimRuns: number
  langsCompleted: Lang[]
  achievements: string[]
  unlockedThemes: string[]
  equippedTheme: string
  lastDailyDay: string | null
}

const DAILY_BONUS_XP = 150
const DAILY_BONUS_COINS = 75

export const FRESH_PLAYER: PlayerState = {
  xp: 0,
  coins: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayedDay: null,
  totalRuns: 0,
  bestWpm: 0,
  perfectRuns: 0,
  pureRuns: 0,
  vimRuns: 0,
  langsCompleted: [],
  achievements: [],
  unlockedThemes: ['ember'],
  equippedTheme: 'ember',
  lastDailyDay: null,
}

export interface RunReward {
  xpGained: number
  coinsGained: number
  leveledUp: boolean
  fromLevel: number
  toLevel: number
  newAchievements: Achievement[]
  streak: number
  streakUp: boolean
  dailyClaimed: boolean
}

/** Le défi du jour est-il encore disponible (non réclamé aujourd'hui) ? */
export function dailyAvailable(p: PlayerState, today: string): boolean {
  return p.lastDailyDay !== today
}

function load(): PlayerState {
  try {
    return { ...FRESH_PLAYER, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...FRESH_PLAYER }
  }
}

function save(p: PlayerState) {
  localStorage.setItem(KEY, JSON.stringify(p))
}

/** Snapshot de la progression locale (pour fusion cloud au login). */
export function readPlayer(): PlayerState {
  return load()
}

function todayLocal(): string {
  const d = new Date()
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

/** Applique un run terminé à l'état et renvoie la récompense à animer. */
export function applyRun(
  prev: PlayerState,
  run: RunResult,
  opts: { daily?: boolean } = {},
): {
  next: PlayerState
  reward: RunReward
} {
  const xpGained = xpForRun(run)
  const coinsGained = coinsForXp(xpGained)

  // Série quotidienne.
  const today = todayLocal()

  // Défi du jour : bonus une seule fois par jour.
  const dailyClaimed = Boolean(opts.daily) && prev.lastDailyDay !== today
  const dailyXp = dailyClaimed ? DAILY_BONUS_XP : 0
  const dailyCoins = dailyClaimed ? DAILY_BONUS_COINS : 0
  let streak = prev.streak
  let streakUp = false
  if (prev.lastPlayedDay !== today) {
    const gap = prev.lastPlayedDay ? dayDiff(prev.lastPlayedDay, today) : 999
    streak = gap === 1 ? prev.streak + 1 : 1
    streakUp = true
  }

  const langs = prev.langsCompleted.includes(run.lang)
    ? prev.langsCompleted
    : [...prev.langsCompleted, run.lang]

  const fromLevel = levelFromXp(prev.xp).level

  const next: PlayerState = {
    ...prev,
    xp: prev.xp + xpGained,
    coins: prev.coins + coinsGained,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    lastPlayedDay: today,
    totalRuns: prev.totalRuns + 1,
    bestWpm: Math.max(prev.bestWpm, run.game === 'rewrite' ? run.wpm : prev.bestWpm),
    perfectRuns: prev.perfectRuns + (run.game === 'rewrite' && run.accuracy >= 1 ? 1 : 0),
    pureRuns: prev.pureRuns + (run.ide ? 0 : 1),
    vimRuns: prev.vimRuns + (run.input === 'vim' ? 1 : 0),
    langsCompleted: langs,
    lastDailyDay: dailyClaimed ? today : prev.lastDailyDay,
  }

  // Succès débloqués par ce run.
  const ctx: AchievementContext = {
    lastRun: run,
    totalRuns: next.totalRuns,
    bestWpm: next.bestWpm,
    perfectRuns: next.perfectRuns,
    pureRuns: next.pureRuns,
    vimRuns: next.vimRuns,
    langs: next.langsCompleted,
    streak: next.streak,
  }
  const satisfied = satisfiedAchievements(ctx)
  const freshIds = satisfied.filter((id) => !prev.achievements.includes(id))
  const newAchievements = freshIds.map((id) => ACHIEVEMENT_BY_ID[id])

  // Bonus XP/pièces des succès.
  let bonusXp = 0
  let bonusCoins = 0
  for (const a of newAchievements) {
    bonusXp += a.xp
    bonusCoins += a.coins
  }
  next.xp += bonusXp + dailyXp
  next.coins += bonusCoins + dailyCoins
  next.achievements = [...prev.achievements, ...freshIds]

  const toLevel = levelFromXp(next.xp).level

  return {
    next,
    reward: {
      xpGained: xpGained + bonusXp + dailyXp,
      coinsGained: coinsGained + bonusCoins + dailyCoins,
      leveledUp: toLevel > fromLevel,
      fromLevel,
      toLevel,
      newAchievements,
      streak,
      streakUp,
      dailyClaimed,
    },
  }
}

export interface PlayerApi {
  player: PlayerState
  recordRun: (run: RunResult, opts?: { daily?: boolean }) => RunReward
  buyTheme: (id: string) => boolean
  equipTheme: (id: string) => void
}

export function usePlayer(): PlayerApi {
  const [player, setPlayer] = useState<PlayerState>(load)
  const ref = useRef(player)

  // Persistance + miroir dans la ref (lue par les handlers, jamais en render).
  useEffect(() => {
    ref.current = player
    save(player)
  }, [player])

  useEffect(() => {
    applyTheme(player.equippedTheme)
  }, [player.equippedTheme])

  const recordRun = useCallback(
    (run: RunResult, opts: { daily?: boolean } = {}): RunReward => {
      const { next, reward } = applyRun(ref.current, run, opts)
      ref.current = next
      setPlayer(next)
      return reward
    },
    [],
  )

  const buyTheme = useCallback((id: string): boolean => {
    const theme = THEME_BY_ID[id]
    const p = ref.current
    if (!theme || p.unlockedThemes.includes(id)) return false
    if (p.coins < theme.cost) return false
    const next = {
      ...p,
      coins: p.coins - theme.cost,
      unlockedThemes: [...p.unlockedThemes, id],
      equippedTheme: id,
    }
    ref.current = next
    setPlayer(next)
    return true
  }, [])

  const equipTheme = useCallback((id: string) => {
    const p = ref.current
    if (!p.unlockedThemes.includes(id)) return
    const next = { ...p, equippedTheme: id }
    ref.current = next
    setPlayer(next)
  }, [])

  return { player, recordRun, buyTheme, equipTheme }
}
