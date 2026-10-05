// Relief de l'île sous forme de données pures (grille de hauteurs).
// La même grille sert au maillage 3D ET à la physique : le joueur colle exactement au sol affiché.
// Pas de Three.js ici, pour pouvoir réutiliser ce module côté serveur en multijoueur.

import { createNoise2D, fbm, smoothstep } from './noise.js';

export function createHeightmap(worldConfig, seed) {
  const { size, segments, islandRadius, maxHeight, seaLevel, shoreMargin } = worldConfig;
  const noise = createNoise2D(seed);
  const coastNoise = createNoise2D(seed + 1);

  const half = size / 2;
  const cell = size / segments;
  const stride = segments + 1;
  const heights = new Float32Array(stride * stride);

  // Hauteur "idéale" en un point : collines × masque d'île
  function rawHeight(x, z) {
    const d = Math.hypot(x, z) / islandRadius;
    // Côte irrégulière : on déforme la distance au centre avec un bruit lent
    const coast = d + coastNoise(x * 0.025, z * 0.025) * 0.18;
    const mask = 1 - smoothstep(0.6, 1.05, coast);

    // Collines douces (valeur entre 0 et 1), mises au carré pour garder des zones plates
    const n = 0.5 + 0.5 * fbm(noise, x * 0.022, z * 0.022, 4);
    const hills = 1.2 + n * n * maxHeight;

    // Au large : fond marin à -4 m ; sur l'île : les collines
    return -4 + (hills + 4) * mask;
  }

  for (let j = 0; j <= segments; j++) {
    for (let i = 0; i <= segments; i++) {
      heights[j * stride + i] = rawHeight(-half + i * cell, -half + j * cell);
    }
  }

  // Hauteur au point (x, z), interpolée sur les MÊMES triangles que le maillage.
  // Chaque case est coupée par la diagonale qui relie (i, j+1) à (i+1, j).
  function getHeight(x, z) {
    const fx = (x + half) / cell;
    const fz = (z + half) / cell;
    if (fx < 0 || fz < 0 || fx >= segments || fz >= segments) return -4;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const h00 = heights[j * stride + i];
    const h10 = heights[j * stride + i + 1];
    const h01 = heights[(j + 1) * stride + i];
    const h11 = heights[(j + 1) * stride + i + 1];
    if (u + v <= 1) {
      return h00 + (h10 - h00) * u + (h01 - h00) * v;
    }
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }

  // Le joueur ne peut se tenir que là où le sol dépasse de l'eau
  function isLand(x, z) {
    return getHeight(x, z) > seaLevel + shoreMargin;
  }

  return { size, segments, cell, half, stride, heights, getHeight, isLand };
}
