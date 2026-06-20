import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

// =============================================================================
// monkey_code — schéma Convex
//
// Tout passe par des fonctions serverless Convex (queries / mutations) : aucune
// compute Vercel n'est consommée. Le front reste 100 % statique sur Vercel et
// parle à Convex via VITE_CONVEX_URL.
//
// Pour lier : `npx convex dev` (génère convex/_generated + l'URL de déploiement).
// =============================================================================

export default defineSchema({
  // Tables d'authentification (@convex-dev/auth) : users, accounts, sessions…
  ...authTables,

  // Profil de progression d'un joueur (1 ↔ 1 avec users).
  profiles: defineTable({
    userId: v.id('users'),
    handle: v.string(),
    xp: v.number(),
    level: v.number(),
    coins: v.number(),
    streak: v.number(),
    bestStreak: v.number(),
    lastPlayedDay: v.optional(v.string()), // 'YYYY-MM-DD' en heure locale du joueur
    bestWpm: v.number(),
    totalRuns: v.number(),
    achievements: v.array(v.string()), // ids débloqués
    unlockedThemes: v.array(v.string()),
    equippedTheme: v.string(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_handle', ['handle'])
    .index('by_xp', ['xp'])
    .index('by_bestWpm', ['bestWpm']),

  // Historique des runs terminés (alimente stats + classements).
  runs: defineTable({
    userId: v.id('users'),
    game: v.string(), // 'rewrite' | 'refactor'
    lang: v.string(), // 'ts' | 'py' | 'rs' | 'go'
    input: v.string(), // 'normal' | 'vim'
    ide: v.boolean(),
    snippetId: v.string(),
    wpm: v.number(),
    raw: v.number(),
    accuracy: v.number(),
    errors: v.number(),
    consistency: v.number(),
    timeMs: v.number(),
    xpGained: v.number(),
    playedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_lang_wpm', ['lang', 'wpm'])
    .index('by_user_lang', ['userId', 'lang']),
})
