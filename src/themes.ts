// =============================================================================
// Thèmes déblocables — la « boutique » de récompenses. Chaque thème réécrit les
// variables CSS du :root. `ember` est offert ; les autres coûtent des pièces
// et/ou demandent un niveau minimum.
// =============================================================================

export interface ThemeVars {
  bg: string
  bgRaise: string
  panel: string
  panelEdge: string
  fg: string
  ink: string
  inkFaint: string
  accent: string
  accentRgb: string
  accentDim: string
  error: string
  ok: string
}

export interface Theme {
  id: string
  name: string
  cost: number // pièces
  minLevel: number
  vars: ThemeVars
}

export const THEMES: Theme[] = [
  {
    id: 'ember',
    name: 'ember',
    cost: 0,
    minLevel: 1,
    vars: {
      bg: '#0b0d11', bgRaise: '#10131a', panel: '#12151d', panelEdge: '#1d2230',
      fg: '#d6dbe5', ink: '#8b93a3', inkFaint: '#4d5566',
      accent: '#ffb454', accentRgb: '255, 180, 84', accentDim: '#8a6a3a',
      error: '#ff5562', ok: '#9ece6a',
    },
  },
  {
    id: 'mint',
    name: 'mint terminal',
    cost: 120,
    minLevel: 3,
    vars: {
      bg: '#0a0f0d', bgRaise: '#0e1512', panel: '#101814', panelEdge: '#1c2a24',
      fg: '#d7e5dd', ink: '#86a397', inkFaint: '#4a665a',
      accent: '#5fe0a8', accentRgb: '95, 224, 168', accentDim: '#3a8a66',
      error: '#ff6b81', ok: '#9ece6a',
    },
  },
  {
    id: 'ice',
    name: 'arctic',
    cost: 160,
    minLevel: 5,
    vars: {
      bg: '#080b12', bgRaise: '#0c1018', panel: '#0e131d', panelEdge: '#1a2436',
      fg: '#d4e2f5', ink: '#8493ad', inkFaint: '#4a5772',
      accent: '#6cc6ff', accentRgb: '108, 198, 255', accentDim: '#3a6e8a',
      error: '#ff6b81', ok: '#7fe0c4',
    },
  },
  {
    id: 'synthwave',
    name: 'synthwave',
    cost: 240,
    minLevel: 8,
    vars: {
      bg: '#120a1c', bgRaise: '#180e26', panel: '#1a1030', panelEdge: '#2c1a48',
      fg: '#f3d9ff', ink: '#a98bc7', inkFaint: '#6a4f88',
      accent: '#ff6ad5', accentRgb: '255, 106, 213', accentDim: '#8a3a76',
      error: '#ff5562', ok: '#72f1b8',
    },
  },
  {
    id: 'matrix',
    name: 'matrix',
    cost: 320,
    minLevel: 12,
    vars: {
      bg: '#060a06', bgRaise: '#0a100a', panel: '#0b130b', panelEdge: '#172517',
      fg: '#c8f7c8', ink: '#6fae6f', inkFaint: '#3e603e',
      accent: '#39ff84', accentRgb: '57, 255, 132', accentDim: '#2a8a4e',
      error: '#ff5562', ok: '#39ff84',
    },
  },
  {
    id: 'rose',
    name: 'rosé pine',
    cost: 280,
    minLevel: 10,
    vars: {
      bg: '#12090f', bgRaise: '#180c14', panel: '#1b0e17', panelEdge: '#301a28',
      fg: '#f0d6e2', ink: '#b387a0', inkFaint: '#724d63',
      accent: '#ff8fb0', accentRgb: '255, 143, 176', accentDim: '#8a4f64',
      error: '#ff5562', ok: '#9ece6a',
    },
  },
  {
    id: 'gold',
    name: 'gold master',
    cost: 600,
    minLevel: 20,
    vars: {
      bg: '#0c0a06', bgRaise: '#12100a', panel: '#15120b', panelEdge: '#2a2414',
      fg: '#f5ecd4', ink: '#b3a884', inkFaint: '#726a4d',
      accent: '#ffd54a', accentRgb: '255, 213, 74', accentDim: '#8a7a3a',
      error: '#ff5562', ok: '#cfe06a',
    },
  },
]

export const THEME_BY_ID: Record<string, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
)

export function applyTheme(id: string): void {
  const theme = THEME_BY_ID[id] ?? THEMES[0]
  const r = document.documentElement.style
  const v = theme.vars
  r.setProperty('--bg', v.bg)
  r.setProperty('--bg-raise', v.bgRaise)
  r.setProperty('--panel', v.panel)
  r.setProperty('--panel-edge', v.panelEdge)
  r.setProperty('--fg', v.fg)
  r.setProperty('--ink', v.ink)
  r.setProperty('--ink-faint', v.inkFaint)
  r.setProperty('--accent', v.accent)
  r.setProperty('--accent-rgb', v.accentRgb)
  r.setProperty('--accent-dim', v.accentDim)
  r.setProperty('--error', v.error)
  r.setProperty('--ok', v.ok)
}
