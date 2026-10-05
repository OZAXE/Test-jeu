# Test-jeu : exploration 3D dans le navigateur

Prototype de jeu d'exploration 3D (Vite + Three.js) jouable sur PC et sur téléphone, sans installation.

En ligne : https://ozaxe.github.io/Test-jeu/

## Contrôles

| | PC | Téléphone |
|---|---|---|
| Se déplacer | ZQSD (ou WASD, ou flèches) | Joystick (moitié gauche de l'écran) |
| Caméra | Souris (clic pour capturer, Échap pour libérer) | Glisser le doigt sur la moitié droite |
| Sauter | Espace | Bouton « Saut » |
| Sprint | Maj (maintenu) | Bouton « Sprint » (interrupteur) |

## Lancer en local

Prérequis : Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173/Test-jeu/ (le chemin `/Test-jeu/` est volontaire, c'est le même qu'en ligne).

Autres commandes :

- `npm run build` : construit la version finale dans `dist/`
- `npm run preview` : sert le contenu de `dist/` pour vérifier le build

## Tester sur son téléphone

1. Le PC et le téléphone doivent être sur le **même réseau Wi-Fi**.
2. Lancer `npm run dev:mobile` (équivaut à `vite --host`).
3. Vite affiche une ligne `Network: http://192.168.x.x:5173/Test-jeu/`.
4. Ouvrir cette adresse sur le téléphone.

Si la page ne charge pas : le pare-feu du PC bloque sans doute le port 5173 (sous Windows, autoriser Node.js sur les réseaux privés). Sur un Wi-Fi d'école ou public, les appareils sont souvent isolés entre eux : utiliser alors le partage de connexion du téléphone, ou simplement tester la version en ligne.

## Déploiement

Le workflow `.github/workflows/deploy.yml` construit le jeu et le publie sur GitHub Pages **à chaque push sur `main`**. On peut aussi le lancer à la main depuis l'onglet *Actions*.

Prérequis (fait une seule fois) : *Settings > Pages > Source = GitHub Actions*.

`base: '/Test-jeu/'` dans `vite.config.js` doit correspondre exactement au nom du dépôt. Sinon la page reste blanche en ligne.

## Organisation du code

```
src/
├── main.js              Assemble tout + boucle de jeu (simulation 60 Hz à pas fixe)
├── config.js            Tous les réglages (vitesses, taille de l'île, durée du jour…)
├── core/                Renderer (pixel ratio limité), détection d'appareil
├── state/               État du joueur : données pures, sérialisables pour le réseau
├── systems/             Simulation : déplacement, saut, collisions (sans Three.js)
├── world/               Relief (heightmap), props, eau, ciel ; données séparées du rendu
├── render/              Affichage du joueur (lit l'état, ne le modifie jamais)
├── camera/              Caméra à la troisième personne
└── controls/            Clavier/souris, tactile, et agrégation en « intentions »
```

Le flux est toujours le même : **entrées → intention → simulation (état) → rendu**.
`state/`, `systems/`, `world/heightmap.js`, `world/noise.js` et `world/world.js` fonctionnent sans navigateur : ils pourront tourner tels quels sur un serveur Node pour le multijoueur. Le monde est généré à partir d'une graine (`CONFIG.seed`), il est donc identique pour tous les joueurs.

Dans la console du navigateur, `window.__game` donne accès à l'état du joueur et au monde pour déboguer.
