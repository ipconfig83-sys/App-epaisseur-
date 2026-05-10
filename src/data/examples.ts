import type { FrameData, LensData } from '@/types';

// =====================================================================
// Example presets — useful for demos and testing
// =====================================================================

export const EXAMPLE_PRESETS: { name: string; lens: LensData; frame: FrameData }[] = [
  {
    name: 'High myope · small frame',
    lens: {
      sphere: -8.0, cylinder: -1.0, axis: 180, addition: 0,
      index: 1.67, material: 'MR7', diameter: 65,
      minCenterThickness: 1.2, minEdgeThickness: 1.0, type: 'single-vision',
    },
    frame: {
      aSize: 48, bSize: 30, dbl: 18, ed: 51,
      shape: 'oval', type: 'full-rim',
      monocularPD: 30, fittingHeight: 16, decentration: 2,
    },
  },
  {
    name: 'High hyperope · presbyopic',
    lens: {
      sphere: 5.5, cylinder: -0.75, axis: 90, addition: 2.25,
      index: 1.6, material: 'MR8', diameter: 70,
      minCenterThickness: 3.5, minEdgeThickness: 1.0, type: 'progressive',
    },
    frame: {
      aSize: 54, bSize: 36, dbl: 17, ed: 58,
      shape: 'rectangular', type: 'full-rim',
      monocularPD: 32, fittingHeight: 22, decentration: 2,
    },
  },
  {
    name: 'Standard adult · low Rx',
    lens: {
      sphere: -1.5, cylinder: -0.25, axis: 90, addition: 0,
      index: 1.5, material: 'CR39', diameter: 65,
      minCenterThickness: 1.5, minEdgeThickness: 1.0, type: 'single-vision',
    },
    frame: {
      aSize: 52, bSize: 32, dbl: 18, ed: 56,
      shape: 'oval', type: 'full-rim',
      monocularPD: 32, fittingHeight: 18, decentration: 1,
    },
  },
];
