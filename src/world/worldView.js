import { CONFIG } from '../config.js';
import { createTerrainMesh } from './terrain.js';
import { createWater } from './water.js';
import { createPropMeshes } from './props.js';
import { createSky } from './sky.js';

// Partie visuelle du monde : construit les meshes à partir des données du monde.
export function createWorldView(scene, worldData) {
  scene.add(createTerrainMesh(worldData.heightmap));
  scene.add(createPropMeshes(worldData.props, CONFIG.seed));

  const water = createWater(worldData.seaLevel);
  scene.add(water.mesh);

  const sky = createSky(scene, CONFIG.sky, CONFIG.render);

  function update(dt, elapsed, center, camera) {
    water.update(elapsed, dt);
    sky.update(dt, center, camera);
  }

  return { update, sky };
}
