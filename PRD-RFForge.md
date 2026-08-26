# Product Requirements Document

## Product Name: RFForge

*Tagline: Forge the match. Understand the gain.*

---

## 1. Overview

### 1.1 Summary
RFForge is a web-based calculation and visualization tool for Power Amplifier (PA) design at Radio Frequency (RF) and millimeter-Wave (mmWave) frequencies, extending into sub-Terahertz (sub-THz) bands. It allows a user to input real amplifier and network parameters and receive engineering-accurate outputs: impedance matching network component values, PA performance metrics, and frequency-dependent loss behavior. An integrated Artificial Intelligence (AI) explanation layer translates numeric results into plain-language engineering commentary.

### 1.2 Problem Statement
Students and early-career engineers studying PA design at high frequencies (60 GHz, 140 GHz, and beyond) often work with scattered reference equations across textbooks, with no single tool that lets them experiment with real design tradeoffs — how a matching network's Quality factor (Q) changes with frequency, how Power-Added Efficiency (PAE) responds to compression, or why sub-THz design is fundamentally harder than sub-6 GHz design. RFForge consolidates this into one interactive tool grounded in real equations, not approximated black-box outputs.

### 1.3 Target User
- Undergraduate and graduate Electrical and Computer Engineering (ECE) students specializing in RF/microwave engineering
- Applicants seeking to demonstrate RF Integrated Circuit (RFIC) design competence for research lab admission
- Early-career RF engineers who want a fast reference/sanity-check tool

### 1.4 Goals
- Provide accurate, equation-grounded RF calculations (not simulated approximations from a black-box model)
- Make frequency-dependent PA design challenges visible and interactive
- Provide plain-language explanations of results without replacing the underlying engineering logic
- Serve as a credible technical portfolio artifact

### 1.5 Non-Goals
- RFForge is not a replacement for full Electromagnetic (EM) simulation tools such as High Frequency Structure Simulator (HFSS) or Computer Simulation Technology Studio Suite (CST)
- RFForge does not perform circuit-level Simulation Program with Integrated Circuit Emphasis (SPICE) simulation
- RFForge does not handle multi-stage amplifier chains in its initial version
- RFForge is not intended for production/fabrication-grade design decisions

---

## 2. Core Functional Modules

### 2.1 Module A — Impedance Matching Network Designer

**Purpose:** Compute component values for a network that matches a given load impedance to a reference impedance (commonly 50 Ohm) at a specified frequency.

**Functional Requirements:**
- FR-A1: User can input source impedance (resistance and reactance) and load impedance (resistance and reactance)
- FR-A2: User can input operating frequency in Hertz (Hz), with support for common RF unit prefixes (MegaHertz/MHz, GigaHertz/GHz)
- FR-A3: System calculates Reflection Coefficient (Γ) between source and load
- FR-A4: System determines matching network topology (L-network minimum viable; Pi-network and T-network as extensions)
- FR-A5: System calculates required Quality factor (Q) of the matching network
- FR-A6: System calculates series and shunt reactance values needed for the match
- FR-A7: System converts reactance values into physical Inductance (L, in Henries) and Capacitance (C, in Farads) at the given frequency
- FR-A8: System displays resulting network bandwidth based on calculated Q
- FR-A9 (stretch): System renders a Smith Chart showing the matching path from load impedance to the reference impedance

**Inputs:** Source impedance (R + jX), load impedance (R + jX), frequency, reference impedance (default 50 Ohm)

**Outputs:** Network topology type, component values (L, C), Q factor, bandwidth, reflection coefficient magnitude and phase

---

### 2.2 Module B — Power Amplifier Performance Calculator

**Purpose:** Compute standard PA figures of merit from basic amplifier parameters.

**Functional Requirements:**
- FR-B1: User can input Direct Current (DC) supply power (P_DC), input power (P_in) sweep range, and small-signal gain
- FR-B2: System calculates output power (P_out) across the input power sweep using a saturating compression model
- FR-B3: System calculates and plots Gain (in decibels, dB) versus input power, showing compression behavior
- FR-B4: System calculates and displays the 1-decibel Compression Point (P1dB) — the input power at which gain has dropped 1 dB from its small-signal value
- FR-B5: System calculates Power-Added Efficiency (PAE) across the input power sweep
- FR-B6: System calculates Drain Efficiency (or Collector Efficiency, depending on device type) across the sweep
- FR-B7: System displays Saturated Output Power (P_sat)
- FR-B8 (stretch): System calculates Output Third-Order Intercept Point (OIP3) for linearity reference

**Inputs:** DC supply power, small-signal gain, saturation power, input power sweep range, device type (Field-Effect Transistor/FET or Bipolar Junction Transistor/BJT, for efficiency terminology only)

**Outputs:** P_out vs. P_in curve, Gain vs. P_in curve, PAE vs. P_in curve, P1dB value, P_sat value

---

### 2.3 Module C — Frequency Scaling and Loss Visualizer

**Purpose:** Show how matching network performance and losses degrade as operating frequency increases from sub-6 GHz through mmWave to sub-THz bands (up to 140 GHz and beyond).

**Functional Requirements:**
- FR-C1: User can input a fixed parasitic capacitance and/or parasitic resistance value representing real-world component non-idealities
- FR-C2: System sweeps frequency across a user-defined range (minimum 1 GHz, maximum configurable up to 300 GHz)
- FR-C3: System calculates how parasitic effects increasingly detune or degrade the matching network as frequency rises
- FR-C4: System calculates and displays insertion loss of the matching network across the frequency sweep
- FR-C5: System calculates and displays achievable inductor Q degradation across the frequency sweep
- FR-C6: System annotates the output chart at standard band references (sub-6 GHz, 24 GHz, 60 GHz, 140 GHz)

**Inputs:** Parasitic capacitance, parasitic resistance, frequency sweep range, base matching network parameters (inherited from Module A)

**Outputs:** Insertion loss vs. frequency chart, Q degradation vs. frequency chart, annotated band markers

---

### 2.4 Module D — Artificial Intelligence Explanation Layer

**Purpose:** Translate numeric outputs from Modules A, B, and C into plain-language engineering commentary.

**Functional Requirements:**
- FR-D1: System sends only calculated numeric outputs (never raw user inputs alone) to the Artificial Intelligence (AI) layer as context
- FR-D2: AI layer generates a plain-language explanation of what the numbers mean (e.g., why PAE is low, why insertion loss increases at a given frequency)
- FR-D3: AI layer explicitly does not generate or alter any calculated engineering value — it is read-only relative to the calculation modules
- FR-D4: System clearly labels AI-generated explanation text as distinct from calculated results (e.g., visually separated panel)
- FR-D5: User can toggle the AI explanation layer on or off

**Inputs:** Numeric outputs from Modules A–C

**Outputs:** Plain-language explanation text

---

## 3. Non-Functional Requirements

- NFR-1: All calculation logic (Modules A–C) must be implemented as pure, independently testable functions, separated from any interface or AI-layer code
- NFR-2: Calculations must complete and display within 1 second of input change for the primary modules
- NFR-3: Application must be usable on both desktop and mobile browsers
- NFR-4: Application must not require a backend for core calculation modules (client-side computation)
- NFR-5: Unit conversions (Hz/MHz/GHz, F/pF, H/nH) must be handled without requiring the user to manually convert units
- NFR-6: All equations used must be documented with references in an accompanying technical write-up

---

## 4. Accuracy and Validation Requirements

- VR-1: Matching network calculations must be validated against at least two known worked examples from a standard reference text (e.g., Pozar's *Microwave Engineering*)
- VR-2: PA performance calculations must be validated against published PA datasheet curves for at least one real device, for shape/behavior comparison (not exact numeric matching, since real device data is proprietary)
- VR-3: Frequency scaling behavior must be qualitatively consistent with known RF engineering principles (Q degradation and loss increasing with frequency)

---

## 5. Content and Documentation Requirements

- CR-1: A technical write-up must accompany the tool, explaining every equation used with citations
- CR-2: A "Methodology" section must clearly state which parts of the tool are deterministic calculation versus AI-generated explanation
- CR-3: Screenshots of key outputs (P_out/Gain/PAE curves, matching network results, frequency scaling chart) must be included in project documentation

---

## 6. Success Criteria

- SC-1: All core calculations (Modules A and B) produce results within 5% of manually verified textbook worked examples
- SC-2: Module C produces a visibly increasing loss/degradation trend as frequency increases from sub-6 GHz to sub-THz
- SC-3: A domain expert (e.g., an RF-focused professor or graduate student) reviewing the tool can identify the correct underlying equations without being told what they are
- SC-4: The tool functions as a standalone, presentable portfolio artifact requiring no verbal explanation of "what it actually calculates"

---

## 7. Build Phases

| Phase | Scope | Priority |
|---|---|---|
| Phase 1 | Module B (PA Performance Calculator) | Highest — fastest visible payoff, simplest equations |
| Phase 2 | Module A (Impedance Matching Network Designer) | High — core RF credibility signal |
| Phase 3 | Module C (Frequency Scaling and Loss Visualizer) | High — strongest domain-specific differentiator |
| Phase 4 | Module D (AI Explanation Layer) | Lowest — supporting feature only |

---

## 8. Glossary of Abbreviations

| Abbreviation | Full Form |
|---|---|
| PA | Power Amplifier |
| RF | Radio Frequency |
| mmWave | millimeter-Wave |
| sub-THz | sub-Terahertz |
| AI | Artificial Intelligence |
| Q | Quality factor |
| Γ | Reflection Coefficient (Gamma) |
| PAE | Power-Added Efficiency |
| P1dB | 1-decibel Compression Point |
| P_sat | Saturated Output Power |
| P_DC | Direct Current Supply Power |
| P_in | Input Power |
| P_out | Output Power |
| OIP3 | Output Third-Order Intercept Point |
| dB | decibels |
| dBm | decibels relative to one milliwatt |
| Hz / MHz / GHz | Hertz / MegaHertz / GigaHertz |
| L | Inductance |
| C | Capacitance |
| R | Resistance |
| X | Reactance |
| FET | Field-Effect Transistor |
| BJT | Bipolar Junction Transistor |
| RFIC | Radio Frequency Integrated Circuit |
| ECE | Electrical and Computer Engineering |
| HFSS | High Frequency Structure Simulator |
| CST | Computer Simulation Technology (Studio Suite) |
| SPICE | Simulation Program with Integrated Circuit Emphasis |
| EM | Electromagnetic |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| VR | Validation Requirement |
| CR | Content Requirement |
| SC | Success Criterion |
