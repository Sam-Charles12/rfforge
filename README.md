# RFForge

*Forge the match. Understand the gain.*

RFForge is a web-based calculation and visualization tool for Power Amplifier design at Radio Frequency and millimeter-Wave frequencies, extending into sub-Terahertz bands. It is built for RF and microwave engineers, students, and early-career designers who want fast, equation-grounded, and auditable worked examples alongside interactive visualisation.

At its core, RFForge is not a simulator in the traditional sense and not a black-box estimator. Every engineering result shown in the interface comes from deterministic calculation logic implemented as pure, independently testable functions. The tool takes real amplifier and network parameters as input and returns engineering-accurate outputs: impedance matching network component values, power amplifier performance metrics, and frequency-dependent loss behavior. An integrated artificial intelligence explanation layer then translates those numeric results into plain-language engineering commentary without ever altering the underlying numbers.

## The Problem It Solves

Students and early-career engineers studying power amplifier design at high frequencies — 60 GHz, 140 GHz, and beyond — often work with scattered reference equations across textbooks, with no single place to experiment with real design tradeoffs.

RFForge consolidates those scattered concepts into one interactive instrument where it becomes possible to explore questions such as how a matching network Quality factor changes with frequency, how Power-Added Efficiency responds to compression, or why sub-Terahertz design is fundamentally harder than sub-6 GHz design.

The emphasis throughout is on transparency and credibility. Calculations complete and display rapidly as inputs change, unit conversions are handled automatically, and the methodology clearly separates what is deterministically calculated from what is AI-generated explanation.

## Who It Is For

RFForge is intended for undergraduate and graduate Electrical and Computer Engineering students specializing in RF and microwave engineering, for applicants seeking to demonstrate RF Integrated Circuit design competence for research lab admission, and for early-career RF engineers who want a fast reference and sanity-check tool for everyday design reasoning.

The interface is designed to function as a standalone, presentable portfolio artifact that communicates what it calculates without requiring verbal explanation. If shown to an RF engineer without context, it should read as a real instrument where every number is legible at a glance.

## What It Does

RFForge is organized around four core functional modules, each presented as a self-contained instrument panel.

### Module A — Impedance Matching Network Designer

This module computes the component values for a network that matches a given load impedance to a reference impedance, commonly 50 Ohm, at a specified operating frequency.

It accepts complex source and load impedances, defined by resistance and reactance, along with operating frequency with support for common RF unit prefixes. From those inputs it determines reflection coefficient magnitude and phase between source and load, selects an appropriate matching network topology from L-network, Pi-network, and T-network options, and calculates the required network Quality factor.

It then derives the necessary series and shunt reactance values for the match and converts them into physical inductance and capacitance values at the given frequency. The resulting network bandwidth based on the calculated Quality factor is also displayed, making the tradeoff between match selectivity and bandwidth immediately visible.

### Module B — Power Amplifier Performance Calculator

This module computes standard power amplifier figures of merit from basic amplifier parameters such as DC supply power, small-signal gain, saturation power, and input power sweep range.

Using a saturating compression model, it traces output power across an input power sweep and derives the associated gain versus input power behavior, including visible gain compression. It identifies the 1-decibel Compression Point where gain has dropped by 1 dB from its small-signal value, along with saturated output power.

It also calculates Power-Added Efficiency and Drain Efficiency across the sweep, with terminology adapted to device type. The outputs are presented as output power, gain, and efficiency curves that show how linearity and efficiency evolve together from small-signal operation through compression and into saturation.

### Module C — Frequency Scaling and Loss Visualizer

This module shows how matching network performance and losses degrade as operating frequency increases from sub-6 GHz through millimeter-Wave to sub-Terahertz bands.

It accounts for real-world component non-idealities represented by parasitic capacitance and parasitic resistance, and sweeps frequency across a wide user-defined range. Across that sweep it models how parasitic effects increasingly detune or degrade the matching network, including insertion loss behavior and achievable inductor Quality factor degradation.

Results are displayed as insertion-loss versus frequency and Quality degradation versus frequency charts, annotated at standard band references such as sub-6 GHz, 24 GHz, 60 GHz, and 140 GHz. The visibly increasing loss and degradation trend with frequency is the central insight of this view and the strongest domain-specific differentiator of the project.

### Module D — Artificial Intelligence Explanation Layer

This module translates numeric outputs from the calculation modules into plain-language engineering commentary.

It receives only calculated numeric outputs as context and generates explanations of what the numbers mean, for example why Power-Added Efficiency is low in a given operating region or why insertion loss increases at a given frequency. The AI layer is strictly read-only relative to the calculation modules and never generates or alters any calculated engineering value.

AI-generated explanation text is visually separated and clearly labeled as distinct from calculated results, and the layer can be toggled on or off. A template-based fallback ensures that meaningful commentary remains available even when AI generation is unavailable.

## Design Character

RFForge is designed to feel like a precision instrument rather than a conventional application. The interface follows a strict bento-grid layout where every screen is composed of self-contained glassmorphic cards with consistent spacing, corner treatment, and internal padding.

The visual system is dark-first and typographically restrained, with numeric and data values set in monospace to reinforce technical legibility while all other interface text uses a humanist sans. Each functional module owns a consistent accent color used for wayfinding, curve coloring, and active states, so module identity is recognizable by color alone.

Charts are treated as the centerpiece of the product, with disciplined line weights, restrained series coloring, subtle gridlines, and annotations positioned to support reading rather than clutter. Motion is fast and purposeful, used only to communicate state change as live calculations update.

## Accuracy and Trust

Accuracy is a foundational requirement. Matching network calculations are validated against known worked examples from standard reference texts. Power amplifier performance calculations are compared against published amplifier datasheet curve shapes and behavior. Frequency scaling behavior is held to qualitative consistency with established RF engineering principles, namely that Quality degradation and loss increase with frequency.

All equations used are documented with references in an accompanying technical write-up, and validation coverage, methodology, and reviewer checklists are maintained as part of the project documentation.

## What It Is Not

RFForge is not a replacement for full electromagnetic simulation tools, does not perform circuit-level SPICE simulation, does not address multi-stage amplifier chains in its initial form, and is not intended for production or fabrication-grade design decisions. It is a fast, interactive, and educational engineering calculator focused on clarity, correctness, and insight.

## Project Standing

RFForge is a private project. Its value lies in providing accurate, equation-grounded RF calculations, making frequency-dependent design challenges visible and interactive, explaining results in accessible language without replacing engineering logic, and serving as a credible technical portfolio artifact.
