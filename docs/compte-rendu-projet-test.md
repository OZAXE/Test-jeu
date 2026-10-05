# Compte rendu du projet test

Ce fichier sert de contexte de reprise : copier le bloc ci-dessous au début d'une nouvelle conversation avec Claude (par exemple pour le projet roguelike) pour qu'il reparte avec la méthode et les choix techniques validés ici.

```
## Contexte de reprise : 2026-10-05 : Session CODE + DESIGN

### Qui je suis
Étudiant ingénieur, je ne suis pas développeur de jeux. Je pilote des projets de jeux web réalisés entièrement par Claude Code (session cloud, dépôts GitHub), et je juge sur des résultats testés et visibles.

### Ce qu'on faisait
Projet test terminé : jeu d'exploration 3D à la 3e personne dans le navigateur (PC + mobile, rien à installer), dépôt OZAXE/Test-jeu, en ligne sur https://ozaxe.github.io/Test-jeu/. But : valider la techno (Vite + Three.js + GitHub Pages) et une méthode de travail avec Claude. Validé : je juge les tests convaincants. Prochain projet : un jeu de type roguelike dans un NOUVEAU dépôt GitHub. Il faut réutiliser la méthode et les choix techniques validés ici, sans copier le code tel quel.

### Décisions prises et raisonnements
- Stack : Vite + Three.js, JavaScript sans TypeScript, aucun éditeur graphique (tout en code/texte pour que Claude écrive et corrige seul).
- GitHub Pages via GitHub Actions (actions/deploy-pages). `base` dans vite.config.js = '/<NomDuDépôt>/' en dev, preview ET build, casse comprise. Sinon page blanche en ligne. Une version conditionnelle (base seulement au build) a cassé `vite preview` : à éviter.
- Prérequis manuel côté utilisateur : Settings > Pages > Source = "GitHub Actions". Le déploiement ne part que depuis main (l'environnement github-pages refuse les autres branches par défaut).
- Architecture pensée pour un futur multijoueur : état pur sérialisable (state/), simulation pure sans Three.js et exécutable dans Node (systems/), rendu qui lit l'état sans le modifier (render/, *View.js), contrôles qui produisent un objet "intention" ({moveX, moveY, yaw, sprint, jump}). Boucle à pas fixe 60 Hz + interpolation d'affichage.
- Monde généré par graine (PRNG mulberry32 + bruit simplex maison) : identique pour tous les joueurs, sans dépendance externe.
- Performance mobile d'abord : InstancedMesh, MeshLambertMaterial, pas de shadow maps (ombre "disque" à la place), pixel ratio plafonné (1,5 mobile / 2 PC), pas d'antialias sur mobile, eau animée à 20 Hz seulement.
- Contrôles : event.code (KeyW…) pour que ZQSD (AZERTY) et WASD marchent sans réglage ; souris en Pointer Lock ; mobile = joystick gauche, glisser à droite, boutons Saut/Sprint ; appareil détecté via matchMedia('(pointer: coarse)') et non le user-agent.
- Caméra / arbres : les props qui cachent le joueur passent en transparence (InstancedMesh "fantôme"), avec une hystérésis de 0,4 m contre le clignotement. Rejeté : rapprocher la caméra (va-et-vient permanent en forêt).
- Caméra / collines : la caméra MONTE (angle vertical) au lieu de se rapprocher. Le rapprochement a été testé puis abandonné : sur une pente, caméra collée à 1,25 m, on ne voyait que la tête. Seule la correction est lissée, les mouvements du joueur restent instantanés.
- Tests : node:test sans dépendance, sur la logique pure (simulation, collisions, occlusion). Chaque test est validé en cassant volontairement le code pour vérifier qu'il échoue.

### État actuel
- Dépôt OZAXE/Test-jeu : 4 PR fusionnées. #1 prototype, #2 contrôle CI des PR + tests, #3 transparence des arbres, #4 caméra au-dessus des collines. Tous les déploiements sont verts, rien en attente.
- 16 tests passent (npm test), le build passe.
- Méthode de livraison validée et écrite dans CLAUDE.md du dépôt : branche, commits clairs, PR vers main, attendre le check "Contrôle" (ci.yml : npm ci + npm test + npm run build), Claude fusionne lui-même si vert, puis vérifie le workflow de déploiement. Ne jamais fusionner si rouge.
- Limite d'environnement : la session cloud ne peut pas ouvrir *.github.io (proxy 403). La page en ligne est vérifiée via le statut du workflow, et le rendu via Chromium headless local (vite preview + Playwright, rendu SwiftShader : les fps mesurés ne sont pas représentatifs).
- Non testé : vraies performances sur un téléphone physique.

### Artefacts et fichiers (dépôt Test-jeu, réutilisables comme modèles)
- .github/workflows/deploy.yml : build Vite + publication Pages sur push main + lancement manuel.
- .github/workflows/ci.yml : contrôle des PR (tests + build).
- CLAUDE.md : conventions + méthode de livraison. À recréer dans le nouveau dépôt.
- vite.config.js : base fixe = nom du dépôt.
- index.html + src/style.css : plein écran mobile (viewport user-scalable=no + viewport-fit=cover, touch-action none, overscroll none, 100dvh, safe-area), écran start/pause.
- src/core/ (renderer, device), src/state/, src/systems/ (movement, collision), src/world/ (noise, heightmap, terrain, water, props, sky, world, worldView), src/render/playerView.js, src/camera/ (followCamera, occlusion), src/controls/ (keyboardMouse, touch, input), src/config.js (tous les réglages).
- tests/simulation.test.js, tests/occlusion.test.js.

### Prochaines étapes
1. Avant de coder le roguelike, cadrer avec moi : 2D ou 3D, tour par tour ou temps réel, PC et/ou mobile, multijoueur visé ou non, ambiance. Puis proposer un plan + arborescence et ATTENDRE mon accord.
2. Créer et configurer le nouveau dépôt : ajouter le dépôt à la session (add_repo), mettre `base` = nom exact du nouveau dépôt, me rappeler d'activer Settings > Pages > Source = GitHub Actions.
3. Reprendre dès le départ : deploy.yml, ci.yml, CLAUDE.md, script npm test, séparation état / simulation pure / rendu / intentions.
4. Pour un roguelike, rendre la simulation pure et déterministe par graine (génération de donjon, combats, loot) pour pouvoir la tester dans Node et rejouer une partie à l'identique.
5. Livrer par étapes avec une PR chacune, contrôle vert, fusion par Claude, vérification du déploiement, puis test visuel headless (PC + viewport mobile) avant chaque PR.

### Contraintes et règles établies
- Toujours proposer plan + arborescence et attendre mon accord avant de coder un nouveau projet.
- Commentaires du code en français, explications détaillées en français, tutoiement, pas de tiret long.
- Claude est autorisé à créer ET fusionner les PR lui-même, uniquement si le check CI est vert. Il vérifie ensuite le déploiement et corrige si rouge.
- Ne pas mettre d'identifiant de modèle dans les commits ou PR.
- Prouver chaque correctif : test unitaire + capture avant/après quand c'est visuel. Si un test visuel montre que l'approche est mauvaise, le dire et changer d'approche (comme pour la caméra-collines).
- Mobile d'abord : peu de polygones, pas d'ombres lourdes, pixel ratio plafonné, objectif 60 fps sur téléphone milieu de gamme.

### Questions ouvertes
- Genre exact du roguelike (2D/3D, tour par tour/temps réel, vue) : non défini, à cadrer en premier.
- Multijoueur (2 à 10 joueurs visés sur le projet test) : GitHub Pages est statique, il faudra un serveur à part (Node + WebSocket sur Render/Fly.io/Railway, ou Colyseus). Serveur qui fait foi ou simple relais : non tranché.
- Le projet Test-jeu reste en l'état. Pas de suite prévue pour l'instant.
- Performances réelles sur téléphone jamais mesurées : à vérifier sur le nouveau projet dès la première version jouable.
```
