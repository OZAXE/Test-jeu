// État d'un joueur : uniquement des données simples, aucun objet Three.js.
// En multijoueur, c'est exactement ce qui sera envoyé sur le réseau
// (et un joueur distant sera juste un autre état dessiné par le même PlayerView).

export function createPlayerState({ id = 'local', x = 0, y = 0, z = 0 } = {}) {
  return {
    id,
    position: { x, y, z },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: 0, // orientation du corps (radians autour de l'axe vertical)
    onGround: true,
    sprinting: false,
    // Petit délai de grâce pour sauter juste après avoir quitté le sol
    coyoteTime: 0,
  };
}

// Copie compacte pour le réseau ou l'interpolation
export function snapshotPlayer(state) {
  return {
    id: state.id,
    x: state.position.x,
    y: state.position.y,
    z: state.position.z,
    rotation: state.rotation,
    vx: state.velocity.x,
    vz: state.velocity.z,
    onGround: state.onGround,
    sprinting: state.sprinting,
  };
}
