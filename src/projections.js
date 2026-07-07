/**
 * projections.js - Maps R^4 -> R^3.
 *
 * Every function takes a 4-vector [x, y, z, w] plus an options object and
 * returns a 3-array [x, y, z]. Pure module, unit-testable in Node.
 */

export const PROJECTIONS = {
  /**
   * Perspective projection from a viewpoint at w = d on the W-axis:
   * scale factor k = d / (d - w). The 4D analogue of a pinhole camera;
   * objects farther along -W appear smaller (the tesseract's inner cube).
   */
  Perspective: (v, { distance = 2.6 } = {}) => {
    const k = distance / Math.max(distance - v[3], 0.15);
    return [v[0]*k, v[1]*k, v[2]*k];
  },

  /** Orthographic: drop w entirely (shadow onto the w = 0 hyperplane). */
  Orthographic: (v) => [v[0], v[1], v[2]],

  /** Oblique parallel (cavalier): w becomes a fixed shear, keeping it visible. */
  Parallel: (v, { shear = 0.35 } = {}) => [
    v[0] + shear * v[3],
    v[1] + shear * v[3],
    v[2],
  ],

  /**
   * Stereographic projection from the pole (0,0,0,1) of the unit 3-sphere.
   * Points are radially normalized onto S^3 first; the map is then
   * p = (x, y, z) / (1 - w), which is conformal (angle-preserving).
   */
  Stereographic: (v) => {
    const n = Math.hypot(v[0], v[1], v[2], v[3]) || 1;
    const k = 1 / Math.max(1.0001 - v[3] / n, 0.05);
    return [v[0]/n*k, v[1]/n*k, v[2]/n*k];
  },
};

/** Smoothstep-blended interpolation between two projection results. */
export function blendProjection(a, b, t) {
  const s = t * t * (3 - 2 * t);
  return [a[0] + (b[0]-a[0])*s, a[1] + (b[1]-a[1])*s, a[2] + (b[2]-a[2])*s];
}
