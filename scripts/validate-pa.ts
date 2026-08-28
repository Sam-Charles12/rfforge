/**
 * RFForge — Module B validation harness (PRD VR-2).
 *
 * Validates the pure PA calculation functions against verifiable mathematical
 * identities and physical asymptotics of the Rapp class-A compression model.
 *
 *   Example PA:  G = 20 dB, P_sat = 30 dBm, P_DC = 2 W, class-A (smoothness 1)
 *   Sweep:       P_in from -20 dBm to +10 dBm
 *
 * Properties checked (each independently derivable from the model equations):
 *   1. Small-signal region:  P_out(dBm) ≈ P_in(dBm) + G_small  (exact for p=1,
 *      up to machine precision in the linear region).
 *   2. P1dB definition:      gain at the located P1dB == G_small - 1 exactly.
 *   3. PAE identity:         PAE == (P_out - P_in)/P_DC at every point.
 *   4. Drain-eff identity:   eta == P_out/P_DC at every point.
 *   5. Class-A asymptote:    as P_in -> infinity, P_out -> P_sat (=1 W),
 *                            so eta -> P_sat/P_DC = 50% (the class-A limit).
 *   6. Compression:          gain is monotonically non-increasing as drive rises.
 *   7. Determinism:          standalone functions match the combined engine.
 *
 * Run: npm run validate:pa
 */
import { calculatePA, calculateP1dB, calculatePowerSweep } from "../lib/pa"

let failures = 0
const rel = (v: number, e: number, r: number) => Math.abs(v - e) <= r * Math.abs(e)

function check(name: string, value: number, expected: number, tolerance: number) {
  const ok = rel(value, expected, tolerance)
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got=${value.toFixed(4)} expected≈${expected.toFixed(4)}`)
}

function checkIdentity(name: string, value: number, expected: number, atol: number) {
  const ok = Math.abs(value - expected) <= atol
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got=${value.toFixed(6)} expected=${expected.toFixed(6)}`)
}

// ------------------------- Main sweep -------------------------
const params = {
  pDcW: 2,
  gainDb: 20,
  psatDbm: 30,
  pInStartDbm: -20,
  pInEndDbm: 10,
  steps: 601,
  smoothness: 1,
  deviceType: "bjt" as const,
}

const result = calculatePA(params)

console.log("--- Worked example: Module B PA Performance ---")
console.log(`P1dB_in = ${result.p1dB.pInDbm.toFixed(2)} dBm, P1dB_out = ${result.p1dB.pOutDbm.toFixed(2)} dBm`)

// 1. Small-signal gain: linear-region points offset exactly by small-signal gain.
for (const idx of [50, 100, 150]) {
  const pt = result.sweep[idx]
  check(`small-signal gain @${pt.pInDbm.toFixed(1)}dBm`, pt.pOutDbm - pt.pInDbm, params.gainDb, 0.001)
}

// 2. P1dB definition: gain at P1dB == small-signal gain - 1.
const gAtP1 = result.p1dB.pOutDbm - result.p1dB.pInDbm
check("gain at P1dB = G_small - 1", gAtP1, params.gainDb - 1, 0.001)

// 3 & 4. Identities across the whole sweep.
let identityErr = 0
for (const pt of result.sweep) {
  const pInW = 10 ** (pt.pInDbm / 10) / 1000
  const pOutW = 10 ** (pt.pOutDbm / 10) / 1000
  identityErr = Math.max(
    identityErr,
    Math.abs(pt.pae - ((pOutW - pInW) / params.pDcW) * 100),
    Math.abs(pt.drainEfficiency - (pOutW / params.pDcW) * 100)
  )
}
checkIdentity("PAE & drain-eff identities hold everywhere", identityErr, 0, 1e-9)

// 5. Class-A asymptote: deep saturation -> eta -> P_sat/P_DC = 50%.
const wide = calculatePowerSweep({ ...params, pInEndDbm: 40, steps: 2000 })
const deepSat = wide[wide.length - 1]
check("drain eff deep saturation -> class-A 50% limit", deepSat.drainEfficiency, 50, 0.01)
check("P_out deep saturation approaches P_sat", deepSat.pOutDbm, params.psatDbm, 0.01)

// 6. Gain monotonically non-increasing with drive.
let mono = true
for (let i = 1; i < result.sweep.length; i++) {
  if (result.sweep[i].gainDb > result.sweep[i - 1].gainDb + 1e-9) mono = false
}
console.log(`${mono ? "PASS" : "FAIL"}  gain is monotonically non-increasing with drive`)
if (!mono) failures++

// 7. Determinism: standalone functions match the combined engine.
const standaloneSweep = calculatePowerSweep(params)
const standaloneP1 = calculateP1dB(standaloneSweep, params.gainDb)
checkIdentity("engine vs standalone P1dB_in", standaloneP1.pInDbm, result.p1dB.pInDbm, 1e-9)

// 8. PAE peaks in the compression region, then falls toward the class-A
//    P_sat/P_DC asymptote (P_in contribution becomes negligible at high gain).
console.log(`PAE peak = ${result.paePeak.toFixed(1)}% (expected ~35%, near compression)`)
check("PAE peak near compression (~30-38%)", result.paePeak, 35, 0.15)

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
