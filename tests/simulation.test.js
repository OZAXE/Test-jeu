// Tests de la simulation (sans navigateur) : lancés par "npm test" et sur chaque PR.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createWorldData } from '../src/world/world.js';
import { createPlayerState } from '../src/state/playerState.js';
import { updatePlayer } from '../src/systems/movement.js';

const DT = 1 / CONFIG.tickRate;
const world = createWorldData();
const idle = { moveX: 0, moveY: 0, yaw: 0, sprint: false, jump: false };

function spawnAt(x, z) {
  return createPlayerState({ x, z, y: world.getGroundHeight(x, z) });
}

test('le monde est identique pour une même graine', () => {
  const other = createWorldData();
  assert.equal(other.props.length, world.props.length);
  assert.deepEqual(other.props[0], world.props[0]);
  assert.equal(other.heightmap.getHeight(10, -7), world.heightmap.getHeight(10, -7));
});

test('le point de départ est sur la terre ferme', () => {
  const { x, z } = CONFIG.player.spawn;
  assert.ok(world.isLand(x, z));
});

test("le joueur ne quitte jamais l'île et ne traverse pas les arbres", () => {
  const trees = world.colliders.filter((c) => c.top === Infinity);
  for (let k = 0; k < 8; k++) {
    const p = spawnAt(0, 0);
    const intent = { moveX: 0, moveY: 1, yaw: (k * Math.PI) / 4, sprint: true, jump: false };
    for (let i = 0; i < 30 * CONFIG.tickRate; i++) {
      intent.jump = i % 50 === 0;
      updatePlayer(p, intent, world, CONFIG.player, DT);
      const { x, y, z } = p.position;
      assert.ok(Number.isFinite(x + y + z), 'position invalide');
      assert.ok(world.isLand(x, z), `direction ${k} : le joueur est dans l'eau en (${x}, ${z})`);
      for (const t of trees) {
        const d = Math.hypot(x - t.x, z - t.z);
        assert.ok(d >= t.radius + CONFIG.player.radius - 0.01, `direction ${k} : dans un arbre`);
      }
    }
  }
});

test("foncer dans un arbre arrête le joueur au contact", () => {
  const tree = world.props.find((p) => p.type === 'tree');
  const p = spawnAt(tree.x, tree.z + 5);
  for (let i = 0; i < 3 * CONFIG.tickRate; i++) {
    updatePlayer(p, { ...idle, moveY: 1 }, world, CONFIG.player, DT);
  }
  const d = Math.hypot(p.position.x - tree.x, p.position.z - tree.z);
  assert.ok(d >= tree.radius + CONFIG.player.radius - 0.01);
});

test('le saut décolle puis retombe au sol', () => {
  const p = spawnAt(0, 0);
  updatePlayer(p, idle, world, CONFIG.player, DT);
  const y0 = p.position.y;
  updatePlayer(p, { ...idle, jump: true }, world, CONFIG.player, DT);
  assert.equal(p.onGround, false);
  let maxY = y0;
  let t = 0;
  while (!p.onGround && t < 3) {
    updatePlayer(p, idle, world, CONFIG.player, DT);
    maxY = Math.max(maxY, p.position.y);
    t += DT;
  }
  assert.ok(p.onGround, 'le joueur ne retombe pas');
  assert.ok(maxY - y0 > 0.8 && maxY - y0 < 2, `hauteur de saut inattendue : ${maxY - y0}`);
});

test('pas de saut en plein vol', () => {
  const p = spawnAt(0, 0);
  updatePlayer(p, { ...idle, jump: true }, world, CONFIG.player, DT);
  for (let i = 0; i < 15; i++) updatePlayer(p, idle, world, CONFIG.player, DT);
  const vyBefore = p.velocity.y;
  updatePlayer(p, { ...idle, jump: true }, world, CONFIG.player, DT);
  assert.ok(p.velocity.y < vyBefore, 'un deuxième saut a été déclenché en l’air');
});
