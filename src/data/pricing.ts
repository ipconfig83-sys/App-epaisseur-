// =====================================================================
// PRESBYTA — Pricing model (placeholder)
// =====================================================================
// Real prices are negotiated per partner.  The figures here are
// indicative reference values used by the quotation panel.  All
// quotations include a clear "estimation" disclaimer and are subject
// to confirmation by the dispensing optician.
// =====================================================================

import type { PresbytaProduct } from './products';

export type Currency = 'MAD' | 'EUR' | 'USD';

/** Approximate exchange rates relative to MAD. Update via API in prod. */
const RATES_FROM_MAD: Record<Currency, number> = {
  MAD: 1,
  EUR: 0.092,
  USD: 0.10,
};

export function convertPrice(priceMAD: number, currency: Currency): number {
  return priceMAD * RATES_FROM_MAD[currency];
}

export function formatPrice(priceMAD: number, currency: Currency): string {
  const value = convertPrice(priceMAD, currency);
  const formatter = new Intl.NumberFormat(currency === 'MAD' ? 'fr-MA' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'MAD' ? 0 : 2,
  });
  return formatter.format(value);
}

interface QuoteAdjustments {
  progressiveSurcharge: number;     // ratio
  highIndexSurcharge: number;       // ratio for index ≥ 1.67
  rimlessMountingFee: number;       // flat MAD
}

const ADJ: QuoteAdjustments = {
  progressiveSurcharge: 0.0,        // already priced in
  highIndexSurcharge: 0.0,          // already priced in
  rimlessMountingFee: 80,           // MAD per pair for drilling
};

/**
 * Compute the displayed quote price (per pair) including adjustments.
 */
export function computeQuotePrice(
  product: PresbytaProduct,
  options: { rimless?: boolean } = {}
): number {
  let price = product.basePriceMAD;
  if (product.type === 'progressive') price *= 1 + ADJ.progressiveSurcharge;
  if (product.index >= 1.67) price *= 1 + ADJ.highIndexSurcharge;
  if (options.rimless) price += ADJ.rimlessMountingFee;
  return Math.round(price);
}
