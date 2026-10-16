import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Procedural watch geometry. Units: case radius ≈ 1.08. The dial faces +Z.
 * Lathe profiles are authored as (radius, height) and rotated so "height" becomes Z.
 */
const v2 = (pts) => pts.map(([r, h]) => new THREE.Vector2(r, h));

const toFaceZ = (g) => {
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
};

/** Mid-case with bevelled flanks and an open exhibition back (r < 0.6). */
export function caseGeometry(seg = 128) {
  return toFaceZ(
    new THREE.LatheGeometry(
      v2([
        [0.6, -0.27],
        [0.7, -0.3],
        [0.86, -0.305],
        [0.97, -0.26],
        [1.04, -0.17],
        [1.08, -0.06],
        [1.085, 0.04],
        [1.07, 0.1],
        [1.02, 0.145],
        [0.94, 0.152],
        [0.905, 0.12],
        [0.9, 0.03],
        [0.002, 0.03],
      ]),
      seg
    )
  );
}

/** Bezel ring with fluting cut into its outer slope. */
export function bezelGeometry(seg = 360, flutes = 60) {
  const g = new THREE.LatheGeometry(
    v2([
      [0.885, 0.148],
      [0.885, 0.2],
      [0.9, 0.244],
      [0.985, 0.262],
      [1.04, 0.245],
      [1.072, 0.2],
      [1.074, 0.16],
      [1.06, 0.148],
    ]),
    seg
  );
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.975) continue;
    const a = Math.atan2(z, x);
    const k = Math.min(1, (r - 0.975) / 0.08);
    const groove = Math.pow(0.5 - 0.5 * Math.cos(a * flutes), 1.6);
    const nr = r - 0.03 * k * groove;
    pos.setX(i, (x / r) * nr);
    pos.setZ(i, (z / r) * nr);
  }
  return toFaceZ(g);
}

/** Slightly domed crystal as a shallow spherical cap whose rim sits at z = 0.262. */
export function crystalGeometry(seg = 48) {
  const chord = 0.89;
  const dome = 0.045;
  const R = (chord * chord + dome * dome) / (2 * dome);
  const theta = Math.asin(chord / R);
  const g = new THREE.SphereGeometry(R, seg, 6, 0, Math.PI * 2, 0, theta);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, 0.262 - (R - dome));
  return g;
}

/** Tapered sword hand, pivot at origin, pointing +Y. */
export function handGeometry({ length = 0.6, width = 0.05, tail = 0.1, depth = 0.012 }) {
  const s = new THREE.Shape();
  s.moveTo(-width * 0.5, -tail);
  s.lineTo(width * 0.5, -tail);
  s.lineTo(width * 0.42, length * 0.86);
  s.lineTo(0, length);
  s.lineTo(-width * 0.42, length * 0.86);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 });
}

/** Half-moon winding rotor for the movement. */
export function rotorGeometry(seg = 48) {
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.78, 0, Math.PI, false);
  s.lineTo(-0.16, 0);
  s.absarc(0, 0, 0.16, Math.PI, 0, true);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: seg,
  });
}

export function roundedBox(w, h, d, r = 0.04, segs = 3) {
  return new RoundedBoxGeometry(w, h, d, segs, r);
}

/** Knurled crown: a cylinder with alternating ridges, axis along X. */
export function crownGeometry(ridges = 24) {
  const g = new THREE.CylinderGeometry(0.115, 0.115, 0.15, ridges * 2, 1, false);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.05) continue;
    const a = Math.atan2(z, x);
    const nr = r * (Math.round((a / (Math.PI * 2)) * ridges * 2) % 2 ? 0.93 : 1);
    pos.setX(i, (x / r) * nr);
    pos.setZ(i, (z / r) * nr);
  }
  g.rotateZ(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}
