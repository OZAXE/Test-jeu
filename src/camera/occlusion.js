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

// ---------- Relief ----------

// Distance maximale à laquelle la caméra peut se placer depuis le point visé "from",
// dans la direction unitaire "dir", sans qu'une colline ne coupe la vue.
// On avance par petits pas le long du rayon : dès que le sol (+ marge) dépasse le rayon,
// on s'arrête juste avant. Une vingtaine d'appels à getHeight par image : négligeable.
export function terrainClearDistance(getHeight, from, dir, maxDist, clearance = 0.35, step = 0.25) {
  for (let d = step; d <= maxDist; d += step) {
    const x = from.x + dir.x * d;
    const y = from.y + dir.y * d;
    const z = from.z + dir.z * d;
    if (getHeight(x, z) + clearance > y) {
      return Math.max(0, d - step);
    }
  }
  return maxDist;
}

// Cherche l'angle vertical le plus proche de "pitch" (en montant) pour lequel la caméra,
// placée à "distance" du point visé, voit le joueur sans colline entre les deux.
// Idée : plutôt que de coller la caméra au joueur, on la fait passer au-dessus de la colline.
// Si même la vue la plus plongeante ne suffit pas, on renvoie la distance réduite.
export function findClearView(getHeight, from, yaw, pitch, maxPitch, distance, pitchStep = 0.05) {
  const dir = { x: 0, y: 0, z: 0 };
  const at = (p) => {
    const cp = Math.cos(p);
    dir.x = Math.sin(yaw) * cp;
    dir.y = Math.sin(p);
    dir.z = Math.cos(yaw) * cp;
    return terrainClearDistance(getHeight, from, dir, distance);
  };
  for (let p = pitch; p < maxPitch + 1e-6; p += pitchStep) {
    if (at(p) >= distance - 1e-6) return { pitch: p, distance };
  }
  return { pitch: maxPitch, distance: at(maxPitch) };
}
