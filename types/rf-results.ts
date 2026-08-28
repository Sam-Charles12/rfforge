/**
 * RFForge — Module D "public" result contract.
 *
 * This is the deliberate, stable shape that the AI explanation layer consumes.
 * It is intentionally decoupled from the internal calc result types
 * (MatchResult / PAResult / ScaleResult) so refinements to those engines never
 * force Module D to change. It carries ONLY the numeric/engineering values the
 * explanation may reference (FR-D1: numeric outputs only — never raw inputs).
 */
import type { MatchResult } from "@/lib/match"
import type { PAResult } from "@/lib/pa"
import type { ScaleResult } from "@/lib/fscale"

export type ResultSource = "A" | "B" | "C"

interface BaseResult {
  /** Which module produced this result. */
  source: ResultSource
  /** Whether the calculation produced a usable, realizable result. */
  realizable: boolean
}

/** Module A — impedance matching network. */
export interface MatchingResult extends BaseResult {
  source: "A"
  reason?: string
  topology: string
  /** Loaded/resulting network quality factor. */
  qFactor: number
  /** Approximate -3 dB bandwidth of the matched network, Hz. */
  bandwidthHz: number
  /** Matched reflection return loss, dB (higher is better). */
  matchedReturnLossDb: number
  /** Unmatched load return loss, dB. */
  loadReturnLossDb: number
}

/** Module B — PA performance. */
export interface PAResultSummary extends BaseResult {
  source: "B"
  gainDb: number
  pSatDbm: number
  p1dBInDbm: number
  p1dBOutDbm: number
  paePeakPct: number
  drainEffPeakPct: number
  drainLabel: string
}

/** Module C — frequency scaling & loss. */
export interface ScaleResultSummary extends BaseResult {
  source: "C"
  reason?: string
  topology: string
  /** Self-resonant frequency of the dominant inductor, GHz. */
  srfGHz: number
  /** Insertion loss at the end of the sweep, dB. */
  ilAtFmaxDb: number
  /** Peak insertion loss over the sweep, dB. */
  ilPeakDb: number
  /** Effective inductor Q at the end of the sweep. */
  qAtFmax: number
  /** Insertion loss rise across the sweep (il_fmax - il_fmin), dB. */
  ilRiseDb: number
}

export type RfResult = MatchingResult | PAResultSummary | ScaleResultSummary

/* ------------------------------------------------------------------------ */
/* Adapters — map internal calc results to the public contract.             */
/* ------------------------------------------------------------------------ */

/** Map a Module A result to its public shape. */
export function buildMatchingResult(m: MatchResult, fHz: number): MatchingResult {
  const qFactor =
    m.topology === "l"
      ? (m.lBranches?.[0]?.Q ?? 0)
      : m.piT?.Q ?? 0

  // Bandwidth: Pi/T carry it directly; single-L sections use loaded-Q approx.
  const bandwidthHz =
    m.topology === "l"
      ? fHz > 0 && qFactor > 0
        ? fHz / qFactor
        : 0
      : (m.piT?.bandwidth ?? 0)

  return {
    source: "A",
    realizable: !!m.realizable,
    reason: m.reason,
    topology: m.topology,
    qFactor,
    bandwidthHz,
    matchedReturnLossDb: m.matchedReflection.returnLossDb,
    loadReturnLossDb: m.loadReflection.returnLossDb,
  }
}

/** Map a Module B result to its public shape. */
export function buildPAResult(p: PAResult): PAResultSummary {
  return {
    source: "B",
    realizable: p.sweep.length > 0,
    gainDb: smallSignalGain(p),
    pSatDbm: p.pSatDbm,
    p1dBInDbm: p.p1dB.pInDbm,
    p1dBOutDbm: p.p1dB.pOutDbm,
    paePeakPct: p.paePeak,
    drainEffPeakPct: p.drainEfficiencyPeak,
    drainLabel: p.drainLabel,
  }
}

function smallSignalGain(p: PAResult): number {
  // Small-signal gain ≈ gain at the lowest drive point in the sweep.
  const first = p.sweep[0]
  return first ? first.gainDb : 0
}

/** Map a Module C result to its public shape. */
export function buildScaleResult(s: ScaleResult): ScaleResultSummary {
  const first = s.points[0]
  const ilAtFmin = first ? first.ilDb : 0
  return {
    source: "C",
    realizable: !!s.realizable,
    reason: s.reason,
    topology: s.topology,
    srfGHz: s.srfHz / 1e9,
    ilAtFmaxDb: s.ilAtFmax,
    ilPeakDb: s.ilPeak,
    qAtFmax: s.qAtFmax,
    ilRiseDb: s.ilAtFmax - ilAtFmin,
  }
}
