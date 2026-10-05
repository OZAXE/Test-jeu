import * as THREE from 'three';
import { findClearView } from './occlusion.js';

// Caméra à la troisième personne qui suit le joueur en douceur.
// Elle tourne autour de lui (yaw/pitch), ne passe jamais sous le terrain
// et monte au-dessus des collines qui couperaient la vue.
export function createFollowCamera(cfg) {
  const camera = new THREE.PerspectiveCamera(cfg.fov, 1, 0.1, 500);

  let yaw = 0; // angle horizontal (0 = caméra côté +z, regard vers -z)
  let pitch = cfg.initialPitch; // angle vertical voulu par le joueur (positif = vue plongeante)
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let initialized = false;

  // Correction due au relief : angle ajouté à celui du joueur, et distance réduite (cas rare)
  let pitchOffset = 0;
  let distance = cfg.distance;

  // Vitesses de lissage : on corrige vite (ne jamais voir à travers le sol),
  // on revient doucement à la position voulue (pas d'à-coups)
  const FAST = 15;
  const SLOW = 2.5;
  const MIN_DISTANCE = 1.5;

  // Le sol ou l'eau : la caméra ne doit passer sous aucun des deux
  let getHeight = null;
  const groundOrWater = (x, z) => Math.max(getHeight(x, z), 0);

  // Applique les mouvements de souris / doigt (en radians)
  function rotate(dYaw, dPitch) {
    yaw -= dYaw;
    pitch = THREE.MathUtils.clamp(pitch + dPitch, cfg.minPitch, cfg.maxPitch);
  }

  // Lissage exponentiel avec une vitesse différente à la montée et à la descente
  const smooth = (current, wanted, upSpeed, downSpeed, dt) => {
    const k = 1 - Math.exp(-(wanted > current ? upSpeed : downSpeed) * dt);
    return current + (wanted - current) * k;
  };

  function update(focus, heightFn, dt) {
    getHeight = heightFn;

    // Le point visé suit le joueur avec un léger retard (lissage exponentiel indépendant du framerate)
    desired.set(focus.x, focus.y + cfg.targetHeight, focus.z);
    if (!initialized) {
      target.copy(desired);
      initialized = true;
    } else {
      target.lerp(desired, 1 - Math.exp(-cfg.followLerp * dt));
    }

    // Relief : angle minimal pour voir le joueur par-dessus les collines
    const view = findClearView(groundOrWater, target, yaw, pitch, cfg.maxPitch, cfg.distance);

    // Seule la correction est lissée : elle monte vite quand une colline gêne et
    // s'efface doucement ensuite. Les mouvements du joueur restent instantanés.
    pitchOffset = smooth(pitchOffset, view.pitch - pitch, FAST, SLOW, dt);
    const viewPitch = Math.min(pitch + pitchOffset, cfg.maxPitch);
    // La distance se réduit vite et se rallonge doucement (cas rare : relief très raide)
    distance = smooth(distance, Math.max(MIN_DISTANCE, view.distance), SLOW, FAST, dt);

    const cp = Math.cos(viewPitch);
    dir.set(Math.sin(yaw) * cp, Math.sin(viewPitch), Math.cos(yaw) * cp);
    camera.position.copy(target).addScaledVector(dir, distance);

    // Garde-fou : la caméra reste toujours au-dessus du sol (et de l'eau)
    const minY = groundOrWater(camera.position.x, camera.position.z) + 0.5;
    if (camera.position.y < minY) camera.position.y = minY;

    camera.lookAt(target);
  }

  return {
    camera,
    rotate,
    update,
    get yaw() {
      return yaw;
    },
  };
}
