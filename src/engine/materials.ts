import type { MaterialSpec, RefractiveIndex, LensMaterial } from '@/types';

// =====================================================================
// Material reference data
// Density (g/cm³) and Abbe number from manufacturer datasheets.
// =====================================================================

export const MATERIALS: Record<LensMaterial, MaterialSpec> = {
  CR39:           { name: 'CR39',          index: 1.5,  density: 1.32, abbe: 58, impactRating: 'standard' },
  Polycarbonate:  { name: 'Polycarbonate', index: 1.59, density: 1.20, abbe: 30, impactRating: 'extreme' },
  MR7:            { name: 'MR7',           index: 1.67, density: 1.36, abbe: 32, impactRating: 'high' },
  MR8:            { name: 'MR8',           index: 1.6,  density: 1.30, abbe: 41, impactRating: 'high' },
};

export const AVAILABLE_INDICES: RefractiveIndex[] = [1.5, 1.56, 1.59, 1.6, 1.67, 1.74];

// Approximate density per index for non-listed materials.
// Used when computing index comparisons regardless of material.
export const DENSITY_BY_INDEX: Record<number, number> = {
  1.5: 1.32,
  1.56: 1.27,
  1.59: 1.20,
  1.6: 1.30,
  1.67: 1.36,
  1.74: 1.47,
};

// ----- Per-index Abbe numbers (chromatic dispersion) -----------------
// Lower Abbe → more chromatic dispersion → more visible rainbow on
// lens edges. Used by the 3D material to tune chromaticAberration.
export const ABBE_BY_INDEX: Record<number, number> = {
  1.5: 58,
  1.56: 36,
  1.59: 30,
  1.6: 41,
  1.67: 32,
  1.74: 33,
};

// ----- Per-index body-tint reference colour --------------------------
// Real ophthalmic substrates carry an almost imperceptible body
// tint. CR-39 has a very faint green, polycarbonate is essentially
// neutral, high-index 1.67/1.74 can show a slight warm cast.
// Values here are tuned for a believable transmission look — never
// strong enough to read as "tinted glass" on the simulator.
export const TINT_BY_INDEX: Record<number, string> = {
  1.5: '#f3fbf6',   // very faint green
  1.56: '#f5faff',  // very faint blue
  1.59: '#f8fbff',  // neutral
  1.6: '#f7fbff',   // neutral
  1.67: '#fefcf6',  // very faint warm
  1.74: '#fdf9f0',  // slightly more warm
};
