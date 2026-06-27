// Carte d'accueil — affichée une seule fois, au tout premier lancement
// (aucun run joué). Non bloquante : un bouton « commencer » la referme.
import { useEffect } from 'react'

interface Step {
  glyph: string
  title: string
  text: string
}

const STEPS: Step[] = [
  {
    glyph: '⌨',
    title: 'recopie, à droite',
    text: 'le panneau de gauche est le modèle (lecture seule). tu tapes dans l’éditeur de droite : vitesse, précision et régularité sont mesurées en direct.',
  },
  {
    glyph: '⚙',
    title: 'choisis ton terrain',
    text: 'langage (ts · py · rust · go), mode réécrire ou modifier, clavier normal ou vim, assistance ide (auto-complétion, snippets) et son de frappe mécanique.',
  },
  {
    glyph: '✦',
    title: 'progresse & débloque',
    text: 'gagne xp, niveaux, pièces et succès. monte en niveau pour débloquer des thèmes et des sons de clavier. tente le ▶ sprint, le ⚡ défi du jour et la course contre ton ghost.',
  },
  {
    glyph: '☁',
    title: 'garde ta progression',
    text: 'joue sans compte (tout reste sur cet appareil), ou crée un compte avec un pseudo + mot de passe pour synchroniser et entrer au classement mondial.',
  },
]

export default function Onboarding({ onClose }: { onClose: () => void }) {
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
        className="onb"
        role="dialog"
        aria-modal="true"
        aria-label="bienvenue"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="onb-logo">
          monkey<span className="logo-accent">_code</span>
        </div>
        <p className="onb-lead">
          le monkeytype du code — muscle ta vitesse de frappe sur du vrai code, pas
          du texte. quatre langages, des modes, et une vraie progression.
        </p>

        <div className="onb-steps">
          {STEPS.map((s) => (
            <div key={s.title} className="onb-step">
              <span className="onb-glyph">{s.glyph}</span>
              <div>
                <div className="onb-step-title">{s.title}</div>
                <div className="onb-step-text">{s.text}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="onb-cta" onClick={onClose}>
          commencer →
        </button>
      </div>
    </div>
  )
}
