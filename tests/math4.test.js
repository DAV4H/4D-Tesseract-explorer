/**
 * Mathematical validation suite.
 * Verifies that the 4D engine is EXACT: rotations are isometries in SO(4)
 * and polytope combinatorics match the known values from geometry.
 */
import { describe, it, expect } from 'vitest';
import {
  I4, matMul, transpose, rotPlane, apply4, orthonormalize, dot4, norm4,
  ROTATION_PLANES,
} from '../src/math4.js';
import { SHAPES } from '../src/shapes.js';
import { computeSlice } from '../src/slicing.js';

const approxIdentity = (m, eps = 1e-12) =>
  I4().every((v, k) => Math.abs(m[k] - v) < eps);

describe('SO(4) rotations', () => {
  it('every plane rotation is orthogonal: R * R^T = I', () => {
    for (const [, i, j] of ROTATION_PLANES) {
      const R = rotPlane(i, j, 0.7231);
      expect(approxIdentity(matMul(R, transpose(R)))).toBe(true);
    }
  });

  it('rotations preserve norms (isometry)', () => {
    const v = [0.3, -1.2, 2.5, -0.7];
    let R = I4();
    for (const [, i, j] of ROTATION_PLANES) R = matMul(rotPlane(i, j, 1.1), R);
    expect(norm4(apply4(R, v))).toBeCloseTo(norm4(v), 12);
  });

  it('orthonormalize repairs drift after 10k compositions', () => {
    let R = I4();
    for (let k = 0; k < 10000; k++) R = matMul(rotPlane(k % 2 ? 0 : 1, 3, 0.01), R);
    R = orthonormalize(R);
    const rows = [0, 1, 2, 3].map(i => R.slice(i * 4, i * 4 + 4));
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        expect(dot4(rows[i], rows[j])).toBeCloseTo(i === j ? 1 : 0, 10);
  });
});

describe('regular polytope combinatorics', () => {
  const expected = {
    'Tesseract (8-cell)':   { v: 16,  e: 32 },
    'Pentachoron (5-cell)': { v: 5,   e: 10 },
    '16-cell':              { v: 8,   e: 24 },
    '24-cell':              { v: 24,  e: 96 },
    '600-cell':             { v: 120, e: 720 },
  };
  for (const [name, { v, e }] of Object.entries(expected)) {
    it(`${name}: ${v} vertices, ${e} edges`, () => {
      const s = SHAPES[name]();
      expect(s.V.length).toBe(v);
      expect(s.E.length).toBe(e);
    });
  }

  it('all vertices of each regular polytope share the same circumradius', () => {
    for (const name of Object.keys(expected)) {
      const s = SHAPES[name]();
      const r0 = norm4(s.V[0]);
      for (const v of s.V) expect(norm4(v)).toBeCloseTo(r0, 10);
    }
  });
});

describe('cross-sections', () => {
  it('central slice of the axis-aligned tesseract is a cube (8 points)', () => {
    const { V, E } = SHAPES['Tesseract (8-cell)']();
    // Hyperplane w = 0 crosses exactly the 8 edges parallel to the W-axis.
    const pts = computeSlice(V, E, 0);
    expect(pts.length).toBe(8);
    for (const p of pts)
      p.forEach(c => expect(Math.abs(c)).toBeCloseTo(1, 12)); // cube corners
  });

  it('slice outside the object is empty', () => {
    const { V, E } = SHAPES['Tesseract (8-cell)']();
    expect(computeSlice(V, E, 2).length).toBe(0);
  });
});
