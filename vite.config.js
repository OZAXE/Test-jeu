import { defineConfig } from 'vite';

// Le site est servi par GitHub Pages sous https://ozaxe.github.io/Test-jeu/
// "base" doit donc correspondre au nom du dépôt (casse comprise),
// sinon les fichiers JS/CSS sont cherchés à la racine et la page reste blanche.
// On garde la même base en local : http://localhost:5173/Test-jeu/
export default defineConfig({
  base: '/Test-jeu/',
  build: {
    target: 'es2020',
    // three.js pèse ~500 ko non compressé : normal, pas besoin d'alerte
    chunkSizeWarningLimit: 1000,
  },
});
