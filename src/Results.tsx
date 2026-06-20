import { useState } from 'react'
import type { RunResult } from './types'
import { LANG_LABEL } from './types'
import type { RunReward } from './player'
import { rankFor } from './progression'
import Confetti from './Confetti'

function Sparkline({ samples }: { samples: number[] }) {
  if (samples.length < 2) return null
  const w = 560
  const h = 120
  const pad = 6
  const max = Math.max(...samples, 1)
  const pts = samples.map((v, i) => {
    const x = pad + (i / (samples.length - 1)) * (w - pad * 2)
    const y = h - pad - (v / max) * (h - pad * 2)
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-label="wpm dans le temps"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function fmtTime(ms: number) {
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`
}

interface Props {
  result: RunResult
  isRecord: boolean
  snippetTitle: string
  reward: RunReward | null
}

export default function Results({ result, isRecord, snippetTitle, reward }: Props) {
  const isRewrite = result.game === 'rewrite'
  const celebrate = isRecord || Boolean(reward?.leveledUp)

  const [copied, setCopied] = useState(false)
  const share = () => {
    const kbd = result.ide ? `${result.input}+ide` : result.input
    const summary = isRewrite
      ? `monkey_code · ${Math.round(result.wpm)} wpm · ${(result.accuracy * 100).toFixed(0)}% · ${LANG_LABEL[result.lang]} ${snippetTitle} · ${kbd}`
      : `monkey_code · ${fmtTime(result.timeMs)} · ${LANG_LABEL[result.lang]} ${snippetTitle} · ${kbd}`
    navigator.clipboard
      ?.writeText(summary)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <div className="results">
      {celebrate && <Confetti />}
      <div className="results-badges">
        {isRecord && <div className="record-badge">★ nouveau record</div>}
        {reward?.leveledUp && (
          <div className="levelup-badge">
            ⬆ niveau {reward.toLevel} · {rankFor(reward.toLevel).name}
          </div>
        )}
        {reward?.dailyClaimed && <div className="daily-badge">⚡ défi du jour validé</div>}
      </div>

      <div className="results-hero">
        <div className="hero-value">
          {isRewrite ? Math.round(result.wpm) : fmtTime(result.timeMs)}
        </div>
        <div className="hero-label">{isRewrite ? 'wpm' : 'temps'}</div>
      </div>

      <div className="results-grid">
        {isRewrite ? (
          <>
            <Stat label="précision" value={`${(result.accuracy * 100).toFixed(1)}%`} />
            <Stat label="brut" value={String(Math.round(result.raw))} />
            <Stat label="erreurs" value={String(result.errors)} />
            <Stat label="temps" value={fmtTime(result.timeMs)} />
            <Stat label="régularité" value={`${Math.round(result.consistency * 100)}%`} />
          </>
        ) : (
          <>
            <Stat label="frappes" value={String(result.keystrokes)} />
            <Stat
              label="frappes/min"
              value={String(Math.round(result.keystrokes / (result.timeMs / 60000)))}
            />
          </>
        )}
        <Stat
          label="exercice"
          value={`${LANG_LABEL[result.lang]} · ${snippetTitle}`}
        />
        <Stat label="clavier" value={result.ide ? `${result.input} + ide` : result.input} />
      </div>

      {reward && (
        <div className="reward-strip">
          <span className="reward-xp">+{reward.xpGained} xp</span>
          <span className="reward-coins">+{reward.coinsGained} ◈</span>
          {reward.streakUp && reward.streak > 1 && (
            <span className="reward-streak">▲ série {reward.streak} j</span>
          )}
        </div>
      )}

      {reward && reward.newAchievements.length > 0 && (
        <div className="reward-achievements">
          {reward.newAchievements.map((a) => (
            <span key={a.id} className="reward-ach" title={a.desc}>
              <b>{a.glyph}</b> {a.name}
            </span>
          ))}
        </div>
      )}

      {isRewrite && <Sparkline samples={result.samples} />}

      <button className={`share-btn ${copied ? 'done' : ''}`} onClick={share}>
        {copied ? '✓ copié dans le presse-papier' : '⧉ partager le résultat'}
      </button>

      <div className="results-hint">
        <kbd>↵</kbd> exercice suivant&ensp;·&ensp;<kbd>⌫</kbd> rejouer celui-ci
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
