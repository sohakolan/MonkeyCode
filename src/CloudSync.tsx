// Monté uniquement quand CLOUD_ENABLED. Au premier login, garantit le profil
// cloud puis y fusionne la progression locale (une fois par session authentifiée).
import { useEffect, useRef } from 'react'
import { useConvexAuth, useMutation } from 'convex/react'
import { anyApi } from 'convex/server'
import { readPlayer } from './player'

export default function CloudSync() {
  const { isAuthenticated } = useConvexAuth()
  const ensure = useMutation(anyApi.profile.ensure)
  const mergeLocal = useMutation(anyApi.profile.mergeLocal)
  const done = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || done.current) return
    done.current = true
    const p = readPlayer()
    void (async () => {
      try {
        await ensure({})
        await mergeLocal({
          xp: p.xp,
          coins: p.coins,
          streak: p.streak,
          bestStreak: p.bestStreak,
          bestWpm: p.bestWpm,
          totalRuns: p.totalRuns,
          achievements: p.achievements,
          unlockedThemes: p.unlockedThemes,
          equippedTheme: p.equippedTheme,
        })
      } catch {
        done.current = false // on réessaiera au prochain rendu
      }
    })()
  }, [isAuthenticated, ensure, mergeLocal])

  return null
}
