/**
 * math4.js - Exact 4D linear algebra.
 *
 * Matrices are flat row-major arrays of length 16. All rotation matrices
 * produced here are elements of SO(4); accumulated products can be pulled
 * back onto SO(4) with `orthonormalize` (Gram-Schmidt) to remove
 * floating-point drift, so every transformation remains a true isometry.
 *
 * Pure module: no rendering dependencies, fully unit-testable in Node.
 */

/** 4x4 identity matrix. */
export const I4 = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

/** Euclidean dot product of two 4-vectors. */
export const dot4 = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3];

/** Euclidean norm of a 4-vector. */
export const norm4 = (v) => Math.hypot(v[0], v[1], v[2], v[3]);

/** Matrix product a*b (row-major 4x4). */
export function matMul(a, b) {
  const r = new Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[i*4 + k] * b[k*4 + j];
      r[i*4 + j] = s;
    }
  }
  return r;
}

/** Transpose of a 4x4 matrix. */
export function transpose(m) {
  const r = new Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r[j*4 + i] = m[i*4 + j];
  return r;
}

/**
 * Rotation by angle t in the coordinate plane spanned by axes i and j.
 *
 * This is the only correct notion of rotation in 4D: a simple rotation
 * fixes the 2-plane ORTHOGONAL to (i, j) pointwise; there is no "rotation
 * axis" as in 3D. The six coordinate planes XY, XZ, YZ, XW, YW, ZW generate
 * all of SO(4).
 */
export function rotPlane(i, j, t) {
  const m = I4(), c = Math.cos(t), s = Math.sin(t);
  m[i*4 + i] = c; m[j*4 + j] = c;
  m[i*4 + j] = -s; m[j*4 + i] = s;
  return m;
}

/** Apply matrix m to 4-vector v. */
export function apply4(m, v) {
  const r = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    r[i] = m[i*4]*v[0] + m[i*4+1]*v[1] + m[i*4+2]*v[2] + m[i*4+3]*v[3];
  }
  return r;
}

/**
 * Gram-Schmidt re-orthonormalization of the rows of m.
 * Projects an almost-orthogonal matrix back onto SO(4), eliminating the
 * O(eps) drift that accumulates when composing thousands of small rotations.
 */
export function orthonormalize(m) {
  const rows = [0, 1, 2, 3].map(i => m.slice(i*4, i*4 + 4));
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < i; j++) {
      const d = dot4(rows[i], rows[j]);
      for (let k = 0; k < 4; k++) rows[i][k] -= d * rows[j][k];
    }
    const n = Math.hypot(...rows[i]);
    for (let k = 0; k < 4; k++) rows[i][k] /= n;
  }
  return rows.flat();
}

/** The six independent rotation planes of R^4: [name, axis i, axis j]. */
export const ROTATION_PLANES = [
  ['XY', 0, 1], ['XZ', 0, 2], ['YZ', 1, 2],
  ['XW', 0, 3], ['YW', 1, 3], ['ZW', 2, 3],
];
