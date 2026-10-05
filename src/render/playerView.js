import * as THREE from 'three';

// Représentation visuelle d'un joueur : personnage low-poly + ombre "disque".
// Ce module LIT l'état du joueur et ne le modifie jamais.
// En multijoueur, on créera un PlayerView par joueur connecté.

export function createPlayerView(scene, { color = 0xe0603a } = {}) {
  const root = new THREE.Group();
  root.name = 'player';

  const flat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const skin = flat(0xf1c9a0);
  const shirt = flat(color);
  const pants = flat(0x3b4a6b);

  // Corps : cylindre à 6 faces légèrement évasé
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.75, 6), shirt);
  body.position.y = 1.05;
  root.add(body);

  // Tête : icosaèdre sans subdivision (20 faces)
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 0), skin);
  head.position.y = 1.68;
  root.add(head);

  // Visière pour voir de quel côté regarde le personnage (+z = avant)
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.12), flat(0x222833));
  visor.position.set(0, 1.72, 0.22);
  root.add(visor);

  // Membres : le pivot est en haut pour pouvoir les balancer
  const limb = (w, h, mat, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    mesh.position.y = -h / 2;
    pivot.add(mesh);
    root.add(pivot);
    return pivot;
  };
  const legL = limb(0.18, 0.68, pants, -0.14, 0.68);
  const legR = limb(0.18, 0.68, pants, 0.14, 0.68);
  const armL = limb(0.14, 0.6, shirt, -0.42, 1.38);
  const armR = limb(0.14, 0.6, shirt, 0.42, 1.38);

  scene.add(root);

  // Ombre "disque" : remplace les vraies ombres (trop coûteuses sur mobile)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 12),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  let walkPhase = 0;

  // "renderPos"/"renderRot" : position interpolée entre deux pas de simulation (fluidité à 90/120 Hz)
  function update(state, renderPos, renderRot, groundHeight, dt) {
    root.position.set(renderPos.x, renderPos.y, renderPos.z);
    root.rotation.y = renderRot;

    // Animation de marche : amplitude et cadence selon la vitesse
    const speed = Math.hypot(state.velocity.x, state.velocity.z);
    if (state.onGround) {
      walkPhase += dt * speed * 2.2;
      const swing = Math.min(1, speed / 5) * 0.75 * Math.sin(walkPhase);
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
      body.position.y = 1.05 + Math.abs(Math.sin(walkPhase)) * 0.04 * Math.min(1, speed / 5);
    } else {
      // En l'air : jambes repliées, bras levés
      legL.rotation.x = 0.5;
      legR.rotation.x = -0.3;
      armL.rotation.x = -2.4;
      armR.rotation.x = -2.4;
    }
    // Penché vers l'avant en sprint
    body.rotation.x = state.sprinting ? 0.12 : 0;

    // Ombre posée au sol, plus petite et plus claire quand on saute
    const h = Math.max(0, renderPos.y - groundHeight);
    shadow.position.set(renderPos.x, groundHeight + 0.03, renderPos.z);
    const k = 1 / (1 + h * 0.4);
    shadow.scale.setScalar(k);
    shadow.material.opacity = 0.3 * k;
  }

  function dispose() {
    scene.remove(root, shadow);
  }

  return { root, update, dispose };
}
