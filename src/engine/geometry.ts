// =====================================================================
// PRESBYTA — Pure geometric helpers
// =====================================================================
// Sagitta, surface radius, and per-meridian sagitta computation for
// sphero-cylindrical lenses.
//
// All linear quantities in mm, powers in dioptres (D).
// =====================================================================

/**
 * Spherical-cap sagitta:
 *   s = R − √(R² − y²)
 *
 * The classic ophthalmic formula.  Returns 0 for non-positive radius
 * or chord, and is clamped at the hemisphere when y → R.
 */
export function sagitta(R: number, y: number): number {
  if (R <= 0 || y <= 0) return 0;
  if (y >= R) return R; // safety clamp
  return R - Math.sqrt(R * R - y * y);
}

/**
 * Higher-order (4th-order) sagitta approximation used for thin
 * sections where the spherical formula loses precision near the optic
 * axis:
 *
 *   s ≈ y² / (2R) + y⁴ / (8R³)
 *
 * Useful as a fallback for very small chords.
 */
export function sagittaApprox(R: number, y: number): number {
  if (R <= 0) return 0;
  const y2 = y * y;
  return y2 / (2 * R) + (y2 * y2) / (8 * R * R * R);
}

/**
 * Surface radius from surface power:
 *   F = (n − n₀) / r          (r in metres, n₀ = 1 for air)
 *   r[mm] = 1000 · (n − 1) / F
 *
 * Zero/very small powers yield an essentially flat surface.
 */
export function radiusFromPower(power: number, index: number): number {
  if (Math.abs(power) < 1e-3) return 1e9;
  return (1000 * (index - 1)) / power;
}

/**
 * Power along a meridian θ (degrees) for a sphero-cylindrical lens.
 * Standard textbook formula (negative cyl convention):
 *
 *   F(θ) = sphere + cylinder · sin²(θ − axis)
 *
 * Examples:
 *   • At θ = axis            → F = sphere (flatter meridian)
 *   • At θ = axis + 90°      → F = sphere + cylinder (steepest)
 */
export function meridianPower(sphere: number, cylinder: number, axisDeg: number, theta: number): number {
  const a = ((theta - axisDeg) * Math.PI) / 180;
  return sphere + cylinder * Math.sin(a) * Math.sin(a);
}

/**
 * Spherical equivalent (used for many ANSI calculations and
 * decentration approximations):
 *   SE = sphere + cylinder/2
 */
export function sphericalEquivalent(sphere: number, cylinder: number): number {
  return sphere + cylinder / 2;
}
