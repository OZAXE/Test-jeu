import * as THREE from 'three';

// Caméra à la troisième personne qui suit le joueur en douceur.
// Elle tourne autour de lui (yaw/pitch) et ne passe jamais sous le terrain.
export function createFollowCamera(cfg) {
  const camera = new THREE.PerspectiveCamera(cfg.fov, 1, 0.1, 500);

  let yaw = 0; // angle horizontal (0 = caméra côté +z, regard vers -z)
  let pitch = cfg.initialPitch; // angle vertical (positif = vue plongeante)
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  let initialized = false;

  // Applique les mouvements de souris / doigt (en radians)
  function rotate(dYaw, dPitch) {
    yaw -= dYaw;
    pitch = THREE.MathUtils.clamp(pitch + dPitch, cfg.minPitch, cfg.maxPitch);
  }

  function update(focus, getHeight, dt) {
    // Le point visé suit le joueur avec un léger retard (lissage exponentiel indépendant du framerate)
    desired.set(focus.x, focus.y + cfg.targetHeight, focus.z);
    if (!initialized) {
      target.copy(desired);
      initialized = true;
    } else {
      target.lerp(desired, 1 - Math.exp(-cfg.followLerp * dt));
    }

    // Position sur une sphère autour du point visé
    const cp = Math.cos(pitch);
    camera.position.set(
      target.x + Math.sin(yaw) * cp * cfg.distance,
      target.y + Math.sin(pitch) * cfg.distance,
      target.z + Math.cos(yaw) * cp * cfg.distance,
    );

    // Anti-clipping : la caméra reste au-dessus du sol (et de l'eau)
    const minY = Math.max(getHeight(camera.position.x, camera.position.z), 0) + 0.5;
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
