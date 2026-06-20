import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { auth } from './auth'
import { xpForRun, levelFromXp } from './progression'

function todayKey(offsetMinutes: number): string {
  // Jour local du joueur (offset envoyé par le client).
  const local = new Date(Date.now() - offsetMinutes * 60_000)
  return local.toISOString().slice(0, 10)
}

function dayDiff(a: string, b: string): number {
  const da = Date.parse(a + 'T00:00:00Z')
  const db = Date.parse(b + 'T00:00:00Z')
  return Math.round((db - da) / 86_400_000)
}

// Enregistre un run terminé et met à jour le profil (XP, niveau, série, records).
// Renvoie de quoi animer la récompense côté client.
export const submit = mutation({
  args: {
    game: v.string(),
    lang: v.string(),
    input: v.string(),
    ide: v.boolean(),
    snippetId: v.string(),
    wpm: v.number(),
    raw: v.number(),
    accuracy: v.number(),
    errors: v.number(),
    consistency: v.number(),
    timeMs: v.number(),
    chars: v.number(),
    newAchievements: v.array(v.string()),
    tzOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('non authentifié')
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (!profile) throw new Error('profil absent — appelle profile.ensure')

    const xpGained = xpForRun(args)
    const coinsGained = Math.max(1, Math.round(xpGained / 8))
    const playedAt = Date.now()

    await ctx.db.insert('runs', {
      userId,
      game: args.game,
      lang: args.lang,
      input: args.input,
      ide: args.ide,
      snippetId: args.snippetId,
      wpm: args.wpm,
      raw: args.raw,
      accuracy: args.accuracy,
      errors: args.errors,
      consistency: args.consistency,
      timeMs: args.timeMs,
      xpGained,
      playedAt,
    })

    // Série quotidienne.
    const today = todayKey(args.tzOffsetMinutes)
    let streak = profile.streak
    if (profile.lastPlayedDay !== today) {
      const gap = profile.lastPlayedDay ? dayDiff(profile.lastPlayedDay, today) : 999
      streak = gap === 1 ? profile.streak + 1 : 1
    }

    const before = levelFromXp(profile.xp)
    const newXp = profile.xp + xpGained
    const after = levelFromXp(newXp)

    const mergedAchievements = Array.from(
      new Set([...profile.achievements, ...args.newAchievements]),
    )

    await ctx.db.patch(profile._id, {
      xp: newXp,
      level: after.level,
      coins: profile.coins + coinsGained,
      streak,
      bestStreak: Math.max(profile.bestStreak, streak),
      lastPlayedDay: today,
      bestWpm: Math.max(profile.bestWpm, args.game === 'rewrite' ? args.wpm : 0),
      totalRuns: profile.totalRuns + 1,
      achievements: mergedAchievements,
      updatedAt: playedAt,
    })

    return {
      xpGained,
      coinsGained,
      leveledUp: after.level > before.level,
      newLevel: after.level,
      streak,
    }
  },
})

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return []
    return await ctx.db
      .query('runs')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit ?? 20)
  },
})
