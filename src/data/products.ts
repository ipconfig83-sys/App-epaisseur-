// =====================================================================
// PRESBYTA — Lens Product Catalogue
// =====================================================================
// Real PRESBYTA lens products available through Lunette 15 Minutes.
// Each product carries its index, base material, default coatings,
// price tier, and a recommendation profile used by the quotation
// engine.
// =====================================================================

import type { LensMaterial, LensType, RefractiveIndex } from '@/types';

export type ProductTier = 'essential' | 'standard' | 'premium' | 'signature';

export type ProductFeature =
  | 'shmc'             // Super Hydrophobic Multi-Coating
  | 'blue-block'
  | 'photochromic'
  | 'uv400'
  | 'anti-reflective'
  | 'progressive'
  | 'office'
  | 'thin'
  | 'ultra-thin'
  | 'impact';

export interface PresbytaProduct {
  /** Internal product code (printed on quotations). */
  code: string;
  /** Marketing name. */
  name: string;
  index: RefractiveIndex;
  material: LensMaterial;
  /** Default lens type — single-vision, progressive, office. */
  type: LensType;
  features: ProductFeature[];
  tier: ProductTier;
  /** Reference price per pair in MAD (Moroccan Dirham). */
  basePriceMAD: number;
  /** Short marketing one-liner shown to the patient. */
  shortDescription: string;
  /** Long commercial paragraph used in quotations. */
  longDescription: string;
}

export const PRESBYTA_CATALOG: PresbytaProduct[] = [
  {
    code: 'PSB-156-SHMC',
    name: 'PRESBYTA 1.56 SHMC',
    index: 1.56,
    material: 'CR39',
    type: 'single-vision',
    features: ['shmc', 'anti-reflective', 'uv400'],
    tier: 'standard',
    basePriceMAD: 350,
    shortDescription: 'Everyday lens with super-hydrophobic multi-coating.',
    longDescription:
      'PRESBYTA 1.56 SHMC is the everyday workhorse of the catalogue. The Super Hydrophobic Multi-Coating repels water, dust and fingerprints while the anti-reflective stack delivers crisp, glare-free vision. UV400 protection is included as standard.',
  },
  {
    code: 'PSB-156-BB',
    name: 'PRESBYTA 1.56 Blue Block',
    index: 1.56,
    material: 'CR39',
    type: 'single-vision',
    features: ['blue-block', 'shmc', 'anti-reflective', 'uv400'],
    tier: 'standard',
    basePriceMAD: 450,
    shortDescription: 'Filters harmful blue light from screens.',
    longDescription:
      'PRESBYTA 1.56 Blue Block selectively attenuates 415–455 nm blue light emitted by digital screens, reducing eye fatigue during prolonged screen use. Combined with the SHMC anti-reflective stack for clarity and durability.',
  },
  {
    code: 'PSB-156-PHOTO',
    name: 'PRESBYTA 1.56 Photochromic',
    index: 1.56,
    material: 'CR39',
    type: 'single-vision',
    features: ['photochromic', 'shmc', 'uv400'],
    tier: 'premium',
    basePriceMAD: 750,
    shortDescription: 'Adaptive tint that darkens outdoors.',
    longDescription:
      'PRESBYTA Photochromic lenses transition from clear indoors to a sun-tinted state outdoors in seconds, providing one pair for every situation. Full UV400 cut-off and SHMC coating.',
  },
  {
    code: 'PSB-160',
    name: 'PRESBYTA 1.60',
    index: 1.6,
    material: 'MR8',
    type: 'single-vision',
    features: ['thin', 'shmc', 'anti-reflective', 'uv400'],
    tier: 'premium',
    basePriceMAD: 650,
    shortDescription: 'Thinner, lighter mid-index lens.',
    longDescription:
      'PRESBYTA 1.60 reduces thickness and weight versus 1.56 by up to 20%, while preserving optical clarity through its MR-8 substrate. Recommended for moderate prescriptions and rimless mounts.',
  },
  {
    code: 'PSB-167',
    name: 'PRESBYTA 1.67',
    index: 1.67,
    material: 'MR7',
    type: 'single-vision',
    features: ['ultra-thin', 'shmc', 'anti-reflective', 'uv400'],
    tier: 'premium',
    basePriceMAD: 950,
    shortDescription: 'High-index lens for strong prescriptions.',
    longDescription:
      'PRESBYTA 1.67 delivers a high-index MR-7 substrate that significantly reduces edge thickness on stronger prescriptions (typically ≥ ±4.00 D). SHMC coating for premium cosmetics.',
  },
  {
    code: 'PSB-174',
    name: 'PRESBYTA 1.74',
    index: 1.74,
    material: 'MR7',
    type: 'single-vision',
    features: ['ultra-thin', 'shmc', 'anti-reflective', 'uv400'],
    tier: 'signature',
    basePriceMAD: 1450,
    shortDescription: 'Flagship ultra-thin lens for very high prescriptions.',
    longDescription:
      'PRESBYTA 1.74 is the flagship of the catalogue: the highest refractive index in the range, producing the thinnest, lightest finish for very strong prescriptions. Reserved for wearers seeking the slimmest possible lens profile.',
  },
  {
    code: 'PSB-PROG-160',
    name: 'PRESBYTA Progressive 1.60',
    index: 1.6,
    material: 'MR8',
    type: 'progressive',
    features: ['progressive', 'shmc', 'anti-reflective', 'uv400'],
    tier: 'premium',
    basePriceMAD: 1850,
    shortDescription: 'PRESBYTA progressive for presbyopia, in 1.60 index.',
    longDescription:
      'PRESBYTA Progressive 1.60 corrects presbyopia with a smooth corridor from distance to near, on a thin MR-8 substrate. Recommended for active wearers needing an all-day, all-distance solution.',
  },
  {
    code: 'PSB-OFFICE-156',
    name: 'PRESBYTA Office',
    index: 1.56,
    material: 'CR39',
    type: 'office',
    features: ['office', 'blue-block', 'shmc', 'anti-reflective', 'uv400'],
    tier: 'premium',
    basePriceMAD: 1250,
    shortDescription: 'Indoor lens for mid-distance work and screens.',
    longDescription:
      'PRESBYTA Office is engineered for indoor wearers: a wide intermediate zone for screens combined with a near zone for documents, plus integrated Blue Block protection. Ideal for professionals spending more than 4 h/day at a desk.',
  },
];

// =====================================================================
// Recommendation engine
// =====================================================================
// Given a prescription and frame, score every product and return the
// best match with rationale.
// =====================================================================

import type { LensData, FrameData } from '@/types';

interface RecommendationResult {
  product: PresbytaProduct;
  score: number;
  rationale: string[];
  alternatives: PresbytaProduct[];
}

export function recommendProduct(
  lens: LensData,
  frame: FrameData,
  preferences: { progressive?: boolean; blueBlock?: boolean; photochromic?: boolean; office?: boolean } = {}
): RecommendationResult {
  const seq = sphericalEquivalent(lens.sphere, lens.cylinder);
  const absSE = Math.abs(seq);

  const scored = PRESBYTA_CATALOG.map((p) => {
    let score = 50;
    const rationale: string[] = [];

    // Index match by power
    const idealIndex = idealIndexForPower(absSE);
    const indexDelta = Math.abs(p.index - idealIndex);
    score -= indexDelta * 30;
    if (indexDelta < 0.05) {
      rationale.push(`Optimal refractive index ${p.index} for SE ${seq.toFixed(2)} D.`);
    }

    // Lens type alignment
    if (preferences.progressive && p.type === 'progressive') {
      score += 25;
      rationale.push('Progressive lens for presbyopia correction.');
    }
    if (!preferences.progressive && p.type === 'progressive') score -= 30;

    if (preferences.office && p.type === 'office') {
      score += 25;
      rationale.push('Office lens optimised for indoor mid-distance use.');
    }
    if (!preferences.office && p.type === 'office') score -= 15;

    // Feature preferences
    if (preferences.blueBlock && p.features.includes('blue-block')) {
      score += 12;
      rationale.push('Blue Block filter requested.');
    }
    if (preferences.photochromic && p.features.includes('photochromic')) {
      score += 15;
      rationale.push('Photochromic adaptive tint requested.');
    }

    // Frame compatibility
    if (frame.type === 'rimless' && p.features.includes('ultra-thin') && p.material === 'MR7') {
      score -= 8;
      rationale.push('Note: high-index can be brittle for drilled rimless.');
    }
    if (frame.type === 'rimless' && p.material === 'Polycarbonate') {
      score += 8;
      rationale.push('Polycarbonate recommended for drilled rimless mounts.');
    }
    if (frame.type === 'semi-rimless' && Math.abs(lens.sphere) >= 4 && p.index >= 1.6) {
      score += 5;
      rationale.push('Higher index improves cosmetics on grooved frames.');
    }

    // Addition triggers progressive
    if (lens.addition >= 0.75 && p.type !== 'progressive' && p.type !== 'office') {
      score -= 10;
    }

    return { product: p, score, rationale };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  const alternatives = scored.slice(1, 4).map((s) => s.product);

  return {
    product: winner.product,
    score: Math.max(0, Math.min(100, winner.score)),
    rationale: winner.rationale.length ? winner.rationale : [
      'Best overall match across power, frame and patient profile.',
    ],
    alternatives,
  };
}

function sphericalEquivalent(sphere: number, cylinder: number) {
  return sphere + cylinder / 2;
}

/**
 * Returns the recommended refractive index purely from the
 * spherical equivalent magnitude:
 *   ≤ 2.00 D → 1.56
 *   ≤ 4.00 D → 1.60
 *   ≤ 6.00 D → 1.67
 *   >  6.00 D → 1.74
 */
export function idealIndexForPower(absSE: number): number {
  if (absSE <= 2) return 1.56;
  if (absSE <= 4) return 1.6;
  if (absSE <= 6) return 1.67;
  return 1.74;
}
