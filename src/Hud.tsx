import type { PlayerState } from './player'
import { levelFromXp, rankFor } from './progression'

interface Props {
  player: PlayerState
  onOpenProfile: () => void
}

export default function Hud({ player, onOpenProfile }: Props) {
  const lvl = levelFromXp(player.xp)
  const rank = rankFor(lvl.level)
  return (
    <button className="hud" onClick={onOpenProfile} title="profil, succès & thèmes">
      <span className="hud-level">
        <span className="hud-glyph">{rank.glyph}</span>
        <span className="hud-lvl-num">Lv {lvl.level}</span>
        <span className="hud-xpbar">
          <span className="hud-xpbar-fill" style={{ width: `${lvl.pct * 100}%` }} />
        </span>
      </span>
      {player.streak > 0 && (
        <span className="hud-stat hud-streak" title="série quotidienne">
          ▲ {player.streak}
        </span>
      )}
      <span className="hud-stat hud-coins" title="pièces">
        ◈ {player.coins}
      </span>
    </button>
  )
}
