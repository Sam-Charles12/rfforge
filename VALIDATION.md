# RFForge — Validation Record

PRD success criteria SC-1 through SC-4 as defined in `PRD-RFForge.md §6`.

---

## SC-1: Core Calculation Accuracy

**Status: PASS** — automated, all 31 checks pass.

**Reproduce:** `npm run validate:final` (requires `npm run build` first if source has changed).

**Test case A1** — real load (R=25 Ω, X=0, Z₀=50 Ω, 1 GHz):

| Quantity | Code | Textbook | Dev |
|---|---|---|---|
| Q | 1.00000 | 1.000 | 0.00% |
| Series X | 25.000 Ω | 25.000 Ω | 0.00% |
| Shunt X | 50.000 Ω | 50.000 Ω | 0.00% |
| Return loss | ∞ dB | ∞ dB (perfect match) | — |

**Test case A2** — complex load (Z_L=12+j8 Ω, Z₀=50 Ω, 2.4 GHz):

| Quantity | Code | Textbook | Dev |
|---|---|---|---|
| Q | 1.77951 | 1.7795 (√(50/12−1)) | 0.00% |
| Series X | 13.354 Ω | 13.354 Ω | 0.00% |
| Shunt X | 28.098 Ω | 28.10 Ω | 0.01% |
| Series L | 0.8856 nH | 0.8855 nH | 0.01% |
| Shunt C | 2.3602 pF | 2.360 pF | 0.01% |
| Return loss | ∞ dB | ∞ dB (perfect match) | — |

**Test case B** — PA (P_DC=2 W, G_ss=20 dB, P_sat=30 dBm, Class-A):

| Quantity | Code | Textbook | Dev |
|---|---|---|---|
| Small-signal gain | 20.000 dB | 20 dB | 0.00% |
| PAE @ −20 dBm | 0.0495% | 0.0495% | 0.00% |
| Drain eff @ −20 dBm | 0.0500% | 0.05% | 0.00% |
| P1dB_in | 8.84 dBm | 8.84 dBm | 0.005 dB |
| P1dB_out | 27.84 dBm | 27.84 dBm | 0.005 dB |
| PAE @ P1dB | 29.99% | 30.02% | 0.09% |
| Drain eff @ P1dB | 30.37% | 30.40% | 0.09% |
| PAE peak | 34.86% | ~34.9% | < 0.2% |

**Supporting suites** (all independently pass):

```
npm run validate:match   → ALL CHECKS PASSED
npm run validate:pa      → ALL CHECKS PASSED
npm run validate:fscale  → ALL CHECKS PASSED
```

---

## SC-2: Frequency Scaling / Degradation Trend

**Status: PASS** — automated, all 4 checks pass.

**Reproduce:** `npm run validate:final` (same run as SC-1).

Module C evaluated over 1–140 GHz (π low-pass, Z_L=200 Ω, Q=10, f₀=10 GHz):

| Frequency | Insertion loss | Effective L |
|---|---|---|
| 1 GHz | 5.74 dB | 237.18 pH |
| 6 GHz | 15.19 dB | 245.21 pH |
| 60 GHz | 63.24 dB | −101.56 pH |
| 140 GHz | 68.18 dB | −13.67 pH |

SRF = 32.70 GHz, IL peak = 96.92 dB.

Trend is monotonically non-decreasing; effective inductance collapses beyond SRF (−13.67 pH at 140 GHz vs. 237.18 pH at 1 GHz).

---

## SC-3: Domain Expert Review

**Status: Not yet run.**

**Reviewer:** ____________________
**Date:** ____________________
**Outcome:** PASS / FAIL / PASS with notes

**Notes:**

---

### Instructions for the reviewer session

Do **not** tell the reviewer what the tool calculates before handing it
over. Let them explore Module A ("Matching") and Module B ("PA
Performance") on their own, then ask these questions as they go.

**Opening instruction** (read or paraphrase to the reviewer):

> "This is a tool I built. I'm not going to tell you what it does yet —
> just click around, try entering some values, and tell me what you think
> it's calculating and whether the behavior looks right to you."

**Questions to ask** (after they've explored for a few minutes):

1. What do you think Module A ("Matching") is calculating?
   *(Should identify: impedance matching network design — L/Pi/T networks, Q factor, component values.)*

2. What do you think Module B ("PA Performance") is calculating?
   *(Should identify: power amplifier gain/compression/efficiency — PAE, P1dB, gain compression.)*

3. Does anything about the calculated results look physically wrong or
   suspicious to you?
   *(Looking for: no red flags on sign conventions, magnitude of values, or curve shapes.)*

4. If you entered a load with reactance (X ≠ 0) in Module A — does the
   loaded-Q value and component solution look reasonable to you?

5. In Module B, does the gain curve compress (bend downward) in a way
   that looks like real PA behaviour as input power increases?

6. Any missing feature or check you'd expect a tool like this to have,
   based on your own RF experience?

**Pass condition:** Reviewer correctly names the underlying concepts
(matching network theory, PAE/compression) without being told, and
doesn't flag anything as obviously incorrect. Partial credit / notes for
later if they identify the concepts correctly but flag a specific rough
edge (confusing label, missing unit) — that's polish feedback, not a
failure of SC-3.

---

## SC-4: Standalone Presentability

**Status: Not yet run.**

**Reviewer:** ____________________
**Date:** ____________________
**Outcome:** PASS / FAIL / PASS with notes

**Notes:**

---

### Instructions for the reviewer session

Hand over the running app (or a link) with the intro below and no other
explanation. Watch what they do without jumping in to help unless
they're completely stuck for a while.

**Opening instruction** (read or paraphrase to the reviewer):

> "Try this out — click around, enter some values, see what happens. I
> want to see if it makes sense without me explaining anything."

**What to observe** (don't ask these out loud — just watch):

1. Do they understand which module/tab they're in and what it's for?
2. Can they enter values into the input fields without confusion?
3. Do they notice and read the AI explanation panel? Does it seem to
   help them understand the result?
4. Do they get stuck anywhere — a label that doesn't make sense, a field
   they don't know what to type, a result they can't interpret?
5. At the end, ask directly: "based on what you just saw, what do you
   think this tool is for?" — a reasonable, roughly-correct answer (even
   in plain language, e.g. "some kind of signal/amplifier calculator")
   counts as a pass; they don't need RF vocabulary.

**Pass condition:** They can use the tool and get a sensible answer to
"what is this for" without you narrating during the session. Getting
stuck on one specific small thing (a tooltip missing, one confusing
label) is a polish note, not a failure — but if they're lost throughout
and need you to explain the tool step by step to use it at all, that's
an SC-4 fail.
