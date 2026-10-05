import * as THREE from 'three';

// Plan d'eau autour de l'île, avec de petites vagues calculées sur le CPU.
// Grille grossière (peu de sommets) : l'effet facettes reste cohérent avec le style low-poly.
export function createWater(seaLevel, size = 420, segments = 48) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  // Non indexée pour avoir des facettes nettes
  const flat = geometry.toNonIndexed();
  geometry.dispose();

  const material = new THREE.MeshLambertMaterial({
    color: 0x2f86c2,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(flat, material);
  mesh.position.y = seaLevel;
  mesh.name = 'water';

  const pos = flat.attributes.position;
  const baseX = Float32Array.from({ length: pos.count }, (_, i) => pos.getX(i));
  const baseZ = Float32Array.from({ length: pos.count }, (_, i) => pos.getZ(i));

  // On n'anime l'eau que quelques fois par seconde : invisible à l'œil, gros gain sur mobile
  let acc = 0;
  function update(time, dt) {
    acc += dt;
    if (acc < 1 / 20) return;
    acc = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = baseX[i];
      const z = baseZ[i];
      const y = Math.sin(x * 0.18 + time * 1.1) * 0.12 + Math.cos(z * 0.21 + time * 0.9) * 0.1;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    flat.computeVertexNormals();
  }

  return { mesh, update };
}
