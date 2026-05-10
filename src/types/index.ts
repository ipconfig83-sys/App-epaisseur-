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

export type AppMode = 'patient' | 'laboratory' | 'quotation' | 'validation';

export type Currency = 'MAD' | 'EUR' | 'USD';

export interface QuotationPreferences {
  progressive: boolean;
  blueBlock: boolean;
  photochromic: boolean;
  office: boolean;
}

export interface ValidationMeasurement {
  measuredCenterMm: number;
  measuredEdgeMm: number;
  batchNumber: string;
  technician: string;
  notes: string;
}

export interface CustomShape {
  /** Source filename. */
  name: string;
  /** Polygon points, mm coordinates centred on the lens optical centre. */
  points: [number, number][];
  /** Bounding-box width in mm. */
  aMm: number;
  /** Bounding-box height in mm. */
  bMm: number;
}

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

export interface MeridianResult {
  power: number;                 // (D)
  axis: number;                  // (°) the axis of this meridian
  frontPower: number;            // (D)
  backPower: number;             // (D)
  frontRadius: number;           // (mm)
  backRadius: number;            // (mm)
  frontSag: number;              // (mm)
  backSag: number;               // (mm)
  edgeThickness: number;         // (mm) at this meridian
}

export interface PrismThinning {
  applied: boolean;
  prismDiopters: number;        // Δ
  base: 'down' | 'up' | 'none';
  thicknessReductionMm: number; // (mm) reduction in worst edge/centre
  rationale: string;
}

export interface BlankAnalysis {
  minimumBlankSize: number;     // (mm)
  effectiveDecentrationH: number; // horizontal (mm)
  effectiveDecentrationV: number; // vertical (mm)
  totalDecentration: number;      // |vector| (mm)
  uncutDiameterUsed: number;      // (mm)
  cutDiameterWorstSide: number;   // (mm)
  fits: boolean;
}

export interface AnsiCheck {
  centerOk: boolean;
  edgeOk: boolean;
  ansiCenterMin: number;        // (mm)
  ansiEdgeMin: number;          // (mm)
  standard: 'Z80.1-dress' | 'Z87.1-impact';
}

export interface ThicknessResult {
  centerThickness: number;        // applied centre thickness after all rules (mm)
  edgeThickness: number;          // worst-meridian uncut edge thickness (mm)
  finalEdgeThickness: number;     // worst-meridian edge after edging (mm)
  finalCenterThickness: number;   // centre after edging + prism thinning (mm)
  edgeThicknessMin: number;       // best-meridian edge (thinnest side) (mm)
  edgeThicknessMax: number;       // worst-meridian edge (mm)

  baseCurve: number;              // recommended front (D)
  backCurve: number;              // computed back (D), worst meridian
  weight: number;                 // estimated weight (g)

  meridians: MeridianResult[];    // 2 entries (axis, perp)
  prismThinning: PrismThinning;
  blank: BlankAnalysis;
  ansi: AnsiCheck;

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
