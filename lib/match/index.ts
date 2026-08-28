/**
 * RFForge — Module A: Impedance Matching Network Designer.
 *
 * Pure, independently testable calculation engine (PRD NFR-1, VR-1) for
 * L / Pi / T matching networks. Returns component values, quality factor,
 * reflection coefficient and network bandwidth for a source/load pair.
 */
import {
  componentFromReactance,
  lNetwork,
  lNetworkInputZ,
  networkInputZ,
  parallelToSeries,
  piNetwork,
  reflection,
  seriesToParallel,
  tNetwork,
  type Complex,
  type ElementType,
  type LSolutionBranch,
  type NetworkElements,
  type PiTResult,
} from "./math"

export type {
  BranchName,
  Complex,
  ElementType,
  LNetworkResult,
  LSolutionBranch,
  NetworkElements,
  PiTResult,
} from "./math"

export type NetworkTopology = "l" | "pi" | "t"

export interface MatchParams {
  zSource: Complex
  zLoad: Complex
  /** Reference impedance, ohms (typically 50). */
  z0: number
  /** Design frequency, Hz. */
  f: number
  /** Network topology. */
  topology: NetworkTopology
  /** Designer-chosen loaded Q (Pi/T only, must exceed the single-L minimum). */
  q?: number
}

export interface ComponentValue {
  value: number
  type: ElementType
  reactance: number
}

export interface MatchResult {
  realizable: boolean
  reason?: string
  topology: NetworkTopology
  /** Reflection at the (unmatched) load, before the network. */
  loadReflection: { mag: number; phaseDeg: number; returnLossDb: number }
  /** Reflection looking into the matched network (ideally ~0). */
  matchedReflection: { mag: number; phaseDeg: number; returnLossDb: number }
  /** L-network: fixed-Q branches. */
  lBranches?: LSolutionBranch[]
  /** Pi/T: low-pass and high-pass alternatives. */
  piT?: {
    lp?: NetworkElements
    hp?: NetworkElements
    Rv: number
    Q: number
    Qmin: number
    bandwidth: number
  }
}

/**
 * Top-level Module A calculation. Pi absorbs complex terminations via their
 * parallel equivalents; T absorbs the load reactance. Each solved network is
 * verified by computing the real input impedance of the assembled circuit.
 */
export function calculateMatch(params: MatchParams): MatchResult {
  const { zSource, zLoad, z0, f, topology, q = 10 } = params
  const loadReflection = reflection(zLoad, z0)

  if (!Number.isFinite(f) || f <= 0 || z0 <= 0) {
    return {
      realizable: false,
      reason: "Invalid frequency or reference impedance",
      topology,
      loadReflection,
      matchedReflection: loadReflection,
    }
  }

  if (topology === "l") {
    const res = lNetwork(zLoad, z0, f)
    if (!res.realizable) {
      return { realizable: false, reason: res.reason, topology, loadReflection, matchedReflection: loadReflection }
    }
    const branch = res.branches[0]
    const zin = lNetworkInputZ(branch.layout, branch.shunt, branch.series, zLoad)
    const matchedReflection = reflection(zin, z0)
    return { realizable: true, topology, loadReflection, matchedReflection, lBranches: res.branches }
  }

  const Rs = zSource.re
  const Rl = zLoad.re

  // Absorb complex terminations: Pi converts series -> parallel models;
  // T absorbs the load reactance into its load-side series arm.
  let piRs = Rs
  let piRl = Rl
  if (topology === "pi") {
    if (zSource.im !== 0) piRs = seriesToParallel(Rs, zSource.im).Rp
    if (zLoad.im !== 0) piRl = seriesToParallel(Rl, zLoad.im).Rp
  }

  const res: PiTResult =
    topology === "pi" ? piNetwork(piRs, piRl, q, f) : tNetwork(Rs, Rl, q, f)

  if (!res.realizable) {
    return { realizable: false, reason: res.reason, topology, loadReflection, matchedReflection: loadReflection }
  }

  const sel = res.lp ?? res.hp!
  const loadZ: Complex =
    topology === "pi" ? { re: piRl, im: 0 } : { re: Rl, im: zLoad.im }

  // For the round-trip we need the EXACT reactance (with correct sign) of each
  // element; components store absolute reactances, so recompute from stored data.
  const zin = networkInputZ(topology, sel, loadZ)
  const matchedReflection = reflection(zin, z0)

  return {
    realizable: true,
    topology,
    loadReflection,
    matchedReflection,
    piT: { lp: res.lp, hp: res.hp, Rv: res.Rv, Q: res.Q, Qmin: res.Qmin, bandwidth: res.bandwidth },
  }
}

/** Smallest realizable Q for Pi/T at the given terminations. */
export function minimumNetworkQ(Rs: number, Rl: number): number {
  const rmin = Math.min(Rs, Rl)
  const rmax = Math.max(Rs, Rl)
  return rmin > 0 ? Math.sqrt(rmax / rmin - 1) : 0
}

/** Format a component value with the appropriate SI prefix + unit. */
export function formatComponent(value: number, type: ElementType): string {
  const base = type === "L" ? 1e-9 : 1e-12
  const unit = type === "L" ? "nH" : "pF"
  if (value < base) return `${(value / 1e-12).toFixed(3)}${type === "L" ? "µH" : "pF"}`
  const v = value / base
  const mag = v >= 1000 ? v / 1000 : v
  const u = v >= 1000 ? (type === "L" ? "µH" : "nF") : unit
  return `${mag.toFixed(mag < 10 ? 3 : mag < 100 ? 2 : 1)}${u}`
}

export { componentFromReactance, parallelToSeries }

/** A single reactive transform along the matching path. */
export interface PathStep {
  kind: "series" | "shunt"
  /** Signed reactance (ohm). Series: added in series. Shunt: across. */
  reactance: number
}

export interface PathPoint {
  /** Normalized reflection coefficient (Smith chart coords). */
  gamma: Complex
  /** Normalized impedance at this node. */
  z: Complex
  label?: string
}

function gammaOf(zn: Complex): Complex {
  // Gamma = (z - 1)/(z + 1) for normalized impedance z
  const num = { re: zn.re - 1, im: zn.im }
  const den = { re: zn.re + 1, im: zn.im }
  const d = den.re * den.re + den.im * den.im
  return { re: (num.re * den.re + num.im * den.im) / d, im: (num.im * den.re - num.re * den.im) / d }
}

/**
 * Build the ordered transform chain and walk it from the LOAD end (elements
 * nearest the load applied first) toward the source — the standard Smith-chart
 * matching-path convention. Starts at the load point, ends at the matched
 * center (normalized 1 + j0).
 */
export function matchingPath(
  topology: NetworkTopology,
  elems: NetworkElements | LSolutionBranch,
  z0: number,
  zLoadNorm: Complex
): PathPoint[] {
  const steps: PathStep[] = []

  if (topology === "l" && "layout" in elems) {
    const L = elems as LSolutionBranch
    if (L.layout === "shunt-load") {
      // load -> shunt -> series
      steps.push({ kind: "shunt", reactance: L.shunt.reactance })
      steps.push({ kind: "series", reactance: L.series.reactance })
    } else {
      // load -> series -> shunt
      steps.push({ kind: "series", reactance: L.series.reactance })
      steps.push({ kind: "shunt", reactance: L.shunt.reactance })
    }
  } else if (topology === "pi") {
    const P = elems as NetworkElements
    steps.push({ kind: "shunt", reactance: P.rightShunt.reactance })
    steps.push({ kind: "series", reactance: P.series.reactance })
    steps.push({ kind: "shunt", reactance: P.leftShunt.reactance })
  } else {
    // t: load -> seriesRight -> [shunt] -> seriesLeft -> source
    const T = elems as NetworkElements
    steps.push({ kind: "series", reactance: T.rightShunt.reactance })
    steps.push({ kind: "shunt", reactance: T.leftShunt.reactance })
    steps.push({ kind: "series", reactance: T.series.reactance })
  }

  const points: PathPoint[] = []
  let z = { re: zLoadNorm.re, im: zLoadNorm.im }
  points.push({ gamma: gammaOf(z), z, label: "Load" })

  for (const step of steps) {
    if (step.kind === "series") {
      z = { re: z.re, im: z.im + step.reactance / z0 }
    } else {
      const y = { re: z.re / (z.re * z.re + z.im * z.im), im: -z.im / (z.re * z.re + z.im * z.im) }
      // shunt branch of signed reactance X contributes admittance -j/X
      const yTot = { re: y.re, im: y.im - 1 / (step.reactance / z0) }
      const d = yTot.re * yTot.re + yTot.im * yTot.im
      z = { re: yTot.re / d, im: -yTot.im / d }
    }
    points.push({ gamma: gammaOf(z), z })
  }

  points[0] = { ...points[0], label: "Load" }
  points[points.length - 1] = { ...points[points.length - 1], label: "Src" }
  return points
}

