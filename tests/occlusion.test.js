// Tests de la détection des arbres/rochers qui cachent le joueur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentHitsCylinder, findOccluders } from '../src/camera/occlusion.js';

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
