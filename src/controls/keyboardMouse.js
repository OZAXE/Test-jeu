// Contrôles PC : clavier pour se déplacer, souris (Pointer Lock) pour orienter la caméra.
//
// On utilise event.code (touche PHYSIQUE) et non event.key (caractère tapé) :
// la touche "KeyW" est le Z en AZERTY et le W en QWERTY, donc ZQSD et WASD marchent sans réglage.

const KEYS = {
  forward: ['KeyW', 'ArrowUp'], // Z en AZERTY
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], // Q en AZERTY
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
};

export function createKeyboardMouse(canvas, sensitivity) {
  const pressed = new Set();
  let jumpQueued = false;
  let lookX = 0;
  let lookY = 0;

  const is = (action) => KEYS[action].some((code) => pressed.has(code));

  function onKeyDown(e) {
    if (e.code === 'Space' && !e.repeat) jumpQueued = true;
    pressed.add(e.code);
    // Empêche le défilement de la page avec espace / flèches
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  }
  function onKeyUp(e) {
    pressed.delete(e.code);
  }
  // Si la fenêtre perd le focus, on relâche tout (sinon le perso continue d'avancer)
  function onBlur() {
    pressed.clear();
  }

  function onMouseMove(e) {
    if (document.pointerLockElement !== canvas) return;
    lookX += e.movementX * sensitivity;
    lookY += e.movementY * sensitivity;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('mousemove', onMouseMove);

  return {
    // Vecteur de déplacement (-1..1) ; normalisé pour ne pas aller plus vite en diagonale
    getMove() {
      let x = (is('right') ? 1 : 0) - (is('left') ? 1 : 0);
      let y = (is('forward') ? 1 : 0) - (is('backward') ? 1 : 0);
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    get sprint() {
      return is('sprint');
    },
    consumeJump() {
      const j = jumpQueued;
      jumpQueued = false;
      return j;
    },
    consumeLook() {
      const l = { x: lookX, y: lookY };
      lookX = 0;
      lookY = 0;
      return l;
    },
    requestPointerLock() {
      // Certains navigateurs renvoient une promesse rejetée si l'appel est trop rapproché
      try {
        const p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch {
        /* ignoré */
      }
    },
  };
}
