# 4D Explorer

An interactive, mathematically exact simulation of four-dimensional Euclidean space.

## Run

Serve the folder statically and open `index.html`:

```bash
npx serve .
```

Or open `index.html` directly in a modern browser (WebGL2 required).

## Features (Phase 1)

- **True SO(4) rotations** in all six planes (XY, XZ, YZ, XW, YW, ZW) with periodic Gram-Schmidt re-orthonormalization; the live rotation matrix is displayed in the HUD.
- **Exact regular polytopes**: tesseract (8-cell), pentachoron (5-cell), 16-cell, 24-cell, 600-cell (golden-ratio construction), hypersphere S3 grid, Clifford torus. Edges derived by minimal pairwise distance (correct for regular polytopes).
- **Projections**: 4D perspective `d/(d-w)`, orthographic, oblique parallel, and stereographic from S3, with smoothstep-blended animated transitions and adjustable view distance.
- **Cross-sections**: exact edge-hyperplane intersections at `w = w0`, rendered as the true 3D slice (convex hull for convex polytopes), with animated hyperslicing and ghost projection overlay.
- **Interaction**: orbit camera, Shift+drag for XW/YW rotation, Ctrl+drag for XY/ZW, held keys Q/A W/S E/D, W-slider, pause, frame stepping, undo/redo, reset.
- **I/O**: PNG screenshots, WebM recording, JSON project save/load.

## Controls

| Input | Action |
|---|---|
| Drag | Orbit camera |
| Shift + drag | Rotate XW / YW |
| Ctrl + drag | Rotate XY / ZW |
| Q/A, W/S, E/D (hold) | Rotate XW / YW / ZW |
| `[` / `]` | Move slicing hyperplane |
| Space | Pause |
| `.` | Step one frame |
| R | Reset rotation |
| Ctrl+Z / Ctrl+Y | Undo / redo |

## Roadmap (Phase 2+)

- TypeScript module split (`math4/`, `geometry/`, `projection/`, `slicing/`, `ui/`) with React dockable panels and unit tests (rotation orthogonality, edge counts 32/10/24/96/720, slice topology)
- 120-cell, facet-shaded solid rendering with 4D normals, hypercube unfolding/nets
- WebGPU compute path for transformation and marching-tetrahedra slicing
- Educational mode with guided lessons and quizzes; timeline/keyframe animation editor
- Experimental 4D rigid-body physics (clearly flagged as speculative)
- Gamepad/touch/VR input, plugin and scripting API
