// =============================================================================
// Identité du joueur (offline-first, localStorage) : nom affiché, description,
// profil public. Séparé de la progression (player.ts) et des préférences
// (prefs.ts) : ici on ne décrit que « qui » est le joueur, pas ses scores.
//
// Quand le cloud est lié, le pseudo du compte (handle) fait foi pour le nom ;
// la description et le réglage public restent locaux.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Identity {
  name: string // nom affiché / pseudo
  bio: string // courte description
  isPublic: boolean // profil visible au classement
}

export const DEFAULT_IDENTITY: Identity = {
  name: '',
  bio: '',
  isPublic: true,
}

export const NAME_MAX = 20
export const BIO_MAX = 160

const KEY = 'monkeycode.identity.v1'

export function loadIdentity(): Identity {
  try {
    return { ...DEFAULT_IDENTITY, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...DEFAULT_IDENTITY }
  }
}

function save(id: Identity) {
  localStorage.setItem(KEY, JSON.stringify(id))
}

export interface IdentityApi {
  identity: Identity
  setIdentity: (patch: Partial<Identity>) => void
}

export function useIdentity(): IdentityApi {
  const [identity, setState] = useState<Identity>(loadIdentity)
  const ref = useRef(identity)

  useEffect(() => {
    ref.current = identity
    save(identity)
  }, [identity])

  const setIdentity = useCallback((patch: Partial<Identity>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  return { identity, setIdentity }
}
