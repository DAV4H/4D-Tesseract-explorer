/**
 * main.js - 4D Explorer application entry point.
 *
 * Wires together the pure math modules (math4, shapes, projections, slicing)
 * with the Three.js renderer, input handling, undo/redo history, and IO.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { I4, matMul, rotPlane, apply4, orthonormalize, ROTATION_PLANES }
  from './math4.js';
import { SHAPES } from './shapes.js';
import { PROJECTIONS, blendProjection } from './projections.js';
import { computeSlice } from './slicing.js';
import { buildGUI } from './ui.js';

/* ============================ SCENE SETUP ============================ */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 100);
camera.position.set(3.2, 2.2, 3.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(4, 6, 3);
scene.add(sun);
const grid = new THREE.GridHelper(8, 16, 0x334455, 0x222233);
grid.position.y = -2;
scene.add(grid);

/* ============================ STATE ============================ */
let R = I4();                       // accumulated SO(4) rotation
let shape = null, lineGeo = null, ptsGeo = null, lineObj = null, ptsObj = null;
const sliceGroup = new THREE.Group();
scene.add(sliceGroup);
let projFrom = 'Perspective', projBlend = 1, simTime = 0, frame = 0;
const history = [], future = [];

const params = {
  shape: 'Tesseract (8-cell)', projection: 'Perspective', distance: 2.6,
  speedXY: 0, speedXZ: 0, speedYZ: 0, speedXW: 0.45, speedYW: 0.25, speedZW: 0,
  slice: false, sliceW: 0, sliceAnim: false, sliceSpeed: 0.5, ghost: true,
  wireframe: true, showVerts: true, colorByW: true, axes: true, grid: false,
  paused: false, simSpeed: 1, lightMode: false,
};

/* Overlay 4D axes: endpoints along +-e_i, projected through the same pipeline. */
const AXES4 = [
  [-1.8,0,0,0],[1.8,0,0,0],[0,-1.8,0,0],[0,1.8,0,0],
  [0,0,-1.8,0],[0,0,1.8,0],[0,0,0,-1.8],[0,0,0,1.8],
];
const AXCOL = [0xff5555,0xff5555,0x55ff7f,0x55ff7f,0x5599ff,0x5599ff,0xff55ff,0xff55ff];
const axGeo = new THREE.BufferGeometry();
axGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24), 3));
axGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(
  AXCOL.flatMap(c => { const k = new THREE.Color(c); return [k.r, k.g, k.b]; })), 3));
const axObj = new THREE.LineSegments(axGeo,
  new THREE.LineBasicMaterial({ vertexColors: true }));
scene.add(axObj);

function setShape(name) {
  if (lineObj) { scene.remove(lineObj, ptsObj); lineGeo.dispose(); ptsGeo.dispose(); }
  const s = SHAPES[name]();
  shape = s;
  const maxR = Math.max(...s.V.map(v => Math.hypot(...v)));  // normalize circumradius
  s.V = s.V.map(v => v.map(c => c * 1.25 / maxR));
  ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(s.V.length * 3), 3));
  ptsGeo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(s.V.length * 3), 3));
  lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', ptsGeo.getAttribute('position'));
  lineGeo.setAttribute('color',    ptsGeo.getAttribute('color'));
  lineGeo.setIndex(s.E.flat());
  lineObj = new THREE.LineSegments(lineGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true }));
  ptsObj = new THREE.Points(ptsGeo,
    new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true }));
  scene.add(lineObj, ptsObj);
}

/* ============================ PER-FRAME UPDATE ============================ */
const _c = new THREE.Color();

function project(v) {                 // animated projection blending
  const b = PROJECTIONS[params.projection](v, params);
  if (projBlend >= 1) return b;
  return blendProjection(PROJECTIONS[projFrom](v, params), b, projBlend);
}

function updateGeometry() {
  const pos = ptsGeo.getAttribute('position'), col = ptsGeo.getAttribute('color');
  const rot = shape.V.map(v => apply4(R, v));
  rot.forEach((r, i) => {
    const p = project(r);
    pos.setXYZ(i, p[0], p[1], p[2]);
    if (params.colorByW) {            // hue encodes the rotated w-coordinate
      const t = THREE.MathUtils.clamp((r[3] + 1.4) / 2.8, 0, 1);
      _c.setHSL(0.72 - 0.62 * t, 0.9, 0.55);
    } else _c.set(0x9fd0ff);
    col.setXYZ(i, _c.r, _c.g, _c.b);
  });
  pos.needsUpdate = col.needsUpdate = true;

  // Cross-section: the slice is a genuine 3D object; render its (x,y,z) directly.
  sliceGroup.clear();
  const fade = params.slice ? (params.ghost ? 0.16 : 0) : 1;
  lineObj.material.opacity = fade; ptsObj.material.opacity = fade;
  lineObj.visible = params.wireframe && fade > 0;
  ptsObj.visible = params.showVerts && fade > 0;
  if (!params.slice) return;

  const raw = computeSlice(rot, shape.E, params.sliceW);
  if (!raw.length) return;
  const pts = raw.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const hue = 0.72 - 0.62 * THREE.MathUtils.clamp((params.sliceW + 1.4) / 2.8, 0, 1);
  if (shape.convex && pts.length > 3) {
    try {
      sliceGroup.add(new THREE.Mesh(new ConvexGeometry(pts),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(hue, 0.85, 0.55),
          transparent: true, opacity: 0.82, roughness: 0.35, metalness: 0.1,
          side: THREE.DoubleSide, flatShading: true,
        })));
    } catch (e) { /* degenerate (coplanar) slice: points only */ }
  }
  const pg = new THREE.BufferGeometry().setFromPoints(pts);
  sliceGroup.add(new THREE.Points(pg, new THREE.PointsMaterial({
    size: 0.06, color: new THREE.Color().setHSL(hue, 0.9, 0.75),
  })));
}

/* ============================ INPUT ============================ */
let drag4D = null, last = [0, 0];
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.shiftKey || e.ctrlKey) {
    drag4D = e.shiftKey ? 'w' : 'xy';
    controls.enabled = false;
    last = [e.clientX, e.clientY];
  }
});
addEventListener('pointermove', e => {
  if (!drag4D) return;
  const dx = (e.clientX - last[0]) * 0.006, dy = (e.clientY - last[1]) * 0.006;
  last = [e.clientX, e.clientY];
  R = drag4D === 'w'
    ? matMul(rotPlane(1, 3, -dy), matMul(rotPlane(0, 3, dx), R))   // XW / YW
    : matMul(rotPlane(2, 3, -dy), matMul(rotPlane(0, 1, dx), R));  // XY / ZW
});
addEventListener('pointerup', () => {
  if (drag4D) { drag4D = null; controls.enabled = true; snapshot(); }
});

const keys = new Set();
let stepOnce = false;
addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'z') { undo(); return; }
  if (e.ctrlKey && e.key === 'y') { redo(); return; }
  keys.add(e.key.toLowerCase());
  if (e.key === ' ') { params.paused = !params.paused; refreshGUI(); }
  if (e.key === '.') stepOnce = true;
  if (e.key.toLowerCase() === 'r') { snapshot(); R = I4(); }
  if (e.key === '[') params.sliceW = Math.max(-1.5, params.sliceW - 0.05);
  if (e.key === ']') params.sliceW = Math.min( 1.5, params.sliceW + 0.05);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

/* ============================ HISTORY / IO ============================ */
function snapshot() {
  history.push(JSON.stringify({ R, params: { ...params } }));
  if (history.length > 100) history.shift();
  future.length = 0;
}
function restore(s) {
  const o = JSON.parse(s);
  R = o.R;
  Object.assign(params, o.params);
  setShape(params.shape);
  refreshGUI();
}
function undo() {
  if (!history.length) return;
  future.push(JSON.stringify({ R, params: { ...params } }));
  restore(history.pop());
}
function redo() {
  if (!future.length) return;
  history.push(JSON.stringify({ R, params: { ...params } }));
  restore(future.pop());
}
function download(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
}

let recorder = null;
const actions = {
  snapshot,
  screenshot() { download(renderer.domElement.toDataURL('image/png'), '4d-explorer.png'); },
  record() {
    if (recorder) { recorder.stop(); recorder = null; return; }
    const chunks = [];
    recorder = new MediaRecorder(renderer.domElement.captureStream(60));
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => download(
      URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })), '4d.webm');
    recorder.start();
  },
  save() {
    download(URL.createObjectURL(new Blob([JSON.stringify({ R, params })],
      { type: 'application/json' })), '4d-project.json');
  },
  load() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => inp.files[0].text().then(t => { snapshot(); restore(t); });
    inp.click();
  },
  resetRotation() { snapshot(); R = I4(); },
  resetAll() { snapshot(); R = I4(); params.sliceW = 0; simTime = 0; },
};

/* ============================ GUI ============================ */
const gui = buildGUI({
  params, actions,
  shapeNames: Object.keys(SHAPES),
  projectionNames: Object.keys(PROJECTIONS),
  onShapeChange: v => { snapshot(); setShape(v); },
  onProjectionChange: () => { projBlend = 0; },
});
function refreshGUI() { gui.controllersRecursive().forEach(c => c.updateDisplay()); }

/* ============================ MAIN LOOP ============================ */
setShape(params.shape);
snapshot();
const hud = document.getElementById('hud');
const clock = new THREE.Clock();
let fps = 0, fpsN = 0, fpsT = 0;
const KEY_PLANES = { q:[0,3,1], a:[0,3,-1], w:[1,3,1], s:[1,3,-1], e:[2,3,1], d:[2,3,-1] };

function animate() {
  requestAnimationFrame(animate);
  let dt = Math.min(clock.getDelta(), 0.05) * params.simSpeed;
  if (params.paused && !stepOnce) dt = 0;
  if (stepOnce) { dt = 1 / 60; stepOnce = false; }
  simTime += dt;

  // Auto rotations: compose all six plane rotations (order-independent to O(dt^2)).
  for (const [name, i, j] of ROTATION_PLANES) {
    const w = params['speed' + name];
    if (w) R = matMul(rotPlane(i, j, w * dt), R);
  }
  for (const [k, [i, j, sg]] of Object.entries(KEY_PLANES))  // held-key rotation
    if (keys.has(k)) R = matMul(rotPlane(i, j, sg * 1.2 * (dt || 1/60)), R);
  if (++frame % 120 === 0) R = orthonormalize(R);
  if (params.sliceAnim) params.sliceW = 1.2 * Math.sin(simTime * params.sliceSpeed);
  if (projBlend < 1) projBlend = Math.min(1, projBlend + 0.016 / 0.6);

  updateGeometry();

  // Overlay axes go through the same 4D pipeline.
  const ap = axGeo.getAttribute('position');
  AXES4.forEach((v, i) => {
    const p = project(apply4(R, v));
    ap.setXYZ(i, p[0], p[1], p[2]);
  });
  ap.needsUpdate = true;
  axObj.visible = params.axes;
  grid.visible = params.grid;
  scene.background.set(params.lightMode ? 0xf2f4f8 : 0x0b0e14);

  fpsN++;
  if (clock.elapsedTime - fpsT >= 1) { fps = fpsN; fpsN = 0; fpsT = clock.elapsedTime; }
  const f = n => (n < 0 ? '' : ' ') + n.toFixed(2);
  hud.textContent =
    `w0 = ${params.sliceW.toFixed(3)}   proj: ${params.projection}` +
    `   verts: ${shape.V.length}  edges: ${shape.E.length}   fps: ${fps}\n` +
    `R in SO(4):\n` +
    [0,1,2,3].map(i => ' [' + [0,1,2,3].map(j => f(R[i*4+j])).join(',') + ' ]').join('\n');

  controls.update();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
animate();
