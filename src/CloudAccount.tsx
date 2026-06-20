// Rendu uniquement quand CLOUD_ENABLED → les hooks Convex ont leur provider.
import { useState } from 'react'
import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'

export default function CloudAccount() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isLoading) return <div className="prof-offline">connexion…</div>

  if (isAuthenticated) {
    return (
      <div className="prof-account">
        <p>
          Compte <b>synchronisé</b> ✓ — ta progression est sauvegardée dans le cloud.
        </p>
        <button className="prof-theme-btn" onClick={() => void signOut()}>
          se déconnecter
        </button>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn('password', { email, password, flow })
    } catch {
      setError(flow === 'signIn' ? 'identifiants invalides' : 'inscription impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="prof-auth" onSubmit={submit}>
      <div className="prof-auth-tabs">
        <button
          type="button"
          className={flow === 'signIn' ? 'prof-tab on' : 'prof-tab'}
          onClick={() => setFlow('signIn')}
        >
          connexion
        </button>
        <button
          type="button"
          className={flow === 'signUp' ? 'prof-tab on' : 'prof-tab'}
          onClick={() => setFlow('signUp')}
        >
          créer un compte
        </button>
      </div>
      <input
        className="prof-input"
        type="email"
        placeholder="email"
        value={email}
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="prof-input"
        type="password"
        placeholder="mot de passe"
        value={password}
        autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <div className="prof-auth-err">{error}</div>}
      <button className="prof-theme-btn buy" type="submit" disabled={busy}>
        {busy ? '…' : flow === 'signIn' ? 'se connecter' : "s'inscrire"}
      </button>
      <button
        type="button"
        className="prof-auth-anon"
        onClick={() => void signIn('anonymous')}
      >
        continuer en invité
      </button>
    </form>
  )
}
