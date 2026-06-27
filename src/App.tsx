import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type EditorHandle } from './Editor'
import TargetPanel from './TargetPanel'
import Results from './Results'
import Hud from './Hud'
import ProfilePage from './ProfilePage'
import Settings from './Settings'
import Leaderboard from './Leaderboard'
import Sprint from './Sprint'
import Onboarding from './Onboarding'

const ONBOARDED_KEY = 'monkeycode.onboarded.v1'
import { usePlayer, dailyAvailable, type RunReward } from './player'
import { usePrefs } from './prefs'
import { loadHistory, saveHistory } from './history'
import { resetProgress } from './data'
import { CLOUD_ENABLED } from './cloudEnv'
import CloudSync from './CloudSync'
import AuthModal from './AuthModal'
import { playKey, playError, playFinish, setSoundPrefs } from './sound'
import { pickChallenge, pickDaily, pickDrill, dailyKey } from './snippets'
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

type View = 'type' | 'leaderboard' | 'profile' | 'settings'
const NAV: { id: View; label: string }[] = [
  { id: 'type', label: 'taper' },
  { id: 'leaderboard', label: 'classement' },
  { id: 'profile', label: 'profil' },
  { id: 'settings', label: 'paramètres' },
]

const DEFAULT_CONFIG: Config = {
  game: 'rewrite',
  input: 'normal',
  lang: 'ts',
  autoIndent: true,
  ide: true,
  sound: false,
}

function loadConfig(): Config {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') }
  } catch {
    return DEFAULT_CONFIG
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
  charErrors: Record<string, number>
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
  charErrors: {},
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
  const [view, setView] = useState<View>('type')
  const [sprintOpen, setSprintOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [editorFocused, setEditorFocused] = useState(true)
  const editorRef = useRef<EditorHandle>(null)
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(ONBOARDED_KEY),
  )
  // Vrai dès qu'une modale (ou une vue hors-jeu) capte le clavier → neutralise
  // les raccourcis globaux.
  const modalOpenRef = useRef(false)

  const { player, recordRun, buyTheme, equipTheme, awardSprint } = usePlayer()
  const { prefs, setPref, resetPrefs } = usePrefs()
  const recordRunRef = useRef(recordRun)
  recordRunRef.current = recordRun
  const quickRestartRef = useRef(prefs.quickRestart)
  quickRestartRef.current = prefs.quickRestart

  // Volume / ambiance sonore appliqués au moteur audio.
  useEffect(() => {
    setSoundPrefs(prefs.soundVolume, prefs.soundPack)
  }, [prefs.soundVolume, prefs.soundPack])

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
    setView('type')
    reset(challenge, true)
  }, [reset])

  const playDrill = useCallback(
    (weak: Record<string, number>) => {
      const c = configRef.current
      setConfig((cfg) => ({ ...cfg, game: 'rewrite' }))
      setView('type')
      reset(pickDrill(c.lang, weak, challengeRef.current.id))
    },
    [reset],
  )

  const applyConfig = useCallback(
    (patch: Partial<Config>) => {
      const merged = { ...configRef.current, ...patch }
      setConfig(merged)
      // Le son n'affecte ni le challenge ni l'éditeur → inutile de relancer.
      const onlySound = Object.keys(patch).every((k) => k === 'sound')
      if (onlySound) return
      if (patch.game !== undefined || patch.lang !== undefined) {
        reset(pickChallenge(merged.game, merged.lang))
      } else {
        reset(challengeRef.current)
      }
    },
    [reset],
  )

  const onResetProgress = useCallback(() => {
    resetProgress()
    location.reload()
  }, [])

  // Navigation : quitter « taper » pendant une course l'annule proprement,
  // sinon l'éditeur se remonterait à vide en gardant un état « en cours ».
  const goView = useCallback(
    (v: View) => {
      if (v !== 'type' && statusRef.current === 'running') retry()
      setView(v)
    },
    [retry],
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
    saveHistory(history)

    if (c.game === 'rewrite') {
      const timeline: GhostTimeline = {
        points: [...r.ghostPoints, { t: res.timeMs, m: ch.target.length }],
        targetLen: ch.target.length,
        wpm: res.wpm,
        timeMs: res.timeMs,
      }
      saveGhostIfBest(ghostKey(c, ch.id), timeline)
    }

    if (c.sound) playFinish()
    setResult(res)
    setIsRecord(beaten)
    setReward(
      recordRunRef.current(res, {
        daily: isDailyRef.current,
        charErrors: r.charErrors,
      }),
    )
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
      const errorsBefore = r.errors
      if (c.game === 'rewrite') {
        // En mode IDE, ce qui suit le curseur (brackets auto-fermés) n'est
        // pas encore jugé.
        const judged = c.ide ? doc.slice(0, cur) : doc
        const m = countMismatches(judged, ch.target)
        if (m > r.prevMismatches) {
          r.errors += m - r.prevMismatches
          // Attribue l'erreur au caractère cible attendu à la frontière.
          const expected = ch.target[matchedPrefix(judged, ch.target)]
          if (expected && expected !== '\n') {
            r.charErrors[expected] = (r.charErrors[expected] ?? 0) + 1
          }
        }
        r.prevMismatches = m
      }
      if (c.sound && inserted > 0) {
        if (r.errors > errorsBefore) playError()
        else playKey()
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

  // Raccourcis globaux (uniquement sur la vue « taper », hors modale).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpenRef.current) return
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
        if (e.key === 'Enter' || (quickRestartRef.current && e.key === 'Tab')) {
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

  // « tape pour commencer » : si l'éditeur a perdu le focus, une frappe normale
  // (hors raccourci/navigation) le récupère immédiatement → l'utilisateur n'a
  // jamais l'impression de taper dans le vide.
  useEffect(() => {
    if (view !== 'type' || editorFocused) return
    const onKey = (e: KeyboardEvent) => {
      if (modalOpenRef.current || statusRef.current === 'done') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Tab') {
        editorRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, editorFocused])

  // Une modale ouverte OU une vue hors-jeu neutralise les raccourcis de course.
  modalOpenRef.current =
    sprintOpen || showOnboarding || accountOpen || view !== 'type'

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
  const showGhost = prefs.showGhost && hasGhost
  // Historique relu à chaque entrée sur le profil (capte les runs récents),
  // mémoïsé pour ne pas invalider les useMemo internes de ProfilePage.
  const profileHistory = useMemo(
    () => (view === 'profile' ? loadHistory() : []),
    [view],
  )

  return (
    <div className="app">
      {CLOUD_ENABLED && <CloudSync />}

      <header className="topbar">
        <button className="logo" onClick={() => goView('type')} aria-label="accueil">
          monkey<span className="logo-accent">_code</span>
          <span className="logo-caret" />
        </button>

        <nav className="mainnav" aria-label="navigation principale">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'navlink on' : 'navlink'}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => goView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          {CLOUD_ENABLED && (
            <button
              className="accountbtn"
              onClick={() => setAccountOpen(true)}
              title="crée un compte pour synchroniser ta progression sur tous tes appareils"
            >
              <span className="accountbtn-glyph">⛁</span>
              <span className="accountbtn-label">compte</span>
            </button>
          )}
          <Hud player={player} onOpenProfile={() => goView('profile')} />
        </div>
      </header>

      {view === 'type' && (
        <>
          <div className="typebar">
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
              <button
                className={config.sound ? 'cfg on' : 'cfg'}
                onClick={() => applyConfig({ sound: !config.sound })}
                title="retour sonore : clic de touche, blip d'erreur, accord de fin"
              >
                son
              </button>
            </nav>

            <div className="topbar-actions">
              <button
                className="daily-btn"
                onClick={() => setSprintOpen(true)}
                title="sprint — enchaîne un max de snippets courts en 60 secondes"
              >
                ▶ sprint
              </button>

              {Object.keys(player.weakKeys).length > 0 && (
                <button
                  className="daily-btn"
                  onClick={() => playDrill(player.weakKeys)}
                  title="drill — exercice ciblé sur tes touches les plus faibles"
                >
                  ◎ drill
                </button>
              )}

              <button
                className={`daily-btn ${dailyReady ? 'ready' : ''}`}
                onClick={playDaily}
                title="défi du jour — même exercice pour tout le monde, bonus une fois par jour"
              >
                ⚡ défi du jour
                {dailyReady && <span className="daily-dot" />}
              </button>
            </div>
          </div>

          <div
            className={`livebar ${status === 'running' ? 'is-live' : ''} ${status === 'done' ? 'is-done' : ''}`}
          >
            {prefs.showClock && (
              <span className="live-item live-time">{fmtClock(elapsed)}</span>
            )}
            {config.game === 'rewrite' ? (
              <>
                {prefs.liveSpeed && (
                  <>
                    <span className="live-item">
                      <b>{Math.round(liveWpm)}</b> wpm
                    </span>
                    <span className="live-item">
                      <b>{Math.round(liveAcc * 100)}%</b> acc
                    </span>
                  </>
                )}
                {showGhost && status === 'running' && (
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
            {prefs.showProgress && (
              <span className="live-progress">
                <span
                  className="live-progress-fill"
                  style={{ width: `${Math.min(progress * 100, 100)}%` }}
                />
                {showGhost && (
                  <span
                    className="live-progress-ghost"
                    style={{ left: `${Math.min(ghostPct * 100, 100)}%` }}
                  />
                )}
              </span>
            )}
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
              <section className="panel panel-target" aria-label="modèle à recopier">
                <div className="panel-head">
                  <span className="panel-tag">cible</span>
                  <span className="panel-title">{challenge.title}</span>
                  <span className="panel-readonly" title="ce panneau sert de modèle — tu tapes à droite">
                    lecture seule
                  </span>
                  {challenge.hint && <span className="panel-hint">{challenge.hint}</span>}
                </div>
                <div className="panel-body">
                  <TargetPanel mode={config.game} target={target} typed={ghostTyped} />
                </div>
              </section>

              <section
                className={`panel panel-editor${editorFocused ? ' is-focused' : ''}`}
                aria-label="zone de saisie"
              >
                <div className="panel-head">
                  <span className="panel-tag">éditeur</span>
                  <span className="panel-title">
                    {config.game === 'refactor'
                      ? 'transforme le code ici'
                      : 'recopie le code ici'}
                  </span>
                  {config.input === 'vim' && vimMode ? (
                    <span className={`vim-badge vim-${vimMode.split(' ')[0]}`}>{vimMode}</span>
                  ) : (
                    <span className={`panel-focus-dot${editorFocused ? ' on' : ''}`}>
                      {editorFocused ? '● actif' : '○ inactif'}
                    </span>
                  )}
                </div>
                <div className="panel-body">
                  <Editor
                    ref={editorRef}
                    challenge={challenge}
                    config={config}
                    runKey={runKey}
                    onDoc={onDoc}
                    onActivity={onActivity}
                    onVimMode={setVimMode}
                    onFocusChange={setEditorFocused}
                  />
                  {!editorFocused && (
                    <button
                      type="button"
                      className="editor-veil"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        editorRef.current?.focus()
                      }}
                    >
                      <span className="editor-veil-caret" />
                      <span className="editor-veil-text">clique ici ou tape pour commencer</span>
                      <span className="editor-veil-sub">c’est dans ce panneau que tu écris</span>
                    </button>
                  )}
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
            {prefs.quickRestart && status === 'done' && (
              <span>
                <kbd>tab</kbd> enchaîner
              </span>
            )}
            {config.ide && status !== 'done' && (
              <span>
                <kbd>tab</kbd> compléter / snippets (fn, forof, iferr…)
              </span>
            )}
            {config.game === 'refactor' && status !== 'done' && (
              <span className="footer-goal">objectif : chaque ligne doit correspondre à la cible</span>
            )}
          </footer>
        </>
      )}

      {view === 'leaderboard' && (
        <main className="view">
          <Leaderboard player={player} />
        </main>
      )}

      {view === 'profile' && (
        <main className="view">
          <ProfilePage player={player} history={profileHistory} />
        </main>
      )}

      {view === 'settings' && (
        <main className="view">
          <Settings
            config={config}
            applyConfig={applyConfig}
            prefs={prefs}
            setPref={setPref}
            resetPrefs={resetPrefs}
            player={player}
            buyTheme={buyTheme}
            equipTheme={equipTheme}
            onResetProgress={onResetProgress}
          />
        </main>
      )}

      {sprintOpen && (
        <Sprint config={config} onAward={awardSprint} onClose={() => setSprintOpen(false)} />
      )}

      {accountOpen && CLOUD_ENABLED && (
        <AuthModal onClose={() => setAccountOpen(false)} />
      )}

      {showOnboarding && (
        <Onboarding
          onClose={() => {
            localStorage.setItem(ONBOARDED_KEY, '1')
            setShowOnboarding(false)
          }}
        />
      )}
    </div>
  )
}
