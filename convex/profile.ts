import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { auth } from './auth'
import { levelFromXp } from './progression'

const DEFAULT_THEME = 'ember'
const STARTER_THEMES = ['ember']

async function profileForUser(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<Doc<'profiles'> | null> {
  return await ctx.db
    .query('profiles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
}

function randomHandle(userId: string): string {
  return `dev_${userId.slice(-6)}`
}

// Profil du joueur connecté (null si non authentifié).
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null
    const profile = await profileForUser(ctx, userId)
    if (!profile) return null
    return { ...profile, ...levelFromXp(profile.xp) }
  },
})

// Crée le profil au premier login si absent. Idempotent.
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error('non authentifié')
    const existing = await profileForUser(ctx, userId)
    if (existing) return existing._id
    return await ctx.db.insert('profiles', {
      userId,
      handle: randomHandle(userId),
      xp: 0,
      level: 1,
      coins: 0,
      streak: 0,
      bestStreak: 0,
      bestWpm: 0,
      totalRuns: 0,
      achievements: [],
      unlockedThemes: STARTER_THEMES,
      equippedTheme: DEFAULT_THEME,
      updatedAt: Date.now(),
    })
  },
})

async function requireProfile(ctx: MutationCtx): Promise<Doc<'profiles'>> {
  const userId = await auth.getUserId(ctx)
  if (!userId) throw new Error('non authentifié')
  const profile = await profileForUser(ctx, userId)
  if (!profile) throw new Error('profil absent — appelle profile.ensure')
  return profile
}

// Fusionne la progression locale (offline) dans le profil cloud au premier
// login. Conservateur : max sur les numériques, union sur les listes — on ne
// perd rien et on ne double-compte pas l'XP.
export const mergeLocal = mutation({
  args: {
    xp: v.number(),
    coins: v.number(),
    streak: v.number(),
    bestStreak: v.number(),
    bestWpm: v.number(),
    totalRuns: v.number(),
    achievements: v.array(v.string()),
    unlockedThemes: v.array(v.string()),
    equippedTheme: v.string(),
  },
  handler: async (ctx, a) => {
    const profile = await requireProfile(ctx)
    const xp = Math.max(profile.xp, a.xp)
    await ctx.db.patch(profile._id, {
      xp,
      level: levelFromXp(xp).level,
      coins: Math.max(profile.coins, a.coins),
      streak: Math.max(profile.streak, a.streak),
      bestStreak: Math.max(profile.bestStreak, a.bestStreak),
      bestWpm: Math.max(profile.bestWpm, a.bestWpm),
      totalRuns: Math.max(profile.totalRuns, a.totalRuns),
      achievements: Array.from(new Set([...profile.achievements, ...a.achievements])),
      unlockedThemes: Array.from(
        new Set([...profile.unlockedThemes, ...a.unlockedThemes]),
      ),
      equippedTheme: a.equippedTheme || profile.equippedTheme,
      updatedAt: Date.now(),
    })
  },
})

export const setHandle = mutation({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const profile = await requireProfile(ctx)
    const clean = handle.trim().slice(0, 20).replace(/\s+/g, '_')
    if (clean.length < 2) throw new Error('pseudo trop court')
    const taken = await ctx.db
      .query('profiles')
      .withIndex('by_handle', (q) => q.eq('handle', clean))
      .unique()
    if (taken && taken._id !== profile._id) throw new Error('pseudo déjà pris')
    await ctx.db.patch(profile._id, { handle: clean, updatedAt: Date.now() })
  },
})

export const equipTheme = mutation({
  args: { theme: v.string() },
  handler: async (ctx, { theme }) => {
    const profile = await requireProfile(ctx)
    if (!profile.unlockedThemes.includes(theme)) throw new Error('thème verrouillé')
    await ctx.db.patch(profile._id, { equippedTheme: theme, updatedAt: Date.now() })
  },
})

// Débloque un thème contre des pièces. Le catalogue/prix vit côté client
// (src/themes.ts) ; le serveur vérifie juste le solde.
export const unlockTheme = mutation({
  args: { theme: v.string(), cost: v.number() },
  handler: async (ctx, { theme, cost }) => {
    const profile = await requireProfile(ctx)
    if (profile.unlockedThemes.includes(theme)) return
    if (profile.coins < cost) throw new Error('pas assez de pièces')
    await ctx.db.patch(profile._id, {
      coins: profile.coins - cost,
      unlockedThemes: [...profile.unlockedThemes, theme],
      equippedTheme: theme,
      updatedAt: Date.now(),
    })
  },
})
