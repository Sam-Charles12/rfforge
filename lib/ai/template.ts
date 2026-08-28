/**
 * RFForge — Module D deterministic fallback explanation generator.
 *
 * Produces plain-language engineering commentary strictly from the numeric
 * result contract. Used when no GROQ_API_KEY is configured (or a live call
 * fails) so the AI layer always returns something useful — this is genuine
 * threshold-driven template logic, not a static "AI unavailable" stub.
 *
 * FR-D3: it is read-only. It takes numbers and returns text; it never
 * generates or alters a calculated value. Implementations must not mutate the
 * input object.
 */
import type { MatchingResult, PAResultSummary, RfResult, ScaleResultSummary } from "@/types/rf-results"
import { isBeyondReturnLossCap, RETURN_LOSS_CAP_DB } from "@/lib/rf/return-loss"

const two = (n: number) => n.toFixed(2)
const one = (n: number) => n.toFixed(1)
const mhz = (hz: number) => (hz / 1e6).toFixed(1)

function explainMatching(r: MatchingResult): string {
  const { qFactor, bandwidthHz, matchedReturnLossDb, loadReturnLossDb } = r

  if (!r.realizable) {
    return `The matching network could not be realized for the given source and load impedances${r.reason ? ` — ${r.reason}` : ""}. The load's return loss of ${two(loadReturnLossDb)} dB is not transformed into an acceptable match at the target frequency. Consider switching topologies (for example, allowing a Pi or T network) or revising the load impedance so a real network exists.`
  }

  const improvements: string[] = []
  if (isBeyondReturnLossCap(matchedReturnLossDb)) {
    improvements.push(
      `the return loss improves from ${two(loadReturnLossDb)} dB (unmatched) to essentially perfect at the design frequency (return loss > ${RETURN_LOSS_CAP_DB} dB, effectively unmeasurable in a real circuit), a net improvement of more than ${RETURN_LOSS_CAP_DB} dB`
    )
  } else {
    const gain = matchedReturnLossDb - loadReturnLossDb
    improvements.push(`the return loss improves from ${two(loadReturnLossDb)} dB (unmatched) to ${two(matchedReturnLossDb)} dB (matched), a net improvement of ${two(gain)} dB`)
  }

  let qSentence: string
  if (qFactor >= 10) {
    qSentence = `The resulting loaded quality factor of ${one(qFactor)} is fairly high, meaning the network is narrowband.`
  } else if (qFactor >= 4) {
    qSentence = `The loaded quality factor of ${one(qFactor)} gives a moderately selective response.`
  } else {
    qSentence = `The low loaded quality factor (${one(qFactor)}) yields a broadband, low-selectivity response.`
  }

  let bwSentence: string
  if (bandwidthHz > 0) {
    const bwMHz = mhz(bandwidthHz)
    if (bandwidthHz >= 200e6) {
      bwSentence = `This corresponds to a wide -3 dB bandwidth of roughly ${bwMHz} MHz, well suited to broadband or multi-band applications.`
    } else {
      bwSentence = `This corresponds to a -3 dB bandwidth of roughly ${bwMHz} MHz, so the match degrades quickly away from the design frequency.`
    }
  } else {
    bwSentence = "A bandwidth figure is not available for this configuration."
  }

  const verdict = isBeyondReturnLossCap(matchedReturnLossDb)
    ? `The match is essentially perfect at the design frequency (return loss > ${RETURN_LOSS_CAP_DB} dB, effectively unmeasurable in a real circuit).`
    : matchedReturnLossDb >= 20
      ? "The match is excellent (≥ 20 dB return loss), so power transfer at the design frequency is essentially lossless."
      : matchedReturnLossDb >= 10
        ? "The match is acceptable (10–20 dB return loss); most power transfers, though a few percent is reflected."
        : "The match is poor (below 10 dB return loss); a meaningful fraction of power is reflected back to the source."

  return `This is a ${r.topology.toUpperCase()} matching network. In summary, ${improvements.join(" and ")}. ${qSentence} ${bwSentence} ${verdict}`
}

function explainPA(r: PAResultSummary): string {
  const { gainDb, pSatDbm, p1dBInDbm, p1dBOutDbm, paePeakPct, drainEffPeakPct, drainLabel } = r

  if (!r.realizable) {
    return `The power-amplifier sweep produced no realizable output. Provide a valid DC supply, small-signal gain, and saturation power so a drive characteristic can be simulated.`
  }

  const compression = pSatDbm - p1dBOutDbm
  const segments: string[] = []
  segments.push(
    `The small-signal gain is ${one(gainDb)} dB with a saturation power of ${one(pSatDbm)} dBm and a 1 dB compression point at an input of ${one(p1dBInDbm)} dBm (output ${one(p1dBOutDbm)} dBm)`
  )

  if (compression >= 3) {
    segments.push(
      `the difference between ${drainLabel.toLowerCase()} saturation and the 1 dB point of ${two(compression)} dB shows a soft, gradual compression`
    )
  } else {
    segments.push(
      `the ${two(compression)} dB gap between saturation and the 1 dB point indicates a fairly abrupt gain roll-off`
    )
  }

  let paeSentence: string
  if (paePeakPct >= 45) {
    paeSentence = `Peak power-added efficiency of ${one(paePeakPct)}% is excellent for this class of device, meaning little DC power is wasted.`
  } else if (paePeakPct >= 30) {
    paeSentence = `Peak power-added efficiency of ${one(paePeakPct)}% is reasonable — the stage is usable but not especially efficient near saturation.`
  } else {
    paeSentence = `Peak power-added efficiency of only ${one(paePeakPct)}% is low; much of the DC input is dissipated as heat, so a higher-efficiency bias or device class may be worth considering.`
  }

  const drainSentence =
    drainEffPeakPct >= 60
      ? `Peak ${drainLabel.toLowerCase()} efficiency of ${one(drainEffPeakPct)}% reflects strong energy conversion at the output.`
      : `Peak ${drainLabel.toLowerCase()} efficiency of ${one(drainEffPeakPct)}% is typical for a linear-biased stage.`

  return `This is a ${one(gainDb)} dB-gain PA stage. In summary, ${segments.join("; ")}. ${paeSentence} ${drainSentence}`
}

function explainScale(r: ScaleResultSummary): string {
  const { srfGHz, ilAtFmaxDb, ilPeakDb, qAtFmax, ilRiseDb, topology } = r

  if (!r.realizable) {
    return `The ${topology.toUpperCase()} scaling analysis did not produce realizable values${r.reason ? ` — ${r.reason}` : ""}. Check the frequency sweep and component parameters so a loss curve can be generated.`
  }

  const nearSrf = srfGHz > 0 && (qAtFmax < 5 || ilRiseDb >= 20)
  const peakPenalty = ilPeakDb - ilAtFmaxDb

  let lossSentence: string
  if (nearSrf) {
    lossSentence = `Insertion loss climbs sharply toward ${two(ilAtFmaxDb)} dB by the end of the sweep (a rise of ${two(ilRiseDb)} dB) — this is the classic signature of the inductor approaching its self-resonant frequency around ${two(srfGHz)} GHz, where its effective Q collapses to about ${two(qAtFmax)}.`
  } else {
    lossSentence = `Insertion loss reaches ${two(ilAtFmaxDb)} dB at the upper end of the sweep (a rise of ${two(ilRiseDb)} dB), which is consistent with loss growing before the inductor's self-resonance at ${two(srfGHz)} GHz.`
  }

  let peakSentence: string
  if (peakPenalty > 3) {
    peakSentence = `The peak of ${two(ilPeakDb)} dB sits ${two(peakPenalty)} dB above the band edge, indicating a resonant loss bump rather than a smooth monotonic rise.`
  } else {
    peakSentence = `Peak loss of ${two(ilPeakDb)} dB stays close to the band-edge value, so there is no pronounced resonant bump.`
  }

  return `This ${topology.toUpperCase()} network's frequency response is dominated by inductor loss. ${lossSentence} ${peakSentence}`
}

/**
 * Deterministic plain-language explanation of a result. Pure: takes the public
 * numeric contract and returns text. Never mutates the input and never
 * invents numbers not present in the result.
 */
export function explainFromTemplate(result: RfResult): string {
  switch (result.source) {
    case "A":
      return explainMatching(result)
    case "B":
      return explainPA(result)
    case "C":
      return explainScale(result)
  }
}
