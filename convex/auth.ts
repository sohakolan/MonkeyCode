import { convexAuth } from '@convex-dev/auth/server'
import { Password } from '@convex-dev/auth/providers/Password'
import { Anonymous } from '@convex-dev/auth/providers/Anonymous'

// Auth serverless : compte mot de passe + session anonyme (pour jouer sans
// inscription puis « upgrader » plus tard). Tout tourne côté Convex.
//
// Le front s'inscrit avec un *pseudo* (pas un e-mail) : il l'envoie via `name`
// et fabrique un identifiant synthétique `pseudo@mc.local` dans `email`
// (l'identifiant de compte du provider Password). On stocke donc le pseudo dans
// `name`, qui devient le `handle` du profil à la création (convex/profile.ts).
const PseudoPassword = Password({
  profile(params) {
    const name = typeof params.name === 'string' ? params.name.trim() : ''
    return {
      email: String(params.email),
      ...(name ? { name } : {}),
    }
  },
  // Règle conviviale : 6 caractères minimum (le front valide aussi).
  validatePasswordRequirements(password) {
    if (password.length < 6) {
      throw new Error('Mot de passe trop court (6 caractères minimum).')
    }
  },
})

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [PseudoPassword, Anonymous],
})
