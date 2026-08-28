/**
 * Pure math + unit-conversion helpers for RFForge.
 * No React, no IO — independently testable (PRD NFR-1).
 */

export type DeviceType = "fet" | "bjt"

export const dBmToW = (dbm: number): number => 10 ** (dbm / 10) / 1000
export const wToDbm = (w: number): number => 10 * Math.log10(w * 1000)
export const linGainToDb = (lin: number): number => 10 * Math.log10(lin)
export const dbToLinGain = (db: number): number => 10 ** (db / 10)

/**
 * Rapp AM/AM compression model — output power in linear watts.
 * Standard solid-state PA behavioral model (cf. "Rapp model" literature &
 * MATLAB comm.MemorylessNonlinearity). Smoothness `p`:
 *   p ~ 1  -> class-A soft compression
 *   p ~ 2  -> class-AB
 *   p -> inf -> ideal hard limiter
 */
export function pOutRapp(pInW: number, gainLin: number, psatW: number, p: number): number {
  if (pInW <= 0) return 0
  const gIn = gainLin * pInW
  const norm = gIn / psatW
  return gIn / (1 + norm ** (2 * p)) ** (1 / (2 * p))
}
