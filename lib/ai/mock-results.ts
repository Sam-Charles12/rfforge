/**
 * RFForge — Module D mock data layer.
 *
 * Temporary hardcoded results matching the public contract (types/rf-results.ts).
 * Used as the fallback when a module hasn't published a live result yet, so the
 * AI layer always has realistic-sounding numbers to explain. These are
 * intentionally generous, physically-plausible engineering numbers.
 */
import type { MatchingResult, PAResultSummary, RfResult, ScaleResultSummary } from "@/types/rf-results"

const mockMatching: MatchingResult = {
  source: "A",
  realizable: true,
  topology: "pi",
  qFactor: 6,
  bandwidthHz: 150e6,
  matchedReturnLossDb: 40,
  loadReturnLossDb: 9.5,
}

const mockPA: PAResultSummary = {
  source: "B",
  realizable: true,
  gainDb: 20,
  pSatDbm: 30,
  p1dBInDbm: 8.8,
  p1dBOutDbm: 27.8,
  paePeakPct: 34.9,
  drainEffPeakPct: 50,
  drainLabel: "Drain",
}

const mockScale: ScaleResultSummary = {
  source: "C",
  realizable: true,
  topology: "pi",
  srfGHz: 32.7,
  ilAtFmaxDb: 68.2,
  ilPeakDb: 70,
  qAtFmax: 0.1,
  ilRiseDb: 62.5,
}

const MOCK_RESULTS: Record<"A" | "B" | "C", RfResult> = {
  A: mockMatching,
  B: mockPA,
  C: mockScale,
}

/** Return the mock result for a source, typed. */
export function getMockResult<T extends RfResult["source"]>(
  source: T
): Extract<RfResult, { source: T }> {
  return MOCK_RESULTS[source] as Extract<RfResult, { source: T }>
}

/** A high-PAE mock used to prove the fallback template is conditional. */
export const mockHighPAE: PAResultSummary = {
  source: "B",
  realizable: true,
  gainDb: 20,
  pSatDbm: 30,
  p1dBInDbm: 8.8,
  p1dBOutDbm: 27.8,
  paePeakPct: 55,
  drainEffPeakPct: 62,
  drainLabel: "Drain",
}
