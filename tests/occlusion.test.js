// Tests de la détection des arbres/rochers qui cachent le joueur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentHitsCylinder, findOccluders, terrainClearDistance, findClearView } from '../src/camera/occlusion.js';

const tree = { type: 'tree', x: 0, z: 0, y: 0, scale: 1, radius: 0.32, top: Infinity };

test('un segment qui traverse le cylindre le touche', () => {
  assert.ok(segmentHitsCylinder({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, 0, 0, 1, 0, 4));
});

test('un segment qui passe à côté ne le touche pas', () => {
  assert.ok(!segmentHitsCylinder({ x: -5, y: 1, z: 3 }, { x: 5, y: 1, z: 3 }, 0, 0, 1, 0, 4));
});

test('un segment qui passe au-dessus ne le touche pas', () => {
  assert.ok(!segmentHitsCylinder({ x: -5, y: 6, z: 0 }, { x: 5, y: 6, z: 0 }, 0, 0, 1, 0, 4));
});

test("un segment qui s'arrête avant le cylindre ne le touche pas", () => {
  assert.ok(!segmentHitsCylinder({ x: -5, y: 1, z: 0 }, { x: -2, y: 1, z: 0 }, 0, 0, 1, 0, 4));
});

test("un arbre entre la caméra et le joueur est détecté, pas un arbre derrière le joueur", () => {
  const behind = { ...tree, z: -6 };
  const cam = { x: 0, y: 3, z: 4 };
  const targets = [{ x: 0, y: 1.6, z: -2 }];
  const hits = findOccluders([tree, behind], cam, targets);
  assert.deepEqual([...hits], [0]);
});

test("l'hystérésis garde un arbre masqué juste à la limite", () => {
  const cam = { x: 1.5, y: 1, z: 5 };
  const targets = [{ x: 1.5, y: 1, z: -5 }]; // passe à 1,5 m du centre, rayon visible 1,3 m
  assert.equal(findOccluders([tree], cam, targets).size, 0);
  assert.equal(findOccluders([tree], cam, targets, new Set([0])).size, 1);
});

// ---------- Relief ----------

const flat = () => 0;
// Colline : un mur de 5 m de haut à partir de z = 3
const hill = (x, z) => (z >= 3 ? 5 : 0);
const from = { x: 0, y: 1.4, z: 0 };
const backward = { x: 0, y: 0.2, z: 0.98 }; // caméra derrière le joueur, légèrement au-dessus

test('terrain plat : la caméra garde sa distance', () => {
  assert.equal(terrainClearDistance(flat, from, backward, 6.5), 6.5);
});

test('une colline derrière le joueur rapproche la caméra avant la pente', () => {
  const d = terrainClearDistance(hill, from, backward, 6.5);
  assert.ok(d < 3.1 && d > 2, `distance inattendue : ${d}`);
  // Le point retenu est bien au-dessus du sol
  assert.ok(from.y + backward.y * d > hill(0, backward.z * d));
});

test('une colline plus loin que la caméra ne change rien', () => {
  const farHill = (x, z) => (z >= 10 ? 5 : 0);
  assert.equal(terrainClearDistance(farHill, from, backward, 6.5), 6.5);
});

test('derrière une colline, la caméra monte au lieu de se rapprocher', () => {
  // Pente qui monte derrière le joueur (côté +z)
  const slope = (x, z) => Math.max(0, z) * 0.6;
  const view = findClearView(slope, from, 0, 0.05, 1.2, 6.5);
  assert.equal(view.distance, 6.5);
  assert.ok(view.pitch > 0.05 && view.pitch <= 1.2);
  // Sans colline : rien ne change
  const same = findClearView(flat, from, 0, 0.2, 1.2, 6.5);
  assert.deepEqual(same, { pitch: 0.2, distance: 6.5 });
});
