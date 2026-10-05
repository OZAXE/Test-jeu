import * as THREE from 'three';
import './style.css';
import { CONFIG } from './config.js';
import { createRenderer, bindResize } from './core/renderer.js';

// Point d'entrée provisoire : vérifie que Vite et Three.js fonctionnent.
const canvas = document.getElementById('scene');
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d9);
const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 400);
camera.position.set(0, 2, 5);
bindResize(renderer, camera);

const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
scene.add(cube);
document.getElementById('start-screen').classList.add('hidden');

renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
});
