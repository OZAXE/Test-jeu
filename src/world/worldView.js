import { CONFIG } from '../config.js';
import { createTerrainMesh } from './terrain.js';
import { createWater } from './water.js';
import { createPropMeshes } from './props.js';
import { createSky } from './sky.js';
import { findOccluders } from '../camera/occlusion.js';

// Partie visuelle du monde : construit les meshes à partir des données du monde.
export function createWorldView(scene, worldData) {
  scene.add(createTerrainMesh(worldData.heightmap));
  const propMeshes = createPropMeshes(worldData.props, CONFIG.seed);
  scene.add(propMeshes.group);

  const water = createWater(worldData.seaLevel);
  scene.add(water.mesh);

  const sky = createSky(scene, CONFIG.sky, CONFIG.render);

  // Points du joueur qu'on veut toujours voir : bas du corps et tête
  const targets = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
  ];
  let occluders = new Set();

  // "center" = position (pieds) du joueur affiché
  function update(dt, elapsed, center, camera) {
    water.update(elapsed, dt);
    sky.update(dt, center, camera);

    // Les arbres et rochers entre la caméra et le joueur passent en transparence
    targets[0].x = targets[1].x = center.x;
    targets[0].z = targets[1].z = center.z;
    targets[0].y = center.y + 0.4;
    targets[1].y = center.y + 1.6;
    occluders = findOccluders(worldData.props, camera.position, targets, occluders);
    propMeshes.setGhosted(occluders);
  }

  return { update, sky };
}
