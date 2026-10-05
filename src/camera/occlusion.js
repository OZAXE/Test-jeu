// Détection des obstacles entre la caméra et le joueur (calcul pur, sans Three.js).
// Chaque arbre ou rocher est approximé par un cylindre vertical englobant sa forme visible.
// Un obstacle "gêne" si un segment caméra -> joueur traverse son cylindre.

// Volume visible d'un prop (les valeurs suivent les géométries de world/props.js)
export function propVolume(p) {
  if (p.type === 'tree') {
    return { radius: 1.3 * p.scale, yMin: p.y - 0.1, yMax: p.y - 0.1 + 4.1 * p.scale };
  }
  return { radius: 1.15 * p.scale, yMin: p.y - p.scale * p.scaleY, yMax: p.top };
}

// Le segment A -> B coupe-t-il le cylindre vertical (centre cx/cz, rayon r, hauteur yMin..yMax) ?
export function segmentHitsCylinder(a, b, cx, cz, r, yMin, yMax) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const ox = a.x - cx;
  const oz = a.z - cz;
  // Résolution de |O + t·D|² = r² (dans le plan horizontal), pour t entre 0 et 1
  const qa = dx * dx + dz * dz;
  const qb = ox * dx + oz * dz;
  const qc = ox * ox + oz * oz - r * r;
  let t0;
  let t1;
  if (qa < 1e-9) {
    // Segment vertical : soit dans le cercle sur toute sa longueur, soit jamais
    if (qc > 0) return false;
    t0 = 0;
    t1 = 1;
  } else {
    const disc = qb * qb - qa * qc;
    if (disc < 0) return false;
    const sq = Math.sqrt(disc);
    t0 = Math.max(0, (-qb - sq) / qa);
    t1 = Math.min(1, (-qb + sq) / qa);
    if (t0 > t1) return false;
  }
  // Hauteurs du segment sur la portion qui est dans le cercle
  const y0 = a.y + (b.y - a.y) * t0;
  const y1 = a.y + (b.y - a.y) * t1;
  return Math.max(y0, y1) >= yMin && Math.min(y0, y1) <= yMax;
}

// Renvoie l'ensemble des indices de props qui cachent l'un des points visés.
// "previous" = obstacles déjà masqués : on leur laisse une marge en plus (hystérésis)
// pour éviter qu'un arbre clignote quand il est pile à la limite.
export function findOccluders(props, cameraPos, targets, previous = new Set(), margin = 0.4) {
  const result = new Set();
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    const v = propVolume(p);
    const r = v.radius + (previous.has(i) ? margin : 0);
    for (const t of targets) {
      if (segmentHitsCylinder(cameraPos, t, p.x, p.z, r, v.yMin, v.yMax)) {
        result.add(i);
        break;
      }
    }
  }
  return result;
}
