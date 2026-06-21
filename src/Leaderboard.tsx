// Page « classement » plein écran.
// - cloud (CLOUD_ENABLED) → classement mondial via Convex (xp / vitesse).
// - offline (défaut)      → « tes records » construits depuis loadHistory().
// Les hooks Convex (useQuery) vivent UNIQUEMENT dans <CloudBoard/>, rendu
// seulement quand CLOUD_ENABLED — sinon pas de provider et ça throw.
import './Leaderboard.css'
import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { anyApi } from 'convex/server'
import { CLOUD_ENABLED } from './cloudEnv'
import { loadHistory } from './history'
import { LANG_LABEL, type Lang, type RunResult } from './types'
import type { PlayerState } from './player'

// ---- cloud row shapes (cf. convex/leaderboard) -----------------------------
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
type Board = 'xp' | 'speed'

// ---- helpers ----------------------------------------------------------------
function medalClass(rank: number): string {
  if (rank === 1) return 'top1'
  if (rank === 2) return 'top2'
  if (rank === 3) return 'top3'
  return ''
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.round(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d < 7) return `il y a ${d} j`
  const w = Math.round(d / 7)
  if (w < 5) return `il y a ${w} sem`
  const mo = Math.round(d / 30)
  return `il y a ${mo} mois`
}

// =============================================================================
// CLOUD — rendu seulement quand CLOUD_ENABLED (hooks Convex présents).
// =============================================================================
function CloudBoard({ player }: { player?: PlayerState }) {
  const [board, setBoard] = useState<Board>('xp')
  const xpRows = useQuery(anyApi.leaderboard.byXp, { limit: 50 }) as
    | XpRow[]
    | undefined
  const speedRows = useQuery(anyApi.leaderboard.bySpeed, { limit: 50 }) as
    | SpeedRow[]
    | undefined
  const rows = board === 'xp' ? xpRows : speedRows
  const loading = rows === undefined

  return (
    <>
      <header className="lb-head">
        <div>
          <h1 className="lb-title">classement</h1>
          <p className="lb-sub">les meilleurs dactylos du monde, en direct.</p>
        </div>
        <div className="lb-seg" role="tablist" aria-label="type de classement">
          <button
            role="tab"
            aria-selected={board === 'xp'}
            className={board === 'xp' ? 'lb-pill on' : 'lb-pill'}
            onClick={() => setBoard('xp')}
          >
            xp
          </button>
          <button
            role="tab"
            aria-selected={board === 'speed'}
            className={board === 'speed' ? 'lb-pill on' : 'lb-pill'}
            onClick={() => setBoard('speed')}
          >
            vitesse
          </button>
        </div>
      </header>

      <p className="lb-eyebrow">
        {board === 'xp' ? 'top expérience' : 'top vitesse'}
      </p>

      {loading ? (
        <div className="lb-state lb-reveal">chargement du classement…</div>
      ) : rows.length === 0 ? (
        <div className="lb-state lb-reveal">
          <strong>aucun joueur classé</strong>
          sois le premier à figurer ici — lance un run.
        </div>
      ) : (
        <ol className="lb-list lb-reveal">
          {rows.map((r, i) => {
            // Surligne la ligne du joueur si son record de vitesse correspond
            // (heuristique : pas d'identité fiable côté offline-first).
            const mine = Boolean(
              player &&
                player.bestWpm > 0 &&
                Math.round(r.bestWpm) === Math.round(player.bestWpm),
            )
            return (
              <li
                key={`${r.rank}-${r.handle}`}
                className={`lb-row lb-reveal ${medalClass(r.rank)} ${mine ? 'me' : ''}`}
                style={{ ['--i' as string]: i }}
              >
                <span className="lb-rank">{r.rank}</span>
                <span className="lb-handle">{r.handle}</span>
                <span className="lb-badge">Lv {r.level}</span>
                <span className="lb-metric">
                  {board === 'xp'
                    ? (r as XpRow).xp.toLocaleString('fr-FR')
                    : Math.round(r.bestWpm)}
                  <span className="lb-unit">{board === 'xp' ? 'xp' : 'wpm'}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}

// =============================================================================
// OFFLINE — « tes records » dérivés de l'historique local. Aucun hook Convex.
// =============================================================================
// Sections « tes records » dérivées de l'historique local — réutilisées en
// offline ET sous le classement mondial quand le cloud est actif.
function PersonalRecords() {
  const history = useMemo(() => loadHistory(), [])

  // Seuls les runs « rewrite » ont un wpm comparable (le refactor n'a pas de
  // vitesse de frappe représentative).
  const runs = useMemo(
    () => history.filter((r) => r.game === 'rewrite'),
    [history],
  )

  const best = useMemo(
    () =>
      runs.reduce<RunResult | null>(
        (acc, r) => (acc && acc.wpm >= r.wpm ? acc : r),
        null,
      ),
    [runs],
  )

  const perLang = useMemo(() => {
    const map = new Map<Lang, { best: RunResult; count: number }>()
    for (const r of runs) {
      const cur = map.get(r.lang)
      if (!cur) map.set(r.lang, { best: r, count: 1 })
      else
        map.set(r.lang, {
          best: r.wpm > cur.best.wpm ? r : cur.best,
          count: cur.count + 1,
        })
    }
    return [...map.entries()].sort((a, b) => b[1].best.wpm - a[1].best.wpm)
  }, [runs])

  const fastest = useMemo(
    () => [...runs].sort((a, b) => b.wpm - a.wpm).slice(0, 10),
    [runs],
  )

  if (runs.length === 0) {
    return (
      <div className="lb-state lb-reveal">
        <strong>pas encore de record</strong>
        termine un run en mode réécriture pour démarrer ton classement perso.
      </div>
    )
  }

  return (
    <>
      <section className="lb-section">
        <p className="lb-eyebrow">meilleur run</p>
        {best && (
          <div className="lb-hero lb-reveal">
            <div className="lb-hero-value">
              {Math.round(best.wpm)}
              <span className="lb-unit">wpm</span>
            </div>
            <div className="lb-hero-meta">
              <span className="lb-hero-label">record absolu</span>
              <span className="lb-hero-detail">
                en <span className="lb-lang">{LANG_LABEL[best.lang]}</span> ·{' '}
                {Math.round(best.accuracy * 100)} % · {relativeDate(best.date)}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="lb-section">
        <p className="lb-eyebrow">records par langage</p>
        <div className="lb-langs lb-reveal">
          {perLang.map(([lang, { best: b, count }]) => (
            <div key={lang} className="lb-lang-card">
              <div className="lb-lang-name">{LANG_LABEL[lang]}</div>
              <div className="lb-lang-wpm">
                {Math.round(b.wpm)}
                <span className="lb-unit">wpm</span>
              </div>
              <div className="lb-lang-runs">
                {count} run{count > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lb-section lb-fast">
        <p className="lb-eyebrow">tes runs les plus rapides</p>
        <ol className="lb-list lb-reveal">
          {fastest.map((r, i) => (
            <li
              key={`${r.date}-${i}`}
              className={`lb-row lb-reveal ${medalClass(i + 1)}`}
              style={{ ['--i' as string]: i }}
            >
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-metric">
                {Math.round(r.wpm)}
                <span className="lb-unit">wpm</span>
              </span>
              <span className={`lb-acc ${r.accuracy < 0.9 ? 'low' : ''}`}>
                {LANG_LABEL[r.lang]} · {Math.round(r.accuracy * 100)} %
              </span>
              <span className="lb-when">{relativeDate(r.date)}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

function OfflineBoard() {
  return (
    <>
      <OfflineHead />
      <PersonalRecords />
      <CloudCta />
    </>
  )
}

function OfflineHead() {
  return (
    <header className="lb-head">
      <div>
        <h1 className="lb-title">classement</h1>
        <p className="lb-sub">tes records personnels, en local.</p>
      </div>
      <div className="lb-seg">
        <span className="lb-pill on" aria-current="page">
          tes records
        </span>
      </div>
    </header>
  )
}

function CloudCta() {
  return (
    <div className="lb-cta lb-reveal">
      <span className="lb-cta-dot" aria-hidden="true" />
      <div className="lb-cta-text">
        <strong>le classement mondial arrive avec un compte</strong>
        <span>
          synchronise ta progression dans le cloud pour défier les autres
          joueurs.
        </span>
      </div>
    </div>
  )
}

// =============================================================================
export default function Leaderboard({ player }: { player?: PlayerState } = {}) {
  return (
    <div className="leaderboard-page">
      {CLOUD_ENABLED ? (
        <>
          <CloudBoard player={player} />
          <p className="lb-eyebrow lb-personal-eyebrow">tes records perso</p>
          <PersonalRecords />
        </>
      ) : (
        <OfflineBoard />
      )}
    </div>
  )
}
