/**
 * slicing.js - Exact cross-sections of 4D objects with the hyperplane w = w0.
 *
 * A 3D hyperplane slicing a 4D object is the exact analogue of a 2D plane
 * slicing a 3D object: the result is a genuine 3D solid. For each edge whose
 * endpoints lie on opposite sides of the hyperplane we compute the exact
 * linear interpolation parameter t and emit the intersection point.
 *
 * Pure module, unit-testable in Node.
 */

/**
 * @param {number[][]} rotated - vertices already transformed by the SO(4) matrix
 * @param {number[][]} edges   - vertex index pairs
 * @param {number} w0          - hyperplane offset along W
 * @returns {number[][]} intersection points [x, y, z] expressed inside the
 *   slicing hyperplane (w is constant there, so it is dropped losslessly).
 */
export function computeSlice(rotated, edges, w0) {
  const pts = [];
  for (const [i, j] of edges) {
    const wi = rotated[i][3] - w0;
    const wj = rotated[j][3] - w0;
    if (wi * wj < 0) {
      const t = wi / (wi - wj);
      pts.push([
        rotated[i][0] + (rotated[j][0] - rotated[i][0]) * t,
        rotated[i][1] + (rotated[j][1] - rotated[i][1]) * t,
        rotated[i][2] + (rotated[j][2] - rotated[i][2]) * t,
      ]);
    }
  }
  return pts;
}
