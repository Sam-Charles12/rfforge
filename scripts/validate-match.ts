/**
 * RFForge — Module A validation harness (PRD VR-1).
 *
 * Validates the pure matching-network functions against known closed-form
 * worked examples and internal round-trip identities.
 *
 *   L-network, real   : 100 -> 1700 ohm (Steer/LibreTexts 10.4) @900MHz
 *                       Q = 4, series L = 70.7nH, shunt C = 0.416pF
 *   L-network, real   : 50 -> 25 ohm (reverse direction), Q = 1
 *   L-network, complex: 200 - j100 -> 100 @500MHz (exact algebraic solution)
 *   Pi / T            : round-trip identity — the assembled network must
 *                       present the exact target impedance at f0 (|Gamma|->0)
 *
 * Run: npm run validate:match
 */
import { calculateMatch, minimumNetworkQ } from "../lib/match"
import { lNetwork } from "../lib/match/math"

let failures = 0
const rel = (v: number, e: number, r: number) => Math.abs(v - e) <= r * Math.abs(e)

function check(name: string, value: number, expected: number, tolerance: number): void {
  const ok = rel(value, expected, tolerance)
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got=${value.toFixed(5)} expected≈${expected.toFixed(5)}`)
}

function checkBool(name: string, value: boolean, expected: boolean): void {
  const ok = value === expected
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got=${value} expected=${expected}`)
}

/** Assert a return loss is better (larger) than `minDb`. */
function checkReturnLoss(name: string, rlDb: number, minDb: number): void {
  const ok = rlDb >= minDb
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got=${rlDb.toFixed(1)} dB (>= ${minDb} dB required)`)
}

// ------------------------------------------------------------------
// 1. L-network real higher load: 100 -> 1700 @900MHz
//    Q = sqrt(1700/100 - 1) = 4 ; Xs = Q*Z0 = 400 ; Xp = Rl/Q = 425
// ------------------------------------------------------------------
console.log("--- L-network: 100 -> 1700 ohm @900 MHz (Steer 10.4) ---")
const res1 = lNetwork({ re: 1700, im: 0 }, 100, 900e6)
checkBool("realizable", res1.realizable, true)
check("Q", res1.Q, 4, 0.001)
const br1 = res1.branches[0]
check("series reactance", Math.abs(br1.series.reactance), 400, 0.001)
check("shunt reactance", Math.abs(br1.shunt.reactance), 425, 0.001)
check("series L (nH)", br1.series.type === "L" ? br1.series.value : br1.series.value, 70.7e-9, 0.01)
check("series component = inductor", br1.series.type === "L" ? 1 : 0, 1, 0)
// assert correct component values
console.log(`  series: ${br1.series.value.toExponential(3)} H (${br1.series.type})`)
console.log(`  shunt:  ${br1.shunt.value.toExponential(3)} F (${br1.shunt.type})`)

// ------------------------------------------------------------------
// 2. L-network real lower load: 50 -> 25 ohm (reverse), Q = 1
//    Xs = Q*25 = 25 (series) ; Xp = 50/1 = 50 (shunt)
// ------------------------------------------------------------------
console.log("--- L-network: 50 -> 25 ohm (reverse direction) ---")
const res2 = lNetwork({ re: 25, im: 0 }, 50, 100e6)
checkBool("realizable", res2.realizable, true)
check("Q", res2.Q, 1, 0.001)
const br2 = res2.branches[0]
check("series reactance", Math.abs(br2.series.reactance), 25, 0.001)
check("shunt reactance", Math.abs(br2.shunt.reactance), 50, 0.001)

// ------------------------------------------------------------------
// 3. L-network complex load: 200 - j100 -> 100 @500MHz
//    Exact algebraic solution: shunt C (susceptance B_T-B_L) & series L.
// ------------------------------------------------------------------
console.log("--- L-network complex: 200 - j100 -> 100 @500 MHz ---")
const res3 = lNetwork({ re: 200, im: -100 }, 100, 500e6)
checkBool("realizable (shunt-load shape, R>Z0)", res3.realizable, true)
const br3 = res3.branches[0]
// series reactance = +122.47 ohm (inductor)  ; shunt susceptance = 0.002899 (cap)
check("series reactance (ohm)", br3.series.reactance, 122.47, 0.002)
check("series L (nH)", br3.series.type === "L" ? br3.series.value : NaN, 38.99e-9, 0.002)
check("shunt C (pF)", br3.shunt.type === "C" ? br3.shunt.value : NaN, 0.923e-12, 0.002)

// ------------------------------------------------------------------
// 4. Round-trip: assembled L network must present Z0 at f0
// ------------------------------------------------------------------
console.log("--- Round-trip identity: L network input impedance ---")
const resL = calculateMatch({ zSource: { re: 50, im: 0 }, zLoad: { re: 25, im: 0 }, z0: 50, f: 100e6, topology: "l" })
checkBool("L network realizable", resL.realizable, true)
checkReturnLoss("L matched return loss", resL.matchedReflection.returnLossDb, 40)

const resLc = calculateMatch({ zSource: { re: 100, im: 0 }, zLoad: { re: 200, im: -100 }, z0: 100, f: 500e6, topology: "l" })
checkBool("complex L realizable", resLc.realizable, true)
checkReturnLoss("complex L matched return loss", resLc.matchedReflection.returnLossDb, 40)

// ------------------------------------------------------------------
// 5. Pi network round-trip: 50 <-> 1700 cannot be matched (Q_min ~5.74),
//    so use 50 -> 500 with Q = 6.
// ------------------------------------------------------------------
console.log("--- Pi network: 50 -> 500 ohm, Q = 6 ---")
const resPi = calculateMatch({ zSource: { re: 50, im: 0 }, zLoad: { re: 500, im: 0 }, z0: 50, f: 1e9, topology: "pi", q: 6 })
checkBool("Pi realizable", resPi.realizable, true)
checkReturnLoss("Pi matched return loss", resPi.matchedReflection.returnLossDb, 40)
const dPi = resPi.piT
checkBool("has both branches", Boolean(dPi?.lp && dPi?.hp), true)
console.log(`  Rv = ${dPi?.Rv.toFixed(2)} ohm, Qmin = ${dPi?.Qmin.toFixed(3)}`)
console.log(`  bandwidth = ${(dPi?.bandwidth ?? 0) / 1e6} MHz`)

// ------------------------------------------------------------------
// 6. T network round-trip: 50 -> 2.1 ohm, Q = 10 (Analog Devices example)
//    Expected: series L ~ X=21 (small side), etc. Verify by round-trip.
// ------------------------------------------------------------------
console.log("--- T network: 50 -> 2.1 ohm, Q = 10 ---")
const resT = calculateMatch({ zSource: { re: 50, im: 0 }, zLoad: { re: 2.1, im: 0 }, z0: 50, f: 100e6, topology: "t", q: 10 })
checkBool("T realizable", resT.realizable, true)
checkReturnLoss("T matched return loss", resT.matchedReflection.returnLossDb, 40)
const dT = resT.piT
console.log(`  Rv = ${dT?.Rv.toFixed(2)} ohm, Qmin = ${dT?.Qmin.toFixed(3)}`)
console.log(`  bandwidth = ${(dT?.bandwidth ?? 0) / 1e6} MHz`)

// ------------------------------------------------------------------
// 7. Q constraint: Pi/T must exceed the single-L minimum Q
// ------------------------------------------------------------------
console.log("--- Q constraint ---")
const qmin = minimumNetworkQ(50, 1700)
check("Q_min 50->1700", qmin, Math.sqrt(33), 0.001)
const resBad = calculateMatch({ zSource: { re: 50, im: 0 }, zLoad: { re: 1700, im: 0 }, z0: 50, f: 1e9, topology: "pi", q: 4 })
checkBool("Pi rejected when Q < Q_min", resBad.realizable, false)

// ------------------------------------------------------------------
// 8. Exact top-level L validation through calculateMatch engine
// ------------------------------------------------------------------
console.log("--- Engine: 100 -> 1700 @900MHz ---")
const eng = calculateMatch({ zSource: { re: 100, im: 0 }, zLoad: { re: 1700, im: 0 }, z0: 100, f: 900e6, topology: "l" })
checkBool("engine realizable", eng.realizable, true)
checkReturnLoss("engine matched return loss", eng.matchedReflection.returnLossDb, 40)

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
