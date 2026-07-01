export type GameMode = 'rewrite' | 'refactor'
export type InputMode = 'normal' | 'vim'
export type Lang = 'ts' | 'py' | 'rs' | 'go' | 'c'

export interface RewriteSnippet {
  id: string
  lang: Lang
  title: string
  code: string
}

export interface RefactorSnippet {
  id: string
  lang: Lang
  title: string
  hint: string
  before: string
  after: string
}

export interface Config {
  game: GameMode
  input: InputMode
  lang: Lang
  autoIndent: boolean
  ide: boolean
  sound: boolean
}

export interface Challenge {
  id: string
  title: string
  hint?: string
  start: string
  target: string
}

export interface RunResult {
  date: number
  game: GameMode
  input: InputMode
  ide: boolean
  lang: Lang
  snippetId: string
  timeMs: number
  wpm: number
  raw: number
  accuracy: number
  errors: number
  keystrokes: number
  consistency: number
  samples: number[]
}

export const LANG_LABEL: Record<Lang, string> = {
  ts: 'typescript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  c: 'c',
}

// Ordre d'affichage dans le sélecteur de langage.
export const LANGS: Lang[] = ['ts', 'py', 'rs', 'go', 'c']

export const INDENT: Record<Lang, number> = { ts: 2, py: 4, rs: 4, go: 4, c: 4 }
