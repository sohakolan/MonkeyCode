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
    title: 'recopie à droite',
    text: 'le panneau de gauche est le modèle, en lecture seule. tu tapes dans l’éditeur de droite. vitesse, précision et régularité sont mesurées pendant la frappe.',
  },
  {
    glyph: '⚙',
    title: 'choisis ton terrain',
    text: 'cinq langages (ts, py, rust, go, c), mode réécrire ou modifier, clavier normal ou vim, assistance ide et son de frappe.',
  },
  {
    glyph: '✦',
    title: 'progresse',
    text: 'les runs rapportent xp, niveaux, pièces et succès. monte en niveau pour débloquer thèmes et sons. il y a aussi le sprint, le défi du jour et la course contre ton ghost.',
  },
  {
    glyph: '☁',
    title: 'garde ta progression',
    text: 'sans compte, tout reste sur cet appareil. avec un compte (pseudo + mot de passe), ta progression se synchronise et tu entres au classement.',
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
          un entraîneur de frappe sur du vrai code, pas du texte. cinq langages,
          deux modes, et une progression locale.
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
