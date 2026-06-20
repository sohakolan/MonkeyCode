// =============================================================================
// Gestion des données locales : export / import / reset de toute la progression
// (profil, historique, ghosts, records sprint, config). Permet de ne rien perdre
// avant la liaison Convex, et de migrer entre appareils/navigateurs.
// =============================================================================

const KEYS = [
  'monkeycode.player.v1',
  'monkeycode.history.v1',
  'monkeycode.ghosts.v1',
  'monkeycode.sprintBest.v1',
  'monkeycode.config.v1',
] as const

interface Backup {
  app: 'monkeycode'
  version: 1
  exportedAt: number
  data: Record<string, unknown>
}

/** Sérialise toute la progression en JSON. */
export function exportData(): string {
  const data: Record<string, unknown> = {}
  for (const k of KEYS) {
    const raw = localStorage.getItem(k)
    if (raw == null) continue
    try {
      data[k] = JSON.parse(raw)
    } catch {
      // valeur corrompue : on l'ignore
    }
  }
  const backup: Backup = {
    app: 'monkeycode',
    version: 1,
    exportedAt: Date.now(),
    data,
  }
  return JSON.stringify(backup, null, 2)
}

/** Restaure depuis un export. Renvoie false si le format est invalide. */
export function importData(json: string): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return false
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as Backup).app !== 'monkeycode' ||
    typeof (parsed as Backup).data !== 'object'
  ) {
    return false
  }
  const { data } = parsed as Backup
  for (const k of KEYS) {
    if (k in data) localStorage.setItem(k, JSON.stringify(data[k]))
  }
  return true
}

/** Efface toute la progression locale. */
export function resetProgress(): void {
  for (const k of KEYS) localStorage.removeItem(k)
}
