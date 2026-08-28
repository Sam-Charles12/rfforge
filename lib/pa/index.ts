/**
 * RFForge — Module B: Power Amplifier Performance Calculator.
 *
 * Pure, independently testable calculation engine (PRD NFR-1, VR-2).
 * Model: Rapp AM/AM saturating compression for P_out vs P_in; PAE and
 * drain/collector efficiency from the standard DC power-balance definitions.
 */
import {
  dBmToW,
  dbToLinGain,
  linGainToDb,
  pOutRapp,
  wToDbm,
  type DeviceType,
} from "./math"
export type { DeviceType } from "./math"

export interface PASweepPoint {
  pInDbm: number
  pOutDbm: number
  gainDb: number
  pae: number
  drainEfficiency: number
}

export interface P1dBPoint {
  pInDbm: number
  pOutDbm: number
}

export interface PASweepParams {
  /** DC supply power, watts (FR-B1). */
  pDcW: number
  /** Small-signal power gain, dB (FR-B1). */
  gainDb: number
  /** Saturated output power, dBm (FR-B7). */
  psatDbm: number
  /** Input power sweep start, dBm (FR-B1). */
  pInStartDbm: number
  /** Input power sweep end, dBm (FR-B1). */
  pInEndDbm: number
  /** Number of sweep points (inclusive). */
  steps: number
  /** Rapp smoothness parameter (class-A ~1, class-AB ~2). */
  smoothness: number
  /** Device type — selects drain vs collector efficiency terminology. */
  deviceType: DeviceType
}

export interface PAResult {
  sweep: PASweepPoint[]
  p1dB: P1dBPoint
  pSatDbm: number
  pOutPeakDbm: number
  paePeak: number
  drainEfficiencyPeak: number
  drainLabel: string
}

/**
 * P_out for a single input level (FR-B2) — linear watts in, dBm out.
 */
export function calculatePout(pInW: number, gainDb: number, psatDbm: number, smoothness: number): number {
  const psatW = dBmToW(psatDbm)
  const gainLin = dbToLinGain(gainDb)
  return wToDbm(pOutRapp(pInW, gainLin, psatW, smoothness))
}

/**
 * Gain (dB) from an input/output power pair (FR-B3).
 */
export function calculateGain(pOutW: number, pInW: number): number {
  if (pInW <= 0) return 0
  return linGainToDb(pOutW / pInW)
}

/**
 * Power-Added Efficiency (%), FR-B5: PAE = (P_out - P_in)/P_DC.
 */
export function calculatePAE(pOutW: number, pInW: number, pDcW: number): number {
  if (pDcW <= 0) return 0
  return ((pOutW - pInW) / pDcW) * 100
}

/**
 * Drain (FET) / Collector (BJT) efficiency (%), FR-B6: eta = P_out/P_DC.
 */
export function calculateDrainEfficiency(pOutW: number, pDcW: number): number {
  if (pDcW <= 0) return 0
  return (pOutW / pDcW) * 100
}

/**
 * Full input-power sweep (FR-B2..B6). Returns one point per step.
 */
export function calculatePowerSweep(params: PASweepParams): PASweepPoint[] {
  const { pDcW, gainDb, psatDbm, pInStartDbm, pInEndDbm, steps, smoothness } = params
  const psatW = dBmToW(psatDbm)
  const gainLin = dbToLinGain(gainDb)
  const points: PASweepPoint[] = []

  for (let i = 0; i < steps; i++) {
    const frac = steps === 1 ? 0 : i / (steps - 1)
    const pInDbm = pInStartDbm + frac * (pInEndDbm - pInStartDbm)
    const pInW = dBmToW(pInDbm)
    const pOutW = pOutRapp(pInW, gainLin, psatW, smoothness)

    points.push({
      pInDbm,
      pOutDbm: wToDbm(pOutW),
      gainDb: calculateGain(pOutW, pInW),
      pae: calculatePAE(pOutW, pInW, pDcW),
      drainEfficiency: calculateDrainEfficiency(pOutW, pDcW),
    })
  }

  return points
}

/**
 * Locate the 1 dB compression point (FR-B4) by scanning the sweep for the
 * first input level at which gain has dropped >= 1 dB below small-signal
 * gain, then interpolating across the bracketing step for sub-step accuracy.
 */
export function calculateP1dB(sweep: PASweepPoint[], gainDb: number): P1dBPoint {
  const gSmall = gainDb
  const floor = gSmall - 1

  for (let i = 1; i < sweep.length; i++) {
    const prev = sweep[i - 1]
    const curr = sweep[i]
    if (prev.gainDb >= floor && curr.gainDb <= floor) {
      // linear interpolation in input power (and output power) domain
      const span = prev.gainDb - curr.gainDb
      const t = span === 0 ? 0 : (prev.gainDb - floor) / span
      const pIn = prev.pInDbm + t * (curr.pInDbm - prev.pInDbm)
      const pOut = prev.pOutDbm + t * (curr.pOutDbm - prev.pOutDbm)
      return { pInDbm: pIn, pOutDbm: pOut }
    }
  }

  // No compression reached within sweep range — clamp to last point.
  const last = sweep[sweep.length - 1]
  return { pInDbm: last.pInDbm, pOutDbm: last.pOutDbm }
}

/**
 * Top-level calculation for Module B — single call returns everything.
 */
export function calculatePA(params: PASweepParams): PAResult {
  const sweep = calculatePowerSweep(params)
  const p1dB = calculateP1dB(sweep, params.gainDb)

  let paePeak = -Infinity
  let drainEfficiencyPeak = -Infinity
  let pOutPeakDbm = -Infinity
  for (const pt of sweep) {
    if (pt.pae > paePeak) paePeak = pt.pae
    if (pt.drainEfficiency > drainEfficiencyPeak) drainEfficiencyPeak = pt.drainEfficiency
    if (pt.pOutDbm > pOutPeakDbm) pOutPeakDbm = pt.pOutDbm
  }

  const drainLabel = params.deviceType === "fet" ? "Drain" : "Collector"

  return {
    sweep,
    p1dB,
    pSatDbm: params.psatDbm,
    pOutPeakDbm,
    paePeak: Number.isFinite(paePeak) ? paePeak : 0,
    drainEfficiencyPeak: Number.isFinite(drainEfficiencyPeak) ? drainEfficiencyPeak : 0,
    drainLabel,
  }
}
