# Backend Convex — monkey_code

Tout le backend est **serverless** (queries/mutations Convex). Le front reste un
build statique sur Vercel : **aucune fonction Vercel** n'est utilisée, donc aucun
quota de compute Vercel consommé.

## Lier le projet (à faire une fois)

```bash
npx convex dev          # crée le déploiement, génère convex/_generated, écrit .env.local
```

Cela ajoute `VITE_CONVEX_URL` à `.env.local`. Le front le lit automatiquement
(`src/cloud.tsx`). Tant que la variable est absente, l'app tourne **100 % en
local** (localStorage) — la progression marche déjà sans backend.

### Auth (mot de passe + anonyme)

`npx @convex-dev/auth` configure les clés JWT (`JWKS`, `JWT_PRIVATE_KEY`) et
`SITE_URL`. Providers actifs : `Password` et `Anonymous` (voir `auth.ts`).

## Déploiement Vercel

1. `npx convex deploy` (ou via l'intégration Vercel) pour le backend de prod.
2. Sur Vercel : build `npm run build`, output `dist/`, et variable
   `VITE_CONVEX_URL` = URL du déploiement Convex prod.

## Fonctions

| Fichier            | Rôle                                                       |
| ------------------ | ---------------------------------------------------------- |
| `schema.ts`        | tables `profiles`, `runs` + tables d'auth                  |
| `auth.ts`          | providers Password / Anonymous                             |
| `profile.ts`       | `me`, `ensure`, `setHandle`, `equipTheme`, `unlockTheme`   |
| `runs.ts`          | `submit` (XP/niveau/série/records), `recent`               |
| `leaderboard.ts`   | `byXp`, `bySpeed`, `topByLang`                             |
| `progression.ts`   | calcul XP/niveau (autorité serveur)                        |
