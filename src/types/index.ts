// =====================================================================
// PRESBYTA — Type Definitions
// =====================================================================

export type RefractiveIndex = 1.5 | 1.56 | 1.59 | 1.6 | 1.67 | 1.74;

export type LensMaterial = 'CR39' | 'Polycarbonate' | 'MR7' | 'MR8';

export type FrameType = 'full-rim' | 'semi-rimless' | 'rimless';

export type FrameShape =
  | 'round'
  | 'oval'
  | 'rectangular'
  | 'aviator'
  | 'cat-eye'
  | 'square'
  | 'panto';

export type LensType = 'single-vision' | 'progressive' | 'office';

export type AppMode = 'patient' | 'laboratory';

export type Theme = 'dark' | 'light';

export type Language = 'fr' | 'en' | 'ar';

export interface FrameData {
  aSize: number;        // horizontal box size (mm)
  bSize: number;        // vertical box size (mm)
  dbl: number;          // distance between lenses (mm)
  ed: number;           // effective diameter (mm)
  shape: FrameShape;
  type: FrameType;
  monocularPD: number;  // monocular pupillary distance (mm)
  fittingHeight: number; // (mm)
  decentration: number; // computed/manual decentration (mm)
}

export interface LensData {
  sphere: number;            // dioptres (D)
  cylinder: number;          // dioptres (D)
  axis: number;              // 0–180°
  addition: number;          // dioptres (D)
  index: RefractiveIndex;
  material: LensMaterial;
  diameter: number;          // (mm)
  minCenterThickness: number; // (mm)
  minEdgeThickness: number;   // (mm)
  type: LensType;
}

export interface ThicknessResult {
  centerThickness: number;        // (mm)
  edgeThickness: number;          // (mm)
  finalEdgeThickness: number;     // after edging (mm)
  finalCenterThickness: number;   // after edging (mm)
  baseCurve: number;              // (D)
  weight: number;                 // estimated weight (g)
  warnings: Warning[];
  optimalIndex: RefractiveIndex;
  comparison: IndexComparison[];
}

export interface IndexComparison {
  index: RefractiveIndex;
  centerThickness: number;
  edgeThickness: number;
  weight: number;
}

export type WarningSeverity = 'info' | 'warning' | 'error';

export interface Warning {
  severity: WarningSeverity;
  code: string;
  message: string;
}

export interface MaterialSpec {
  name: LensMaterial;
  index: RefractiveIndex;
  density: number;       // g/cm³
  abbe: number;          // V-number (chromatic dispersion)
  impactRating: 'standard' | 'high' | 'extreme';
}
