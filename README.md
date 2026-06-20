# monkey_code

Un MonkeyType pour le **code** : la cible s'affiche à gauche, tu tapes (ou transformes) le code à droite.

```bash
npm install
npm run dev
```

## Modes de jeu

- **réécrire** — recopie un snippet de zéro. Le panneau cible se colore au fil de la frappe (juste / faux / restant), les erreurs sont soulignées en rouge dans l'éditeur. Stats : wpm, précision, erreurs, régularité + courbe de wpm.
- **modifier** — pars d'un code existant et transforme-le pour qu'il corresponde à la cible (arrow functions, async/await, early returns, iterators…). Chaque ligne conforme se coche en temps réel. Stats : temps, frappes, frappes/min.
- **sprint** ▶ — time-attack 60 s : enchaîne un max de snippets courts, combo de score, record personnel par langage. Overlay isolé (`src/Sprint.tsx`).

## Défis & course

- **défi du jour** ⚡ — même exercice pour tout le monde un jour donné (choisi de façon déterministe), **bonus une fois par jour**. `src/snippets.ts:pickDaily`.
- **course contre ton ghost** — en réécriture, un marqueur fantôme rejoue la progression de ton meilleur run sur la même cible ; indicateur ▲ avance / ▼ retard en direct. `src/ghost.ts`.

## Clavier

- **normal** ou **vim** (émulation complète via CodeMirror : motions, opérateurs, modes — badge normal/insert/visual dans l'en-tête).
- `⌘↵` nouvel exercice · `⌘⌫` recommencer · sur l'écran de résultats : `↵` suivant, `⌫` rejouer.
- **indent auto** (mode réécrire) : à la ligne, l'indentation de la cible est insérée pour toi.

## Mode IDE (actif par défaut)

- Auto-fermeture des parenthèses/quotes/brackets (et frappe « par-dessus » pour les refermer) + surlignage du bracket correspondant.
- Autocomplétion (`Tab` pour accepter) : identifiants de l'exercice en cours + snippets expansibles par langage (`fn`, `forof`, `iferr`, `ifmain`, `match`…) avec champs navigables au `Tab`.
- En réécriture, les caractères auto-insérés après le curseur ne comptent pas comme erreurs.
- Les records sont comparés à mode IDE égal (un run assisté ne bat pas un record « pur »).

## Langages

TypeScript, Python, Rust, Go — snippets de réécriture et exercices de refactoring inclus dans `src/snippets.ts` (ajoute les tiens là-bas).

## Persistance

Tout en localStorage tant que Convex n'est pas lié : config, historique des runs,
profil de progression, ghosts et records de sprint (clés `monkeycode.*`, listées dans `src/data.ts`).

## Comptes, progression & récompenses

L'app fonctionne **100 % en local** (localStorage) tant qu'aucun backend n'est lié.

- **XP & niveaux** — chaque run rapporte de l'XP (vitesse × précision × régularité, bonus « à la main » sans IDE et bonus vim). Les niveaux débloquent des **rangs** de carrière dev (`hello_world` → `kernel hacker` → `singularity`). Voir `src/progression.ts`.
- **Pièces ◈** — gagnées à chaque run, dépensées dans la boutique de **thèmes** (`mint`, `arctic`, `synthwave`, `matrix`, `rosé pine`, `gold master`). Voir `src/themes.ts`.
- **Succès** — 16 succès (vitesse, sans-faute, vim, polyglotte, séries…) donnant XP + pièces. Voir `src/achievements.ts`.
- **Série quotidienne** — joue chaque jour pour faire grimper ta série.
- **Profil** — clique le HUD (en haut à droite) : stats, succès, thèmes, compte.

Tout est animé sur l'écran de résultats (XP, level-up, succès débloqués).

## Analytics & feedback

- **touches faibles** — chaque erreur est attribuée au caractère cible attendu ; le profil affiche tes caractères les plus ratés (décote du passé pour refléter le présent) + une **carte de chaleur clavier**. `src/achievements.ts` n.b. data dans `player.weakKeys`.
- **progression wpm** — courbe de tes 30 derniers runs (dernier / moyenne / record). `src/ProgressChart.tsx`.
- **son** 🔊 — retour audio synthétisé (Web Audio, zéro asset) : clic de touche, blip d'erreur, accord de fin. Toggle `son` dans la barre de config. `src/sound.ts`.

## Données

Onglet **compte** du profil : **exporter** / **importer** (JSON) / **réinitialiser** toute ta
progression locale — pour migrer entre navigateurs ou ne rien perdre avant Convex. `src/data.ts`.

## Backend Convex (serverless, prêt à brancher)

Le dossier `convex/` contient le schéma + les fonctions serverless (auth, profils,
runs, classements). **Aucune fonction Vercel** n'est utilisée → pas de quota compute
Vercel consommé. Pour lier :

```bash
npx convex dev          # génère convex/_generated + écrit VITE_CONVEX_URL dans .env.local
npx @convex-dev/auth     # configure les clés d'auth (Password + Anonymous)
```

Dès que `VITE_CONVEX_URL` est présent, l'onglet **compte** du profil propose
connexion / inscription. Détails dans `convex/README.md`.
