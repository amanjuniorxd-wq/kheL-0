import "server-only";

/**
 * INR -> USD conversion for PayPal. Most Indian PayPal merchant accounts
 * can't settle in INR for cross-border payments, so every PayPal order is
 * placed in USD — this is the one place that number gets computed.
 *
 * Fetches a live rate from a free, keyless FX API and caches it in memory
 * for CACHE_MS so a burst of checkouts doesn't hit the rate API on every
 * request. If the fetch fails, falls back to the last good cached rate,
 * and if there's no cache yet, to PAYPAL_FALLBACK_INR_PER_USD (or a
 * conservative hardcoded default) — a rate-provider outage should degrade
 * to an approximate rate, never block a donation outright.
 */

const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours
const FALLBACK_INR_PER_USD = Number(process.env.PAYPAL_FALLBACK_INR_PER_USD ?? "88");

let cached: { rate: number; fetchedAt: number } | null = null;

async function fetchInrPerUsd(): Promise<number> {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", { cache: "no-store" });
  if (!res.ok) throw new Error(`FX rate fetch failed: ${res.status}`);
  const data = await res.json();
  const rate = data?.rates?.INR;
  if (!rate || typeof rate !== "number") throw new Error("FX response missing INR rate");
  return rate;
}

/** Returns how many rupees equal one US dollar right now (cached, with fallback). */
export async function getInrPerUsd(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.rate;
  }
  try {
    const rate = await fetchInrPerUsd();
    cached = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    if (cached) return cached.rate;
    return FALLBACK_INR_PER_USD;
  }
}

/**
 * Converts a ₹ amount to USD, rounded to PayPal's 2-decimal minimum unit
 * and floored at $0.01 so a tiny ₹ amount never rounds to a $0.00 order
 * (which PayPal rejects).
 */
export async function convertInrToUsd(amountInr: number): Promise<{ usd: number; inrPerUsd: number }> {
  const inrPerUsd = await getInrPerUsd();
  const usd = Math.round((amountInr / inrPerUsd) * 100) / 100;
  return { usd: Math.max(usd, 0.01), inrPerUsd };
}
