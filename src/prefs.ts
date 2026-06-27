// =============================================================================
// Préférences d'apparence & d'affichage (offline-first, localStorage).
// Séparé de `Config` (qui décrit le *jeu* : mode, langue, input…) : ici on ne
// touche qu'au confort visuel et sonore, jamais à la nature d'un run.
//
// `applyPrefs` projette les préférences sur des variables/attributs CSS du
// :root — la feuille de styles et le thème CodeMirror s'y accrochent, ce qui
// garde la personnalisation découplée du rendu.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SoundPack } from './sound'

export type CaretStyle = 'line' | 'block' | 'underline'
export type FontId = 'jetbrains' | 'martian' | 'plex' | 'fira'
export type { SoundPack }

export interface FontDef {
  id: FontId
  label: string
  stack: string
}

// Toutes ces familles sont chargées dans index.html (Google Fonts).
export const FONTS: FontDef[] = [
  { id: 'jetbrains', label: 'JetBrains Mono', stack: "'JetBrains Mono', ui-monospace, monospace" },
  { id: 'martian', label: 'Martian Mono', stack: "'Martian Mono', ui-monospace, monospace" },
  { id: 'plex', label: 'IBM Plex Mono', stack: "'IBM Plex Mono', ui-monospace, monospace" },
  { id: 'fira', label: 'Fira Code', stack: "'Fira Code', ui-monospace, monospace" },
]

export const FONT_BY_ID: Record<FontId, FontDef> = Object.fromEntries(
  FONTS.map((f) => [f.id, f]),
) as Record<FontId, FontDef>

export interface Prefs {
  // apparence
  font: FontId
  fontSize: number // px de l'éditeur (13 → 22)
  caret: CaretStyle
  caretBlink: boolean
  smoothCaret: boolean
  // affichage pendant un run
  liveSpeed: boolean // wpm en direct
  showProgress: boolean
  showGhost: boolean
  showClock: boolean
  blindMode: boolean // masque le surlignage des erreurs
  // son
  soundVolume: number // 0 → 1
  soundPack: SoundPack
  quickRestart: boolean // Tab relance le run
}

export const DEFAULT_PREFS: Prefs = {
  font: 'jetbrains',
  fontSize: 15,
  caret: 'line',
  caretBlink: true,
  smoothCaret: true,
  liveSpeed: true,
  showProgress: true,
  showGhost: true,
  showClock: true,
  blindMode: false,
  soundVolume: 0.5,
  soundPack: 'click',
  quickRestart: true,
}

const KEY = 'monkeycode.prefs.v1'

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function savePrefs(p: Prefs) {
  localStorage.setItem(KEY, JSON.stringify(p))
}

/** Projette les préférences visuelles sur le :root (vars + attributs data-*). */
export function applyPrefs(p: Prefs): void {
  const root = document.documentElement
  root.style.setProperty('--mono', FONT_BY_ID[p.font]?.stack ?? FONTS[0].stack)
  root.style.setProperty('--editor-font-size', `${p.fontSize}px`)
  root.dataset.caret = p.caret
  root.dataset.caretBlink = p.caretBlink ? 'on' : 'off'
  root.dataset.smoothCaret = p.smoothCaret ? 'on' : 'off'
  root.dataset.blind = p.blindMode ? 'on' : 'off'
}

export interface PrefsApi {
  prefs: Prefs
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  resetPrefs: () => void
}

export function usePrefs(): PrefsApi {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const ref = useRef(prefs)

  useEffect(() => {
    ref.current = prefs
    savePrefs(prefs)
    applyPrefs(prefs)
  }, [prefs])

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }, [])

  const resetPrefs = useCallback(() => setPrefs({ ...DEFAULT_PREFS }), [])

  return { prefs, setPref, resetPrefs }
}
