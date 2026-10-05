// Constantes centrales du jeu : tout ce qui se règle se trouve ici.

export const CONFIG = {
  // Graine du monde : même graine = même île pour tous les joueurs (utile en multijoueur)
  seed: 1337,

  world: {
    size: 160, // côté du terrain en mètres
    segments: 72, // subdivisions de la grille (peu de polygones)
    islandRadius: 58, // rayon approximatif de l'île
    maxHeight: 9, // hauteur max des collines
    seaLevel: 0, // altitude de l'eau
    shoreMargin: 0.15, // le joueur ne peut pas aller où le sol est sous seaLevel + marge
    treeCount: 70,
    rockCount: 40,
  },

  player: {
    radius: 0.45, // rayon de collision
    height: 1.7,
    walkSpeed: 5, // m/s
    sprintSpeed: 9, // m/s
    acceleration: 30, // m/s² (réactivité au démarrage)
    deceleration: 40, // m/s² (freinage quand on lâche)
    turnSpeed: 12, // vitesse de rotation du corps vers la direction de marche
    jumpSpeed: 7.5, // vitesse verticale initiale du saut
    gravity: 22, // m/s²
    spawn: { x: 0, z: 0 },
  },

  camera: {
    fov: 60,
    distance: 6.5, // distance derrière le joueur
    targetHeight: 1.4, // point visé au-dessus des pieds
    minPitch: -0.35, // regarder vers le haut (rad)
    maxPitch: 1.2, // regarder vers le bas (rad)
    initialPitch: 0.35,
    followLerp: 10, // douceur du suivi (plus grand = plus rigide)
    mouseSensitivity: 0.0025,
    touchSensitivity: 0.006,
  },

  sky: {
    dayDuration: 240, // durée d'un cycle jour/nuit complet en secondes
    startTime: 0.3, // 0 = minuit, 0.25 = lever, 0.5 = midi, 0.75 = coucher
  },

  render: {
    maxPixelRatioMobile: 1.5,
    maxPixelRatioDesktop: 2,
    fogNear: 40,
    fogFar: 150,
  },

  // Pas fixe de simulation : 60 mises à jour par seconde, quel que soit le framerate.
  // Indispensable pour avoir une physique identique chez tous les joueurs plus tard.
  tickRate: 60,
};
