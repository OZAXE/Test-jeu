import { defineConfig } from 'vite';

// Le site est servi par GitHub Pages sous https://ozaxe.github.io/Test-jeu/
// "base" doit donc correspondre au nom du dépôt (casse comprise),
// sinon les fichiers JS/CSS sont cherchés à la racine et la page reste blanche.
// En local (npm run dev) on garde la racine "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Test-jeu/' : '/',
  server: {
    host: false,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
  },
}));
