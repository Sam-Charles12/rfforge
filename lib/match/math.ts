/**
 * Pure math + unit helpers for RFForge Module A — Impedance Matching Network
 * Designer (L / Pi / T topologies).
 *
 * No React, no IO — independently testable (PRD NFR-1). Equations follow the
 * classic Q-method decomposition into virtual-resistance L-sections (Pozar;
 * Bowick, "RF Circuit Design"; C. Bowick Q-method literature).
 */

export interface Complex {
  re: number
  im: number
}

export type BranchName = "lp" | "hp"
export type ElementType = "L" | "C"

export const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
export const sub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im })
export const conjugate = (z: Complex): Complex => ({ re: z.re, im: -z.im })
export const mag = (z: Complex): number => Math.hypot(z.re, z.im)

/** Reciprocal (complex 1/z) — used to convert impedance <-> admittance. */
export const reciprocal = (z: Complex): Complex => {
  const d = z.re * z.re + z.im * z.im
  if (d === 0) return { re: Infinity, im: 0 }
  return { re: z.re / d, im: -z.im / d }
}

/**
 * Series element admittance for a shunt branch that, when added across an
 * impedance, changes its real part. Returns the required reactance.
 */

/**
 * Reflection coefficient Gamma = (Z_L - Z_0)/(Z_L + Z_0),
 * its magnitude, phase (deg) and return loss (dB).
 */
export function reflection(Zl: Complex, Z0: number): {
  mag: number
  phaseDeg: number
  returnLossDb: number
} {
  const num = sub(Zl, { re: Z0, im: 0 })
  const den = add(Zl, { re: Z0, im: 0 })
  const d = den.re * den.re + den.im * den.im
  const gz: Complex =
    d === 0
      ? { re: Infinity, im: Infinity }
      : {
          re: (num.re * den.re + num.im * den.im) / d,
          im: (num.im * den.re - num.re * den.im) / d,
        }
  const m = mag(gz)
  const phase = (Math.atan2(gz.im, gz.re) * 180) / Math.PI
  const rl = m === 0 ? Infinity : -20 * Math.log10(m)
  return { mag: m, phaseDeg: phase, returnLossDb: rl }
}

/** Convert a reactance (Ohms) to an absolute component value + type. */
export function componentFromReactance(X: number, f: number): { value: number; type: ElementType } {
  const w = 2 * Math.PI * f
  if (X >= 0) return { value: X / w, type: "L" }
  return { value: 1 / (w * -X), type: "C" }
}

/** Series model -> parallel model (Q-based transform). */
export function seriesToParallel(Rs: number, Xs: number): { Rp: number; Xp: number } {
  const q = Xs / Rs
  return { Rp: Rs * (1 + q * q), Xp: Xs * (1 + 1 / (q * q)) }
}

/** Parallel model -> series model (Q-based transform). */
export function parallelToSeries(Rp: number, Xp: number): { Rs: number; Xs: number } {
  const q = Math.abs(Rp / Xp)
  return { Rs: Rp / (1 + q * q), Xs: Xp * (1 / (1 + 1 / (q * q))) }
}

/* ------------------------------------------------------------------ *
 *  L-network (2 element)
 * ------------------------------------------------------------------ */

export interface LSolutionBranch {
  branch: BranchName
  /** shunt element adjacent to LOAD; series element adjacent to SOURCE */
  shunt: { value: number; type: ElementType; reactance: number }
  series: { value: number; type: ElementType; reactance: number }
  Q: number
  tunable: boolean
  /** Physical arrangement: which element sits at the load end. */
  layout: "shunt-load" | "series-load"
}

export interface LNetworkResult {
  realizable: boolean
  reason?: string
  branches: LSolutionBranch[]
  Q: number
  Qmin: number
}

/**
 * Two-element L-section matching complex load Z_L = R + jX to real source Z_0.
 *
 * Two physical shapes are considered:
 *   - "shunt-load"  (shunt across load, series to source)  — realizable when R > Z_0
 *   - "series-load" (series from load, shunt to source)      — realizable when R < Z_0
 *
 * For a given shape the required reactance is solved algebraically and both
 * low-pass / high-pass polarity branches (which element is L vs C) returned.
 */
export function lNetwork(Zl: Complex, Z0: number, f: number): LNetworkResult {
  const R = Zl.re
  const X = Zl.im

  const branches: LSolutionBranch[] = []

  // ---- Shape: shunt across load, series to source (realizable R > Z0) ----
  if (R > Z0) {
    const G = R / (R * R + X * X)
    const BL = -X / (R * R + X * X)
    const inner = G / Z0 - G * G
    if (inner > 0) {
      const BT = Math.sqrt(inner)
      for (const s of [1, -1]) {
        const bTot = s * BT
        const Bshunt = bTot - BL
        const Xseries = bTot * Z0 / G
        const shunt = componentFromReactance(-1 / Bshunt, f)
        const series = componentFromReactance(Xseries, f)
        branches.push({
          branch: shunt.type === "C" ? "lp" : "hp",
          shunt: { ...shunt, reactance: -1 / Bshunt },
          series: { ...series, reactance: Xseries },
          Q: Math.abs(Xseries / R),
          tunable: false,
          layout: "shunt-load",
        })
      }
    }
  }

  // ---- Shape: series from load, shunt to source (realizable R < Z0) ----
  if (R < Z0) {
    const inner = R * (Z0 - R)
    if (inner > 0) {
      const Xprime = Math.sqrt(inner)
      for (const s of [1, -1]) {
        const Xs1 = s * Xprime - X
        const Bshunt = s * Xprime / (R * Z0)
        const series = componentFromReactance(Xs1, f)
        const shunt = componentFromReactance(-1 / Bshunt, f)
        branches.push({
          branch: series.type === "L" ? "lp" : "hp",
          shunt: { ...shunt, reactance: -1 / Bshunt },
          series: { ...series, reactance: Xs1 },
          Q: Math.abs(Xs1 / R),
          tunable: false,
          layout: "series-load",
        })
      }
    }
  }

  if (branches.length === 0) {
    return { realizable: false, reason: "Load cannot be matched with a 2-element L-section", branches: [], Q: 0, Qmin: 0 }
  }

  // L-network Q is fixed by the resistance ratio (not designer-selectable).
  const Rmin = Math.min(R, Z0)
  const Rmax = Math.max(R, Z0)
  const Q = Math.sqrt(Rmax / Rmin - 1)
  return { realizable: true, branches, Q, Qmin: Q }
}

/* ------------------------------------------------------------------ *
 *  Pi network (3 element, series arm + two shunts)
 * ------------------------------------------------------------------ */

export interface NetworkElements {
  /** left shunt (adjacent source), series arm, right shunt (adjacent load) */
  leftShunt: { value: number; type: ElementType; reactance: number }
  series: { value: number; type: ElementType; reactance: number }
  rightShunt: { value: number; type: ElementType; reactance: number }
}

export interface PiTResult {
  realizable: boolean
  reason?: string
  /** low-pass (shunts = C, series = L) and high-pass (shunts = L, series = C) */
  lp?: NetworkElements
  hp?: NetworkElements
  Rv: number
  Q: number
  Qmin: number
  bandwidth: number
}

/**
 * Pi network matching REAL source R_s to REAL load R_l using a designer-chosen
 * loaded Q. Virtual resistor R_V = R_small/(Q^2+1) sits on the series arm.
 * Low-pass (default) is C-L-C; high-pass is L-C-L.
 */
export function piNetwork(Rs: number, Rl: number, Q: number, f: number): PiTResult {
  const Rmin = Math.min(Rs, Rl)
  const Rmax = Math.max(Rs, Rl)
  const Qmin = Math.sqrt(Rmax / Rmin - 1)
  const bandwidth = f / (2 * Q)

  if (Q <= Qmin) {
    return {
      realizable: false,
      reason: `Q=${Q.toFixed(3)} must exceed the single-L minimum ${Qmin.toFixed(3)} for Pi`,
      Rv: 0,
      Q,
      Qmin,
      bandwidth,
    }
  }

  const Rv = Rmin / (Q * Q + 1)
  if (Rv <= 0) return { realizable: false, reason: "Invalid virtual resistance", Rv, Q, Qmin, bandwidth }

  // source section: R_s -> R_V  (both > R_V)
  const Qs = Math.sqrt(Rs / Rv - 1)
  const Xs_s = Qs * Rv // series @ R_V end
  const Xps = Rs / Qs // shunt @ R_s end

  const Ql = Math.sqrt(Rl / Rv - 1)
  const Xs_l = Ql * Rv
  const Xpl = Rl / Ql

  const Xseries = Xs_s + Xs_l // combine on series arm

  // low-pass: shunts capacitive (-), series inductive (+)
  const lp: NetworkElements = {
    leftShunt: { ...componentFromReactance(-Xps, f), reactance: -Xps },
    series: { ...componentFromReactance(Xseries, f), reactance: Xseries },
    rightShunt: { ...componentFromReactance(-Xpl, f), reactance: -Xpl },
  }
  // high-pass: shunts inductive (+), series capacitive (-)
  const hp: NetworkElements = {
    leftShunt: { ...componentFromReactance(Xps, f), reactance: Xps },
    series: { ...componentFromReactance(-Xseries, f), reactance: -Xseries },
    rightShunt: { ...componentFromReactance(Xpl, f), reactance: Xpl },
  }

  return { realizable: true, lp, hp, Rv, Q, Qmin, bandwidth }
}

/* ------------------------------------------------------------------ *
 *  T network (3 element, two series arms + one junction shunt)
 * ------------------------------------------------------------------ */

/**
 * T network matching REAL source R_s to REAL load R_l with designer-chosen Q.
 * Virtual resistor R_V = (Q^2+1)*R_small sits at the junction node.
 * Low-pass (default) is L-C-L; high-pass is C-L-C.
 */
export function tNetwork(Rs: number, Rl: number, Q: number, f: number): PiTResult {
  const Rmin = Math.min(Rs, Rl)
  const Rmax = Math.max(Rs, Rl)
  const Qmin = Math.sqrt(Rmax / Rmin - 1)
  const bandwidth = f / (2 * Q)

  if (Q <= Qmin) {
    return {
      realizable: false,
      reason: `Q=${Q.toFixed(3)} must exceed the single-L minimum ${Qmin.toFixed(3)} for T`,
      Rv: 0,
      Q,
      Qmin,
      bandwidth,
    }
  }

  const Rv = (Q * Q + 1) * Rmin
  if (Rv <= Rmax) {
    return {
      realizable: false,
      reason: "Virtual resistance too small for T topology",
      Rv,
      Q,
      Qmin,
      bandwidth,
    }
  }

  // small side matched with the chosen Q; large side gets its own Q
  const Qsmall = Q
  const Qlarge = Math.sqrt(Rv / Rmax - 1)

  // series arm on small-R end:  X = Q_small * R_small
  // series arm on large-R end:  X = Q_large * R_large
  // junction shunt: resonate the parallel combination of the two section shunts
  let XsSmall: number
  let XsLarge: number
  let XshuntSmall: number
  let XshuntLarge: number
  if (Rs < Rl) {
    XsSmall = Qsmall * Rs
    XsLarge = Qlarge * Rl
    XshuntSmall = Rv / Qsmall
    XshuntLarge = Rv / Qlarge
  } else {
    XsSmall = Qsmall * Rl
    XsLarge = Qlarge * Rs
    XshuntSmall = Rv / Qsmall
    XshuntLarge = Rv / Qlarge
  }
  const Xshunt = -1 / (1 / XshuntSmall + 1 / XshuntLarge)

  // low-pass: T series arms inductive (+), junction shunt capacitive (-)
  // left series adjacent source, right series adjacent load
  const leftSeries = componentFromReactance(XsLarge, f)
  const rightSeries = componentFromReactance(XsSmall, f)
  const shunt = componentFromReactance(Xshunt, f)

  const lp: NetworkElements = {
    leftShunt: { ...shunt, reactance: Xshunt },
    series: { ...leftSeries, reactance: XsLarge },
    rightShunt: { ...rightSeries, reactance: XsSmall },
  }

  const hp: NetworkElements = {
    leftShunt: { ...componentFromReactance(Xshunt > 0 ? -Math.abs(Xshunt) : Math.abs(Xshunt), f), reactance: Xshunt > 0 ? -Xshunt : Xshunt },
    series: { ...componentFromReactance(-XsLarge, f), reactance: -XsLarge },
    rightShunt: { ...componentFromReactance(-XsSmall, f), reactance: -XsSmall },
  }

  return { realizable: true, lp, hp, Rv, Q, Qmin, bandwidth }
}

/**
 * Input impedance of an assembled 2-element L-section (shunt across load,
 * series toward source), terminated by Zl. Round-trip validation.
 */
/**
 * Input impedance of an assembled 2-element L-section terminated by Zl,
 * looking from the source end. Round-trip validation.
 *   shunt-load:  source -> series -> shunt -> load  (compute load->shunt->series)
 *   series-load: source -> shunt -> series -> load  (compute load->series->shunt)
 */
export function lNetworkInputZ(
  layout: "shunt-load" | "series-load",
  shunt: { reactance: number },
  series: { reactance: number },
  Zl: Complex
): Complex {
  const shuntAdd = (z: Complex) =>
    reciprocal(add(reciprocal(z), { re: 0, im: -1 / shunt.reactance }))
  const seriesAdd = (z: Complex) => add(z, { re: 0, im: series.reactance })
  return layout === "shunt-load"
    ? seriesAdd(shuntAdd(Zl))
    : shuntAdd(seriesAdd(Zl))
}

/**
 * Compute the input impedance of an assembled 3-element network looking from
 * the source end, terminated by Zl. Used for round-trip validation.
 */
export function networkInputZ(
  topology: "pi" | "t",
  elems: NetworkElements,
  Zl: Complex
): Complex {
  if (topology === "pi") {
    // source -> [leftShunt] -> [series] -> [rightShunt] -> load
    let z = Zl
    z = reciprocal(add(reciprocal(z), { re: 0, im: -1 / elems.rightShunt.reactance }))
    z = add(z, { re: 0, im: elems.series.reactance })
    z = reciprocal(add(reciprocal(z), { re: 0, im: -1 / elems.leftShunt.reactance }))
    return z
  }
  // t: source -> [series] -> [shunt || ] -> [rightShunt] -> load
  let z = Zl
  z = add(z, { re: 0, im: elems.rightShunt.reactance })
  z = reciprocal(add(reciprocal(z), { re: 0, im: -1 / elems.leftShunt.reactance }))
  return add(z, { re: 0, im: elems.series.reactance })
}
