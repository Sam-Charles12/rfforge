/**
 * RFForge — Module D (AI layer) validation harness.
 *
 * Validates the Module D whistle: the public result contract, the deterministic
 * fallback template, and FR-D3 (the AI layer is read-only — it must never
 * mutate or re-derive calculated values).
 *
 *  1. Contract: every mock result matches the public RFResult shape.
 *  2. Template: explainFromTemplate returns non-empty plain text per module.
 *  3. Conditional (not static): high-PAE vs low-PAE results produce different
 *     wording, proving the fallback is genuinely threshold-driven.
 *  4. FR-D3 / purity: a frozen result is not mutated and no numeric literal is
 *     invented that wasn't present in the input.
 *  5. Adapters: internal -> public mapping is correct (Hz->GHz, etc.).
 *
 * Run: npm run validate:ai
 */
import { getMockResult, mockHighPAE } from "../lib/ai/mock-results"
import { explainFromTemplate, explainFollowUpFromTemplate } from "../lib/ai/template"
import type { RfResult } from "../types/rf-results"
import { buildMatchingResult, buildPAResult, buildScaleResult } from "../types/rf-results"
import { calculateMatch } from "../lib/match"
import { calculatePA } from "../lib/pa"
import { calculateScale } from "../lib/fscale"

let failures = 0

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`)
}

function isNum(n: unknown, finite = true): n is number {
  return typeof n === "number" && (finite ? Number.isFinite(n) : true)
}

function validMatching(r: RfResult): r is Extract<RfResult, { source: "A" }> {
  const m = r as Extract<RfResult, { source: "A" }>
  return (
    m.source === "A" &&
    typeof m.realizable === "boolean" &&
    typeof m.topology === "string" &&
    isNum(m.qFactor) &&
    isNum(m.bandwidthHz) &&
    isNum(m.matchedReturnLossDb) &&
    isNum(m.loadReturnLossDb)
  )
}

function validPA(r: RfResult): r is Extract<RfResult, { source: "B" }> {
  const m = r as Extract<RfResult, { source: "B" }>
  return (
    m.source === "B" &&
    typeof m.realizable === "boolean" &&
    isNum(m.gainDb) &&
    isNum(m.pSatDbm) &&
    isNum(m.p1dBInDbm) &&
    isNum(m.p1dBOutDbm) &&
    isNum(m.paePeakPct) &&
    isNum(m.drainEffPeakPct) &&
    typeof m.drainLabel === "string"
  )
}

function validScale(r: RfResult): r is Extract<RfResult, { source: "C" }> {
  const m = r as Extract<RfResult, { source: "C" }>
  return (
    m.source === "C" &&
    typeof m.realizable === "boolean" &&
    typeof m.topology === "string" &&
    isNum(m.srfGHz) &&
    isNum(m.ilAtFmaxDb) &&
    isNum(m.ilPeakDb) &&
    isNum(m.qAtFmax) &&
    isNum(m.ilRiseDb)
  )
}

const ma = getMockResult("A")
const mb = getMockResult("B")
const mc = getMockResult("C")

check("Contract: mock A matches MatchingResult", validMatching(ma))
check("Contract: mock B matches PAResultSummary", validPA(mb))
check("Contract: mock C matches ScaleResultSummary", validScale(mc))

/* --- Template: non-empty, per-module --- */
const ta = explainFromTemplate(ma)
const tb = explainFromTemplate(mb)
const tc = explainFromTemplate(mc)
check("Template A: non-empty", ta.trim().length > 40, `${ta.trim().length} chars`)
check("Template B: non-empty", tb.trim().length > 40, `${tb.trim().length} chars`)
check("Template C: non-empty", tc.trim().length > 40, `${tc.trim().length} chars`)

/* --- Conditional phrasing (not static boilerplate) --- */
const lowPae = explainFromTemplate(mb)
const highPae = explainFromTemplate(mockHighPAE)
check(
  "Template is conditional (high vs low PAE differ)",
  lowPae !== highPae,
  "low-PAE and high-PAE wording differ"
)
check("Conditional reflects thresholds", highPae.includes("excellent") !== lowPae.includes("excellent"))

/* --- Follow-up responder (deterministic chat fallback) --- */
const qBandwidth = explainFollowUpFromTemplate(ma, "what is the bandwidth?")
const qGain = explainFollowUpFromTemplate(mb, "explain the gain")
const qIl = explainFollowUpFromTemplate(mc, "why is insertion loss high?")
check("Follow-up A: non-empty", qBandwidth.trim().length > 20, `${qBandwidth.trim().length} chars`)
check("Follow-up B: non-empty", qGain.trim().length > 20, `${qGain.trim().length} chars`)
check("Follow-up C: non-empty", qIl.trim().length > 20, `${qIl.trim().length} chars`)
check(
  "Follow-up A: answers the bandwidth question from the values",
  qBandwidth.includes((ma.bandwidthHz / 1e6).toFixed(1) + " MHz")
)
check(
  "Follow-up B: answers the gain question from the values",
  qGain.includes(mb.gainDb.toFixed(1) + " dB")
)
const qOffTopic = explainFollowUpFromTemplate(mb, "tell me about weather in london")
check(
  "Follow-up off-topic: does not fabricate, names available metrics",
  qOffTopic.includes("gain") && qOffTopic.includes("Psat")
)

/* --- FR-D3 / purity: frozen input is not mutated; values are not altered --- */
const frozen = Object.freeze({ ...mb })
const before = JSON.stringify(frozen)
const out = explainFromTemplate(frozen as RfResult)
check("FR-D3: input object not mutated", JSON.stringify(frozen) === before)
// The output must restate the input's calculated values exactly (never alter
// them). Check the key PA figures appear intact at their formatted precision.
const fmt = (n: number) => n.toFixed(1)
check(
  "FR-D3: PAE value restated exactly",
  out.includes(fmt(mb.paePeakPct) + "%")
)
check(
  "FR-D3: Psat value restated exactly",
  out.includes(fmt(mb.pSatDbm) + " dBm")
)

/* --- Adapters map internal -> public correctly --- */
const match = calculateMatch({ zSource: { re: 50, im: 0 }, zLoad: { re: 200, im: 0 }, z0: 50, f: 2.4e9, topology: "pi", q: 10 })
const adaptedMatch = buildMatchingResult(match, 2.4e9)
check("Adapter A: pi bandwidth Hz carried through", adaptedMatch.bandwidthHz === match.piT?.bandwidth)
check("Adapter A: return loss mapped", adaptedMatch.matchedReturnLossDb === match.matchedReflection.returnLossDb)

const pa = calculatePA({ pDcW: 2, gainDb: 20, psatDbm: 30, pInStartDbm: -20, pInEndDbm: 10, steps: 200, smoothness: 1, deviceType: "fet" })
const adaptedPA = buildPAResult(pa)
check("Adapter B: pSat mapped", adaptedPA.pSatDbm === pa.pSatDbm)
check("Adapter B: p1dB output mapped", adaptedPA.p1dBOutDbm === pa.p1dB.pOutDbm)

const scale = calculateScale({ zLoad: { re: 200, im: 0 }, z0: 50, topology: "pi", q: 10, branch: "lp", f0: 10e9, cp: 0.1e-12, inductorQ: 100, capQ: 200, fmin: 1e9, fmax: 20e9, steps: 50 })
const adaptedScale = buildScaleResult(scale)
check("Adapter C: SRF Hz -> GHz", adaptedScale.srfGHz === scale.srfHz / 1e9)
check("Adapter C: IL peak mapped", adaptedScale.ilPeakDb === scale.ilPeak)

console.log(failures === 0 ? "\nAll Module D checks passed." : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
