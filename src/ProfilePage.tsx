// =============================================================================
// Page profil — l'identité du joueur (niveau, rang, stats, courbe, succès,
// touches faibles). Page plein écran (pas une modale). Tout-mono, ember terminal.
// =============================================================================
import { useMemo } from 'react'
import './ProfilePage.css'
import type { PlayerState } from './player'
import { topWeakKeys } from './player'
import type { RunResult, Lang } from './types'
import { LANG_LABEL } from './types'
import { levelFromXp } from './progression'
import { ACHIEVEMENTS } from './achievements'
import { THEME_BY_ID } from './themes'

interface ProfilePageProps {
  player: PlayerState
  history: RunResult[]
}

// --- Rangs « identité » dérivés du niveau (paliers maison, FR sobre). --------
interface Tier {
  at: number
  name: string
  glyph: string
}
const TIERS: Tier[] = [
  { at: 1, name: 'novice', glyph: '◦' },
  { at: 5, name: 'initié', glyph: '›' },
  { at: 11, name: 'artisan', glyph: '▸' },
  { at: 19, name: 'expert', glyph: '◆' },
  { at: 30, name: 'maître', glyph: '✦' },
  { at: 45, name: 'légende', glyph: '∞' },
]
function tierFor(level: number): Tier {
  let t = TIERS[0]
  for (const tier of TIERS) if (level >= tier.at) t = tier
  return t
}
function nextTier(level: number): Tier | null {
  for (const tier of TIERS) if (tier.at > level) return tier
  return null
}

const round = (n: number) => Math.round(n)
const pct1 = (n: number) => `${Math.round(n * 100)}%`

/** Durée humaine « Xh Ym » / « Xm Ys » à partir de millisecondes. */
function humanDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export default function ProfilePage({ player, history }: ProfilePageProps) {
  const lvl = useMemo(() => levelFromXp(player.xp), [player.xp])
  const tier = tierFor(lvl.level)
  const upcoming = nextTier(lvl.level)

  // Runs « rewrite » triés chronologiquement — base des moyennes et de la courbe.
  const rewriteRuns = useMemo(
    () =>
      history
        .filter((r) => r.game === 'rewrite')
        .slice()
        .sort((a, b) => a.date - b.date),
    [history],
  )

  const stats = useMemo(() => {
    const wpms = rewriteRuns.map((r) => r.wpm)
    const accs = rewriteRuns.map((r) => r.accuracy)
    const cons = rewriteRuns.map((r) => r.consistency)
    const totalMs = history.reduce((a, r) => a + r.timeMs, 0)

    // Meilleur wpm par langage (sur les runs rewrite).
    const bestByLang = new Map<Lang, number>()
    for (const r of rewriteRuns) {
      const cur = bestByLang.get(r.lang) ?? 0
      if (r.wpm > cur) bestByLang.set(r.lang, r.wpm)
    }

    return {
      hasRuns: rewriteRuns.length > 0,
      avgWpm: mean(wpms),
      avgAcc: mean(accs),
      avgCons: mean(cons),
      totalMs,
      bestByLang: [...bestByLang.entries()].sort((a, b) => b[1] - a[1]),
    }
  }, [rewriteRuns, history])

  const weak = useMemo(() => topWeakKeys(player.weakKeys, 12), [player.weakKeys])

  const unlocked = useMemo(
    () => new Set(player.achievements),
    [player.achievements],
  )
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length

  const theme = THEME_BY_ID[player.equippedTheme] ?? THEME_BY_ID.ember

  return (
    <main className="profile-page" aria-label="profil du joueur">
      <h1 className="pp-title">profil</h1>

      {/* ── Identité ─────────────────────────────────────────────────── */}
      <section className="pp-identity" aria-labelledby="pp-identity-h">
        <h2 id="pp-identity-h" className="pp-sr">identité</h2>
        <div className="pp-id-left">
          <div className="pp-level-block">
            <span className="pp-level-num">{lvl.level}</span>
            <span className="pp-level-cap">niveau</span>
          </div>
          <div className="pp-id-meta">
            <span className="pp-tier">
              <span className="pp-tier-glyph" aria-hidden="true">
                {tier.glyph}
              </span>
              {tier.name}
            </span>
            <div
              className="pp-xpbar"
              role="progressbar"
              aria-label="progression vers le niveau suivant"
              aria-valuemin={0}
              aria-valuemax={lvl.span}
              aria-valuenow={lvl.into}
            >
              <span
                className="pp-xpbar-fill"
                style={{ width: `${Math.max(2, Math.round(lvl.pct * 100))}%` }}
              />
            </div>
            <span className="pp-xp-label">
              {lvl.into} / {lvl.span} xp
              {upcoming && (
                <span className="pp-xp-next">
                  {' '}· prochain rang : {upcoming.name} (niv {upcoming.at})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="pp-id-counters">
          <IdCounter label="runs" value={player.totalRuns} />
          <IdCounter label="meilleur wpm" value={round(player.bestWpm)} accent />
          <IdCounter
            label="série"
            value={player.streak}
            sub={`record ${player.bestStreak}`}
          />
          <IdCounter label="pièces" value={player.coins} />
        </div>
      </section>

      {/* ── Statistiques ─────────────────────────────────────────────── */}
      <section className="pp-section" aria-labelledby="pp-stats-h">
        <p className="pp-eyebrow">
          <span className="pp-caret" aria-hidden="true">▸ </span>statistiques
        </p>
        <h2 id="pp-stats-h" className="pp-sr">records et moyennes</h2>
        <div className="pp-stat-grid">
          <Stat label="meilleur wpm" value={round(player.bestWpm)} accent />
          <Stat
            label="wpm moyen"
            value={stats.hasRuns ? round(stats.avgWpm) : '—'}
          />
          <Stat
            label="précision moy."
            value={stats.hasRuns ? pct1(stats.avgAcc) : '—'}
          />
          <Stat
            label="régularité moy."
            value={stats.hasRuns ? pct1(stats.avgCons) : '—'}
          />
          <Stat label="temps tapé" value={humanDuration(stats.totalMs)} />
          <Stat label="runs parfaits" value={player.perfectRuns} />
          <Stat label="runs purs" value={player.pureRuns} sub="sans ide" />
          <Stat label="runs vim" value={player.vimRuns} />
          <Stat
            label="langages"
            value={player.langsCompleted.length}
            sub="terminés"
          />
        </div>

        {stats.bestByLang.length > 0 && (
          <div className="pp-lang-best">
            <p className="pp-mini-eyebrow">meilleur wpm par langage</p>
            <div className="pp-lang-row">
              {stats.bestByLang.map(([lang, wpm]) => (
                <div className="pp-lang-cell" key={lang}>
                  <span className="pp-lang-name">{LANG_LABEL[lang]}</span>
                  <span className="pp-lang-wpm">{round(wpm)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Courbe de progression ────────────────────────────────────── */}
      <section className="pp-section" aria-labelledby="pp-curve-h">
        <p className="pp-eyebrow">
          <span className="pp-caret" aria-hidden="true">▸ </span>progression
        </p>
        <h2 id="pp-curve-h" className="pp-sr">courbe de wpm</h2>
        <div className="pp-card pp-chart-card">
          <WpmChart runs={rewriteRuns.slice(-30)} />
        </div>
      </section>

      {/* ── Succès ───────────────────────────────────────────────────── */}
      <section className="pp-section" aria-labelledby="pp-ach-h">
        <p className="pp-eyebrow">
          <span className="pp-caret" aria-hidden="true">▸ </span>succès
          <span className="pp-eyebrow-count">
            {unlockedCount} / {ACHIEVEMENTS.length} débloqués
          </span>
        </p>
        <h2 id="pp-ach-h" className="pp-sr">succès</h2>
        <div className="pp-badge-grid">
          {ACHIEVEMENTS.map((a) => {
            const on = unlocked.has(a.id)
            return (
              <div
                key={a.id}
                className={`pp-badge ${on ? 'on' : 'off'}`}
                title={`${a.name} — ${a.desc}`}
              >
                <span className="pp-badge-glyph" aria-hidden="true">
                  {on ? a.glyph : '🔒'}
                </span>
                <span className="pp-badge-name">{a.name}</span>
                <span className="pp-badge-desc">{a.desc}</span>
                <span className="pp-badge-reward">
                  +{a.xp} xp · +{a.coins} ¢
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Touches faibles ──────────────────────────────────────────── */}
      <section className="pp-section" aria-labelledby="pp-weak-h">
        <p className="pp-eyebrow">
          <span className="pp-caret" aria-hidden="true">▸ </span>touches faibles
        </p>
        <h2 id="pp-weak-h" className="pp-sr">touches faibles</h2>
        <div className="pp-card">
          {weak.length === 0 ? (
            <p className="pp-empty">
              aucune faiblesse marquée — joue quelques runs pour repérer tes
              touches les plus ratées.
            </p>
          ) : (
            <WeakKeys keys={weak} />
          )}
        </div>
      </section>

      {/* ── Thème équipé (vitrine compacte) ──────────────────────────── */}
      <section className="pp-section" aria-labelledby="pp-theme-h">
        <p className="pp-eyebrow">
          <span className="pp-caret" aria-hidden="true">▸ </span>thème
        </p>
        <h2 id="pp-theme-h" className="pp-sr">thème équipé</h2>
        <div className="pp-card pp-theme-card">
          <span className="pp-theme-swatch" aria-hidden="true" />
          <div className="pp-theme-meta">
            <span className="pp-theme-name">{theme.name}</span>
            <span className="pp-theme-sub">
              {player.unlockedThemes.length} thème
              {player.unlockedThemes.length > 1 ? 's' : ''} débloqué
              {player.unlockedThemes.length > 1 ? 's' : ''} · la boutique
              complète vit dans les réglages
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}

// --- Compteurs d'identité ----------------------------------------------------
function IdCounter({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="pp-counter">
      <span className={`pp-counter-num ${accent ? 'accent' : ''}`}>{value}</span>
      <span className="pp-counter-label">{label}</span>
      {sub && <span className="pp-counter-sub">{sub}</span>}
    </div>
  )
}

// --- Carte statistique -------------------------------------------------------
function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="pp-stat">
      <span className="pp-stat-label">{label}</span>
      <span className={`pp-stat-num ${accent ? 'accent' : ''}`}>{value}</span>
      {sub && <span className="pp-stat-sub">{sub}</span>}
    </div>
  )
}

// --- Courbe wpm (SVG inline, sans dépendance) --------------------------------
function WpmChart({ runs }: { runs: RunResult[] }) {
  if (runs.length < 2) {
    return (
      <p className="pp-empty pp-chart-empty">
        joue quelques runs pour voir ta courbe.
      </p>
    )
  }

  const W = 640
  const H = 200
  const padX = 8
  const padTop = 14
  const padBottom = 14
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom

  const wpms = runs.map((r) => r.wpm)
  const max = Math.max(...wpms)
  const min = Math.min(...wpms)
  const span = Math.max(1, max - min)
  const padded = span * 0.15 // marge verticale pour ne pas coller aux bords

  const x = (i: number) =>
    padX + (runs.length === 1 ? innerW / 2 : (i / (runs.length - 1)) * innerW)
  const y = (v: number) =>
    padTop +
    innerH -
    ((v - (min - padded)) / (span + padded * 2)) * innerH

  const linePts = runs.map((r, i) => `${x(i).toFixed(1)},${y(r.wpm).toFixed(1)}`)
  const linePath = `M ${linePts.join(' L ')}`
  const areaPath = `${linePath} L ${x(runs.length - 1).toFixed(1)},${(
    padTop + innerH
  ).toFixed(1)} L ${x(0).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`

  // Hairlines de fond (3 lignes horizontales).
  const grid = [0.25, 0.5, 0.75].map((g) => padTop + innerH * g)

  const last = runs[runs.length - 1].wpm
  const lastX = x(runs.length - 1)
  const lastY = y(last)

  return (
    <svg
      className="pp-chart"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`courbe de wpm sur les ${runs.length} derniers runs : de ${round(
        runs[0].wpm,
      )} à ${round(last)} wpm, maximum ${round(max)}`}
    >
      {grid.map((gy, i) => (
        <line
          key={i}
          className="pp-chart-grid"
          x1={padX}
          x2={W - padX}
          y1={gy}
          y2={gy}
        />
      ))}
      <path className="pp-chart-area" d={areaPath} />
      <path className="pp-chart-line" d={linePath} />
      <circle className="pp-chart-dot" cx={lastX} cy={lastY} r={3.5} />
    </svg>
  )
}

// --- Touches faibles (chips dimensionnées par nombre d'erreurs) ---------------
function WeakKeys({ keys }: { keys: { char: string; count: number }[] }) {
  const max = Math.max(...keys.map((k) => k.count))
  const display = (c: string) =>
    c === ' ' ? '␣' : c === '\t' ? '⇥' : c === '\n' ? '↵' : c
  return (
    <div className="pp-weak-row">
      {keys.map((k) => {
        const t = k.count / max // 0..1
        return (
          <span
            key={k.char}
            className="pp-weak-chip"
            style={{
              fontSize: `${0.9 + t * 0.7}rem`,
              background: `rgba(var(--accent-rgb), ${(0.06 + t * 0.22).toFixed(3)})`,
              borderColor: `rgba(var(--accent-rgb), ${(0.2 + t * 0.4).toFixed(3)})`,
            }}
            title={`« ${display(k.char)} » — ${k.count} erreur${
              k.count > 1 ? 's' : ''
            }`}
          >
            <span className="pp-weak-char">{display(k.char)}</span>
            <span className="pp-weak-count">{k.count}</span>
          </span>
        )
      })}
    </div>
  )
}
