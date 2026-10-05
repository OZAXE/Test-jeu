import * as THREE from 'three';
import { smoothstep } from './noise.js';

// Palette du ciel aux moments clés de la journée
const NIGHT = new THREE.Color(0x0e1a38);
const DAY = new THREE.Color(0x87b5d9);
const SUNSET = new THREE.Color(0xf09a62);
const SUN_DAY = new THREE.Color(0xfff4e0);
const SUN_LOW = new THREE.Color(0xffa25a);

// Cycle jour/nuit : couleur du ciel, brouillard, soleil et lumières.
// "time" va de 0 à 1 : 0 = minuit, 0.25 = lever, 0.5 = midi, 0.75 = coucher.
export function createSky(scene, skyConfig, renderConfig) {
  const skyColor = new THREE.Color();
  scene.background = skyColor;
  scene.fog = new THREE.Fog(skyColor, renderConfig.fogNear, renderConfig.fogFar);

  // Lumière d'ambiance ciel/sol : peu coûteuse et donne du volume sans ombres
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5a6b3a, 1);
  scene.add(hemi);

  // Soleil : lumière directionnelle sans ombres projetées
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  scene.add(sun);
  scene.add(sun.target);

  // Disque du soleil visible dans le ciel (non affecté par le brouillard)
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(8, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false }),
  );
  scene.add(sunDisc);

  const moonDisc = new THREE.Mesh(
    new THREE.CircleGeometry(5, 10),
    new THREE.MeshBasicMaterial({ color: 0xdfe6ff, fog: false }),
  );
  scene.add(moonDisc);

  const sunDir = new THREE.Vector3();
  let time = skyConfig.startTime;

  // "center" = position du joueur : le soleil et la lune suivent pour rester à l'horizon
  function update(dt, center, camera) {
    time = (time + dt / skyConfig.dayDuration) % 1;

    // Angle du soleil : se lève à l'est (+x), culmine à midi, se couche à l'ouest
    const angle = (time - 0.25) * Math.PI * 2;
    const elevation = Math.sin(angle);
    sunDir.set(Math.cos(angle), elevation, 0.35).normalize();

    // 0 la nuit, 1 en plein jour, transition douce autour de l'horizon
    const daylight = smoothstep(-0.12, 0.3, elevation);
    // Teinte orangée quand le soleil est proche de l'horizon
    const horizonGlow = Math.exp(-((elevation / 0.18) ** 2));

    skyColor.copy(NIGHT).lerp(DAY, daylight).lerp(SUNSET, horizonGlow * 0.55);
    scene.fog.color.copy(skyColor);

    sun.color.copy(SUN_LOW).lerp(SUN_DAY, smoothstep(0, 0.4, elevation));
    sun.intensity = 2.2 * smoothstep(-0.05, 0.25, elevation);
    // La nuit, on garde une lumière bleutée suffisante pour jouer
    hemi.intensity = 0.45 + 0.75 * daylight;
    hemi.color.setHSL(0.58, 0.5, 0.55 + 0.25 * daylight);

    sun.position.copy(center).addScaledVector(sunDir, 80);
    sun.target.position.copy(center);

    sunDisc.position.copy(center).addScaledVector(sunDir, 300);
    sunDisc.lookAt(camera.position);
    sunDisc.visible = elevation > -0.1;

    moonDisc.position.copy(center).addScaledVector(sunDir, -300);
    moonDisc.lookAt(camera.position);
    moonDisc.visible = elevation < 0.1;
  }

  return {
    update,
    get time() {
      return time;
    },
  };
}
