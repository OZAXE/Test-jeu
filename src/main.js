import * as THREE from 'three';
import './style.css';
import { CONFIG } from './config.js';
import { createRenderer, bindResize } from './core/renderer.js';
import { createWorldData } from './world/world.js';
import { createWorldView } from './world/worldView.js';

// Point d'entrée provisoire : caméra en orbite autour de l'île pour vérifier le monde.
const canvas = document.getElementById('scene');
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 500);
bindResize(renderer, camera);

const worldData = createWorldData();
const worldView = createWorldView(scene, worldData);
document.getElementById('start-screen').classList.add('hidden');

const timer = new THREE.Timer();
const center = new THREE.Vector3();
renderer.setAnimationLoop((now) => {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  camera.position.set(Math.cos(t * 0.1) * 90, 40, Math.sin(t * 0.1) * 90);
  camera.lookAt(center);
  worldView.update(dt, t, center, camera);
  renderer.render(scene, camera);
});
