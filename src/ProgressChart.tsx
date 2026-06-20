// Graphe de progression : wpm de tes derniers runs en réécriture (historique local).
import { loadHistory } from './history'

const MAX_POINTS = 30

export default function ProgressChart() {
  const runs = loadHistory()
    .filter((r) => r.game === 'rewrite' && r.wpm > 0)
    .slice(-MAX_POINTS)

  if (runs.length < 2) {
    return (
      <div className="prof-chart">
        <div className="prof-weak-title">progression wpm</div>
        <div className="prof-chart-empty">
          fais au moins 2 réécritures pour voir ta courbe.
        </div>
      </div>
    )
  }

  const values = runs.map((r) => r.wpm)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const best = Math.round(max)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  const last = Math.round(values[values.length - 1])

  const w = 560
  const h = 130
  const pad = 8
  const span = Math.max(max - min, 1)
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (v - min) / span) * (h - pad * 2)
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`

  return (
    <div className="prof-chart">
      <div className="prof-chart-head">
        <span className="prof-weak-title">progression wpm</span>
        <span className="prof-chart-legend">
          <b>{last}</b> dernier · <b>{avg}</b> moy · <b>{best}</b> record
        </span>
      </div>
      <svg
        className="prof-chart-svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-label="progression du wpm"
      >
        <defs>
          <linearGradient id="prog-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#prog-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.2" fill="var(--accent)" />
        ))}
      </svg>
    </div>
  )
}
