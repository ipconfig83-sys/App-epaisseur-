// Numerical audit of the PRESBYTA optical engine.
// Runs the simulator for the prescriptions defined in the user's audit
// brief and prints a compact table of key results.
//
// Usage:  node --import tsx scripts/audit-engine.mjs
// or simply use vite-node via:  npx vite-node scripts/audit-engine.mjs

import { runSimulation } from '../src/engine/calculate.ts';

const FRAME = {
  aSize: 54,
  bSize: 38,
  dbl: 18,
  ed: 58,
  shape: 'rectangular',
  type: 'full-rim',
  monocularPD: 31,
  fittingHeight: 19,
  decentration: 0,
};

function lens(sphere, index) {
  return {
    sphere,
    cylinder: 0,
    axis: 0,
    addition: 0,
    index,
    material:
      index === 1.5 ? 'CR39'
      : index === 1.6 ? 'MR8'
      : 'MR7',
    diameter: 70,
    minCenterThickness: 1.5,
    minEdgeThickness: 1.0,
    type: 'single-vision',
  };
}

const tests = [
  { label: '-6.00 D · n=1.50', sphere: -6, n: 1.5 },
  { label: '-6.00 D · n=1.60', sphere: -6, n: 1.6 },
  { label: '-6.00 D · n=1.67', sphere: -6, n: 1.67 },
  { label: '+6.00 D · n=1.50', sphere: 6, n: 1.5 },
  { label: '+6.00 D · n=1.60', sphere: 6, n: 1.6 },
  { label: '+6.00 D · n=1.67', sphere: 6, n: 1.67 },
];

console.log('Frame:', FRAME);
console.log('---');
console.log('Rx                    | base | back  | Ct(mm)| Et(mm)| FinalE| Weight| Prism | MBS  | DC');
console.log('----------------------+------+-------+-------+-------+-------+-------+-------+------+-----');

for (const t of tests) {
  const r = runSimulation(lens(t.sphere, t.n), FRAME);
  const row = [
    t.label.padEnd(22),
    r.baseCurve.toFixed(2).padStart(4),
    r.backCurve.toFixed(2).padStart(5),
    r.centerThickness.toFixed(2).padStart(5),
    r.edgeThickness.toFixed(2).padStart(5),
    r.finalEdgeThickness.toFixed(2).padStart(5),
    r.weight.toFixed(2).padStart(5),
    r.prismThinning.applied ? r.prismThinning.prismDiopters.toFixed(2).padStart(5) : '  —  ',
    r.blank.minimumBlankSize.toFixed(1).padStart(4),
    r.blank.totalDecentration.toFixed(2).padStart(4),
  ];
  console.log(row.join(' | '));
}
