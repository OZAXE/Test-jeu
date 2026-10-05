# Consignes du projet

Jeu d'exploration 3D (Vite + Three.js, JavaScript), publié sur GitHub Pages : https://ozaxe.github.io/Test-jeu/

## Conventions

- Commentaires du code en français.
- Pas d'éditeur graphique : tout est du code ou du texte.
- Performance mobile d'abord : peu de polygones, pas de shadow maps, pixel ratio plafonné.
- Séparer l'état (`src/state/`), la simulation (`src/systems/`, sans Three.js) et le rendu (`src/render/`, `src/world/*View.js`) en vue du multijoueur.
- `base: '/Test-jeu/'` dans `vite.config.js` doit rester égal au nom du dépôt.

## Vérifications avant de pousser

- `npm test` : tests de simulation (Node, sans navigateur)
- `npm run build`

## Méthode de livraison (validée par le propriétaire du dépôt)

1. Travailler sur une branche, commits clairs (un par étape logique).
2. Ouvrir une Pull Request vers `main`.
3. Attendre que le contrôle « Contrôle » (`.github/workflows/ci.yml`) soit vert.
4. Fusionner la PR soi-même, puis vérifier que le workflow « Déploiement GitHub Pages » passe au vert.
5. Ne jamais fusionner une PR dont le contrôle est rouge.
