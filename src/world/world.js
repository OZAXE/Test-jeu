import { CONFIG } from '../config.js';
import { createHeightmap } from './heightmap.js';
import { generateProps } from './props.js';

// Données du monde, sans aucun rendu : relief, obstacles et règles de la mer.
// C'est ce que la simulation (et plus tard le serveur) utilise.
export function createWorldData(config = CONFIG) {
  const heightmap = createHeightmap(config.world, config.seed);
  const props = generateProps(heightmap, config.world, config.seed, config.player.spawn);

  // Les colliders sont simplement les props (x, z, radius, top)
  const colliders = props;

  // Hauteur du sol "marchable" : terrain, ou sommet d'un rocher si on est dessus
  function getGroundHeight(x, z, feetY = Infinity, stepHeight = 0.35) {
    let h = heightmap.getHeight(x, z);
    for (const c of colliders) {
      if (c.top === Infinity) continue;
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < c.radius * c.radius && c.top <= feetY + stepHeight && c.top > h) {
        h = c.top;
      }
    }
    return h;
  }

  return {
    heightmap,
    props,
    colliders,
    getGroundHeight,
    isLand: heightmap.isLand,
    seaLevel: config.world.seaLevel,
  };
}
