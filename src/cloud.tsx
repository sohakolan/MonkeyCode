// =============================================================================
// Pont Convex côté client. Activé seulement si VITE_CONVEX_URL est défini
// (après `npx convex dev`). Sans lui, l'app tourne 100 % en local et ce module
// se contente de relayer les enfants.
//
// Les fonctions Convex sont référencées via `anyApi` côté composants pour ne PAS
// dépendre de convex/_generated tant que le backend n'est pas généré.
// =============================================================================
import type { ReactNode } from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { CLOUD_ENABLED, CONVEX_URL } from './cloudEnv'

const client = CLOUD_ENABLED ? new ConvexReactClient(CONVEX_URL as string) : null

export function CloudProvider({ children }: { children: ReactNode }) {
  if (!client) return <>{children}</>
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>
}
