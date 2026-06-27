// =============================================================================
// Page « paramètres » — réglages du jeu (Config) + confort visuel/sonore (Prefs)
// + boutique de thèmes. Page plein écran (pas une modale). Offline-first : tout
// passe par les callbacks fournis, aucune dépendance cloud.
// =============================================================================
import { useEffect, useRef, useState } from 'react'
import './Settings.css'
import { exportData, importData } from './data'
import type { Config, GameMode, InputMode, Lang } from './types'
import { LANG_LABEL } from './types'
import type { Prefs, FontId, CaretStyle } from './prefs'
import { FONTS } from './prefs'
import { SOUND_PACKS, playKey } from './sound'
import type { PlayerState } from './player'
import { THEMES } from './themes'
import { levelFromXp } from './progression'

interface SettingsProps {
  config: Config
  applyConfig: (patch: Partial<Config>) => void
  prefs: Prefs
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  resetPrefs: () => void
  player: PlayerState
  buyTheme: (id: string) => boolean
  equipTheme: (id: string) => void
  onResetProgress: () => void
}

// --- petites briques d'UI réutilisables --------------------------------------

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <section className="set-section">
      <h2 className="set-eyebrow">
        <span className="set-caret">▸</span> {eyebrow}
      </h2>
      <div className="set-panel">{children}</div>
    </section>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="set-row">
      <div className="set-row-label">
        <span className="set-row-title">{label}</span>
        {hint ? <span className="set-row-hint">{hint}</span> : null}
      </div>
      <div className="set-row-control">{children}</div>
    </div>
  )
}

function PillGroup<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div className="set-pills" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            className={`set-pill${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Toggle({
  on,
  onToggle,
  label,
}: {
  on: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      className={`set-switch${on ? ' is-on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-pressed={on}
      aria-label={label}
      onClick={onToggle}
    >
      <span className="set-switch-knob" />
    </button>
  )
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  display,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (n: number) => void
  ariaLabel: string
  display: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="set-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${pct}%` }}
      />
      <span className="set-slider-val">{display}</span>
    </div>
  )
}

// --- composant principal -----------------------------------------------------

export default function Settings(props: SettingsProps) {
  const {
    config,
    applyConfig,
    prefs,
    setPref,
    resetPrefs,
    player,
    buyTheme,
    equipTheme,
    onResetProgress,
  } = props

  const level = levelFromXp(player.xp).level

  // Confirmation inline pour la zone de danger.
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    if (!confirmReset) return
    const t = setTimeout(() => setConfirmReset(false), 3500)
    return () => clearTimeout(t)
  }, [confirmReset])

  // Sauvegarde locale : export (téléchargement) / import (fichier .json).
  const fileRef = useRef<HTMLInputElement>(null)
  const [dataMsg, setDataMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const exportProgress = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monkeycode-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setDataMsg({ kind: 'ok', text: 'progression exportée' })
  }

  const importProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (importData(String(reader.result))) {
        setDataMsg({ kind: 'ok', text: 'import réussi — rechargement…' })
        setTimeout(() => location.reload(), 600)
      } else {
        setDataMsg({ kind: 'err', text: 'fichier invalide' })
      }
    }
    reader.readAsText(file)
  }

  const handleResetProgress = () => {
    if (confirmReset) {
      setConfirmReset(false)
      onResetProgress()
    } else {
      setConfirmReset(true)
    }
  }

  const langOptions = (Object.keys(LANG_LABEL) as Lang[]).map((l) => ({
    value: l,
    label: LANG_LABEL[l],
  }))

  return (
    <div className="settings-page">
      <header className="set-head">
        <h1 className="set-title">paramètres</h1>
        <p className="set-sub">
          règle le jeu, l’apparence et le son. tout est sauvegardé sur cet appareil.
        </p>
      </header>

      <div className="set-body">
        {/* 1 — Comportement ---------------------------------------------- */}
        <Section eyebrow="comportement">
          <Row label="mode de jeu" hint="réécrire un extrait ou le modifier">
            <PillGroup<GameMode>
              ariaLabel="mode de jeu"
              value={config.game}
              onChange={(v) => applyConfig({ game: v })}
              options={[
                { value: 'rewrite', label: 'réécrire' },
                { value: 'refactor', label: 'modifier' },
              ]}
            />
          </Row>
          <Row label="langage">
            <PillGroup<Lang>
              ariaLabel="langage"
              value={config.lang}
              onChange={(v) => applyConfig({ lang: v })}
              options={langOptions}
            />
          </Row>
          <Row label="saisie" hint="touches normales ou modal vim">
            <PillGroup<InputMode>
              ariaLabel="mode de saisie"
              value={config.input}
              onChange={(v) => applyConfig({ input: v })}
              options={[
                { value: 'normal', label: 'normal' },
                { value: 'vim', label: 'vim' },
              ]}
            />
          </Row>
          <Row label="mode ide" hint="autocomplétion et aides à la frappe">
            <Toggle
              label="mode ide"
              on={config.ide}
              onToggle={() => applyConfig({ ide: !config.ide })}
            />
          </Row>
          <Row label="indentation auto" hint="garde l’indentation à la ligne suivante">
            <Toggle
              label="indentation automatique"
              on={config.autoIndent}
              onToggle={() => applyConfig({ autoIndent: !config.autoIndent })}
            />
          </Row>
          <Row label="redémarrage rapide" hint="tab relance le run en cours">
            <Toggle
              label="redémarrage rapide"
              on={prefs.quickRestart}
              onToggle={() => setPref('quickRestart', !prefs.quickRestart)}
            />
          </Row>
          <Row label="mode aveugle" hint="masque le surlignage des erreurs">
            <Toggle
              label="mode aveugle"
              on={prefs.blindMode}
              onToggle={() => setPref('blindMode', !prefs.blindMode)}
            />
          </Row>
        </Section>

        {/* 2 — Apparence ------------------------------------------------- */}
        <Section eyebrow="apparence">
          <div className="set-field">
            <div className="set-field-head">
              <span className="set-row-title">thème</span>
              <span className="set-coins">
                {player.coins} <span className="set-coins-unit">pièces</span>
              </span>
            </div>
            <div className="set-themes">
              {THEMES.map((t) => {
                const owned = player.unlockedThemes.includes(t.id)
                const equipped = player.equippedTheme === t.id
                const meetsLevel = level >= t.minLevel
                const affordable = player.coins >= t.cost
                const buyable = !owned && meetsLevel && affordable
                const disabled = !owned && !buyable

                const onClick = () => {
                  if (equipped) return
                  if (owned) {
                    equipTheme(t.id)
                  } else if (buyable) {
                    buyTheme(t.id) // auto-équipe côté player.ts
                  }
                }

                let state = 'verrouillé'
                if (equipped) state = 'équipé'
                else if (owned) state = 'débloqué'
                else if (buyable) state = `${t.cost} pièces`

                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`set-theme${equipped ? ' is-equipped' : ''}${
                      disabled ? ' is-locked' : ''
                    }`}
                    aria-pressed={equipped}
                    aria-label={`thème ${t.name}, ${state}`}
                    disabled={disabled}
                    onClick={onClick}
                  >
                    <span
                      className="set-theme-swatch"
                      style={{ background: t.vars.bg, borderColor: t.vars.panelEdge }}
                    >
                      <span
                        className="set-theme-chip"
                        style={{ background: t.vars.panel }}
                      />
                      <span
                        className="set-theme-chip"
                        style={{ background: t.vars.accent }}
                      />
                      <span
                        className="set-theme-chip"
                        style={{ background: t.vars.fg }}
                      />
                    </span>
                    <span className="set-theme-name">{t.name}</span>
                    <span
                      className={`set-theme-state${
                        equipped ? ' is-equipped' : owned ? ' is-owned' : ''
                      }`}
                    >
                      {equipped
                        ? '● équipé'
                        : owned
                          ? 'débloqué'
                          : buyable
                            ? `${t.cost} pièces`
                            : !meetsLevel
                              ? `niv. ${t.minLevel}`
                              : `${t.cost} pièces`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <Row label="police">
            <div className="set-pills" role="group" aria-label="police">
              {FONTS.map((f) => {
                const active = prefs.font === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`set-pill${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    style={{ fontFamily: f.stack }}
                    onClick={() => setPref('font', f.id as FontId)}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </Row>

          <Row label="taille de police" hint="taille du texte de l’éditeur">
            <Slider
              ariaLabel="taille de police"
              value={prefs.fontSize}
              min={13}
              max={22}
              step={1}
              display={`${prefs.fontSize} px`}
              onChange={(n) => setPref('fontSize', n)}
            />
          </Row>

          <Row label="style du curseur">
            <PillGroup<CaretStyle>
              ariaLabel="style du curseur"
              value={prefs.caret}
              onChange={(v) => setPref('caret', v)}
              options={[
                { value: 'line', label: 'trait' },
                { value: 'block', label: 'bloc' },
                { value: 'underline', label: 'souligné' },
              ]}
            />
          </Row>
          <Row label="curseur clignotant">
            <Toggle
              label="curseur clignotant"
              on={prefs.caretBlink}
              onToggle={() => setPref('caretBlink', !prefs.caretBlink)}
            />
          </Row>
          <Row label="curseur fluide" hint="anime le déplacement du curseur">
            <Toggle
              label="curseur fluide"
              on={prefs.smoothCaret}
              onToggle={() => setPref('smoothCaret', !prefs.smoothCaret)}
            />
          </Row>
        </Section>

        {/* 3 — Affichage ------------------------------------------------- */}
        <Section eyebrow="affichage">
          <Row label="wpm en direct" hint="vitesse affichée pendant le run">
            <Toggle
              label="wpm en direct"
              on={prefs.liveSpeed}
              onToggle={() => setPref('liveSpeed', !prefs.liveSpeed)}
            />
          </Row>
          <Row label="barre de progression">
            <Toggle
              label="barre de progression"
              on={prefs.showProgress}
              onToggle={() => setPref('showProgress', !prefs.showProgress)}
            />
          </Row>
          <Row label="fantôme" hint="course contre ton meilleur run">
            <Toggle
              label="fantôme"
              on={prefs.showGhost}
              onToggle={() => setPref('showGhost', !prefs.showGhost)}
            />
          </Row>
          <Row label="chrono">
            <Toggle
              label="chrono"
              on={prefs.showClock}
              onToggle={() => setPref('showClock', !prefs.showClock)}
            />
          </Row>
        </Section>

        {/* 4 — Son ------------------------------------------------------- */}
        <Section eyebrow="son">
          <Row label="son de frappe" hint="vrai retour sonore mécanique à chaque touche">
            <Toggle
              label="son de frappe"
              on={config.sound}
              onToggle={() => applyConfig({ sound: !config.sound })}
            />
          </Row>
          <Row label="volume" hint="niveau du clavier et des effets">
            <Slider
              ariaLabel="volume du son"
              value={prefs.soundVolume}
              min={0}
              max={1}
              step={0.05}
              display={`${Math.round(prefs.soundVolume * 100)} %`}
              onChange={(n) => setPref('soundVolume', n)}
            />
          </Row>

          <div className="set-field">
            <div className="set-field-head">
              <span className="set-row-title">clavier</span>
              <span className="set-row-hint set-sound-help">
                clique un pack pour l’écouter — d’autres se débloquent en montant de niveau
              </span>
            </div>
            <div className="set-sounds">
              {SOUND_PACKS.map((sp) => {
                const unlocked = level >= sp.minLevel
                const active = prefs.soundPack === sp.id
                const onClick = () => {
                  if (!unlocked) return
                  setPref('soundPack', sp.id)
                  // aperçu : on joue le pack immédiatement (le moteur lit la pref
                  // au prochain rendu, donc on force ici via une frappe témoin).
                  setTimeout(() => playKey(), 0)
                }
                return (
                  <button
                    key={sp.id}
                    type="button"
                    className={`set-sound${active ? ' is-active' : ''}${
                      unlocked ? '' : ' is-locked'
                    }`}
                    aria-pressed={active}
                    aria-label={`pack ${sp.label}${unlocked ? '' : `, verrouillé niveau ${sp.minLevel}`}`}
                    disabled={!unlocked}
                    onClick={onClick}
                  >
                    <span className="set-sound-top">
                      <span className="set-sound-name">{sp.label}</span>
                      {unlocked ? (
                        active ? (
                          <span className="set-sound-badge is-on">● actif</span>
                        ) : (
                          <span className="set-sound-badge">▶ écouter</span>
                        )
                      ) : (
                        <span className="set-sound-badge is-lock">⬚ niv. {sp.minLevel}</span>
                      )}
                    </span>
                    <span className="set-sound-hint">{sp.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Section>

        {/* 5 — Données --------------------------------------------------- */}
        <Section eyebrow="données">
          <Row
            label="sauvegarde locale"
            hint="exporte ou restaure profil, historique, records et ghosts"
          >
            <div className="set-data-actions">
              <button type="button" className="set-btn" onClick={exportProgress}>
                ↓ exporter
              </button>
              <button
                type="button"
                className="set-btn"
                onClick={() => fileRef.current?.click()}
              >
                ↑ importer
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                onChange={importProgress}
                hidden
              />
            </div>
          </Row>
          {dataMsg && (
            <p className={`set-data-msg is-${dataMsg.kind}`} role="status">
              {dataMsg.text}
            </p>
          )}
          <Row
            label="réinitialiser l’apparence"
            hint="remet polices, curseur et affichage par défaut"
          >
            <button type="button" className="set-btn" onClick={resetPrefs}>
              réinitialiser
            </button>
          </Row>
          <div className="set-danger">
            <div className="set-row-label">
              <span className="set-row-title set-danger-title">
                réinitialiser ma progression
              </span>
              <span className="set-row-hint">
                efface xp, pièces, thèmes et succès. irréversible.
              </span>
            </div>
            <button
              type="button"
              className={`set-btn set-btn-danger${confirmReset ? ' is-armed' : ''}`}
              onClick={handleResetProgress}
            >
              {confirmReset ? 'confirmer ?' : 'réinitialiser ma progression'}
            </button>
          </div>
        </Section>
      </div>
    </div>
  )
}
