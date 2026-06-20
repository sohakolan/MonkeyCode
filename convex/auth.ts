import { convexAuth } from '@convex-dev/auth/server'
import { Password } from '@convex-dev/auth/providers/Password'
import { Anonymous } from '@convex-dev/auth/providers/Anonymous'

// Auth serverless : compte mot de passe + session anonyme (pour jouer sans
// inscription puis « upgrader » plus tard). Tout tourne côté Convex.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
})
