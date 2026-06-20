import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from './Editor'
import TargetPanel from './TargetPanel'
import Results from './Results'
import Hud from './Hud'
import Profile from './Profile'
import { usePlayer, dailyAvailable, type RunReward } from './player'
import { CLOUD_ENABLED } from './cloudEnv'
import CloudSync from './CloudSync'
import { pickChallenge, pickDaily, dailyKey } from './snippets'
import {
  ghostKey,
  loadGhost,
  saveGhostIfBest,
  ghostMatchedAt,
  type GhostPoint,
  type GhostTimeline,
} from './ghost'
import type { Challenge, Config, GameMode, InputMode, Lang, RunResult } from './types'
import { LANG_LABEL } from './types'

const CONFIG_KEY = 'monkeycode.config.v1'
const HISTORY_KEY = 'monkeycode.history.v1'

const DEFAULT_CONFIG: Config = {
  game: 'rewrite',
  input: 'normal',
  lang: 'ts',
  autoIndent: true,
  ide: true,
}

function loadConfig(): Config {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') }
  } catch {
    return DEFAULT_CONFIG
  }
}

function loadHistory(): RunResult[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function normalize(s: string): string {
  return s
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
}

function matchedPrefix(doc: string, target: string): number {
  let i = 0
  while (i < doc.length && i < target.length && doc[i] === target[i]) i++
  return i
}

function countMismatches(doc: string, target: string): number {
  let c = 0
  for (let i = 0; i < doc.length; i++) {
    if (i >= target.length || doc[i] !== target[i]) c++
  }
  return c
}

function fmtClock(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type Status = 'idle' | 'running' | 'done'

interface RunData {
  startAt: number
  keystrokes: number
  errors: number
  prevMismatches: number
  samples: number[]
  lastSampleAt: number
  ghostPoints: GhostPoint[]
  lastGhostAt: number
}

const freshRun = (): RunData => ({
  startAt: 0,
  keystrokes: 0,
  errors: 0,
  prevMismatches: 0,
  samples: [],
  lastSampleAt: 0,
  ghostPoints: [],
  lastGhostAt: 0,
})

export default function App() {
  const [config, setConfig] = useState<Config>(loadConfig)
  const [challenge, setChallenge] = useState<Challenge>(() => {
    const c = loadConfig()
    return pickChallenge(c.game, c.lang)
  })
  const [runKey, setRunKey] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [typed, setTyped] = useState(challenge.start)
  const [cursor, setCursor] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [vimMode, setVimMode] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [isRecord, setIsRecord] = useState(false)
  const [reward, setReward] = useState<RunReward | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const { player, recordRun, buyTheme, equipTheme } = usePlayer()
  const recordRunRef = useRef(recordRun)
  recordRunRef.current = recordRun

  const [ghostMatched, setGhostMatched] = useState(0)
  const [hasGhost, setHasGhost] = useState(false)
  const run = useRef<RunData>(freshRun())
  const ghostRef = useRef<GhostTimeline | null>(null)
  const isDailyRef = useRef(false)
  const statusRef = useRef(status)
  statusRef.current = status
  const typedRef = useRef(typed)
  typedRef.current = typed
  const challengeRef = useRef(challenge)
  challengeRef.current = challenge
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  }, [config])

  const reset = useCallback((nextChallenge: Challenge, daily = false) => {
    run.current = freshRun()
    isDailyRef.current = daily
    const c = configRef.current
    ghostRef.current =
      c.game === 'rewrite' ? loadGhost(ghostKey(c, nextChallenge.id)) : null
    setHasGhost(Boolean(ghostRef.current))
    setGhostMatched(0)
    setChallenge(nextChallenge)
    setTyped(nextChallenge.start)
    setCursor(0)
    setElapsed(0)
    setStatus('idle')
    setResult(null)
    setIsRecord(false)
    setReward(null)
    setRunKey((k) => k + 1)
  }, [])

  const retry = useCallback(() => reset(challengeRef.current, isDailyRef.current), [reset])

  const next = useCallback(() => {
    const c = configRef.current
    reset(pickChallenge(c.game, c.lang, challengeRef.current.id))
  }, [reset])

  const playDaily = useCallback(() => {
    const { lang, challenge } = pickDaily()
    setConfig((cfg) => ({ ...cfg, game: 'rewrite', lang }))
    reset(challenge, true)
  }, [reset])

  const applyConfig = useCallback(
    (patch: Partial<Config>) => {
      const merged = { ...configRef.current, ...patch }
      setConfig(merged)
      if (patch.game !== undefined || patch.lang !== undefined) {
        reset(pickChallenge(merged.game, merged.lang))
      } else {
        reset(challengeRef.current)
      }
    },
    [reset],
  )

  const finish = useCallback(() => {
    const c = configRef.current
    const ch = challengeRef.current
    const r = run.current
    const timeMs = Math.max(performance.now() - (r.startAt || performance.now()), 500)
    const minutes = timeMs / 60000
    const wpm = ch.target.length / 5 / minutes
    const raw = r.keystrokes / 5 / minutes
    const accuracy = r.keystrokes
      ? Math.max(0, (r.keystrokes - r.errors) / r.keystrokes)
      : 1
    const mean = r.samples.length
      ? r.samples.reduce((a, b) => a + b, 0) / r.samples.length
      : wpm
    const sd = r.samples.length
      ? Math.sqrt(r.samples.reduce((a, b) => a + (b - mean) ** 2, 0) / r.samples.length)
      : 0
    const consistency = mean ? Math.max(0, 1 - sd / mean) : 1

    const res: RunResult = {
      date: Date.now(),
      game: c.game,
      input: c.input,
      ide: c.ide,
      lang: c.lang,
      snippetId: ch.id,
      timeMs,
      wpm,
      raw,
      accuracy,
      errors: r.errors,
      keystrokes: r.keystrokes,
      consistency,
      samples: r.samples.slice(-120),
    }

    const history = loadHistory()
    const comparable =
      c.game === 'rewrite'
        ? history.filter(
            (h) =>
              h.game === 'rewrite' &&
              h.lang === c.lang &&
              h.input === c.input &&
              (h.ide ?? false) === c.ide,
          )
        : history.filter(
            (h) =>
              h.game === 'refactor' &&
              h.snippetId === ch.id &&
              h.input === c.input &&
              (h.ide ?? false) === c.ide,
          )
    const beaten =
      comparable.length > 0 &&
      (c.game === 'rewrite'
        ? comparable.every((h) => h.wpm < res.wpm)
        : comparable.every((h) => h.timeMs > res.timeMs))

    history.push(res)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200)))

    if (c.game === 'rewrite') {
      const timeline: GhostTimeline = {
        points: [...r.ghostPoints, { t: res.timeMs, m: ch.target.length }],
        targetLen: ch.target.length,
        wpm: res.wpm,
        timeMs: res.timeMs,
      }
      saveGhostIfBest(ghostKey(c, ch.id), timeline)
    }

    setResult(res)
    setIsRecord(beaten)
    setReward(recordRunRef.current(res, { daily: isDailyRef.current }))
    setStatus('done')
  }, [])

  const onActivity = useCallback(() => {
    if (statusRef.current === 'idle') {
      run.current.startAt = performance.now()
      run.current.lastSampleAt = performance.now()
      setStatus('running')
    }
  }, [])

  const onDoc = useCallback(
    (doc: string, inserted: number, cur: number) => {
      if (statusRef.current === 'done') return
      setTyped(doc)
      setCursor(cur)
      const ch = challengeRef.current
      const c = configRef.current
      const r = run.current
      r.keystrokes += inserted
      if (c.game === 'rewrite') {
        // En mode IDE, ce qui suit le curseur (brackets auto-fermés) n'est
        // pas encore jugé.
        const judged = c.ide ? doc.slice(0, cur) : doc
        const m = countMismatches(judged, ch.target)
        if (m > r.prevMismatches) r.errors += m - r.prevMismatches
        r.prevMismatches = m
      }
      if (normalize(doc) === normalize(ch.target)) finish()
    },
    [finish],
  )

  // Horloge + échantillons wpm pendant la course.
  useEffect(() => {
    if (status !== 'running') return
    const t = setInterval(() => {
      const now = performance.now()
      const el = now - run.current.startAt
      setElapsed(el)
      const matched = matchedPrefix(typedRef.current, challengeRef.current.target)
      if (now - run.current.lastSampleAt >= 1000 && el > 1500) {
        run.current.lastSampleAt = now
        run.current.samples.push(matched / 5 / (el / 60000))
      }
      // Timeline ghost (toutes les ~250ms) + position du fantôme.
      if (now - run.current.lastGhostAt >= 250) {
        run.current.lastGhostAt = now
        run.current.ghostPoints.push({ t: el, m: matched })
      }
      if (ghostRef.current) setGhostMatched(ghostMatchedAt(ghostRef.current, el))
    }, 100)
    return () => clearInterval(t)
  }, [status, runKey])

  // Raccourcis globaux.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        next()
        return
      }
      if (mod && e.key === 'Backspace') {
        e.preventDefault()
        retry()
        return
      }
      if (statusRef.current === 'done') {
        if (e.key === 'Enter') {
          e.preventDefault()
          next()
        } else if (e.key === 'Backspace') {
          e.preventDefault()
          retry()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [next, retry])

  // Stats live.
  const dailyReady = dailyAvailable(player, dailyKey())
  const target = challenge.target
  // En IDE, la cible ne juge que ce qui précède le curseur.
  const ghostTyped =
    config.game === 'rewrite' && config.ide ? typed.slice(0, cursor) : typed
  const matched = matchedPrefix(typed, target)
  const minutes = elapsed / 60000
  const liveWpm = status === 'running' && minutes > 0.02 ? matched / 5 / minutes : 0
  const liveAcc = run.current.keystrokes
    ? Math.max(0, (run.current.keystrokes - run.current.errors) / run.current.keystrokes)
    : 1
  const targetLines = target.split('\n')
  const typedLines = typed.split('\n')
  const linesOk = targetLines.filter((l, i) => typedLines[i] === l).length
  const progress =
    config.game === 'rewrite' ? matched / target.length : linesOk / targetLines.length
  const ghostPct = target.length ? ghostMatched / target.length : 0
  const ghostDelta = matched - ghostMatched

  return (
    <div className="app">
      {CLOUD_ENABLED && <CloudSync />}
      <header className="topbar">
        <div className="logo">
          monkey<span className="logo-accent">_code</span>
          <span className="logo-caret" />
        </div>

        <nav className="configbar" aria-label="configuration">
          <div className="cfg-group">
            {(['rewrite', 'refactor'] as GameMode[]).map((g) => (
              <button
                key={g}
                className={config.game === g ? 'cfg on' : 'cfg'}
                onClick={() => applyConfig({ game: g })}
              >
                {g === 'rewrite' ? 'réécrire' : 'modifier'}
              </button>
            ))}
          </div>
          <span className="cfg-sep" />
          <div className="cfg-group">
            {(['ts', 'py', 'rs', 'go'] as Lang[]).map((l) => (
              <button
                key={l}
                className={config.lang === l ? 'cfg on' : 'cfg'}
                onClick={() => applyConfig({ lang: l })}
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>
          <span className="cfg-sep" />
          <div className="cfg-group">
            {(['normal', 'vim'] as InputMode[]).map((m) => (
              <button
                key={m}
                className={config.input === m ? 'cfg on' : 'cfg'}
                onClick={() => applyConfig({ input: m })}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="cfg-sep" />
          <button
            className={config.ide ? 'cfg on' : 'cfg'}
            onClick={() => applyConfig({ ide: !config.ide })}
            title="auto-fermeture des brackets, complétion (tab) et snippets, comme dans un IDE"
          >
            ide
          </button>
          {config.game === 'rewrite' && (
            <button
              className={config.autoIndent ? 'cfg on' : 'cfg'}
              onClick={() => applyConfig({ autoIndent: !config.autoIndent })}
              title="à la ligne, l'indentation de la cible est insérée pour toi"
            >
              indent auto
            </button>
          )}
        </nav>

        <button
          className={`daily-btn ${dailyReady ? 'ready' : ''}`}
          onClick={playDaily}
          title="défi du jour — même exercice pour tout le monde, bonus une fois par jour"
        >
          ⚡ défi du jour
          {dailyReady && <span className="daily-dot" />}
        </button>

        <Hud player={player} onOpenProfile={() => setProfileOpen(true)} />
      </header>

      <div
        className={`livebar ${status === 'running' ? 'is-live' : ''} ${status === 'done' ? 'is-done' : ''}`}
      >
        <span className="live-item live-time">{fmtClock(elapsed)}</span>
        {config.game === 'rewrite' ? (
          <>
            <span className="live-item">
              <b>{Math.round(liveWpm)}</b> wpm
            </span>
            <span className="live-item">
              <b>{Math.round(liveAcc * 100)}%</b> acc
            </span>
            {hasGhost && status === 'running' && (
              <span className={`live-ghost ${ghostDelta >= 0 ? 'ahead' : 'behind'}`}>
                {ghostDelta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(ghostDelta))}
                <span className="live-ghost-tag">ghost</span>
              </span>
            )}
          </>
        ) : (
          <span className="live-item">
            <b>{linesOk}</b>/{targetLines.length} lignes
          </span>
        )}
        <span className="live-progress">
          <span
            className="live-progress-fill"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
          {hasGhost && (
            <span
              className="live-progress-ghost"
              style={{ left: `${Math.min(ghostPct * 100, 100)}%` }}
            />
          )}
        </span>
      </div>

      {status === 'done' && result ? (
        <main className="stage">
          <Results
            result={result}
            isRecord={isRecord}
            snippetTitle={challenge.title}
            reward={reward}
          />
        </main>
      ) : (
        <main className="stage panels" key={`${challenge.id}-${runKey}`}>
          <section className="panel panel-target">
            <div className="panel-head">
              <span className="panel-tag">cible</span>
              <span className="panel-title">{challenge.title}</span>
              {challenge.hint && <span className="panel-hint">{challenge.hint}</span>}
            </div>
            <div className="panel-body">
              <TargetPanel mode={config.game} target={target} typed={ghostTyped} />
            </div>
          </section>

          <section className="panel panel-editor">
            <div className="panel-head">
              <span className="panel-tag">éditeur</span>
              <span className="panel-title">
                {config.game === 'refactor' ? 'transforme le code' : 'recopie le code'}
              </span>
              {config.input === 'vim' && vimMode && (
                <span className={`vim-badge vim-${vimMode.split(' ')[0]}`}>{vimMode}</span>
              )}
            </div>
            <div className="panel-body">
              <Editor
                challenge={challenge}
                config={config}
                runKey={runKey}
                onDoc={onDoc}
                onActivity={onActivity}
                onVimMode={setVimMode}
              />
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <span>
          <kbd>⌘↵</kbd> nouvel exercice
        </span>
        <span>
          <kbd>⌘⌫</kbd> recommencer
        </span>
        {config.ide && (
          <span>
            <kbd>tab</kbd> compléter / snippets (fn, forof, iferr…)
          </span>
        )}
        {config.game === 'refactor' && (
          <span className="footer-goal">objectif : chaque ligne doit correspondre à la cible</span>
        )}
      </footer>

      {profileOpen && (
        <Profile
          player={player}
          buyTheme={buyTheme}
          equipTheme={equipTheme}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  )
}
