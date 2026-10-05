// Collisions simples : obstacles circulaires (arbres, rochers) + interdiction d'entrer dans l'eau.
// Fonctions pures sur des données : réutilisables telles quelles côté serveur.

// Repousse le joueur hors des cercles qu'il chevauche.
// Un rocher dont le sommet est sous les pieds (+ hauteur de marche) ne bloque pas : on peut monter dessus.
export function pushOutOfColliders(pos, radius, colliders, stepHeight) {
  for (const c of colliders) {
    if (c.top <= pos.y + stepHeight) continue;
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const minDist = radius + c.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist) continue;
    const dist = Math.sqrt(distSq) || 0.0001;
    const push = minDist - dist;
    pos.x += (dx / dist) * push;
    pos.z += (dz / dist) * push;
  }
}

// Déplace de (dx, dz) en restant sur la terre ferme.
// Si le mouvement complet mène à l'eau, on essaie chaque axe séparément : le joueur glisse le long du rivage.
export function moveWithShore(pos, dx, dz, isLand) {
  if (isLand(pos.x + dx, pos.z + dz)) {
    pos.x += dx;
    pos.z += dz;
    return;
  }
  if (isLand(pos.x + dx, pos.z)) {
    pos.x += dx;
    return;
  }
  if (isLand(pos.x, pos.z + dz)) {
    pos.z += dz;
  }
}
