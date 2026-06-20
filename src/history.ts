// Historique local des runs terminés (source unique de vérité côté front).
import type { RunResult } from './types'

const HISTORY_KEY = 'monkeycode.history.v1'

export function loadHistory(): RunResult[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveHistory(history: RunResult[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200)))
}
