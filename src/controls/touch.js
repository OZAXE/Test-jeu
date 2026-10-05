// Contrôles mobiles :
// - moitié gauche : joystick virtuel qui apparaît sous le pouce
// - moitié droite : glisser le doigt pour orienter la caméra
// - boutons Saut et Sprint (sprint = interrupteur)
// Les Pointer Events gèrent le multitouch : chaque doigt a son pointerId.

const JOYSTICK_RADIUS = 50; // px : déplacement max du bouton central

export function createTouchControls(sensitivity) {
  const ui = document.getElementById('touch-ui');
  const joyZone = document.getElementById('joystick-zone');
  const lookZone = document.getElementById('look-zone');
  const base = document.getElementById('joystick-base');
  const knob = document.getElementById('joystick-knob');
  const btnJump = document.getElementById('btn-jump');
  const btnSprint = document.getElementById('btn-sprint');

  ui.hidden = false;

  const move = { x: 0, y: 0 };
  let joyId = null;
  let joyCx = 0;
  let joyCy = 0;

  let lookId = null;
  let lastX = 0;
  let lastY = 0;
  let lookX = 0;
  let lookY = 0;

  let jumpQueued = false;
  let sprint = false;

  // Capture du doigt : la zone continue de recevoir ses mouvements même s'il en sort.
  // Peut échouer si le doigt est déjà relevé : sans gravité, on ignore.
  const capture = (el, id) => {
    try {
      el.setPointerCapture(id);
    } catch {
      /* ignoré */
    }
  };

  // ---------- Joystick ----------
  joyZone.addEventListener('pointerdown', (e) => {
    if (joyId !== null) return;
    joyId = e.pointerId;
    capture(joyZone, e.pointerId);
    joyCx = e.clientX;
    joyCy = e.clientY;
    base.style.left = `${joyCx}px`;
    base.style.top = `${joyCy}px`;
    base.classList.add('active');
    knob.style.transform = 'translate(0px, 0px)';
  });

  joyZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    let dx = e.clientX - joyCx;
    let dy = e.clientY - joyCy;
    const len = Math.hypot(dx, dy);
    if (len > JOYSTICK_RADIUS) {
      dx = (dx / len) * JOYSTICK_RADIUS;
      dy = (dy / len) * JOYSTICK_RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // Petite zone morte au centre pour éviter les dérives
    const m = Math.min(1, len / JOYSTICK_RADIUS);
    const k = m < 0.12 ? 0 : 1;
    move.x = (dx / JOYSTICK_RADIUS) * k;
    move.y = (-dy / JOYSTICK_RADIUS) * k; // vers le haut de l'écran = avancer
  });

  const endJoy = (e) => {
    if (e.pointerId !== joyId) return;
    joyId = null;
    move.x = 0;
    move.y = 0;
    base.classList.remove('active');
  };
  joyZone.addEventListener('pointerup', endJoy);
  joyZone.addEventListener('pointercancel', endJoy);

  // ---------- Caméra ----------
  lookZone.addEventListener('pointerdown', (e) => {
    if (lookId !== null) return;
    lookId = e.pointerId;
    capture(lookZone, e.pointerId);
    lastX = e.clientX;
    lastY = e.clientY;
  });

  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    lookX += (e.clientX - lastX) * sensitivity;
    lookY += (e.clientY - lastY) * sensitivity;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  const endLook = (e) => {
    if (e.pointerId === lookId) lookId = null;
  };
  lookZone.addEventListener('pointerup', endLook);
  lookZone.addEventListener('pointercancel', endLook);

  // ---------- Boutons ----------
  btnJump.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    jumpQueued = true;
    btnJump.classList.add('pressed');
  });
  const releaseJump = () => btnJump.classList.remove('pressed');
  btnJump.addEventListener('pointerup', releaseJump);
  btnJump.addEventListener('pointercancel', releaseJump);
  btnJump.addEventListener('pointerleave', releaseJump);

  btnSprint.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sprint = !sprint;
    btnSprint.classList.toggle('pressed', sprint);
  });

  return {
    getMove() {
      return { x: move.x, y: move.y };
    },
    get sprint() {
      return sprint;
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
  };
}
