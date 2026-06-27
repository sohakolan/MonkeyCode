// =============================================================================
// Modale de compte cloud — inscription / connexion par pseudo + mot de passe.
// Rendue uniquement quand CLOUD_ENABLED (les hooks Convex ont leur provider).
//
// Le backend Convex (auth Password) s'identifie par e-mail : on mappe donc le
// pseudo vers un identifiant synthétique stable (`pseudo@mc.local`) que
// l'utilisateur ne voit jamais. Le vrai pseudo est passé via `name` et devient
// le `handle` du profil côté serveur (voir convex/auth.ts + convex/profile.ts).
// =============================================================================
import { useEffect, useRef, useState } from 'react'
import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'

type Flow = 'signIn' | 'signUp'

// Identifiant interne dérivé du pseudo (jamais affiché).
function handleToEmail(handle: string): string {
  const slug = handle.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '')
  return `${slug}@mc.local`
}

function validate(flow: Flow, handle: string, password: string): string | null {
  const h = handle.trim()
  if (flow === 'signUp') {
    if (h.length < 3) return 'choisis un pseudo d’au moins 3 caractères.'
    if (h.length > 20) return 'pseudo trop long (20 caractères max).'
    if (!/^[a-zA-Z0-9_]+$/.test(h))
      return 'pseudo : lettres, chiffres et _ uniquement.'
    if (password.length < 6) return 'mot de passe : 6 caractères minimum.'
  } else {
    if (!h) return 'entre ton pseudo.'
    if (!password) return 'entre ton mot de passe.'
  }
  return null
}

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const [flow, setFlow] = useState<Flow>('signUp')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  // Échap ferme, focus auto sur le premier champ.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    firstFieldRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const problem = validate(flow, handle, password)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await signIn('password', {
        email: handleToEmail(handle),
        password,
        name: handle.trim(),
        flow,
      })
      onClose()
    } catch {
      setError(
        flow === 'signIn'
          ? 'pseudo ou mot de passe incorrect.'
          : 'ce pseudo est peut-être déjà pris — essaie d’en changer.',
      )
    } finally {
      setBusy(false)
    }
  }

  const guest = async () => {
    setBusy(true)
    setError(null)
    try {
      await signIn('anonymous')
      onClose()
    } catch {
      setError('connexion invité impossible pour le moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-scrim" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label="compte cloud"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="auth-x" onClick={onClose} aria-label="fermer">
          ✕
        </button>

        <div className="auth-brand">
          monkey<span className="logo-accent">_code</span>
        </div>

        {isLoading ? (
          <p className="auth-loading">connexion au cloud…</p>
        ) : isAuthenticated ? (
          // --- déjà connecté --------------------------------------------------
          <div className="auth-connected">
            <div className="auth-check">✓</div>
            <h2 className="auth-h2">compte synchronisé</h2>
            <p className="auth-lead">
              ta progression — xp, niveaux, pièces, succès et records — est
              sauvegardée dans le cloud et te suit sur tous tes appareils.
            </p>
            <button className="auth-submit ghost" onClick={() => void signOut()}>
              se déconnecter
            </button>
          </div>
        ) : (
          // --- inscription / connexion ---------------------------------------
          <>
            <h2 className="auth-h2">
              {flow === 'signUp' ? 'crée ton compte' : 'content de te revoir'}
            </h2>
            <p className="auth-lead">
              {flow === 'signUp'
                ? 'garde ta progression en sécurité et grimpe dans le classement mondial. juste un pseudo et un mot de passe — pas d’e-mail.'
                : 'reconnecte-toi pour retrouver ta progression synchronisée.'}
            </p>

            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={flow === 'signUp'}
                className={flow === 'signUp' ? 'auth-tab on' : 'auth-tab'}
                onClick={() => {
                  setFlow('signUp')
                  setError(null)
                }}
              >
                créer un compte
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={flow === 'signIn'}
                className={flow === 'signIn' ? 'auth-tab on' : 'auth-tab'}
                onClick={() => {
                  setFlow('signIn')
                  setError(null)
                }}
              >
                se connecter
              </button>
            </div>

            <form className="auth-form" onSubmit={submit}>
              <label className="auth-label">
                <span>pseudo</span>
                <input
                  ref={firstFieldRef}
                  className="auth-input"
                  type="text"
                  placeholder="ex. neo_dev"
                  value={handle}
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={20}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </label>

              <label className="auth-label">
                <span>mot de passe</span>
                <div className="auth-pw">
                  <input
                    className="auth-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder={flow === 'signUp' ? '6 caractères minimum' : '••••••••'}
                    value={password}
                    autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'masquer le mot de passe' : 'afficher le mot de passe'}
                    tabIndex={-1}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </label>

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              <button className="auth-submit" type="submit" disabled={busy}>
                {busy
                  ? '…'
                  : flow === 'signUp'
                    ? 'créer mon compte →'
                    : 'se connecter →'}
              </button>
            </form>

            <div className="auth-divider">
              <span>ou</span>
            </div>

            <button className="auth-guest" type="button" onClick={guest} disabled={busy}>
              continuer en invité
            </button>
            <p className="auth-fineprint">
              tu peux jouer sans compte : ta progression reste sur cet appareil.
              crée un compte quand tu veux la synchroniser.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
