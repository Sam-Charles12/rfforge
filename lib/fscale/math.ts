/**
 * Pure math for RFForge Module C — Frequency Scaling & Loss Visualizer.
 *
 * No React, no IO — independently testable (PRD NFR-1). Models a matching
 * network (inherited from Module A) as a physical lumped-element cascade and
 * sweeps operating frequency to expose (a) dissipative + mismatch insertion
 * loss (FR-C4) and (b) effective-inductor-Q degradation driven by parasitic
 * shunt capacitance / self-resonance (FR-C5, FR-C3).
 *
 * Component models (standard RF literature, cf. Pozar Microwave Engineering;
 * Coilcraft "Understanding Q"; everythingRF adaptive-ABCD loss method):
 *   - Inductor (series loss R from low-f Q0, shunted by parasitic Cp):
 *         Z = 1 / ( 1/(R + jwL) + jwCp ),   R = w0*L/Q0
 *     -> parallel self-resonance at f_srf = 1/(2pi*sqrt(L*Cp)); effective
 *        series-equivalent Q and inductance follow from Z.
 *   - Capacitor (series loss Rc = |Xc0|/Qc):  Z = Rc - j/(wC).
 *
 * Network ABCD cascade + transducer gain G_T with real terminations Rs (source)
 * and Rl (load):
 *         G_T = 4*Rs*Rl / |A*Rl + B + Rs*(C*Rl + D)|^2,   IL = -10*log10(G_T)
 * By construction a lossless network (Q -> inf) at its design frequency gives
 * G_T -> 1, i.e. insertion loss -> 0 dB (validated in validate-fscale.ts).
 */

import type {
  ComponentValue,
  LSolutionBranch,
  NetworkElements,
  NetworkTopology,
} from "../match"

export interface Complex {
  re: number
  im: number
}

export const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
export const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
})
export const reciprocal = (z: Complex): Complex => {
  const d = z.re * z.re + z.im * z.im
  if (d === 0) return { re: Infinity, im: 0 }
  return { re: z.re / d, im: -z.im / d }
}
export const j = (x: number): Complex => ({ re: 0, im: x })

/** ABCD matrix of a two-port. */
export interface ABCD {
  a: Complex
  b: Complex
  c: Complex
  d: Complex
}

export const abcdSeries = (z: Complex): ABCD => ({ a: { re: 1, im: 0 }, b: z, c: { re: 0, im: 0 }, d: { re: 1, im: 0 } })
export const abcdShunt = (z: Complex): ABCD => ({ a: { re: 1, im: 0 }, b: { re: 0, im: 0 }, c: reciprocal(z), d: { re: 1, im: 0 } })

/** Cascade two ABCD matrices: M = M1 then M2 (port1 of M2 faces port2 of M1). */
export function abcdCascade(m1: ABCD, m2: ABCD): ABCD {
  return {
    a: add(mul(m1.a, m2.a), mul(m1.b, m2.c)),
    b: add(mul(m1.a, m2.b), mul(m1.b, m2.d)),
    c: add(mul(m1.c, m2.a), mul(m1.d, m2.c)),
    d: add(mul(m1.c, m2.b), mul(m1.d, m2.d)),
  }
}

/* ------------------------------------------------------------------ *
 *  Network building
 * ------------------------------------------------------------------ */

/** A fixed lumped element in the cascade, in source -> load order. */
export interface ScaleElement {
  kind: "series" | "shunt"
  type: "L" | "C"
  /** Fixed value: H for an inductor, F for a capacitor (from Module A). */
  value: number
}

/**
 * Build the source -> load element list for the chosen branch of a solved
 * matching network. Reuses Module A's solved component values.
 */
export function buildElements(network: MatchNetwork): ScaleElement[] {
  switch (network.topology) {
    case "l": {
      const b = network.lBranch
      if (!b) return []
      if (b.layout === "shunt-load") {
        return [limb("series", b.series), limb("shunt", b.shunt)]
      }
      return [limb("shunt", b.shunt), limb("series", b.series)]
    }
    case "pi": {
      const e = network.elems
      return [limb("shunt", e.leftShunt), limb("series", e.series), limb("shunt", e.rightShunt)]
    }
    case "t": {
      const e = network.elems
      return [limb("series", e.series), limb("shunt", e.leftShunt), limb("series", e.rightShunt)]
    }
  }
}

function limb(kind: "series" | "shunt", c: ComponentValue): ScaleElement {
  return { kind, type: c.type, value: c.value }
}

/* ------------------------------------------------------------------ *
 *  Element impedance / admittance models
 * ------------------------------------------------------------------ */

/**
 * Impedance of a single reactive limb (between its node and the opposite
 * reference point) at angular frequency w, for an element designed at w0.
 *   - Inductor: (R + jwL) shunted by parasitic Cp  -> self-resonant
 *   - Capacitor: series loss Rc + ideal C
 */
function limbImpedance(el: ScaleElement, w: number, w0: number, cp: number, inductorQ: number, capQ: number): Complex {
  if (el.type === "L") {
    const L = el.value
    if (L <= 0) return { re: 0, im: 0 }
    const R = (w0 * L) / (inductorQ > 0 ? inductorQ : 1)
    const zbulk = add({ re: R, im: w * L }, { re: 0, im: 0 })
    const ybulk = reciprocal(zbulk)
    const ypar = add(ybulk, j(w * cp)) // parasitic shunt admittance
    return reciprocal(ypar)
  }
  // capacitor
  const C = el.value
  if (C <= 0) return { re: 0, im: 0 }
  const Rc = 1 / (w0 * C * (capQ > 0 ? capQ : 1))
  return { re: Rc, im: -1 / (w * C) }
}

/** ABCD of a single element at frequency w. */
function elementABCD(el: ScaleElement, w: number, w0: number, cp: number, inductorQ: number, capQ: number): ABCD {
  const z = limbImpedance(el, w, w0, cp, inductorQ, capQ)
  return el.kind === "series" ? abcdSeries(z) : abcdShunt(z)
}

/* ------------------------------------------------------------------ *
 *  Cascade analysis
 * ------------------------------------------------------------------ */

export interface ScaleSweepParams {
  /** Solved matching network components + design point. */
  network: MatchNetwork
  /** Design frequency, Hz (components synthesized at this f0). */
  f0: number
  /** Source reference impedance, ohm. */
  z0: number
  /** Load resistance the network matches, ohm. */
  rl: number
  /** Parasitic shunt capacitance per inductor, F (FR-C1). */
  cp: number
  /** Inductor design/low-f quality factor (FR-C1 parasitic resistance). */
  inductorQ: number
  /** Capacitor quality factor (fixed internally, loss is secondary). */
  capQ: number
}

export interface MatchNetwork {
  topology: NetworkTopology
  lBranch?: LSolutionBranch
  elems: NetworkElements
}

/** One frequency point output of the sweep. */
export interface ScalePoint {
  fHz: number
  /** Insertion loss, dB (>= 0). */
  ilDb: number
  /** Input return loss of the loaded network, dB (mismatch/detuning). */
  returnLossDb: number
  /** Effective series-equivalent Q of the dominant inductor. */
  inductorQ: number
  /** Effective series-equivalent inductance of the dominant inductor, H. */
  effectiveL: number
  /** SRF of the dominant inductor, Hz. */
  srfHz: number
}

/**
 * Analyze a fixed designed network at a single frequency w. Returns IL,
 * return loss, and the dominant-inductor Q/Leff/SRF.
 */
export function analyze(
  params: ScaleSweepParams,
  w: number
): { ilDb: number; returnLossDb: number; inductorQ: number; effectiveL: number; srfHz: number } {
  const { network, f0, z0, rl, cp, inductorQ, capQ } = params
  const elements = buildElements(network)

  let m: ABCD = { a: { re: 1, im: 0 }, b: { re: 0, im: 0 }, c: { re: 0, im: 0 }, d: { re: 1, im: 0 } }
  for (const el of elements) {
    m = abcdCascade(m, elementABCD(el, w, 2 * Math.PI * f0, cp, inductorQ, capQ))
  }

  // Transducer gain with real source Rs = z0, real load Rl = rl.
  const t1 = mul(m.a, { re: rl, im: 0 })
  const t2 = add(t1, m.b)
  const t3 = mul(m.c, { re: rl, im: 0 })
  const t4 = add(t3, m.d)
  const t5 = mul({ re: z0, im: 0 }, t4)
  const den = add(t2, t5)
  const denSq = den.re * den.re + den.im * den.im
  const gt = denSq > 0 ? (4 * z0 * rl) / denSq : 0
  const ilDb = gt > 0 ? Math.max(0, -10 * Math.log10(gt)) : Infinity

  // Input impedance + return loss (source referenced to z0).
  const zi = inputImpedance(m, rl)
  const gamma = reflect(zi, z0).mag
  const returnLossDb = gamma === 0 ? Infinity : -20 * Math.log10(gamma)

  const { q, leff, srf } = dominantInductor(network, f0, cp, inductorQ, w)

  return { ilDb, returnLossDb, inductorQ: q, effectiveL: leff, srfHz: srf }
}

/** Input impedance looking into port1 (source side) of an ABCD terminated by Rl. */
function inputImpedance(m: ABCD, rl: number): Complex {
  const zl = { re: rl, im: 0 }
  const num = add(mul(m.a, zl), m.b)
  const den = add(mul(m.c, zl), m.d)
  return mul(num, reciprocal(den))
}

function reflect(Zl: Complex, z0: number): { mag: number } {
  const num = { re: Zl.re - z0, im: Zl.im }
  const den = { re: Zl.re + z0, im: Zl.im }
  const d = den.re * den.re + den.im * den.im
  if (d === 0) return { mag: 1 }
  const g = {
    re: (num.re * den.re + num.im * den.im) / d,
    im: (num.im * den.re - num.re * den.im) / d,
  }
  return { mag: Math.hypot(g.re, g.im) }
}

/**
 * Determine the dominant (largest) inductor in the network and evaluate its
 * effective series-equivalent Q, effective inductance, and self-resonant
 * frequency at angular w.
 */
function dominantInductor(
  network: MatchNetwork,
  f0: number,
  cp: number,
  q0: number,
  w: number
): { q: number; leff: number; srf: number } {
  const elements = buildElements(network).filter((e) => e.type === "L")
  if (elements.length === 0) return { q: 0, leff: 0, srf: Infinity }
  const main = elements.reduce((a, b) => (a.value >= b.value ? a : b))
  const L = main.value
  const R = (2 * Math.PI * f0 * L) / (q0 > 0 ? q0 : 1)
  const zbulk = { re: R, im: w * L }
  const zpar = reciprocal(add(reciprocal(zbulk), j(w * cp))) // self-resonant inductor impedance
  const xse = zpar.im
  const rse = zpar.re
  const q = rse > 0 ? Math.abs(xse / rse) : 0
  const leff = w > 0 ? xse / w : 0
  const srf = cp > 0 ? 1 / (2 * Math.PI * Math.sqrt(L * cp)) : Infinity
  return { q, leff, srf }
}

/**
 * Self-resonant frequency (Hz) of the dominant (largest) inductor in the
 * network given parasitic capacitance cp — the classic series-R + shunt-Cp model.
 */
export function dominantSRF(network: MatchNetwork, cp: number): number {
  const elements = buildElements(network).filter((e) => e.type === "L")
  if (elements.length === 0) return Infinity
  const L = elements.reduce((a, b) => (a.value >= b.value ? a : b)).value
  return cp > 0 ? 1 / (2 * Math.PI * Math.sqrt(L * cp)) : Infinity
}

/**
 * Run the frequency sweep across [fmin, fmax] Hz with `steps` points,
 * logarithmically spaced.
 */
export function sweepScale(params: ScaleSweepParams, fmin: number, fmax: number, steps: number): ScalePoint[] {
  const pts: ScalePoint[] = []
  const srf = dominantInductor(params.network, params.f0, params.cp, params.inductorQ, 2 * Math.PI * params.f0).srf
  for (let i = 0; i < steps; i++) {
    const frac = steps === 1 ? 0 : i / (steps - 1)
    const f = fmin * (fmax / fmin) ** frac
    const w = 2 * Math.PI * f
    const a = analyze(params, w)
    pts.push({ fHz: f, ilDb: a.ilDb, returnLossDb: a.returnLossDb, inductorQ: a.inductorQ, effectiveL: a.effectiveL, srfHz: srf })
  }
  return pts
}
