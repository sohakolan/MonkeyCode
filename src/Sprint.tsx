// =============================================================================
// Mode SPRINT — time-attack 60 s, isolé du moteur rewrite/refactor principal.
// Enchaîne des snippets courts ; chaque snippet complété ajoute au score. Gère
// son propre timer, son éditeur et son écran de résultats (overlay plein écran).
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from './Editor'
import TargetPanel from './TargetPanel'
import { pickSprint } from './snippets'
import type { Challenge, Config } from './types'

const DURATION = 60_000

function normalize(s: string): string {
  return s
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
}

function countMismatches(doc: string, target: string): number {
  let c = 0
  for (let i = 0; i < doc.length; i++) if (i >= target.length || doc[i] !== target[i]) c++
  return c
}

type Status = 'idle' | 'running' | 'done'

interface Props {
  config: Config
  onAward: (xp: number, coins: number) => void
  onClose: () => void
}

export default function Sprint({ config, onAward, onClose }: Props) {
  // L'éditeur se comporte comme en réécriture, quel que soit le mode courant.
  const editorConfig: Config = { ...config, game: 'rewrite' }

  const [status, setStatus] = useState<Status>('idle')
  const [snippet, setSnippet] = useState<Challenge>(() => pickSprint(config.lang))
  const [runKey, setRunKey] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [completed, setCompleted] = useState(0)
  const [typed, setTyped] = useState('')

  const endAtRef = useRef(0)
  const charsScoreRef = useRef(0)
  const charsTypedRef = useRef(0)
  const errorsRef = useRef(0)
  const prevMismatchRef = useRef(0)
  const awardedRef = useRef(false)
  const statusRef = useRef(status)
  statusRef.current = status
  const snippetRef = useRef(snippet)
  snippetRef.current = snippet

  const restart = useCallback(() => {
    charsScoreRef.current = 0
    charsTypedRef.current = 0
    errorsRef.current = 0
    prevMismatchRef.current = 0
    awardedRef.current = false
    setCompleted(0)
    setTimeLeft(DURATION)
    setStatus('idle')
    setTyped('')
    setSnippet(pickSprint(config.lang))
    setRunKey((k) => k + 1)
  }, [config.lang])

  const finishSprint = useCallback(() => {
    if (awardedRef.current) return
    awardedRef.current = true
    const xp = Math.round(charsScoreRef.current * 0.45)
    const coins = Math.max(1, Math.round(xp / 8))
    onAward(xp, coins)
    setStatus('done')
  }, [onAward])

  // Décompte.
  useEffect(() => {
    if (status !== 'running') return
    const t = setInterval(() => {
      const left = Math.max(0, endAtRef.current - performance.now())
      setTimeLeft(left)
      if (left <= 0) finishSprint()
    }, 100)
    return () => clearInterval(t)
  }, [status, finishSprint])

  const onActivity = useCallback(() => {
    if (statusRef.current === 'idle') {
      endAtRef.current = performance.now() + DURATION
      setStatus('running')
    }
  }, [])

  const onDoc = useCallback(
    (doc: string, inserted: number, cur: number) => {
      if (statusRef.current === 'done') return
      setTyped(doc)
      charsTypedRef.current += inserted
      const target = snippetRef.current.target
      const judged = editorConfig.ide ? doc.slice(0, cur) : doc
      const m = countMismatches(judged, target)
      if (m > prevMismatchRef.current) errorsRef.current += m - prevMismatchRef.current
      prevMismatchRef.current = m

      if (normalize(doc) === normalize(target)) {
        // snippet complété → score + suivant
        charsScoreRef.current += target.length
        prevMismatchRef.current = 0
        setCompleted((c) => c + 1)
        setTyped('')
        setSnippet(pickSprint(config.lang, snippetRef.current.id))
        setRunKey((k) => k + 1)
      }
    },
    [config.lang, editorConfig.ide],
  )

  // Raccourcis : échap ferme, entrée rejoue (sur l'écran de fin).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (statusRef.current === 'done' && e.key === 'Enter') {
        e.preventDefault()
        restart()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, restart])

  const seconds = Math.ceil(timeLeft / 1000)
  const wpm = Math.round(charsScoreRef.current / 5) // 60 s = 1 min
  const acc = charsTypedRef.current
    ? Math.max(0, (charsTypedRef.current - errorsRef.current) / charsTypedRef.current)
    : 1

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="sprint" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="fermer">
          ✕
        </button>

        {status === 'done' ? (
          <div className="sprint-results">
            <div className="sprint-tag">sprint terminé</div>
            <div className="hero-value">{completed}</div>
            <div className="hero-label">snippets</div>
            <div className="results-grid">
              <div className="stat">
                <div className="stat-value">{wpm}</div>
                <div className="stat-label">wpm</div>
              </div>
              <div className="stat">
                <div className="stat-value">{Math.round(acc * 100)}%</div>
                <div className="stat-label">précision</div>
              </div>
              <div className="stat">
                <div className="stat-value">{charsScoreRef.current}</div>
                <div className="stat-label">caractères</div>
              </div>
            </div>
            <div className="results-hint">
              <kbd>↵</kbd> rejouer&ensp;·&ensp;<kbd>esc</kbd> fermer
            </div>
          </div>
        ) : (
          <>
            <div className="sprint-bar">
              <span className={`sprint-time ${seconds <= 10 ? 'low' : ''}`}>
                {seconds}s
              </span>
              <span className="sprint-stat">
                <b>{completed}</b> snippets
              </span>
              <span className="sprint-stat">
                <b>{wpm}</b> wpm
              </span>
              <span className="sprint-progress">
                <span
                  className="sprint-progress-fill"
                  style={{ width: `${(timeLeft / DURATION) * 100}%` }}
                />
              </span>
            </div>

            <div className="sprint-target">
              <TargetPanel mode="rewrite" target={snippet.target} typed={typed} />
            </div>

            <div className="sprint-editor panel-editor">
              <Editor
                challenge={snippet}
                config={editorConfig}
                runKey={runKey}
                onDoc={onDoc}
                onActivity={onActivity}
                onVimMode={() => {}}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
