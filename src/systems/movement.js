import { pushOutOfColliders, moveWithShore } from './collision.js';

// Fait avancer l'état d'un joueur d'un pas de temps fixe, à partir de ses intentions.
// "intent" = { moveX, moveY, yaw, sprint, jump } : peu importe qu'il vienne du clavier,
// du joystick ou (plus tard) du réseau, la simulation est la même.
//
// Convention : moveY > 0 = avancer (vers où regarde la caméra), moveX > 0 = aller à droite.
// "yaw" = angle horizontal de la caméra.

const STEP_HEIGHT = 0.35; // hauteur franchissable sans sauter (petits rochers)
const COYOTE = 0.1; // secondes pendant lesquelles on peut encore sauter après avoir quitté le sol

export function updatePlayer(state, intent, world, cfg, dt) {
  const pos = state.position;
  const vel = state.velocity;

  // ---- 1. Direction voulue dans le monde, relative à la caméra ----
  const sin = Math.sin(intent.yaw);
  const cos = Math.cos(intent.yaw);
  // Avant = (-sin, -cos), droite = (cos, -sin)
  let wishX = -sin * intent.moveY + cos * intent.moveX;
  let wishZ = -cos * intent.moveY - sin * intent.moveX;
  // Intensité entre 0 et 1 (le joystick permet de marcher doucement)
  const amount = Math.min(1, Math.hypot(intent.moveX, intent.moveY));
  const len = Math.hypot(wishX, wishZ);
  if (len > 0) {
    wishX /= len;
    wishZ /= len;
  }

  state.sprinting = intent.sprint && amount > 0.1;
  const maxSpeed = (state.sprinting ? cfg.sprintSpeed : cfg.walkSpeed) * amount;
  const targetVX = wishX * maxSpeed;
  const targetVZ = wishZ * maxSpeed;

  // ---- 2. Accélération progressive vers la vitesse voulue (moins de contrôle en l'air) ----
  const control = state.onGround ? 1 : 0.45;
  const accel = (amount > 0.01 ? cfg.acceleration : cfg.deceleration) * control;
  const dvx = targetVX - vel.x;
  const dvz = targetVZ - vel.z;
  const dvLen = Math.hypot(dvx, dvz);
  const maxDv = accel * dt;
  if (dvLen <= maxDv) {
    vel.x = targetVX;
    vel.z = targetVZ;
  } else {
    vel.x += (dvx / dvLen) * maxDv;
    vel.z += (dvz / dvLen) * maxDv;
  }

  // ---- 3. Orientation du corps vers la direction de déplacement ----
  const speed = Math.hypot(vel.x, vel.z);
  if (speed > 0.3) {
    const targetRot = Math.atan2(vel.x, vel.z);
    let diff = targetRot - state.rotation;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // chemin le plus court
    state.rotation += diff * Math.min(1, cfg.turnSpeed * dt);
  }

  // ---- 4. Déplacement horizontal (sans entrer dans l'eau) puis collisions ----
  const prevX = pos.x;
  const prevZ = pos.z;
  moveWithShore(pos, vel.x * dt, vel.z * dt, world.isLand);
  pushOutOfColliders(pos, cfg.radius, world.colliders, STEP_HEIGHT);
  // Si la poussée d'un obstacle nous a envoyés dans l'eau, on annule le mouvement
  if (!world.isLand(pos.x, pos.z)) {
    pos.x = prevX;
    pos.z = prevZ;
  }
  // Vitesse réelle après collisions : évite de "pousser" indéfiniment contre un arbre
  vel.x = (pos.x - prevX) / dt;
  vel.z = (pos.z - prevZ) / dt;

  // ---- 5. Saut et gravité ----
  const wasOnGround = state.onGround;
  state.coyoteTime = wasOnGround ? COYOTE : Math.max(0, state.coyoteTime - dt);
  if (intent.jump && state.coyoteTime > 0) {
    vel.y = cfg.jumpSpeed;
    state.onGround = false;
    state.coyoteTime = 0;
  }

  vel.y -= cfg.gravity * dt;
  pos.y += vel.y * dt;

  const ground = world.getGroundHeight(pos.x, pos.z, pos.y, STEP_HEIGHT);
  if (pos.y <= ground) {
    // Atterrissage
    pos.y = ground;
    vel.y = 0;
    state.onGround = true;
  } else if (wasOnGround && vel.y <= 0 && pos.y - ground < STEP_HEIGHT) {
    // En descente de colline : on reste collé au sol au lieu de "décoller"
    pos.y = ground;
    vel.y = 0;
    state.onGround = true;
  } else {
    state.onGround = false;
  }
}
