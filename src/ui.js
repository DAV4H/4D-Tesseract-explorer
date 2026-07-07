/**
 * ui.js - Control panel construction (lil-gui).
 */
import GUI from 'three/addons/libs/lil-gui.module.min.js';

/**
 * Builds the full settings panel.
 * @returns {GUI} the gui instance (needed for updateDisplay on undo/redo/load).
 */
export function buildGUI({ params, actions, shapeNames, projectionNames,
                           onShapeChange, onProjectionChange }) {
  const gui = new GUI({ title: '4D Explorer' });

  gui.add(params, 'shape', shapeNames).name('Object').onChange(onShapeChange);

  const fp = gui.addFolder('Projection');
  fp.add(params, 'projection', projectionNames)
    .onChange(onProjectionChange)
    .onFinishChange(actions.snapshot);
  fp.add(params, 'distance', 1.4, 8, 0.05).name('view distance d');

  const fr = gui.addFolder('Rotation speeds (rad/s)');
  ['XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW']
    .forEach(p => fr.add(params, 'speed' + p, -2, 2, 0.01).name(p));
  fr.add(actions, 'resetRotation').name('reset rotation (R)');

  const fs = gui.addFolder('Cross-section (w = w0)');
  fs.add(params, 'slice').name('enable slicing');
  fs.add(params, 'sliceW', -1.5, 1.5, 0.001).name('w0').listen();
  fs.add(params, 'sliceAnim').name('animate w0');
  fs.add(params, 'sliceSpeed', 0, 2, 0.01).name('anim speed');
  fs.add(params, 'ghost').name('ghost projection');

  const fd = gui.addFolder('Display');
  fd.add(params, 'wireframe');
  fd.add(params, 'showVerts').name('vertices');
  fd.add(params, 'colorByW').name('color by w');
  fd.add(params, 'axes').name('4D axes');
  fd.add(params, 'grid');
  fd.add(params, 'lightMode').name('light mode');

  const fm = gui.addFolder('Simulation');
  fm.add(params, 'paused').listen();
  fm.add(params, 'simSpeed', 0.05, 3, 0.05).name('speed');
  fm.add(actions, 'screenshot');
  fm.add(actions, 'record').name('record / stop (webm)');
  fm.add(actions, 'save').name('save project');
  fm.add(actions, 'load').name('load project');
  fm.add(actions, 'resetAll').name('reset scene');

  return gui;
}
