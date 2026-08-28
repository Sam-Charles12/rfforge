/**
 * RFForge — Module C validation harness (PRD VR-3, SC-2).
 *
 * Validates the pure frequency-scaling functions against verifiable
 * mathematical identities and physical asymptotics of the fixed-network
 * loss model (self-resonant inductor + ABCD transducer-gain cascade).
 *
 * Properties checked (each independently derivable from the model equations):
 *   1. Lossless limit:  as inductor Q -> inf and Cp -> 0, insertion loss at the
 *      design frequency -> 0 dB (G_T -> 1 for a lossless matched network).
 *   2. Self-resonance identity:  SRF = 1/(2pi*sqrt(L*Cp)); the effective
 *      inductor Q -> 0 and effective inductance -> 0 as f -> SRF from below.
 *   3. Q shape:  effective Q rises toward SRF thern collapses to ~0 at SRF
 *      (the canonical "Q vs frequency" self-resonant curve, Coilcraft-style).
 *   4. Degradation trend (SC-2):  insertion loss grows as frequency scales
 *      upward from the low-gigahertz design point toward sub-THz.
 *   5. Determinism:  standalone analyze matches the engine's swept point.
 *
 * Run: npm run validate:fscale
 */
import { calculateMatch } from "../lib/match"
import { calculateScale, type ScaleParams } from "../lib/fscale"
import { analyze, buildElements, dominantSRF, type MatchNetwork } from "../lib/fscale/math"

let failures = 0

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`)
}

const base: ScaleParams = {
  zLoad: { re: 200, im: 0 },
  z0: 50,
  topology: "pi",
  q: 10,
  branch: "lp",
  f0: 10e9,
  cp: 0.1e-12,
  inductorQ: 100,
  capQ: 200,
  fmin: 1e9,
  fmax: 140e9,
  steps: 401,
}

console.log("--- Module C: Frequency Scaling / Loss Visualizer ---")

// ---- 1. Lossless limit at design frequency ----
const ideals = calculateScale({ ...base, cp: 0, inductorQ: 1e9, capQ: 1e9, fmin: base.f0, fmax: base.f0, steps: 1 })
const ilIdeal = ideals.points[0]?.ilDb ?? Infinity
console.log(`lossless IL @ f0 = ${ilIdeal.toFixed(5)} dB`)
check("lossless network -> IL ≈ 0 dB at design f0", ilIdeal < 0.05, `IL=${ilIdeal.toFixed(4)} dB`)

// ---- 2 & 3. SRF identity + Q collapse on the dominant inductor ----
// Rebuild the network object directly so we can independently compute SRF.
const match = calculateMatch({
  zSource: { re: base.z0, im: 0 },
  zLoad: base.zLoad,
  z0: base.z0,
  f: base.f0,
  topology: base.topology,
  q: base.q,
})
if (!match.realizable) {
  console.log("FAIL  test network not realizable")
  process.exit(1)
}
const net: MatchNetwork = {
  topology: "pi",
  elems: match.piT!.lp!,
}
const need = Array.from(new Set(buildElements(net).map((e) => `${e.type}${e.kind}`)))
const L = buildElements(net).filter((e) => e.type === "L").reduce((a, b) => (a.value >= b.value ? a : b)).value
const Cp = base.cp
const srf = 1 / (2 * Math.PI * Math.sqrt(L * Cp))
const srfCalc = dominantSRF(net, Cp)
check("dominant-SRF helper == 1/(2pi sqrt(LCp))", Math.abs(srfCalc - srf) / srf < 1e-9, `SRF=${(srf / 1e9).toFixed(2)} GHz, L=${(L * 1e9).toFixed(2)} nH, Cp=${(Cp * 1e12).toFixed(2)} pF`)

// Probe Q just below SRF and AT SRF.
const probeLow = analyze({ network: net, f0: base.f0, z0: base.z0, rl: base.zLoad.re, cp: Cp, inductorQ: base.inductorQ, capQ: base.capQ }, 0.9 * 2 * Math.PI * srf)
const probeSrf = analyze({ network: net, f0: base.f0, z0: base.z0, rl: base.zLoad.re, cp: Cp, inductorQ: base.inductorQ, capQ: base.capQ }, 2 * Math.PI * srf)
console.log(`Q @ 0.9*SRF = ${probeLow.inductorQ.toFixed(1)}, Q @ SRF = ${probeSrf.inductorQ.toFixed(4)}, Leff @ SRF = ${(probeSrf.effectiveL * 1e12).toFixed(2)} pH`)
check("inductor Q collapses to ~0 at SRF", probeSrf.inductorQ < 1.0, `Q_SRF=${probeSrf.inductorQ.toFixed(3)}`)
check("effective inductance -> 0 at SRF", Math.abs(probeSrf.effectiveL) < 1e-9, `Leff_SRF=${(probeSrf.effectiveL * 1e12).toFixed(2)} pH`)
check("Q rises toward SRF then collapses (0.9*SRF > SRF Q)", probeLow.inductorQ > probeSrf.inductorQ, `Q(0.9SRF)=${probeLow.inductorQ.toFixed(1)} > Q(SRF)=${probeSrf.inductorQ.toFixed(3)}`)

// ---- 4. Degradation trend (SC-2): IL grows from sub-6 up to sub-THz ----
const sweep = calculateScale(base)
const startIl = sweep.points[0]?.ilDb ?? 0
const endIl = sweep.points[sweep.points.length - 1]?.ilDb ?? 0
console.log(`IL @ fmin=${(sweep.points[0]?.fHz ?? 0) / 1e9}GHz = ${startIl.toFixed(2)} dB · IL @ fmax=${(sweep.points[sweep.points.length - 1]?.fHz ?? 0) / 1e9}GHz = ${endIl.toFixed(2)} dB`)
check("insertion loss increases from sub-6 to sub-THz (SC-2)", endIl > startIl + 0.5, `${startIl.toFixed(2)} -> ${endIl.toFixed(2)} dB`)
check("IL remains physical (>= 0 dB)", endIl >= 0)

// SRF should land inside the swept band so the degradation narrative is visible.
console.log(`dominant SRF = ${(srf / 1e9).toFixed(2)} GHz (inside 1-140 GHz sweep)`)
check("SRF lies within the default sweep band", srf >= base.fmin && srf <= base.fmax, `${(srf / 1e9).toFixed(1)} GHz`)

// ---- 5. Determinism: standalone analyze matches swept point ----
const mid = sweep.points[Math.floor(sweep.points.length / 2)]
const midW = 2 * Math.PI * mid.fHz
const a = analyze({ network: net, f0: base.f0, z0: base.z0, rl: base.zLoad.re, cp: Cp, inductorQ: base.inductorQ, capQ: base.capQ }, midW)
check("engine IL == standalone analyze IL", Math.abs(a.ilDb - mid.ilDb) < 1e-9, `${a.ilDb.toFixed(4)} vs ${mid.ilDb.toFixed(4)}`)

console.log(`required elements: ${need.join(", ")}`)
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
