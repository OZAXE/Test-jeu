import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRng } from './noise.js';

// ---------- Placement (données pures, réutilisable côté serveur) ----------

// Génère la liste des arbres et rochers avec leur collider circulaire.
// Chaque collider a une hauteur "top" : on peut sauter sur les rochers, pas sur les arbres.
export function generateProps(heightmap, worldConfig, seed, spawn) {
  const rng = createRng(seed + 99);
  const props = [];
  const R = worldConfig.islandRadius;

  const tooClose = (x, z, minDist) =>
    props.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < (minDist + p.radius) ** 2) ||
    (x - spawn.x) ** 2 + (z - spawn.z) ** 2 < 16; // zone de départ dégagée

  // Pente approximative : différence de hauteur sur 1 m
  const slopeAt = (x, z) => {
    const h = heightmap.getHeight(x, z);
    return Math.max(
      Math.abs(heightmap.getHeight(x + 1, z) - h),
      Math.abs(heightmap.getHeight(x, z + 1) - h),
    );
  };

  const tryPlace = (count, type, accept) => {
    let placed = 0;
    for (let attempt = 0; attempt < count * 30 && placed < count; attempt++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * R;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const y = heightmap.getHeight(x, z);
      if (!accept(y, slopeAt(x, z))) continue;
      const scale = 0.75 + rng() * 0.6;
      const radius = type === 'tree' ? 0.32 * scale : 0.85 * scale;
      if (tooClose(x, z, radius + 1.2)) continue;

      const prop = { type, x, z, y, scale, rotation: rng() * Math.PI * 2, radius };
      if (type === 'tree') {
        prop.top = Infinity; // on ne monte pas dans les arbres
      } else {
        // Rocher à moitié enterré ; aplati verticalement
        prop.scaleY = 0.55 + rng() * 0.35;
        prop.y = y - 0.25 * scale;
        prop.top = prop.y + scale * prop.scaleY * 0.95;
      }
      props.push(prop);
      placed++;
    }
  };

  // Arbres : sur l'herbe, pas trop pentue
  tryPlace(worldConfig.treeCount, 'tree', (h, s) => h > 1.1 && h < 7.5 && s < 0.6);
  // Rochers : n'importe où sur la terre ferme, y compris la plage
  tryPlace(worldConfig.rockCount, 'rock', (h) => h > 0.4);

  return props;
}

// ---------- Rendu (Three.js) ----------

// Un arbre low-poly = tronc + 2 cônes empilés. Une seule géométrie par partie,
// dessinée en "instancing" : 1 appel de dessin pour TOUS les troncs, 1 pour TOUS les feuillages.
function createTreeGeometries() {
  const trunk = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 5);
  trunk.translate(0, 0.8, 0);

  const cone1 = new THREE.ConeGeometry(1.3, 2.0, 6);
  cone1.translate(0, 2.3, 0);
  const cone2 = new THREE.ConeGeometry(0.95, 1.6, 6);
  cone2.translate(0, 3.3, 0);
  const foliage = mergeGeometries([cone1.toNonIndexed(), cone2.toNonIndexed()]);
  foliage.computeVertexNormals();

  return { trunk: trunk.toNonIndexed(), foliage };
}

// Rocher = icosaèdre déformé aléatoirement (forme fixe, la variété vient de l'échelle/rotation)
function createRockGeometry(seed) {
  const rng = createRng(seed + 7);
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const pos = geo.attributes.position;
  // Les sommets partagés sont dupliqués : on déforme selon la position pour garder une forme fermée
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, 0.8 + rng() * 0.35);
    const k = offsets.get(key);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createPropMeshes(props, seed) {
  const group = new THREE.Group();
  group.name = 'props';

  // Pour chaque prop : son type et son numéro d'instance dans le mesh correspondant
  const trees = [];
  const rocks = [];
  const slots = props.map((p) => {
    const list = p.type === 'tree' ? trees : rocks;
    list.push(p);
    return list.length - 1;
  });

  const { trunk, foliage } = createTreeGeometries();
  const trunkMesh = new THREE.InstancedMesh(
    trunk,
    new THREE.MeshLambertMaterial({ color: 0x7a5434, flatShading: true }),
    trees.length,
  );
  const foliageMesh = new THREE.InstancedMesh(
    foliage,
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    trees.length,
  );
  const rockMesh = new THREE.InstancedMesh(
    createRockGeometry(seed),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    rocks.length,
  );

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const t = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const rng = createRng(seed + 5);

  trees.forEach((p, i) => {
    q.setFromAxisAngle(up, p.rotation);
    s.setScalar(p.scale);
    t.set(p.x, p.y - 0.1, p.z);
    m.compose(t, q, s);
    trunkMesh.setMatrixAt(i, m);
    foliageMesh.setMatrixAt(i, m);
    // Variations de vert d'un arbre à l'autre
    color.setHSL(0.27 + rng() * 0.07, 0.45 + rng() * 0.15, 0.3 + rng() * 0.1);
    foliageMesh.setColorAt(i, color);
  });

  rocks.forEach((p, i) => {
    q.setFromEuler(new THREE.Euler(rng() * 0.4, p.rotation, rng() * 0.4));
    s.set(p.scale, p.scale * p.scaleY, p.scale);
    t.set(p.x, p.y, p.z);
    m.compose(t, q, s);
    rockMesh.setMatrixAt(i, m);
    const g = 0.48 + rng() * 0.12;
    color.setRGB(g, g * 0.98, g * 0.93);
    rockMesh.setColorAt(i, color);
  });

  const solidMeshes = [trunkMesh, foliageMesh, rockMesh];
  for (const mesh of solidMeshes) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  // ---------- Version "fantôme" des props qui cachent le joueur ----------
  // Mêmes géométries, matériau semi-transparent. Un prop gênant est retiré du mesh
  // normal (échelle 0) et dessiné ici à la place.
  const ghostMaterial = (color) =>
    new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
  const ghostOf = (mesh, color) => {
    const g = new THREE.InstancedMesh(mesh.geometry, ghostMaterial(color), mesh.count);
    // Couleurs d'instance créées d'emblée : le shader est compilé une seule fois
    if (mesh.instanceColor) g.setColorAt(0, new THREE.Color(1, 1, 1));
    g.count = 0;
    g.frustumCulled = false; // la liste change sans arrêt, inutile de recalculer la sphère englobante
    g.renderOrder = 1; // dessiné après les objets opaques
    group.add(g);
    return g;
  };
  const ghosts = [
    ghostOf(trunkMesh, 0x7a5434),
    ghostOf(foliageMesh, 0xffffff),
    ghostOf(rockMesh, 0xffffff),
  ];

  // Matrices d'origine, pour pouvoir réafficher un prop
  const original = solidMeshes.map((mesh) =>
    Array.from({ length: mesh.count }, (_, i) => {
      const mat = new THREE.Matrix4();
      mesh.getMatrixAt(i, mat);
      return mat;
    }),
  );
  const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  let hidden = new Set();

  // Met à jour la liste des props en transparence (indices dans "props")
  function setGhosted(indices) {
    // Rien à faire si la liste n'a pas changé (cas le plus fréquent)
    if (indices.size === hidden.size && [...indices].every((i) => hidden.has(i))) return;

    for (const i of hidden) {
      if (indices.has(i)) continue;
      const k = props[i].type === 'tree' ? [0, 1] : [2];
      for (const m of k) solidMeshes[m].setMatrixAt(slots[i], original[m][slots[i]]);
    }
    for (const g of ghosts) g.count = 0;
    for (const i of indices) {
      const k = props[i].type === 'tree' ? [0, 1] : [2];
      for (const m of k) {
        const slot = slots[i];
        solidMeshes[m].setMatrixAt(slot, hiddenMatrix);
        const g = ghosts[m];
        g.setMatrixAt(g.count, original[m][slot]);
        if (solidMeshes[m].instanceColor) {
          solidMeshes[m].getColorAt(slot, color);
          g.setColorAt(g.count, color);
        }
        g.count++;
      }
    }
    for (const mesh of [...solidMeshes, ...ghosts]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    hidden = new Set(indices);
  }

  return { group, setGhosted };
}
