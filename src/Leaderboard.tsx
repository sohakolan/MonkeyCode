// Rendu uniquement quand CLOUD_ENABLED → les hooks Convex ont leur provider.
// Référence les fonctions via anyApi (pas de dépendance à convex/_generated).
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { anyApi } from 'convex/server'

type Board = 'xp' | 'speed'

interface XpRow {
  rank: number
  handle: string
  level: number
  xp: number
  bestWpm: number
  streak: number
}
interface SpeedRow {
  rank: number
  handle: string
  level: number
  bestWpm: number
}

export default function Leaderboard() {
  const [board, setBoard] = useState<Board>('xp')
  const xpRows = useQuery(anyApi.leaderboard.byXp, { limit: 50 }) as XpRow[] | undefined
  const speedRows = useQuery(anyApi.leaderboard.bySpeed, { limit: 50 }) as
    | SpeedRow[]
    | undefined
  const rows = board === 'xp' ? xpRows : speedRows
  const loading = rows === undefined

  return (
    <div className="lb">
      <div className="lb-tabs">
        <button
          className={board === 'xp' ? 'prof-tab on' : 'prof-tab'}
          onClick={() => setBoard('xp')}
        >
          xp
        </button>
        <button
          className={board === 'speed' ? 'prof-tab on' : 'prof-tab'}
          onClick={() => setBoard('speed')}
        >
          vitesse
        </button>
      </div>

      {loading ? (
        <div className="prof-offline">chargement du classement…</div>
      ) : rows.length === 0 ? (
        <div className="prof-offline">aucun joueur classé pour l'instant.</div>
      ) : (
        <ol className="lb-list">
          {rows.map((r) => (
            <li key={r.rank} className={`lb-row ${r.rank <= 3 ? 'top' : ''}`}>
              <span className="lb-rank">{r.rank}</span>
              <span className="lb-handle">{r.handle}</span>
              <span className="lb-lvl">Lv {r.level}</span>
              <span className="lb-metric">
                {board === 'xp'
                  ? `${(r as XpRow).xp} xp`
                  : `${Math.round(r.bestWpm)} wpm`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
