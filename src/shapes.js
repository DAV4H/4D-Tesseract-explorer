/**
 * shapes.js - Exact constructions of 4D objects.
 *
 * Each generator returns { V, E, convex }:
 *   V      - array of 4-vectors [x, y, z, w]
 *   E      - array of vertex-index pairs [i, j]
 *   convex - whether hyperplane cross-sections are convex (enables hull rendering)
 *
 * Pure module: no rendering dependencies, fully unit-testable in Node.
 */

/**
 * Edges = vertex pairs at the minimal pairwise distance.
 * Provably correct for regular polytopes: they are vertex-transitive and all
 * edges share the same (minimal) length.
 */
export function edgesByMinDist(V) {
  let min = Infinity;
  const E = [];
  const d2 = (a, b) =>
    (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2 + (a[3]-b[3])**2;
  for (let i = 0; i < V.length; i++)
    for (let j = i + 1; j < V.length; j++) {
      const d = d2(V[i], V[j]);
      if (d > 1e-9 && d < min) min = d;
    }
  for (let i = 0; i < V.length; i++)
    for (let j = i + 1; j < V.length; j++)
      if (Math.abs(d2(V[i], V[j]) - min) < 1e-6 * min + 1e-9) E.push([i, j]);
  return E;
}

/** The 12 even permutations of (0,1,2,3), used by the 600-cell. */
export function evenPerms() {
  const res = [];
  const rec = (a, c = []) => {
    if (!a.length) { res.push(c); return; }
    a.forEach((x, i) => rec([...a.slice(0, i), ...a.slice(i + 1)], [...c, x]));
  };
  rec([0, 1, 2, 3]);
  return res.filter(p => {
    let inv = 0;
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++) if (p[i] > p[j]) inv++;
    return inv % 2 === 0;
  });
}

export const SHAPES = {
  /** 16 vertices (+-1)^4, 32 edges, 24 square faces, 8 cubic cells. */
  'Tesseract (8-cell)': () => {
    const V = [];
    for (let m = 0; m < 16; m++) V.push([0,1,2,3].map(i => (m >> i & 1) ? 1 : -1));
    return { V, E: edgesByMinDist(V), convex: true };
  },

  /** Regular 4-simplex: 5 vertices, every pair is an edge (10 edges). */
  'Pentachoron (5-cell)': () => {
    const s = Math.sqrt(5);
    const V = [
      [ 1,  1,  1, -1/s], [ 1, -1, -1, -1/s],
      [-1,  1, -1, -1/s], [-1, -1,  1, -1/s],
      [ 0,  0,  0,  4/s],
    ];
    return { V, E: edgesByMinDist(V), convex: true };
  },

  /** Cross-polytope: 8 vertices +-e_i, 24 edges (all pairs except opposites). */
  '16-cell': () => {
    const V = [];
    for (let i = 0; i < 4; i++)
      for (const s of [1, -1]) { const v = [0,0,0,0]; v[i] = s; V.push(v); }
    return { V, E: edgesByMinDist(V), convex: true };
  },

  /** 24 vertices: all permutations of (+-1, +-1, 0, 0); 96 edges. */
  '24-cell': () => {
    const V = [];
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++)
        for (const a of [1, -1])
          for (const b of [1, -1]) {
            const v = [0,0,0,0]; v[i] = a; v[j] = b; V.push(v);
          }
    return { V, E: edgesByMinDist(V), convex: true };
  },

  /**
   * 600-cell: 120 vertices, 720 edges. Vertices are:
   *   16 x (+-1/2, +-1/2, +-1/2, +-1/2)
   *    8 x permutations of (+-1, 0, 0, 0)
   *   96 x even permutations of (+-phi, +-1, +-1/phi, 0) / 2   (phi = golden ratio)
   */
  '600-cell': () => {
    const PHI = (1 + Math.sqrt(5)) / 2;
    const V = [];
    for (let m = 0; m < 16; m++)
      V.push([0,1,2,3].map(i => (m >> i & 1) ? 0.5 : -0.5));
    for (let i = 0; i < 4; i++)
      for (const s of [1, -1]) { const v = [0,0,0,0]; v[i] = s; V.push(v); }
    const base = [PHI/2, 0.5, 1/(2*PHI)];
    for (const p of evenPerms())
      for (let sg = 0; sg < 8; sg++) {
        const vals = [
          base[0] * ((sg & 1) ? -1 : 1),
          base[1] * ((sg & 2) ? -1 : 1),
          base[2] * ((sg & 4) ? -1 : 1),
          0,
        ];
        const v = [0,0,0,0];
        for (let k = 0; k < 4; k++) v[p[k]] = vals[k];
        V.push(v);
      }
    return { V, E: edgesByMinDist(V), convex: true };
  },

  /** Unit 3-sphere sampled on a hyperspherical (u, v, w) coordinate grid. */
  'Hypersphere (S3)': () => {
    const V = [], E = [];
    const NU = 6, NV = 6, NW = 12;
    const idx = (i, j, k) => (i * (NV + 1) + j) * NW + k;
    for (let i = 0; i <= NU; i++) {
      const u = Math.PI * i / NU;
      for (let j = 0; j <= NV; j++) {
        const v = Math.PI * j / NV;
        for (let k = 0; k < NW; k++) {
          const w = 2 * Math.PI * k / NW;
          V.push([
            Math.cos(u),
            Math.sin(u) * Math.cos(v),
            Math.sin(u) * Math.sin(v) * Math.cos(w),
            Math.sin(u) * Math.sin(v) * Math.sin(w),
          ]);
        }
      }
    }
    for (let i = 0; i <= NU; i++)
      for (let j = 0; j <= NV; j++)
        for (let k = 0; k < NW; k++) {
          E.push([idx(i, j, k), idx(i, j, (k + 1) % NW)]);
          if (j < NV) E.push([idx(i, j, k), idx(i, j + 1, k)]);
          if (i < NU) E.push([idx(i, j, k), idx(i + 1, j, k)]);
        }
    return { V, E, convex: true };
  },

  /** Flat (Clifford) torus embedded in S3; cross-sections are NOT convex. */
  'Clifford torus': () => {
    const V = [], E = [], N = 24, r = Math.SQRT1_2;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const u = 2 * Math.PI * i / N, v = 2 * Math.PI * j / N;
        V.push([r*Math.cos(u), r*Math.sin(u), r*Math.cos(v), r*Math.sin(v)]);
      }
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        E.push([i*N + j, i*N + (j + 1) % N]);
        E.push([i*N + j, ((i + 1) % N)*N + j]);
      }
    return { V, E, convex: false };
  },
};
