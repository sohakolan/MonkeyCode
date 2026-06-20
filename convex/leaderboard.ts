import { v } from 'convex/values'
import { query } from './_generated/server'

// Classement par XP (progression globale).
export const byXp = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query('profiles')
      .withIndex('by_xp')
      .order('desc')
      .take(limit ?? 50)
    return rows.map((p, i) => ({
      rank: i + 1,
      handle: p.handle,
      level: p.level,
      xp: p.xp,
      bestWpm: p.bestWpm,
      streak: p.streak,
    }))
  },
})

// Classement par meilleur wpm (vitesse pure).
export const bySpeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query('profiles')
      .withIndex('by_bestWpm')
      .order('desc')
      .take(limit ?? 50)
    return rows.map((p, i) => ({
      rank: i + 1,
      handle: p.handle,
      level: p.level,
      bestWpm: p.bestWpm,
    }))
  },
})

// Meilleur run par langage (records communautaires).
export const topByLang = query({
  args: { lang: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { lang, limit }) => {
    return await ctx.db
      .query('runs')
      .withIndex('by_lang_wpm', (q) => q.eq('lang', lang))
      .order('desc')
      .take(limit ?? 20)
  },
})
