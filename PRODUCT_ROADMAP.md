# Product Roadmap: SMART-SCAN EW — Adaptive Receiver Scheduler

**Problem ID:** SIH26055
**Problem:** Development of Smart Scan Strategy for Electronic Warfare in the absence of prior reliable intelligence
**Date:** September 2026
**Document Version:** 1.0

---

## Executive Summary

SMART-SCAN EW is a research prototype demonstrating intelligent frequency-band scheduling for electronic warfare receivers operating without prior emitter intelligence. The system learns emitter behavior patterns in real-time and uses exploration-exploitation optimization (LinUCB + graph-enhanced prediction) to maximize intercept probability.

This roadmap covers three phases:

1. **Phase 1 — Prototype Validation** (Current → Hackathon Demo): Polish the existing working prototype, fix remaining bugs, and prepare a compelling demonstration.
2. **Phase 2 — Research Platform** (Post-Hackathon, 3–6 months): Transform the prototype into a configurable research platform suitable for experimentation and academic publication.
3. **Phase 3 — Deployment Research** (6–18 months): Explore hardware integration, enterprise architecture, and field validation — acknowledging this is a long-term research direction, not a near-term deliverable.

**Current State:** The system is a functional prototype with a working RF simulation, 4 schedulers, 7 intelligence layers, 7 evaluation scenarios, an integrated dashboard with 10+ visualization panels, explainable AI (Decision Trace), and optional Firebase authentication. The adaptive scheduler outperforms baselines in correlated and environment-change scenarios (100% intercept rate vs 0–17%).

---

# PHASE 1: PROTOTYPE VALIDATION

**Timeline:** Current → Hackathon Demo (2–4 weeks)
**Goal:** Ship a polished, bug-free hackathon demo that convincingly demonstrates intelligent frequency scheduling with explainable decisions.

## 1.1 Priority Scheduler Evaluation Fix

| Attribute | Detail |
|-----------|--------|
| **What** | The Priority scheduler shows 0 intercept rate in evaluation because the evaluation runner uses simplified `bandMetrics` instead of the full `FrequencyActivityMap` intelligence layer. This is a known bug — the Priority scheduler works correctly in the dashboard but not in the evaluation harness. |
| **Technical Objective** | Refactor `run-evaluation.ts` to instantiate and update full intelligence layers (FrequencyActivityMap, TemporalMemory, LinkGraph, PatternFingerprint) for all schedulers, not just the Adaptive scheduler. Ensure Priority scheduler receives live band metrics and exploration scores during evaluation. |
| **Business Objective** | Honest comparative evaluation. Judges should see that the Priority scheduler is a meaningful baseline, not a zero-performing straw man. This strengthens the case that the Adaptive scheduler's advantage is genuine. |
| **Proof of Success** | `npm run eval` shows non-zero intercept rates for Priority across all 7 scenarios. Priority outperforms Sequential/Random but underperforms Adaptive — the expected hierarchy. |
| **Expected Risks** | Low technical risk — the intelligence layers already exist and work. Main risk is accidentally breaking the Adaptive scheduler's evaluation by changing shared initialization code. Mitigate with scenario-level regression testing. |

## 1.2 Unit Tests for Core Modules

| Attribute | Detail |
|-----------|--------|
| **What** | Currently no unit tests exist. Core modules — frequency map scoring, temporal memory hit/miss tracking, periodicity detection, pattern similarity, transition graph probabilities, LinUCB arm selection — are untested. |
| **Technical Objective** | Write unit tests for `frequency-map.ts`, `temporal-memory.ts`, `pattern-fingerprint.ts`, `link-graph.ts`, `prediction.ts`, and `baseline.ts`. Use Vitest (already configured). Target: 80%+ line coverage on scheduler modules. Focus on edge cases: empty histories, single-observation state, zero-confidence predictions. |
| **Business Objective** | Confidence that the intelligence layers produce correct outputs. Critical for hackathon Q&A when judges ask "how do you verify this isn't just random?" |
| **Proof of Success** | `npm test` passes. `npm run test:coverage` shows ≥80% on scheduler modules. Key invariants verified: periodicity detector returns period ±1 for clean periodic signals, transition graph probabilities sum to ~1.0, exploration bonus decays with visits. |
| **Expected Risks** | Medium effort — deterministic seeded randomness helps testability, but the modules have complex internal state. Risk of brittle tests that encode implementation details rather than behavior. Focus on behavioral contracts. |

## 1.3 Scenario Configuration UI

| Attribute | Detail |
|-----------|--------|
| **What** | Scenarios are currently hardcoded in `scenarios.ts`. Users cannot modify emitter count, behavior types, band assignments, or timing without editing source code. |
| **Technical Objective** | Add a scenario configuration panel to the dashboard: sliders/dropdowns for number of emitters, behavior type per emitter (static, periodic, agile, burst, correlated), active band range, simulation duration, and noise level. Store custom configurations in browser localStorage. Maintain the 7 built-in scenarios as presets. |
| **Business Objective** | Judges can explore "what if" scenarios live during the demo. "Watch what happens when we add a correlated emitter pair" is a compelling demo moment. |
| **Proof of Success** | A user can create a custom scenario from the UI, run it, and see the Adaptive scheduler respond to the custom emitter mix. Built-in presets still work identically. |
| **Expected Risks** | Low-medium risk. The simulation infrastructure already accepts configuration objects. Main work is the UI panel and serialization. Risk of breaking scenario reproducibility if custom configs aren't seeded properly. |

## 1.4 Export Simulation Results

| Attribute | Detail |
|-----------|--------|
| **What** | There is no way to export simulation data. Evaluation results exist only in memory. |
| **Technical Objective** | Add "Export Results" button that generates: (a) CSV file with per-step metrics (time, band scanned, hit/miss, Pd, FAR, active scheduler score), (b) JSON file with full simulation state (observations, predictions, confidence, pattern classifications). Use browser `Blob` + `URL.createObjectURL` for download. Include scenario metadata and scheduler config in export header. |
| **Business Objective** | Enable post-hoc analysis. Judges and researchers can download data and verify claims independently. Enables reproducibility. |
| **Proof of Success** | Click "Export" → downloads a CSV that opens in Excel with readable columns. JSON import restores simulation state for visualization. |
| **Expected Risks** | Low risk. Straightforward serialization. Main concern is file size for long simulations — mitigate with configurable export granularity (every N steps). |

## 1.5 WebGL Visualizations for Performance

| Attribute | Detail |
|-----------|--------|
| **What** | The dashboard uses HTML5 Canvas for the Live Spectrum, 360° Activity Matrix, and Link Graph. With many bands (>50), rendering performance degrades noticeably. |
| **Technical Objective** | Replace Canvas rendering with WebGL (via raw WebGL2 or PixiJS) for the Activity Matrix and Spectrum panels. Keep Canvas for the Link Graph (d3-force is already performant). Implement progressive rendering: only update visible regions, batch draw calls, use instanced rendering for repeated elements. |
| **Business Objective** | Smooth demo with 100+ frequency bands. Judges see real-time updates without jank. Professional impression. |
| **Proof of Success** | Dashboard runs at 60fps with 100 bands active. No dropped frames during simulation. Memory usage stays under 200MB. |
| **Expected Risks** | Medium-high effort. WebGL has a steep debugging curve and browser compatibility concerns. Risk of spending too much time on rendering polish at the expense of core algorithm improvements. Mitigate: only invest if Canvas performance is demonstrably insufficient for the demo scenario (typically 30–50 bands). |

---

### Phase 1 Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| Priority scheduler eval fix merged | Week 1 | `npm run eval` shows correct Priority scores |
| Unit tests written and passing | Week 2 | ≥80% coverage on scheduler modules |
| Scenario config UI functional | Week 3 | Custom scenario runs end-to-end |
| Export working | Week 3 | CSV/JSON download with complete data |
| WebGL rendering (if needed) | Week 4 | 60fps at 100 bands |
| Demo-ready build | Week 4 | `npm run build` succeeds, deployed to Vercel |

### Phase 1 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Priority eval fix breaks Adaptive eval | Medium | High | Run full scenario suite before/after; compare metric deltas |
| WebGL effort exceeds time budget | Medium | Medium | Set hard timebox (1 week); fall back to optimized Canvas |
| Export data format too large | Low | Low | Configurable granularity; compress with gzip |
| Unit test flakiness | Low | Medium | Use seeded randomness; deterministic inputs |

### Phase 1 Success Criteria

- [ ] All 4 schedulers show non-zero, meaningful evaluation metrics across 7 scenarios
- [ ] Unit test coverage ≥80% on scheduler modules
- [ ] Custom scenarios configurable from UI
- [ ] Results exportable as CSV/JSON
- [ ] Production build passes TypeScript strict mode
- [ ] Demo runs smoothly at localhost with `npm run dev`
- [ ] Decision Trace panel shows explainable reasoning for every scheduler decision

---

# PHASE 2: RESEARCH PLATFORM

**Timeline:** Post-Hackathon, 3–6 months
**Goal:** Transform the prototype into a configurable research platform for experimentation, ablation studies, and academic publication. The system should support researchers running controlled experiments with reproducible results.

## 2.1 Multi-Receiver Coordination Simulation

| Attribute | Detail |
|-----------|--------|
| **What** | Currently the system simulates a single receiver scanning independently. Real EW environments have multiple receivers that must coordinate to cover the frequency space efficiently. |
| **Technical Objective** | Extend the simulation engine to support N receivers with independent or coordinated scheduling. Each receiver has its own bandwidth, dwell time, and scan state. Add coordination modes: independent (no communication), shared-map (all receivers update the same frequency map), partitioned (receivers divide the band), and cooperative (receivers share observations in real-time). Maintain deterministic reproducibility. |
| **Business Objective** | Multi-receiver coordination is a realistic operational scenario. This capability is essential for any discussion with defense researchers or procurement officers. |
| **Proof of Success** | Simulation runs with 3 receivers in cooperative mode. Observation rate is ≥2x single-receiver. Frequency map builds faster. Evaluation shows measurable improvement over independent operation. |
| **Expected Risks** | High complexity. The simulation loop must handle concurrent receiver state, shared intelligence layers, and coordination latency. Risk of combinatorial explosion in evaluation scenarios. Mitigate: start with 2 receivers, add N later. |

## 2.2 Receiver Handoff Protocols

| Attribute | Detail |
|-----------|--------|
| **What** | When multiple receivers operate, there must be protocols for handing off frequency bands between them — e.g., if one receiver detects a signal, it hands off tracking to another receiver with better SNR or closer frequency alignment. |
| **Technical Objective** | Implement handoff logic: trigger conditions (SNR threshold, confidence level, frequency proximity), handoff message format, target receiver selection algorithm. Model handoff latency as a configurable parameter. Evaluate the impact of handoff delay on intercept performance. |
| **Business Objective** | Handoff is a realistic operational requirement. Demonstrating intelligent handoff strengthens the system's credibility for real-world deployment scenarios. |
| **Proof of Success** | In a 3-receiver scenario, the system executes handoffs when SNR conditions favor it. Handoff success rate >80%. Interception time improves by ≥15% vs no-handoff baseline. |
| **Expected Risks** | Medium complexity. Handoff logic interacts with the scheduler in non-trivial ways. Risk of over-engineering — keep protocols simple and extensible. |

## 2.3 Dynamic Bandwidth Allocation

| Attribute | Detail |
|-----------|--------|
| **What** | The receiver has fixed instantaneous bandwidth. In reality, bandwidth could be dynamically allocated — wider bandwidth for initial scanning, narrower for detailed analysis of interesting bands. |
| **Technical Objective** | Add configurable bandwidth modes: wideband scan (fast but low resolution), narrowband analysis (slow but high resolution), and adaptive (scheduler controls bandwidth based on confidence). Integrate bandwidth control into the scheduler's action space. |
| **Business Objective** | Dynamic bandwidth is a realistic receiver capability. This extends the scheduler's decision space and demonstrates more sophisticated control. |
| **Proof of Success** | Adaptive bandwidth scheduler achieves higher Pd with lower FAR than fixed-bandwidth scheduler. Narrowband analysis mode detects weak signals that wideband scanning misses. |
| **Expected Risks** | Medium complexity. Changes the scheduler's action space, requiring modifications to LinUCB. Risk of making the action space too large — mitigate with a small number of discrete bandwidth modes. |

## 2.4 Confidence-Aware Scheduling

| Attribute | Detail |
|-----------|--------|
| **What** | The scheduler currently scores bands based on predicted activity. It should also factor in prediction confidence — spending more time validating uncertain predictions rather than repeatedly scanning high-confidence bands. |
| **Technical Objective** | Add confidence score to each band prediction. Implement confidence-aware acquisition function: UCB variant that explicitly balances exploitation (high predicted value) against validation (reduce uncertainty). Track prediction accuracy over time and adjust confidence calibration. |
| **Business Objective** | More intelligent scheduling that avoids redundancy. Demonstrates mature understanding of exploration-exploitation tradeoffs. |
| **Proof of Success** | Confidence-aware scheduler reduces redundant scans of known-active bands by ≥30% while maintaining same intercept rate. Confidence scores are well-calibrated (predicted 80% confidence → actual 80% hit rate). |
| **Expected Risks** | Low-medium complexity. The prediction layer already outputs confidence scores. Main risk is over-tuning the acquisition function to specific scenarios. |

## 2.5 Anomaly Detection

| Attribute | Detail |
|-----------|--------|
| **What** | Emitters may change behavior unexpectedly — a previously static emitter starts frequency hopping, or a new emitter appears. The system should detect these anomalies. |
| **Technical Objective** | Implement anomaly detection: compare observed band behavior against learned patterns using residual analysis. Flag bands where observed statistics diverge significantly from predicted patterns. Add anomaly severity scoring (low/medium/high). Integrate anomaly events into the Decision Trace panel. |
| **Business Objective** | Anomaly detection is operationally critical — unexpected emitter changes can indicate threat escalation. This capability is a significant differentiator. |
| **Proof of Success** | System detects behavior change within 2 scan cycles of onset. False anomaly rate <10%. Anomalies appear in Decision Trace with reasoning. |
| **Expected Risks** | Medium complexity. Anomaly detection requires statistical thresholds that may need tuning per scenario. Risk of too many false positives drowning real anomalies. |

## 2.6 Change-Point Detection

| Attribute | Detail |
|-----------|--------|
| **What** | Closely related to anomaly detection — specifically, detecting when an emitter transitions from one behavioral mode to another (e.g., periodic → burst). |
| **Technical Objective** | Implement change-point detection using CUSUM (Cumulative Sum) or Bayesian Online Change Point Detection on per-band observation streams. Detect mode transitions and trigger pattern reclassification. Add change-point events to the timeline. |
| **Business Objective** | Understanding when emitters change modes enables proactive re-scheduling. Demonstrates temporal reasoning sophistication. |
| **Proof of Success** | Change points detected within 1–3 samples of actual transition. Pattern engine reclassifies emitter behavior correctly after change. Timeline shows change-point events. |
| **Expected Risks** | Medium complexity. Change-point detection is well-studied but parameter-sensitive. Risk of sensitivity/recall tradeoff. |

## 2.7 Scenario Editor (Custom Emitter Behaviors)

| Attribute | Detail |
|-----------|--------|
| **What** | The scenario configuration UI (Phase 1) allows selecting from predefined behavior types. A full scenario editor would allow defining custom emitter behaviors with parameterized timing, frequency patterns, and correlations. |
| **Technical Objective** | Build a visual scenario editor: drag-and-drop emitter placement on a timeline, define frequency patterns as sequences of (band, duration, probability) tuples, define correlation links between emitters, set noise profiles. Save/load scenario definitions as JSON. |
| **Business Objective** | Enables researchers to define custom test scenarios without code changes. Critical for academic publication — reviewers expect custom experimental setups. |
| **Proof of Success** | User creates a custom emitter behavior (e.g., "hop between 3 bands with 0.3s dwell, 0.1s gap, restart after 5s silence") from the UI. Simulation runs with the custom emitter. Results are reproducible. |
| **Expected Risks** | High complexity. Visual editor is significant UI work. Risk of scope creep — limit to timeline-based definition, not a full visual programming environment. |

## 2.8 Experiment Comparison Mode

| Attribute | Detail |
|-----------|--------|
| **What** | Currently evaluation runs one scenario at a time. Researchers need to compare multiple runs side-by-side with different parameters. |
| **Technical Objective** | Add experiment management: save experiment configurations, run multiple experiments sequentially, display side-by-side comparison charts (metrics, timeline, patterns). Store experiment results in IndexedDB for persistence across sessions. |
| **Business Objective** | Essential for ablation studies and parameter sensitivity analysis. Enables rigorous experimental methodology. |
| **Proof of Success** | User runs 3 experiments with different scheduler configs, views side-by-side metric comparison, and exports comparison as a table. |
| **Expected Risks** | Medium complexity. Storage management and UI layout for comparison views. Risk of performance issues with many concurrent experiments. |

## 2.9 Replay Mode

| Attribute | Detail |
|-----------|--------|
| **What** | There is no way to replay a past simulation. Users must re-run the entire simulation to revisit a specific moment. |
| **Technical Objective** | Record full simulation state at each time step (scheduler choice, observations, predictions, patterns, confidence). Implement playback controls: play, pause, step forward/back, speed control, jump to time. Allow timeline scrubbing. Store recordings in IndexedDB with metadata. |
| **Business Objective** | Enables detailed post-hoc analysis and presentation. "Let me show you what happened at t=42s when the emitter switched behavior" is a powerful demo technique. |
| **Proof of Success** | User records a simulation, replays it, scrubs to any time step, and sees the exact state of all intelligence layers at that moment. |
| **Expected Risks** | Medium complexity. Storage overhead is significant (full state per step). Mitigate with delta compression and configurable recording granularity. |

## 2.10 Exportable Evaluation Reports (CSV/JSON/PDF)

| Attribute | Detail |
|-----------|--------|
| **What** | Phase 1 adds CSV/JSON export for raw data. This extends to formatted evaluation reports. |
| **Technical Objective** | Generate structured reports: summary metrics table, per-scenario breakdown, scheduler comparison charts, timeline visualization snapshots. Export as CSV (for data analysis), JSON (for programmatic access), and optionally PDF (for presentations) using a client-side PDF library. |
| **Business Objective** | Researchers need publication-quality output. Defense clients expect formatted reports. |
| **Proof of Success** | One-click export produces a CSV with all metrics, a JSON with full state, and a PDF with charts and summary text. |
| **Expected Risks** | Low-medium complexity. PDF generation is the main effort. CSV/JSON are straightforward. |

## 2.11 Model Versioning

| Attribute | Detail |
|-----------|--------|
| **What** | As the scheduler algorithm evolves, there is no way to track which version of the model produced which results. |
| **Technical Objective** | Implement model versioning: assign version hashes to scheduler configurations, record which model version produced each evaluation result, store model metadata (hyperparameters, training data hash, version timestamp). Display version in UI and export. |
| **Business Objective** | Essential for reproducibility and audit trails. Researchers need to know exactly which algorithm version produced which result. |
| **Proof of Success** | Each evaluation run records the model version hash. Results can be filtered by model version. Version history shows parameter changes between versions. |
| **Expected Risks** | Low complexity. Metadata management and storage. |

## 2.12 Audit Logs

| Attribute | Detail |
|-----------|--------|
| **What** | There is no record of user actions or system decisions beyond the current session. |
| **Technical Objective** | Implement structured audit logging: record all user actions (scenario selection, parameter changes, start/stop), scheduler decisions (with reasoning from Decision Trace), and evaluation results. Store in IndexedDB with timestamps and user identity (if authenticated). Provide log viewer in UI and export. |
| **Business Objective** | Defense and government contexts require audit trails. This is a compliance prerequisite for any real deployment discussion. |
| **Proof of Success** | Log viewer shows chronological record of all actions and decisions. Export produces machine-readable audit log. |
| **Expected Risks** | Low complexity. Straightforward event logging. Main concern is log volume — implement rotation and configurable verbosity. |

## 2.13 Confidence Calibration

| Attribute | Detail |
|-----------|--------|
| **What** | The prediction layer outputs confidence scores, but these may not be well-calibrated (e.g., 80% confidence does not correspond to 80% actual accuracy). |
| **Technical Objective** | Implement calibration analysis: bin predictions by confidence, compute actual accuracy per bin, plot calibration curve (reliability diagram). Add Platt scaling or isotonic regression for post-hoc calibration. Track calibration drift over simulation time. |
| **Business Objective** | Well-calibrated confidence scores are essential for trust in automated decision-making. Military operators need to know how much to trust the system's predictions. |
| **Proof of Success** | Calibration curve shows predicted confidence closely tracks actual accuracy (ECE < 0.1). After calibration, ECE < 0.05. |
| **Expected Risks** | Low complexity. Statistical analysis of existing prediction data. |

## 2.14 Ablation Studies

| Attribute | Detail |
|-----------|--------|
| **What** | There is no way to test the contribution of individual intelligence layers (e.g., "how much does the transition graph add beyond the frequency map?"). |
| **Technical Objective** | Implement ablation mode: toggle individual intelligence layers on/off, run evaluation with each combination, compare metrics. Display ablation results as a contribution table (layer → metric improvement). Automate full factorial ablation over all layers. |
| **Business Objective** | Essential for academic publication — reviewers expect ablation studies. Demonstrates rigorous scientific methodology. |
| **Proof of Success** | Ablation study shows each layer's marginal contribution. Full ablation completes in <5 minutes for 7 scenarios. Results exportable as a table. |
| **Expected Risks** | Low complexity. The layers are already modular — ablation is toggling instantiation. Main risk is combinatorial explosion with many layers. |

## 2.15 Robustness Testing

| Attribute | Detail |
|-----------|--------|
| **What** | The system is tested against 7 fixed scenarios. There is no systematic evaluation of robustness to noise, parameter variation, or adversarial conditions. |
| **Technical Objective** | Implement robustness testing: vary noise levels (±50%), band count (10–200), emitter density (sparse to congested), timing jitter, and detection threshold. Generate robustness curves showing metric degradation as conditions worsen. Add perturbation testing (random parameter perturbation within bounds). |
| **Business Objective** | Defense systems must degrade gracefully under stress. Robustness evidence is essential for credibility. |
| **Proof of Success** | Robustness curves show smooth degradation (no cliff effects). System maintains >50% intercept rate at 2x nominal noise level. |
| **Expected Risks** | Medium complexity. Requires many evaluation runs. Mitigate with parallel execution and progress tracking. |

## 2.16 Adversarial Emitters

| Attribute | Detail |
|-----------|--------|
| **What** | All current emitter models are cooperative — they follow predictable patterns. Real adversaries may actively try to evade detection. |
| **Technical Objective** | Implement adversarial emitter models: frequency-agile with anti-pattern behavior (switching after detection), decoy emitters (appear active but transmit no information), deceptive emitters (mimic patterns of other emitters), coordinated jamming (multiple emitters targeting the same band simultaneously). |
| **Business Objective** | Demonstrates the system's resilience against intelligent adversaries. Critical for any realistic EW evaluation. |
| **Proof of Success** | Adaptive scheduler maintains >60% intercept rate against adversarial emitters. Baseline schedulers degrade significantly more. |
| **Expected Risks** | High complexity. Adversarial models are hard to define rigorously. Risk of creating adversarial scenarios that are trivially easy or impossibly hard. |

## 2.17 Uncertainty-Aware Prediction

| Attribute | Detail |
|-----------|--------|
| **What** | The prediction layer outputs point estimates with confidence, but does not model full uncertainty distributions. |
| **Technical Objective** | Extend predictions to probability distributions (e.g., Gaussian processes or ensemble-based uncertainty). Use uncertainty to drive exploration — bands with high uncertainty get higher exploration priority. Implement Thompson sampling as an alternative to UCB. |
| **Business Objective** | More principled exploration-exploitation. Demonstrates statistical sophistication. |
| **Proof of Success** | Thompson sampling scheduler achieves comparable or better intercept rate than UCB with fewer redundant scans. Uncertainty estimates are well-calibrated. |
| **Expected Risks** | Medium complexity. Gaussian processes are computationally expensive for large band counts. Mitigate with ensemble approximations. |

## 2.18 Human-in-the-Loop Approval

| Attribute | Detail |
|-----------|--------|
| **What** | The scheduler operates autonomously. In operational contexts, a human operator may need to approve or override scheduling decisions. |
| **Technical Objective** | Add approval mode: scheduler proposes next scan, operator approves/modifies/rejects, scheduler learns from operator feedback. Model operator preferences over time. Add operator response time tracking. |
| **Business Objective** | Human-in-the-loop is a realistic operational mode. Demonstrates understanding of real-world deployment constraints. |
| **Proof of Success** | Operator can approve/override scheduler decisions. System adapts to operator preferences (reduces overrides over time). Response time tracked. |
| **Expected Risks** | Low-medium complexity. UI for approval workflow is straightforward. Main risk is making the approval process too slow for real-time operation. |

## 2.19 Alert Prioritization

| Attribute | Detail |
|-----------|--------|
| **What** | When multiple detections occur simultaneously, there is no prioritization of which alerts to surface to the operator. |
| **Technical Objective** | Implement alert prioritization: score alerts by (a) emitter threat level (if known), (b) detection confidence, (c) novelty (new emitter vs known), (d) time since last detection. Surface top-K alerts. Implement alert deduplication (merge multiple detections of same emitter). |
| **Business Objective** | Operator attention is a scarce resource. Prioritized alerts reduce cognitive load and improve response time. |
| **Proof of Success** | Alert queue shows prioritized list with reasoning. Novel emitters surface above known emitters. Alert deduplication reduces noise by ≥50%. |
| **Expected Risks** | Low complexity. Scoring function is straightforward. Main risk is tuning weights for different operational contexts. |

---

### Phase 2 Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| Multi-receiver simulation | Month 2 | 3 receivers coordinate, >2x observation rate |
| Confidence-aware scheduling | Month 2 | Reduces redundant scans by ≥30% |
| Anomaly + change-point detection | Month 3 | Detects changes within 2 scan cycles |
| Experiment comparison + replay | Month 3 | Side-by-side comparison, full replay |
| Ablation studies | Month 4 | Full factorial ablation, contribution table |
| Adversarial emitters | Month 4 | Scheduler maintains >60% intercept rate |
| Model versioning + audit logs | Month 5 | Complete audit trail, version tracking |
| Uncertainty-aware prediction | Month 5 | Thompson sampling comparable to UCB |
| Human-in-the-loop + alert priority | Month 6 | Operator approval workflow functional |
| Confidence calibration | Month 6 | ECE < 0.05 after calibration |
| Research platform release | Month 6 | All features integrated, documentation complete |

### Phase 2 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Multi-receiver coordination too complex | High | High | Start with 2 receivers; additive coordination only |
| Adversarial emitter models poorly defined | Medium | Medium | Use published EW adversary models as reference |
| Feature scope exceeds 6-month budget | High | Medium | Prioritize features by publication value; defer low-impact items |
| Performance degrades with added complexity | Medium | Medium | Profile early; implement caching and lazy evaluation |
| Thompson sampling computationally expensive | Medium | Low | Use ensemble approximation; benchmark with 50 bands |

### Phase 2 Success Criteria

- [ ] Multi-receiver simulation with 3+ receivers in cooperative mode
- [ ] Confidence-aware scheduling reduces redundant scans by ≥30%
- [ ] Anomaly and change-point detection functional with <10% false positive rate
- [ ] Scenario editor allows custom emitter behavior definition from UI
- [ ] Experiment comparison mode with side-by-side metrics
- [ ] Full replay with timeline scrubbing
- [ ] Model versioning and audit logs for all evaluation runs
- [ ] Ablation study framework produces contribution tables
- [ ] Robustness curves for noise, band count, and emitter density
- [ ] Adversarial emitter models with measurable scheduler resilience
- [ ] Well-calibrated confidence scores (ECE < 0.1)
- [ ] Human-in-the-loop approval mode functional
- [ ] Alert prioritization with deduplication
- [ ] Research documentation suitable for academic submission

---

# PHASE 3: DEPLOYMENT RESEARCH

**Timeline:** 6–18 months
**Goal:** Explore paths toward real-world deployment, including hardware integration, enterprise architecture, and field validation. This phase is explicitly research-oriented — it identifies what is needed for deployment without committing to specific delivery timelines.

**Honest Assessment:** Government procurement timelines are measured in years, not months. Hardware integration requires access to real EW receivers, which is typically restricted. This phase establishes technical readiness and identifies gaps.

## 3.1 Hardware-in-the-Loop Support

| Attribute | Detail |
|-----------|--------|
| **What** | The system currently runs entirely in simulation. Hardware-in-the-loop (HIL) mode would connect the scheduler to a real or emulated receiver front-end, replacing the simulated receiver with actual RF hardware data. |
| **Technical Objective** | Define a hardware abstraction layer (HAL) that standardizes the interface between the scheduler and receiver hardware. Implement HIL adapter for SDR (Software Defined Radio) platforms (e.g., USRP, RTL-SDR). Handle real-time constraints: the scheduler must make decisions within the receiver's tuning latency. Add hardware-specific configuration (gain, sample rate, antenna selection). |
| **Business Objective** | HIL validation is the bridge between simulation and real deployment. Demonstrates that the scheduler works with real RF data, not just simulation artifacts. |
| **Proof of Success** | Scheduler controls a connected SDR to scan a real (or lab-generated) RF environment. Intercept rate is comparable to simulation. Decision latency <100ms. |
| **Expected Risks** | Very high complexity. Requires access to SDR hardware, RF lab environment, and signal generators. Real-time constraints may require significant architectural changes. Budget for hardware procurement and lab time. |

## 3.2 Secure APIs for External Simulators

| Attribute | Detail |
|-----------|--------|
| **What** | The system uses its own RF simulator. External simulators (e.g., professional EW simulation tools) may have higher fidelity or domain-specific models. |
| **Technical Objective** | Define a simulator API: standardized interface for external simulators to provide emitter states, channel conditions, and ground truth. Implement API adapters for common simulation formats. Support both batch mode (pre-computed scenarios) and streaming mode (real-time simulator integration). Secure API with authentication and rate limiting. |
| **Business Objective** | Interoperability with existing defense simulation tools. Reduces barrier to adoption — clients can use their existing simulator investment. |
| **Proof of Success** | External simulator feeds emitter data to the scheduler via API. Scheduler produces equivalent results to built-in simulator. API handles 1000 events/second without degradation. |
| **Expected Risks** | Medium complexity. API design is straightforward. Risk is defining a common format that works across diverse simulators. |

## 3.3 Model Management and Versioning

| Attribute | Detail |
|-----------|--------|
| **What** | Phase 2 introduces model versioning within the platform. This extends to a full model registry with lifecycle management. |
| **Technical Objective** | Implement model registry: store model artifacts (parameters, hyperparameters, training config), track model lineage (which data trained which model), support model promotion (dev → staging → production), implement model rollback. Integrate with audit logs for full traceability. |
| **Business Objective** | Enterprise-grade model management. Essential for any production deployment where models are updated iteratively. |
| **Proof of Success** | Model registry tracks 10+ model versions. Rollback to previous version works. Lineage shows data → model → evaluation results. |
| **Expected Risks** | Low-medium complexity. Storage and metadata management. |

## 3.4 Enterprise Deployment Architecture

| Attribute | Detail |
|-----------|--------|
| **What** | The current system is a single-user web application. Enterprise deployment requires multi-tenancy, isolation, and scalability. |
| **Technical Objective** | Design enterprise architecture: containerized deployment (Docker/Kubernetes), multi-tenant isolation (separate simulation environments per user/org), centralized authentication (LDAP/SAML integration), resource quotas and billing hooks, centralized logging and monitoring. |
| **Business Objective** | Enterprise architecture is a prerequisite for organizational adoption. Demonstrates production-readiness thinking. |
| **Proof of Success** | System deploys to Kubernetes. Multiple users run independent simulations simultaneously. Authentication integrates with LDAP. Resource usage is monitored and logged. |
| **Expected Risks** | High complexity. Significant infrastructure work. Budget for DevOps and cloud resources. |

## 3.5 Authorized Field Validation

| Attribute | Detail |
|-----------|--------|
| **What** | The system has never been tested outside the lab. Field validation in realistic EW environments is essential for credibility. |
| **Technical Objective** | Plan and execute field trials: (a) controlled lab environment with signal generators, (b) semi-controlled outdoor environment, (c) (if authorized) operational environment. Collect field data, compare with simulation results, identify simulation-reality gaps. Implement field data recording for future model training. |
| **Business Objective** | Field validation is the gold standard for defense technology credibility. Without it, claims remain theoretical. |
| **Proof of Success** | Field trial report showing: (a) scheduler performance in lab, (b) identified simulation-reality gaps, (c) recommended model adjustments, (d) comparison with human operator baseline. |
| **Expected Risks** | Very high risk. Requires government/military cooperation, security clearances, and specialized equipment. Timeline is uncertain — depends on partner availability and authorization. May not be achievable within 18 months. |

## 3.6 Certification and Compliance Preparation

| Attribute | Detail |
|-----------|--------|
| **What** | Defense systems require certification (e.g., MIL-STD compliance, NATO STANAG, national EW standards). No certification work has been started. |
| **Technical Objective** | Identify applicable standards and certification requirements. Document system architecture against standard requirements. Implement required security controls (encryption, access control, audit). Prepare certification documentation. |
| **Business Objective** | Certification is a prerequisite for operational deployment. Starting preparation early avoids delays later. |
| **Proof of Success** | Certification gap analysis complete. Documentation template populated. Security controls implemented for identified requirements. |
| **Expected Risks** | High risk. Certification requirements are complex and vary by jurisdiction. Requires specialized expertise. May require engagement with certification authorities. |

## 3.7 Role-Based Access Control (RBAC)

| Attribute | Detail |
|-----------|--------|
| **What** | Current authentication is binary — authenticated or not. Operational systems need role-based access. |
| **Technical Objective** | Implement RBAC: roles (Admin, Operator, Analyst, Viewer), permissions per role (configure scenarios, run simulations, view results, export data), per-resource access control (own simulations vs shared), audit trail of access decisions. |
| **Business Objective** | RBAC is a standard enterprise/defense requirement. Demonstrates operational maturity. |
| **Proof of Success** | User with Operator role cannot modify system configuration. Analyst can view all simulations but cannot run new ones. Access violations are logged. |
| **Expected Risks** | Low-medium complexity. Standard pattern implementation. |

## 3.8 Secure On-Premise Deployment

| Attribute | Detail |
|-----------|--------|
| **What** | The current system runs on Vercel (cloud). Defense environments often require on-premise deployment with no external network access. |
| **Technical Objective** | Package system for air-gapped deployment: containerized build with no external CDN dependencies, offline-capable (no cloud auth required), local data storage (no external telemetry), secure update mechanism (signed bundles). Remove all external network calls from the runtime path. |
| **Business Objective** | On-premise deployment is a hard requirement for classified or sensitive EW environments. |
| **Proof of Success** | System builds and runs in an air-gapped Docker container. No outbound network connections. All features functional without internet. |
| **Expected Risks** | Medium complexity. Removing cloud dependencies is mechanical but thorough. Main risk is hidden dependencies (analytics, CDN fonts, etc.). |

## 3.9 Offline Operation Mode

| Attribute | Detail |
|-----------|--------|
| **What** | The system requires a web browser and development server. Field deployment may need standalone operation. |
| **Technical Objective** | Implement offline mode: service worker for caching, IndexedDB for all data persistence, no network requirements. Optionally, package as Electron desktop application for standalone deployment. Implement data sync when connectivity is restored. |
| **Business Objective** | Field operators may not have reliable network connectivity. Offline operation is essential for tactical deployment. |
| **Proof of Success** | System runs in browser with no network. All simulation and visualization features work. Data persists across sessions. |
| **Expected Risks** | Low-medium complexity. Service workers and IndexedDB are well-understood. Main risk is ensuring all dependencies are bundleable for offline use. |

## 3.10 Synthetic Data Generation

| Attribute | Detail |
|-----------|--------|
| **What** | Real EW data is classified and scarce. The system could generate synthetic training data for model improvement. |
| **Technical Objective** | Implement synthetic data pipeline: generate large volumes of labeled RF scenarios using the existing simulator, with controlled variation in parameters. Export in standard formats (CSV, HDF5). Implement data quality checks (coverage, balance, edge cases). Support data augmentation (noise injection, timing variation, band remapping). |
| **Business Objective** | Synthetic data enables model training without access to classified data. Accelerates research iteration. |
| **Proof of Success** | Pipeline generates 10,000 labeled scenarios with controlled parameter distributions. Data quality metrics show adequate coverage. Export is compatible with standard ML frameworks. |
| **Expected Risks** | Low complexity. The simulator already generates data — this is packaging and quality assurance. |

## 3.11 Digital Twin Integration

| Attribute | Detail |
|-----------|--------|
| **What** | A digital twin would mirror a real EW system's state, enabling continuous learning and prediction validation against actual outcomes. |
| **Technical Objective** | Define digital twin architecture: real-time data ingestion from operational receivers, model update pipeline, prediction validation against observed outcomes, drift detection, automated retraining triggers. Implement as a research prototype (not production). |
| **Business Objective** | Digital twin is a strategic capability for continuous improvement. Long-term vision for operational deployment. |
| **Proof of Success** | Research prototype demonstrates: (a) real-time data ingestion, (b) model update within 1 hour of new data, (c) drift detection triggers retraining. |
| **Expected Risks** | Very high complexity. Requires operational data access and real-time infrastructure. More of a research direction than a deliverable within 18 months. |

## 3.12 Custom Scenario Development Services

| Attribute | Detail |
|-----------|--------|
| **What** | The scenario editor (Phase 2) is self-service. Some clients may need professionally developed custom scenarios. |
| **Technical Objective** | Define a scenario development service: client consultation, scenario specification, implementation using the scenario editor API, validation against client requirements, delivery and documentation. |
| **Business Objective** | Revenue stream for custom scenario development. Builds client relationships and domain expertise. |
| **Proof of Success** | Deliver 3 custom scenarios to beta clients. Client satisfaction score ≥4/5. Scenario development time <1 week per scenario. |
| **Expected Risks** | Low technical complexity, high business complexity. Requires client engagement and project management. |

## 3.13 Training Curriculum Development

| Attribute | Detail |
|-----------|--------|
| **What** | Operators and researchers need training on how to use the system effectively. |
| **Technical Objective** | Develop training materials: (a) operator guide (scenario configuration, result interpretation, alert response), (b) researcher guide (experiment design, ablation studies, result publication), (c) developer guide (architecture, extension points, API reference). Include video tutorials and interactive walkthroughs. |
| **Business Objective** | Training reduces support burden and improves adoption. Professional training materials demonstrate product maturity. |
| **Proof of Success** | Training curriculum covers 3 user personas. Interactive walkthrough available in-app. Documentation covers all features. |
| **Expected Risks** | Low technical complexity. Documentation and content creation effort. |

---

### Phase 3 Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| HAL and HIL adapter design | Month 8 | Interface specification complete |
| Simulator API specification | Month 9 | API documented, adapter implemented for one external sim |
| Model registry functional | Month 9 | Version tracking, lineage, rollback working |
| Enterprise architecture design | Month 10 | Docker/K8s deployment validated |
| RBAC implementation | Month 11 | Role-based access control working |
| On-premise deployment validated | Month 12 | Air-gapped Docker deployment verified |
| Offline mode functional | Month 12 | Service worker caching, all features offline |
| Synthetic data pipeline | Month 13 | 10,000 labeled scenarios generated |
| Field trial planning | Month 14 | Trial protocol approved, equipment identified |
| Certification gap analysis | Month 15 | Standards identified, gap analysis complete |
| HIL prototype (if hardware available) | Month 16 | Scheduler controls real SDR, comparable to simulation |
| Digital twin prototype | Month 17 | Real-time ingestion and model update demonstrated |
| Training curriculum v1 | Month 18 | Operator, researcher, and developer guides complete |

### Phase 3 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No access to SDR hardware for HIL | High | High | Partner with university EW lab; use emulated hardware |
| Field trial authorization delayed | High | High | Proceed with lab trials; treat field trials as stretch goal |
| Certification requirements unclear | Medium | Medium | Engage with defense standards body early |
| On-premise deployment reveals hidden dependencies | Medium | Medium | Systematic audit of all external calls; automated build verification |
| Digital twin scope exceeds 18-month budget | High | Low | Treat as research direction; document architecture without full implementation |

### Phase 3 Success Criteria

- [ ] Hardware abstraction layer defined and documented
- [ ] External simulator API functional with at least one adapter
- [ ] Model registry with versioning, lineage, and rollback
- [ ] Enterprise architecture validated with Kubernetes deployment
- [ ] RBAC implemented with 4 roles
- [ ] On-premise deployment verified in air-gapped environment
- [ ] Offline mode functional without network connectivity
- [ ] Synthetic data pipeline generating labeled scenarios
- [ ] Field trial protocol prepared (even if trials not yet conducted)
- [ ] Certification gap analysis complete
- [ ] Training curriculum covering 3 user personas
- [ ] Digital twin architecture documented (implementation optional)

---

# PRIORITY MATRIX

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| Priority Scheduler Eval Fix | High | Low | **High** | 1 |
| Unit Tests for Core Modules | High | Medium | **High** | 1 |
| Scenario Configuration UI | Medium | Medium | **Medium** | 1 |
| Export Simulation Results | Medium | Low | **Medium** | 1 |
| WebGL Visualizations | Low | High | **Low** | 1 |
| Multi-Receiver Coordination | High | High | **High** | 2 |
| Receiver Handoff Protocols | Medium | Medium | **Medium** | 2 |
| Dynamic Bandwidth Allocation | Medium | Medium | **Medium** | 2 |
| Confidence-Aware Scheduling | High | Low | **High** | 2 |
| Anomaly Detection | High | Medium | **High** | 2 |
| Change-Point Detection | Medium | Medium | **Medium** | 2 |
| Scenario Editor (Custom) | High | High | **Medium** | 2 |
| Experiment Comparison Mode | High | Medium | **High** | 2 |
| Replay Mode | Medium | Medium | **Medium** | 2 |
| Exportable Reports | Medium | Low | **Medium** | 2 |
| Model Versioning | Medium | Low | **Medium** | 2 |
| Audit Logs | Medium | Low | **Medium** | 2 |
| Confidence Calibration | Medium | Low | **Medium** | 2 |
| Ablation Studies | High | Low | **High** | 2 |
| Robustness Testing | High | Medium | **High** | 2 |
| Adversarial Emitters | High | High | **Medium** | 2 |
| Uncertainty-Aware Prediction | Medium | Medium | **Medium** | 2 |
| Human-in-the-Loop Approval | Medium | Medium | **Low** | 2 |
| Alert Prioritization | Medium | Low | **Medium** | 2 |
| Hardware-in-the-Loop | Very High | Very High | **Medium** | 3 |
| Secure APIs for External Simulators | Medium | Medium | **Medium** | 3 |
| Model Management (Full) | Medium | Medium | **Low** | 3 |
| Enterprise Deployment | High | Very High | **Medium** | 3 |
| Field Validation | Very High | Very High | **Medium** | 3 |
| Certification Prep | High | High | **Low** | 3 |
| RBAC | Medium | Low | **Medium** | 3 |
| On-Premise Deployment | High | Medium | **High** | 3 |
| Offline Operation | Medium | Low | **Medium** | 3 |
| Synthetic Data Generation | Medium | Low | **Medium** | 3 |
| Digital Twin Integration | High | Very High | **Low** | 3 |
| Custom Scenario Services | Low | Low | **Low** | 3 |
| Training Curriculum | Medium | Low | **Medium** | 3 |

---

# DEPENDENCY MAP

## Phase 1 Dependencies

```
Priority Eval Fix ──→ (independent)
Unit Tests ──→ (independent, but should test existing code first)
Scenario Config UI ──→ (independent of above)
Export Results ──→ (independent, but benefits from Scenario Config)
WebGL Visualizations ──→ (independent, lowest priority)
```

## Phase 2 Dependencies

```
Confidence-Aware Scheduling ──→ (extends existing prediction layer)
Anomaly Detection ──→ (uses pattern-fingerprint, temporal-memory)
Change-Point Detection ──→ (extends anomaly detection)
Multi-Receiver Coordination ──→ Receiver Handoff Protocols ──→ Dynamic Bandwidth Allocation
Experiment Comparison ──→ Replay Mode (shared state recording)
Model Versioning ──→ Audit Logs (shared metadata infrastructure)
Ablation Studies ──→ Robustness Testing (shared evaluation framework)
Adversarial Emitters ──→ Uncertainty-Aware Prediction (both need adversarial evaluation)
Scenario Editor ──→ Experiment Comparison (custom scenarios feed experiments)
Confidence Calibration ──→ (independent, but benefits from more data)
Human-in-the-Loop ──→ Alert Prioritization (operator interface)
Exportable Reports ──→ (independent, benefits from all above)
```

## Phase 3 Dependencies

```
HAL Design ──→ HIL Prototype (hardware access required)
Simulator API ──→ External Simulator Integration
Model Management ──→ Enterprise Deployment
RBAC ──→ Enterprise Deployment
On-Premise Deployment ──→ Offline Operation
Synthetic Data ──→ (independent, benefits from simulator maturity)
Digital Twin ──→ (independent, long-term research)
Field Validation ──→ Certification Prep (field data informs certification)
Training Curriculum ──→ (independent, benefits from feature stability)
Custom Scenario Services ──→ Scenario Editor (Phase 2 prerequisite)
```

---

# TECHNICAL ARCHITECTURE EVOLUTION

## Current Architecture (Phase 1)

```
React 18 + TypeScript + Vite
├── src/rf-environment/    # Simulation (ground truth)
├── src/receiver/          # Virtual receiver + detection
├── src/scheduler/         # Intelligence layers + schedulers
├── src/evaluation/        # Metrics, scenarios, runner
├── src/ui/                # Dashboard components
├── src/firebase/          # Auth (optional)
└── src/simulation/        # CLI simulation runner
```

## Target Architecture (Phase 2)

```
React 18 + TypeScript + Vite
├── src/core/              # Core simulation engine (shared)
├── src/receivers/         # Single + multi-receiver support
├── src/scheduler/         # All scheduler variants
├── src/intelligence/      # Intelligence layers (expanded)
├── src/evaluation/        # Evaluation + ablation + robustness
├── src/experiment/        # Experiment management + comparison
├── src/replay/            # Recording + playback
├── src/ui/                # Dashboard + config + reports
└── src/data/              # IndexedDB + model registry
```

## Target Architecture (Phase 3)

```
┌─────────────────────────────────────────────────┐
│                Enterprise Layer                   │
│  RBAC │ Audit │ Model Registry │ Multi-Tenant    │
├─────────────────────────────────────────────────┤
│                API Layer                          │
│  Simulator API │ HAL │ WebSocket │ REST           │
├─────────────────────────────────────────────────┤
│                Core Engine                        │
│  Simulation │ Intelligence │ Schedulers           │
├─────────────────────────────────────────────────┤
│                Deployment                         │
│  Docker │ K8s │ On-Prem │ Offline │ Air-Gapped   │
└─────────────────────────────────────────────────┘
```

---

# RISK SUMMARY BY PHASE

## Phase 1: Prototype Validation

**Overall Risk: LOW**

| Category | Assessment |
|----------|------------|
| Technical | Low — all components exist; work is refinement and testing |
| Schedule | Low — 4 weeks is sufficient for listed features |
| Quality | Low — unit tests and eval fixes improve quality |
| Scope | Low — features are well-defined and bounded |

## Phase 2: Research Platform

**Overall Risk: MEDIUM**

| Category | Assessment |
|----------|------------|
| Technical | Medium — multi-receiver coordination and adversarial emitters are complex |
| Schedule | Medium — 6 months is tight for 19 features; prioritization is critical |
| Quality | Medium — ablation and robustness testing require careful implementation |
| Scope | High — 19 features is ambitious; expect 12–15 to be delivered |

## Phase 3: Deployment Research

**Overall Risk: HIGH**

| Category | Assessment |
|----------|------------|
| Technical | High — hardware integration, certification, and field validation are unpredictable |
| Schedule | High — external dependencies (hardware, authorization, partners) create uncertainty |
| Quality | High — defense standards compliance is complex and non-negotiable |
| Scope | High — many features depend on access to hardware and classified environments |

---

# SUCCESS CRITERIA SUMMARY

## Phase 1: Hackathon Demo Ready

The prototype is demo-ready when:
- All 4 schedulers produce meaningful evaluation metrics
- Core modules have unit test coverage
- Users can configure custom scenarios from the UI
- Results are exportable as CSV/JSON
- Decision Trace panel explains every scheduler decision
- Production build passes with no errors
- Demo runs smoothly at localhost with visual polish

## Phase 2: Research Platform Complete

The research platform is complete when:
- Multi-receiver coordination is functional and measurable
- Anomaly/change-point detection operational
- Ablation studies can be run with one click
- Experiment comparison and replay work
- Model versioning and audit trails are complete
- Documentation is suitable for academic publication
- At least 12 of 19 planned features are delivered

## Phase 3: Deployment Research Complete

Deployment research is complete when:
- Hardware abstraction layer is defined and documented
- On-premise deployment is verified
- Field trial protocol is prepared (trials themselves may not be conducted)
- Certification gap analysis is complete
- Training curriculum covers all user personas
- The system is positioned for real-world evaluation (timing depends on partner access)

---

# APPENDIX: CURRENT SYSTEM CAPABILITIES

For reference, the following capabilities are already implemented and working as of September 2026:

## Simulation Engine
- 6 emitter behavior types: static, periodic, frequency-agile, burst, correlated, adaptive
- Deterministic seeded randomness for reproducibility
- Ground truth strictly separated from receiver observations
- Configurable receiver parameters (bandwidth, dwell time, tuning time, detection threshold)

## Intelligence Layers
- Frequency Activity Map (live priority scoring)
- Temporal Memory (per-band hit/miss history, inter-arrival statistics)
- Periodicity Detection (autocorrelation-based)
- Periodic Optimizer (predictive scheduling)
- Transition Graph (learned frequency transitions)
- Correlation Graph (co-occurrence tracking)
- Pattern Fingerprint Engine (behavioral clustering)
- Prediction Layer (multi-source fusion)

## Schedulers
- Sequential (round-robin baseline)
- Random (seeded baseline)
- Priority (activity-based with exploration bonus)
- Adaptive (LinUCB + graph-enhanced exploration-exploitation)

## Evaluation
- 7 reproducible scenarios
- 6 metrics: Pd, FAR, Intercept Rate, Avg Intercept Time, Prediction Accuracy, Scan Efficiency
- Comparative evaluation runner
- Timeline event logging

## Visualization
- Live Spectrum (Canvas-based)
- 360° Activity Matrix (Frequency × Time)
- Dedicated Link Graph Analysis View (d3-force, full-screen)
- Global RF Intelligence Map (Leaflet, 3 map styles)
- Behavioral Patterns panel
- Frequency Activity Map (tabular)
- Performance Metrics panel
- Event Timeline
- Receiver Status panel
- Next Best Scan panel
- Decision Trace panel (explainable AI)
- Simulation Status bar

## Authentication
- Firebase Authentication (Google OAuth + Email/Password)
- Configurable Demo Access
- Protected routes
- Works without Firebase config (optional)

---

*Document generated September 2026. This roadmap reflects the current state of the SMART-SCAN EW prototype and realistic assessments of effort and risk. Timelines are estimates and should be adjusted based on available resources, partner engagement, and access to hardware/classified environments.*
