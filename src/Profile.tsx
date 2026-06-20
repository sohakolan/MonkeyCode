import { useEffect, useState } from 'react'
import type { PlayerState } from './player'
import { topWeakKeys } from './player'
import { levelFromXp, rankFor, nextRank, RANKS } from './progression'
import { LANG_LABEL } from './types'
import { ACHIEVEMENTS } from './achievements'
import { THEMES } from './themes'
import { CLOUD_ENABLED } from './cloudEnv'
import CloudAccount from './CloudAccount'
import Leaderboard from './Leaderboard'
import KeyboardHeatmap from './KeyboardHeatmap'
import ProgressChart from './ProgressChart'
import DataManager from './DataManager'

type Tab = 'stats' | 'succes' | 'themes' | 'classement' | 'compte'

const TABS: Tab[] = CLOUD_ENABLED
  ? ['stats', 'succes', 'themes', 'classement', 'compte']
  : ['stats', 'succes', 'themes', 'compte']

const TAB_LABEL: Record<Tab, string> = {
  stats: 'stats',
  succes: 'succès',
  themes: 'themes',
  classement: 'classement',
  compte: 'compte',
}

interface Props {
  player: PlayerState
  buyTheme: (id: string) => boolean
  equipTheme: (id: string) => void
  onClose: () => void
}

export default function Profile({ player, buyTheme, equipTheme, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('stats')
  const lvl = levelFromXp(player.xp)
  const rank = rankFor(lvl.level)
  const upcoming = nextRank(lvl.level)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="profil du joueur"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="fermer">
          ✕
        </button>

        <header className="prof-head">
          <div className="prof-rank-glyph">{rank.glyph}</div>
          <div className="prof-id">
            <div className="prof-rank-name">{rank.name}</div>
            <div className="prof-lvl">
              niveau {lvl.level}
              {upcoming && (
                <span className="prof-next">
                  · {upcoming.name} au niv. {upcoming.at}
                </span>
              )}
            </div>
            <div className="prof-xpbar">
              <span className="prof-xpbar-fill" style={{ width: `${lvl.pct * 100}%` }} />
            </div>
            <div className="prof-xp-text">
              {lvl.into} / {lvl.span} xp · {player.xp} xp au total
            </div>
          </div>
          <div className="prof-wallet">
            <div className="prof-coins">◈ {player.coins}</div>
            {player.streak > 0 && <div className="prof-flame">▲ {player.streak} j</div>}
          </div>
        </header>

        <nav className="prof-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={tab === t ? 'prof-tab on' : 'prof-tab'}
              onClick={() => setTab(t)}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </nav>

        <div className="prof-body">
          {tab === 'stats' && <StatsTab player={player} />}
          {tab === 'succes' && <AchievementsTab unlocked={player.achievements} />}
          {tab === 'themes' && (
            <ThemesTab
              player={player}
              buyTheme={buyTheme}
              equipTheme={equipTheme}
              level={lvl.level}
            />
          )}
          {tab === 'classement' && CLOUD_ENABLED && <Leaderboard />}
          {tab === 'compte' && (
            <div className="prof-compte">
              {CLOUD_ENABLED ? <CloudAccount /> : <OfflineNote />}
              <DataManager />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsTab({ player }: { player: PlayerState }) {
  const cells: [string, string][] = [
    ['runs joués', String(player.totalRuns)],
    ['meilleur wpm', String(Math.round(player.bestWpm))],
    ['runs parfaits', String(player.perfectRuns)],
    ['runs à la main', String(player.pureRuns)],
    ['runs en vim', String(player.vimRuns)],
    ['meilleure série', `${player.bestStreak} j`],
    ['langages joués', player.langsCompleted.map((l) => LANG_LABEL[l]).join(', ') || '—'],
    ['succès', `${player.achievements.length} / ${ACHIEVEMENTS.length}`],
  ]
  return (
    <div className="prof-stats-grid">
      {cells.map(([label, value]) => (
        <div key={label} className="prof-stat">
          <div className="prof-stat-value">{value}</div>
          <div className="prof-stat-label">{label}</div>
        </div>
      ))}
      <div className="prof-ranks">
        {RANKS.map((r) => (
          <span
            key={r.name}
            className={levelFromXp(player.xp).level >= r.at ? 'prof-rankchip on' : 'prof-rankchip'}
            title={`niveau ${r.at}`}
          >
            {r.glyph} {r.name}
          </span>
        ))}
      </div>
      <div className="prof-chart-wrap">
        <ProgressChart />
      </div>
      <KeyboardHeatmap weak={player.weakKeys} />
      <WeakKeys weak={player.weakKeys} />
    </div>
  )
}

const CHAR_LABEL: Record<string, string> = { ' ': '␣', '\t': '⇥' }
const showChar = (c: string) => CHAR_LABEL[c] ?? c

function WeakKeys({ weak }: { weak: Record<string, number> }) {
  const top = topWeakKeys(weak, 8)
  if (top.length === 0) return null
  const max = top[0].count
  return (
    <div className="prof-weak">
      <div className="prof-weak-title">touches faibles</div>
      <div className="prof-weak-list">
        {top.map(({ char, count }) => (
          <div key={char} className="prof-weak-row">
            <span className="prof-weak-key">{showChar(char)}</span>
            <span className="prof-weak-bar">
              <span
                className="prof-weak-bar-fill"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </span>
            <span className="prof-weak-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AchievementsTab({ unlocked }: { unlocked: string[] }) {
  return (
    <div className="prof-ach-grid">
      {ACHIEVEMENTS.map((a) => {
        const got = unlocked.includes(a.id)
        return (
          <div key={a.id} className={got ? 'prof-ach got' : 'prof-ach'}>
            <span className="prof-ach-glyph">{got ? a.glyph : '∅'}</span>
            <div className="prof-ach-text">
              <div className="prof-ach-name">{a.name}</div>
              <div className="prof-ach-desc">{a.desc}</div>
            </div>
            <span className="prof-ach-xp">+{a.xp}</span>
          </div>
        )
      })}
    </div>
  )
}

function ThemesTab({
  player,
  buyTheme,
  equipTheme,
  level,
}: {
  player: PlayerState
  buyTheme: (id: string) => boolean
  equipTheme: (id: string) => void
  level: number
}) {
  return (
    <div className="prof-theme-grid">
      {THEMES.map((t) => {
        const owned = player.unlockedThemes.includes(t.id)
        const equipped = player.equippedTheme === t.id
        const lockedByLevel = level < t.minLevel
        const canBuy = !owned && !lockedByLevel && player.coins >= t.cost
        return (
          <div key={t.id} className={equipped ? 'prof-theme on' : 'prof-theme'}>
            <div className="prof-theme-swatch">
              {[t.vars.bg, t.vars.panel, t.vars.accent, t.vars.fg].map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </div>
            <div className="prof-theme-name">{t.name}</div>
            {owned ? (
              <button
                className="prof-theme-btn"
                disabled={equipped}
                onClick={() => equipTheme(t.id)}
              >
                {equipped ? 'équipé' : 'équiper'}
              </button>
            ) : lockedByLevel ? (
              <button className="prof-theme-btn" disabled>
                niv. {t.minLevel}
              </button>
            ) : (
              <button
                className="prof-theme-btn buy"
                disabled={!canBuy}
                onClick={() => buyTheme(t.id)}
              >
                ◈ {t.cost}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function OfflineNote() {
  return (
    <div className="prof-offline">
      <p>
        Mode <b>local</b> : ta progression est enregistrée sur cet appareil.
      </p>
      <p className="prof-offline-dim">
        Lie un backend Convex (<code>npx convex dev</code>) pour synchroniser ton
        compte, débloquer les classements et retrouver ta progression partout.
      </p>
    </div>
  )
}
