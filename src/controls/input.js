import { DEVICE } from '../core/device.js';
import { CONFIG } from '../config.js';
import { createKeyboardMouse } from './keyboardMouse.js';
import { createTouchControls } from './touch.js';

// Rassemble toutes les sources d'entrée en un seul objet "intention" pour la simulation.
// Le reste du jeu ne sait pas si on joue au clavier ou au doigt.
export function createInput(canvas) {
  // Le clavier reste actif même sur tablette (clavier Bluetooth, PC tactile...)
  const kb = createKeyboardMouse(canvas, CONFIG.camera.mouseSensitivity);
  const touch = DEVICE.isMobile ? createTouchControls(CONFIG.camera.touchSensitivity) : null;

  return {
    // Mouvement de caméra accumulé depuis la dernière image (radians)
    consumeLook() {
      const a = kb.consumeLook();
      if (touch) {
        const b = touch.consumeLook();
        a.x += b.x;
        a.y += b.y;
      }
      return a;
    },

    // Intention pour UN pas de simulation
    // yaw = orientation de la caméra, pour que "avancer" aille là où on regarde
    getIntent(yaw) {
      const k = kb.getMove();
      const t = touch ? touch.getMove() : { x: 0, y: 0 };
      // Le joystick est prioritaire s'il est utilisé
      const useTouch = Math.hypot(t.x, t.y) > 0;
      const move = useTouch ? t : k;
      const jump = kb.consumeJump() | (touch ? touch.consumeJump() : false);
      return {
        moveX: move.x,
        moveY: move.y,
        yaw,
        sprint: kb.sprint || (touch ? touch.sprint : false),
        jump: Boolean(jump),
      };
    },

    requestPointerLock: () => kb.requestPointerLock(),
  };
}
