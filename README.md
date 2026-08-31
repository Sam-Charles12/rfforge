# RFForge

RF/PA engineering calculator for impedance matching, power-amplifier performance, and frequency-scaling analysis, with an AI explanation layer. Built for RF and microwave engineers who want fast, auditable worked examples alongside interactive visualisation.

## Modules

| Module | What it does |
|---|---|
| **A — Matching** | L/Pi/T impedance matching network design. Takes complex source and load impedances, returns Q factor, component values, and topology. |
| **B — PA Performance** | Power amplifier gain compression, PAE, drain efficiency, and P1dB from Rapp-model sweep. |
| **C — Frequency Scaling** | Insertion-loss and effective-inductance curves across sub-6 GHz to sub-THz, including parasitic SRF. |
| **D — AI Explanation** | Groq-powered natural-language explanation of calculation results, with template fallback. |

## Getting started

```bash
npm install
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000).

For development with hot reload:

```bash
npm run dev
```

## Validation

Validation scripts cover core-calculation accuracy (SC-1/SC-2) and can be extended for domain-expert (SC-3) and standalone-presentability (SC-4) reviews. Full results, methodology, and reviewer checklists live in [VALIDATION.md](./VALIDATION.md).

```bash
npm run validate:final    # SC-1 + SC-2 (automated)
npm run validate:match    # Module A — L/Pi/T network
npm run validate:pa       # Module B — PA performance
npm run validate:fscale   # Module C — frequency scaling
npm run validate:ai       # Module D — AI explanation layer
```

## Tech stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS v4 + shadcn/ui (base-mira)
- Recharts for visualisation
- Groq API for AI explanations (compound model)

## License

Private project — see repository for details.
