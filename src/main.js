import * as THREE from 'three';
import './style.css';
import { CONFIG } from './config.js';
import { DEVICE } from './core/device.js';
import { createRenderer, bindResize } from './core/renderer.js';
import { createWorldData } from './world/world.js';
import { createWorldView } from './world/worldView.js';
import { createPlayerState } from './state/playerState.js';
import { updatePlayer } from './systems/movement.js';
import { createPlayerView } from './render/playerView.js';
import { createFollowCamera } from './camera/followCamera.js';
import { createInput } from './controls/input.js';

// ---------------------------------------------------------------------------
// Organisation :
//   données (world, playerState)  ->  simulation (systems)  ->  rendu (views)
// La simulation tourne à pas fixe (60 Hz) ; le rendu suit le rafraîchissement de l'écran
// et interpole entre deux pas pour rester fluide sur les écrans 90/120 Hz.
// ---------------------------------------------------------------------------

blockBrowserGestures();

const canvas = document.getElementById('scene');
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();

// ---- Données ----
const world = createWorldData();
const spawn = CONFIG.player.spawn;
const player = createPlayerState({
  x: spawn.x,
  z: spawn.z,
  y: world.getGroundHeight(spawn.x, spawn.z),
});

// ---- Rendu ----
const followCam = createFollowCamera(CONFIG.camera);
bindResize(renderer, followCam.camera);
const worldView = createWorldView(scene, world);
const playerView = createPlayerView(scene);

// ---- Entrées ----
const input = createInput(canvas);

// ---- Écran de démarrage / pause ----
const startScreen = document.getElementById('start-screen');
const startText = document.getElementById('start-text');
const hint = document.getElementById('hint');
let playing = false;

if (DEVICE.isMobile) {
  startText.textContent = 'Touche l’écran pour jouer';
  hint.textContent = 'Pouce gauche : bouger · Glisser à droite : caméra';
} else {
  startText.innerHTML =
    'Clique pour jouer<br><small>ZQSD : bouger · Souris : caméra · Espace : sauter · Maj : sprint · Échap : pause</small>';
  hint.textContent = 'ZQSD · Souris · Espace · Maj';
}

startScreen.addEventListener('click', () => {
  if (DEVICE.isMobile) {
    enterFullscreen();
    setPlaying(true);
  } else {
    // Le jeu démarre réellement quand le navigateur confirme le verrouillage de la souris
    input.requestPointerLock();
  }
});

// Sur PC, Échap libère la souris : on remet l'écran de pause
document.addEventListener('pointerlockchange', () => {
  setPlaying(document.pointerLockElement === canvas);
});
// Clic sur le jeu après une pause sans passer par l'écran (sécurité)
canvas.addEventListener('click', () => {
  if (!DEVICE.isMobile && document.pointerLockElement !== canvas) input.requestPointerLock();
});

function setPlaying(value) {
  playing = value;
  startScreen.classList.toggle('hidden', value);
  if (!value) startText.innerHTML = DEVICE.isMobile ? 'Touche pour reprendre' : 'Clique pour reprendre';
  if (value) setTimeout(() => (hint.style.opacity = '0'), 6000);
}

// ---- Boucle de jeu ----
const STEP = 1 / CONFIG.tickRate;
const timer = new THREE.Timer();
let accumulator = 0;

// Positions avant/après le dernier pas, pour l'interpolation visuelle
const prevPos = new THREE.Vector3().copy(player.position);
let prevRot = player.rotation;
const renderPos = new THREE.Vector3();

// Mise à jour de la caméra AVANT la simulation : le "yaw" donne le sens de "avancer"
function applyLook() {
  const look = input.consumeLook();
  if (playing) followCam.rotate(look.x, look.y);
}

function simulate() {
  prevPos.copy(player.position);
  prevRot = player.rotation;
  const intent = playing
    ? input.getIntent(followCam.yaw)
    : { moveX: 0, moveY: 0, yaw: followCam.yaw, sprint: false, jump: false };
  updatePlayer(player, intent, world, CONFIG.player, STEP);
}

// Compteur d'images par seconde
const fpsEl = document.getElementById('fps');
let fpsFrames = 0;
let fpsTime = 0;

renderer.setAnimationLoop((now) => {
  timer.update(now);
  // Plafond : après un onglet en arrière-plan, on ne rattrape pas des secondes de simulation
  const dt = Math.min(timer.getDelta(), 0.1);

  applyLook();

  accumulator += dt;
  while (accumulator >= STEP) {
    simulate();
    accumulator -= STEP;
  }

  // Interpolation entre l'état précédent et l'état courant
  const alpha = accumulator / STEP;
  renderPos.copy(prevPos).lerp(player.position, alpha);
  let dRot = player.rotation - prevRot;
  dRot = Math.atan2(Math.sin(dRot), Math.cos(dRot));
  const renderRot = prevRot + dRot * alpha;

  const ground = world.getGroundHeight(renderPos.x, renderPos.z, renderPos.y);
  playerView.update(player, renderPos, renderRot, ground, dt);
  followCam.update(renderPos, world.heightmap.getHeight, dt);
  worldView.update(dt, timer.getElapsed(), renderPos, followCam.camera);

  renderer.render(scene, followCam.camera);

  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    fpsEl.textContent = `${Math.round(fpsFrames / fpsTime)} fps`;
    fpsFrames = 0;
    fpsTime = 0;
  }
});

// ---------------------------------------------------------------------------

// Empêche zoom, double-tap, menu contextuel et défilement parasites sur mobile
function blockBrowserGestures() {
  const prevent = (e) => e.preventDefault();
  document.addEventListener('touchmove', prevent, { passive: false });
  document.addEventListener('gesturestart', prevent); // pinch-zoom iOS Safari
  document.addEventListener('dblclick', prevent);
  document.addEventListener('contextmenu', prevent);
}

// Plein écran + paysage sur Android (iOS Safari ne le permet pas sur iPhone, on ignore l'erreur)
function enterFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

// Accès debug depuis la console du navigateur
window.__game = { player, world, followCam, CONFIG };
