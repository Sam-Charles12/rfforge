/**
 * RFForge — Module C: Frequency Scaling & Loss Visualizer.
 *
 * Pure, independently testable calculation engine (PRD NFR-1, VR-3, SC-2).
 * Reuses Module A's solved matching network (FR "inherited from Module A"),
 * applies fixed parasitic capacitance/resistance (FR-C1) to the network's
 * inductors, sweeps frequency (FR-C2) and reports insertion loss (FR-C4),
 * inductor-Q degradation (FR-C5), effective-inductance detuning (FR-C3) and
 * self-resonant frequency.
 */
import {
  calculateMatch,
  type Complex,
  type LSolutionBranch,
  type MatchResult,
  type NetworkElements,
  type NetworkTopology,
} from "../match"
import { sweepScale, type MatchNetwork, type ScalePoint } from "./math"
export type { Complex, ScalePoint } from "./math"

export type BranchName = "lp" | "hp"

export interface ScaleParams {
  /** Complex load impedance (ohm). */
  zLoad: Complex
  /** Source / reference impedance (ohm). */
  z0: number
  /** Topology inherited from Module A. */
  topology: NetworkTopology
  /** Designer-loaded Q (Pi/T only). */
  q?: number
  /** User-requested branch (L, or LP/HP for Pi/T). */
  branch: BranchName
  /** Design frequency (Hz) at which Module A synthesizes the network. */
  f0: number
  /** Parasitic shunt capacitance per inductor (farads) — FR-C1. */
  cp: number
  /** Inductor design/low-frequency quality factor — FR-C1 (parasitic R). */
  inductorQ: number
  /** Capacitor quality factor (secondary loss term). */
  capQ: number
  /** Sweep start (Hz), >= 1 GHz (FR-C2). */
  fmin: number
  /** Sweep end (Hz), configurable up to 300 GHz (FR-C2). */
  fmax: number
  /** Number of sweep points. */
  steps: number
}

export interface ScaleResult {
  realizable: boolean
  reason?: string
  topology: NetworkTopology
  /** Swept points, log-spaced frequency. */
  points: ScalePoint[]
  /** Bypassed real impedance actually driven by the network (load R used). */
  rl: number
  /** Self-resonant frequency of the dominant inductor (Hz). */
  srfHz: number
  /** Peak insertion loss over the sweep (dB). */
  ilPeak: number
  /** Insertion loss at the end of the sweep (dB). */
  ilAtFmax: number
  /** Effective inductor Q at the end of the sweep. */
  qAtFmax: number
}

/**
 * Top-level Module C calculation: synthesize the network via Module A at f0,
 * then sweep frequency with parasitic Cp/Q applied.
 *
 * `branch` resolution:
 *   - topology "l"  -> always use the first (low-loss) branch.
 *   - Pi/T "lp"     -> use the low-pass prototype (series-arm inductor).
 *   - Pi/T "hp"     -> use the high-pass prototype.
 */
export function calculateScale(params: ScaleParams): ScaleResult {
  const { zLoad, z0, topology, q = 10, branch, f0, cp, inductorQ, capQ, fmin, fmax, steps } = params

  const match: MatchResult = calculateMatch({
    zSource: { re: z0, im: 0 },
    zLoad,
    z0,
    f: f0,
    topology,
    q: q > 0 ? q : 10,
  })

  if (!match.realizable) {
    return {
      realizable: false,
      reason: match.reason ?? "Matching network not realizable for these parameters",
      topology,
      points: [],
      rl: zLoad.re,
      srfHz: Infinity,
      ilPeak: 0,
      ilAtFmax: 0,
      qAtFmax: 0,
    }
  }

  // Resolve the physical limb set for the requested branch.
  let net: MatchNetwork
  if (topology === "l") {
    const lB = (match.lBranches ?? [])[0]
    if (!lB) {
      return { realizable: false, reason: "No L-branch solution", topology, points: [], rl: zLoad.re, srfHz: Infinity, ilPeak: 0, ilAtFmax: 0, qAtFmax: 0 }
    }
    net = { topology: "l", lBranch: lB, elems: emptyElems() }
  } else {
    const piT = match.piT
    const elems: NetworkElements | undefined = branch === "hp" ? piT?.hp : piT?.lp
    if (!elems) {
      return { realizable: false, reason: `No ${branch} branch solution`, topology, points: [], rl: zLoad.re, srfHz: Infinity, ilPeak: 0, ilAtFmax: 0, qAtFmax: 0 }
    }
    net = { topology, elems }
  }

  const rl = zLoad.re
  const network: MatchNetwork = { topology: net.topology, lBranch: net.lBranch, elems: net.elems }
  const points = sweepScale({ network, f0, z0, rl, cp, inductorQ, capQ }, fmin, fmax, steps)

  let srfHz = Infinity
  let ilPeak = 0
  let ilAtFmax = 0
  let qAtFmax = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (Number.isFinite(p.srfHz)) srfHz = Math.min(srfHz, p.srfHz)
    if (Number.isFinite(p.ilDb) && p.ilDb > ilPeak) ilPeak = p.ilDb
    if (i === points.length - 1) {
      ilAtFmax = p.ilDb
      qAtFmax = p.inductorQ
    }
  }

  return {
    realizable: true,
    topology,
    points,
    rl,
    srfHz: Number.isFinite(srfHz) ? srfHz : Infinity,
    ilPeak,
    ilAtFmax,
    qAtFmax,
  }
}

function emptyElems(): NetworkElements {
  return {
    leftShunt: { value: 0, type: "C", reactance: 0 },
    series: { value: 0, type: "L", reactance: 0 },
    rightShunt: { value: 0, type: "C", reactance: 0 },
  }
}

export type { LSolutionBranch, NetworkElements, NetworkTopology }
