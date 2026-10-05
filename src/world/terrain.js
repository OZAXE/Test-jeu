import * as THREE from 'three';

// Couleurs low-poly par altitude
const COLORS = {
  seabed: new THREE.Color(0xb8a670),
  sand: new THREE.Color(0xe6d49a),
  grassLow: new THREE.Color(0x7cb356),
  grassHigh: new THREE.Color(0x5a9442),
  rock: new THREE.Color(0x8f8a7e),
};

function colorForHeight(h, slope, out) {
  if (h < -0.2) return out.copy(COLORS.seabed);
  if (h < 0.9) return out.copy(COLORS.sand);
  if (h > 7 || slope < 0.75) return out.copy(COLORS.rock);
  // Dégradé d'herbe selon l'altitude
  return out.copy(COLORS.grassLow).lerp(COLORS.grassHigh, Math.min(1, (h - 0.9) / 6));
}

// Construit le maillage du terrain à partir de la grille de hauteurs.
// Géométrie non indexée : chaque triangle a sa propre normale et sa couleur => rendu "facettes".
export function createTerrainMesh(heightmap) {
  const { segments, cell, half, stride, heights } = heightmap;
  const triCount = segments * segments * 2;
  const positions = new Float32Array(triCount * 9);
  const colors = new Float32Array(triCount * 9);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const color = new THREE.Color();
  let p = 0;

  const pushTri = (i0, j0, i1, j1, i2, j2) => {
    a.set(-half + i0 * cell, heights[j0 * stride + i0], -half + j0 * cell);
    b.set(-half + i1 * cell, heights[j1 * stride + i1], -half + j1 * cell);
    c.set(-half + i2 * cell, heights[j2 * stride + i2], -half + j2 * cell);

    // Pente du triangle (composante verticale de la normale) pour colorer les falaises en roche
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    const n = ab.cross(ac).normalize();
    const avgH = (a.y + b.y + c.y) / 3;
    colorForHeight(avgH, Math.abs(n.y), color);
    // Légère variation de teinte pour casser l'uniformité
    const jitter = 0.94 + ((i0 * 7 + j0 * 13) % 7) * 0.02;
    color.multiplyScalar(jitter);

    for (const v of [a, b, c]) {
      positions[p] = v.x;
      positions[p + 1] = v.y;
      positions[p + 2] = v.z;
      colors[p] = color.r;
      colors[p + 1] = color.g;
      colors[p + 2] = color.b;
      p += 3;
    }
  };

  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      // Même découpage que heightmap.getHeight (diagonale (i, j+1)-(i+1, j))
      pushTri(i, j, i, j + 1, i + 1, j);
      pushTri(i + 1, j, i, j + 1, i + 1, j + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'terrain';
  return mesh;
}
