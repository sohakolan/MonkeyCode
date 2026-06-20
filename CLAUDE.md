# CLAUDE.md — guide de contribution (agents & humains)

MonkeyCode = « MonkeyType pour le code » : un entraîneur de dactylographie de code
(React 19 + Vite + TypeScript + CodeMirror 6), backend **Convex serverless**,
hébergé sur **Vercel** (build statique, aucune fonction Vercel → pas de quota compute).

## Convention de commit — Conventional Commits 1.0.0 (OBLIGATOIRE)

Chaque commit DOIT suivre <https://www.conventionalcommits.org/fr/v1.0.0/> :

```
<type>(<scope>): <description courte à l'impératif, minuscule, sans point final>

[corps optionnel : le pourquoi, pas le comment]

[footer optionnel : BREAKING CHANGE:, refs…]
```

**Types autorisés** : `feat`, `fix`, `chore`, `docs`, `style`, `refactor`,
`perf`, `test`, `build`, `ci`, `revert`.

**Scopes usuels** : `front`, `backend`, `convex`, `progression`, `rewards`,
`ghost`, `auth`, `ui`, `deps`, `config`.

**Règles** :
- Un commit = un changement logique cohérent (ne pas tout empiler).
- Description ≤ ~72 caractères, à l'impératif présent (« add », « fix », pas « added »).
- Changement cassant : `feat(api)!: …` ou footer `BREAKING CHANGE: …`.
- Commit ET push à chaque changement significatif (le travail ne reste pas local).

**Exemples** :
```
feat(front): add race-against-ghost replay during runs
fix(progression): cap speed multiplier so short runs aren't over-rewarded
chore(deps): add convex and @convex-dev/auth
docs(convex): document linking steps for the serverless backend
refactor(ui): extract player hud from app header
```

## Commandes

```bash
npm run dev      # serveur de dev
npm run build    # tsc -b + vite build  ← gate de validation (doit rester vert)
npm run lint     # eslint (le repo tolère la convention ref-pendant-render)
```

Avant de commit : `npm run build` doit passer.

## Architecture (repères)

- `src/` — front. Progression **offline-first** (localStorage) : `progression.ts`,
  `achievements.ts`, `themes.ts`, `player.ts`, `ghost.ts`. UI : `App.tsx`, `Editor.tsx`,
  `Hud.tsx`, `Profile.tsx`, `Results.tsx`.
- `convex/` — backend serverless (schéma, auth Password/Anonymous, profils, runs,
  classements). Voir `convex/README.md`. Non typé par le build front (tsconfig `include: ["src"]`).
- Le cloud est **optionnel** : sans `VITE_CONVEX_URL`, l'app tourne 100 % en local.
  Tout le code cloud est guardé par `CLOUD_ENABLED` (`src/cloudEnv.ts`) et référence les
  fonctions via `anyApi` pour ne pas dépendre de `convex/_generated`.

## Contraintes produit

- Rester **serverless** (Convex) — jamais de compute Vercel.
- Ne jamais casser le mode **offline** : toute feature cloud doit être additive et guardée.
- Esthétique « ember terminal » tout-mono ; les thèmes recolorent via `--accent-rgb`.
