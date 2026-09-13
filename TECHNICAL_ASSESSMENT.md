# Technical Assessment: SMART-SCAN EW Adaptive Receiver Scheduler

## 1. Problem Statement Analysis

The SIH 2026 problem (SIH26055) requires developing a **Smart Scan Strategy for Electronic Warfare** in environments where **no prior reliable intelligence** about emitters exists. 

Key constraints:
- Receiver has limited instantaneous bandwidth vs. large total frequency coverage
- Must decide **which frequency band to scan next** and **when**
- Emitters are dynamic: intermittent, periodic, frequency-agile, correlated, behavior-changing
- No ground truth access during decision-making (critical for realism)
- Must demonstrate measurable improvement over baseline strategies

## 2. Generic Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RF ENVIRONMENT SIMULATOR                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Emitter     │  │ Noise       │  │ Ground      │             │
│  │ Models      │  │ Model       │  │ Truth       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RECEIVER SIMULATOR                           │
│  • Total frequency range    • Instantaneous bandwidth           │
│  • Scan dwell time          • Tuning/switching time             │
│  • Detection threshold      • Noise level                       │
│  • Observation interval     • Sensing uncertainty               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DETECTION ENGINE                             │
│  • Signal detection logic   • Hit/Miss classification           │
│  • Feature extraction       • SNR estimation                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ADAPTIVE SCHEDULER (CORE INTELLIGENCE)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Frequency   │  │ Temporal    │  │ Link Graph  │             │
│  │ Activity Map│  │ Memory      │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │               │               │                        │
│         └───────────────┼───────────────┘                        │
│                         ▼                                        │
│              ┌─────────────────────┐                             │
│              │ Prediction Layer    │                             │
│              └─────────────────────┘                             │
│                         │                                        │
│                         ▼                                        │
│              ┌─────────────────────┐                             │
│              │ Smart Scheduler     │                             │
│              │ (Exploration/Exploit)│                            │
│              └─────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    NEXT SCAN DECISION
                              │
                              └──────────→ Online Learning Loop
```

## 3. Unique Features We're Adding

| Feature | Description | Innovation |
|---------|-------------|------------|
| **Dynamic Frequency Map** | Live spectrum activity visualization with priority scoring | Real-time RF situational awareness |
| **360° RF Activity Matrix** | Frequency × Time temporal matrix for pattern detection | Spatio-temporal correlation discovery |
| **Link Graph** | Learned transition probabilities between frequency bands | Predictive hopping/correlation modeling |
| **Temporal Memory** | Per-band periodicity detection, inter-arrival statistics | Periodic emitter interception optimization |
| **Behavioral Fingerprints** | Clustering of detected patterns into behavioral signatures | Pattern-based generalization to unknown emitters |

## 4. Proposed Architecture (Modular, Testable)

```
src/
├── core/                    # Core types and interfaces
│   ├── types.ts            # TypeScript interfaces
│   ├── config.ts           # Configuration schemas
│   └── constants.ts        # Physical constants
├── rf-environment/         # Phase 1: RF Simulator
│   ├── emitter.ts          # Emitter models (static, periodic, agile, burst)
│   ├── noise.ts            # Noise/interference models
│   ├── ground-truth.ts     # Ground truth recorder (separate from receiver)
│   └── simulator.ts        # Main RF environment orchestrator
├── receiver/               # Phase 2: Receiver Model
│   ├── receiver.ts         # Virtual receiver with configurable params
│   ├── detection.ts        # Detection engine with uncertainty
│   └── observation.ts      # Observation/feature extraction
├── scheduler/              # Phase 3-9: Scheduling Intelligence
│   ├── baseline.ts         # Sequential, Random, Priority baselines
│   ├── frequency-map.ts    # Dynamic frequency activity map
│   ├── temporal-memory.ts  # Per-band temporal statistics
│   ├── link-graph.ts       # Transition probability graph
│   ├── pattern-fingerprint.ts # Behavioral clustering
│   ├── prediction.ts       # Prediction layer
│   ├── adaptive.ts         # Main adaptive scheduler
│   └── exploration.ts      # Exploration vs exploitation strategies
├── evaluation/             # Phase 4: Metrics & Evaluation
│   ├── metrics.ts          # Pd, FAR, Intercept Rate, etc.
│   ├── scenarios.ts        # Reproducible test scenarios (A-G)
│   ├── runner.ts           # Evaluation runner
│   └── comparison.ts       # Baseline vs Adaptive comparison
├── ui/                     # Phase 12: Dashboard
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   └── visualizations/     # Canvas/WebGL visualizations
└── main.ts                 # Application entry point
```

## 5. Technology Choices

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Language** | TypeScript | Type safety for complex state, interfaces |
| **Runtime** | Node.js (simulation) + Browser (UI) | Headless simulation, web dashboard |
| **Build** | Vite | Fast dev, optimized production build |
| **Testing** | Vitest | Fast, TypeScript-native |
| **Visualization** | HTML5 Canvas + WebGL | Performance for real-time spectrum/matrix |
| **State** | Zustand (or signals) | Lightweight, predictable state |
| **Math/Stats** | Custom + simple-statistics | Avoid heavy ML deps; statistical methods preferred |
| **Random** | seedrandom | Deterministic, reproducible simulations |

## 6. Algorithm Choice & Justification

### Baseline Schedulers (Deterministic)
- **Sequential**: Fixed round-robin - simplest reference
- **Random**: Uniform random - stochastic reference
- **Priority/Score**: Recent activity weighted - heuristic reference

### Adaptive Scheduler (Core Intelligence)
**Approach: Contextual Multi-Armed Bandit with Graph-Enhanced Priors**

Why not Deep RL?
- Sample efficiency: Bandits learn from hundreds of steps, not millions
- Explainability: Every decision traceable to features
- Deterministic debugging: Fixed seed = reproducible behavior
- Real-time: Microsecond decisions, no GPU needed

**Algorithm: LinUCB + Graph Propagation**
- Each frequency band = arm with context features
- Context: [time_since_hit, hit_rate, signal_strength, periodicity, graph_transition_prob, exploration_bonus]
- Linear reward model: `reward = θ·context + noise`
- Graph propagation: `P(band_j | band_i) = edge_weight_ij`
- Exploration: UCB bonus `α * sqrt(log(total) / n_arm)`

**Periodic Optimization**: Dedicated harmonic detector per band using autocorrelation on hit timestamps. When periodicity confidence > threshold, schedule predictive windows.

## 7. Data Flow

```
Time Step t:
1. Scheduler selects band B_t based on current state
2. Receiver tunes to B_t (incurs switching time)
3. Receiver dwells for dwell_time
4. RF Simulator computes ground truth at B_t, t
5. Detection Engine applies noise, threshold → Hit/Miss
6. Features extracted: SNR, timestamp, bandwidth estimate
7. All modules update:
   - FrequencyMap[B_t].update(hit/miss, features)
   - TemporalMemory[B_t].record(t, hit)
   - LinkGraph.update(prev_band, B_t, hit)
   - PatternFingerprint.cluster(features)
8. PredictionLayer.recompute()
9. Scheduler computes priorities for t+1
10. Metrics accumulate
```

## 8. Metrics (Quantitative Evaluation)

| Metric | Formula | Target |
|--------|---------|--------|
| **Probability of Detection (Pd)** | True Positives / (True Positives + False Negatives) | > 0.85 |
| **False Alarm Rate (FAR)** | False Positives / (False Positives + True Negatives) | < 0.15 |
| **Intercept Rate** | Intercepted Opportunities / Total Opportunities | > 0.80 |
| **Avg Intercept Time** | Mean(time_to_first_detection | emitter_active) | < 2× dwell |
| **Prediction Accuracy** | Correct Next-Band Predictions / Total Predictions | > 0.70 |
| **Scan Efficiency** | Productive Scans / Total Scans | > 0.60 |

## 9. Implementation Phases

| Phase | Deliverable | Est. Effort |
|-------|-------------|-------------|
| **1** | RF Environment Simulator (emitters, noise, ground truth) | 2-3 days |
| **2** | Receiver + Detection Model (configurable, uncertain) | 1-2 days |
| **3** | Baseline Schedulers (sequential, random, priority) | 1 day |
| **4** | Metrics + Evaluation Framework (scenarios A-G) | 1-2 days |
| **5** | Frequency Activity Map | 1 day |
| **6** | Temporal Activity Matrix (360° view) | 1 day |
| **7** | Temporal Memory + Periodicity Detection | 2 days |
| **8** | Link Graph (transition learning) | 1-2 days |
| **9** | Adaptive Scheduler (LinUCB + Graph) | 2-3 days |
| **10** | Exploration/Exploitation (adaptive UCB) | 1 day |
| **11** | Advanced Prediction (periodic optimization) | 1-2 days |
| **12** | Integrated Dashboard (live visualizations) | 2-3 days |

**Total: ~16-23 days**

## 10. Risks & Limitations

| Risk | Mitigation |
|------|------------|
| Over-engineering ML | Start with statistical methods; add ML only if gap demonstrated |
| Simulation-reality gap | Explicitly label approximations; no "military-grade" claims |
| Non-reproducible results | Fixed seeds everywhere; deterministic algorithms |
| UI blocking simulation | Headless simulation core; UI as separate consumer |
| Scope creep | Strict phase gates; demo-ready at each phase |
| Performance (1000s of steps) | Profile early; use typed arrays, object pooling |

## 11. Realistic SIH Demonstration Scope

**Must-have for demo (Phases 1-9):**
- Working RF simulator with 4+ emitter types
- 3 baseline schedulers + 1 adaptive scheduler
- Live dashboard showing: Spectrum, Matrix, Graph, Metrics
- Scenario runner with A-G scenarios
- Comparative results table

**Nice-to-have (Phases 10-12):**
- Behavioral fingerprint clustering
- Advanced periodic optimization
- Polished UI with timeline/events

**Out of scope:**
- Real RF hardware integration
- Classified EW techniques
- Large-scale distributed simulation

---

## Next Steps

1. Initialize project with Vite + TypeScript
2. Implement Phase 1: RF Environment Simulator
3. Implement Phase 2: Receiver + Detection
4. Implement Phase 3: Baseline Schedulers
5. Implement Phase 4: Metrics + Scenarios
6. Run first comparative evaluation
7. Continue with intelligence layers (5-9)
8. Build dashboard (12) in parallel with core

The repository is empty, so we start fresh with a clean architecture.