# RLM Lite

**Reasoning observability for multi-agent AI systems.**

RLM Lite instruments AI reasoning at the claim level. Submit any assertion, question, or hypothesis, and a structured three-agent debate unfolds: claims are extracted in parallel, contradictions are detected and classified, attractor stability is estimated, and a synthesis is generated — all exportable as structured JSON.

> **RLM Lite is not a debate framework. It is a measurement instrument.**  
> The goal is to make reasoning *observable* — not just to run agents, but to surface what they assert, where they conflict, and how stable the resulting attractor is.

---

## What it does

```
Input prompt
     ↓
┌──────────────────────────────────────────┐
│  Proposer     Challenger     Explorer    │  ← parallel claim extraction
│  (assert)     (challenge)    (explore)   │
└──────────────────┬───────────────────────┘
                   ↓
         Friction detection
    blocking · structural · exploratory
         deferred · resolved
                   ↓
        Metrics computation
    contradiction density · agreement rate
         attractor stability
                   ↓
         Synthesis claim
                   ↓
         JSON export
```

---

## Core concepts

| Concept | Definition |
|---|---|
| **Atomic claim** | A single, self-contained assertion — the unit of analysis |
| **Friction** | A detected contradiction or productive tension between two claims |
| **Friction type** | `blocking` · `structural` · `exploratory` · `deferred` · `resolved` |
| **Contradiction density** | Frictions per claim — signals how contested the reasoning space is |
| **Attractor stability** | Convergence likelihood estimate (0 = unstable, 1 = stable) |

---

## Quick start

```bash
git clone https://github.com/malkavai-misty/rlm-lite.git
cd rlm-lite
npm install
cp .env.example .env.local
# Edit .env.local — add ANTHROPIC_API_KEY or OPENAI_API_KEY
npm run dev
```

Open http://localhost:3000, enter a prompt, run a cycle.

**Supported providers:** Anthropic Claude (recommended), OpenAI, any OpenAI-compatible endpoint.

---

## Architecture

```
src/
├── lib/
│   ├── types.ts              # Core types: Claim, Friction, DebateCycle
│   ├── providers.ts          # Provider abstraction (Anthropic / OpenAI)
│   ├── claim-extractor.ts    # Atomic claim extraction per agent role
│   ├── friction-detector.ts  # Contradiction detection + classification
│   └── debate-engine.ts      # Full cycle orchestration
└── app/
    ├── page.tsx              # Interactive sandbox UI
    └── api/run/route.ts      # POST /api/run — runs a debate cycle
```

The pipeline is intentionally transparent. Every function does one thing:

- **`extractClaims`** — three agents run in parallel, each given a role-specific system prompt, each returning 3–5 atomic claims
- **`detectFrictions`** — a single LLM pass comparing all claims pairwise, classifying each contradiction by type
- **`runDebateCycle`** — orchestrates extraction → friction detection → synthesis, returns a typed `DebateCycle` object

The output JSON is the artifact. It is designed to be diff-able, auditable, and feed-able into downstream analysis pipelines.

---

## Lite vs. the full RLM system

RLM Lite exposes the core claim-level pipeline. The full Resonance Lattice Model research system includes additional components not published here:

| Component | Lite | Full RLM |
|---|---|---|
| Claim extraction (Proposer / Challenger / Explorer) | ✓ | ✓ |
| Friction classification | ✓ | ✓ |
| Basic metrics (density, stability) | ✓ | ✓ |
| JSON export | ✓ | ✓ |
| Frame Transition Analyzer | — | ✓ |
| Accretion system (cross-cycle memory) | — | ✓ |
| Escalation governance | — | ✓ |
| Resonance scoring | — | ✓ |
| URRP theorem registry integration | — | ✓ |

The **Frame Transition Analyzer** is a novel instrumentation component that detects *frame-stickiness* — when a synthesis reaches a correct conclusion while internally retaining the initial frame's organizational structure rather than genuinely adopting the challenger's framing. This signal is not included in Lite.

---

## Research context

RLM Lite is derived from the **Resonance Lattice Model (RLM)**, a component of the **Unified Reasoning Robustness Protocol (URRP)** research program.

URRP is a formal framework for measuring reasoning stability in large language model systems across six invariant dimensions (I₁–I₆), where I₂ (Substrate Invariant) serves as the foundational substrate layer.

Published papers:
- **I₂: Substrate Invariant** — [doi:10.5281/zenodo.20799847](https://zenodo.org/doi/10.5281/zenodo.20799847)
- **CSA: Constraint Stability Analysis** — [doi:10.5281/zenodo.20822051](https://zenodo.org/doi/10.5281/zenodo.20822051)

---

## License

MIT. Use it, fork it, extend it. If you build something interesting on top, open an issue.

---

*Built by [@Malkavai-Misty](https://github.com/malkavai-misty). Part of the URRP research program.*
