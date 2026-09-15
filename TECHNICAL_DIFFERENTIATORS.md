# SMART-SCAN EW — Technical Differentiators

## 1. Why SMART-SCAN EW is Different

Traditional electronic warfare scanning strategies follow fixed, predetermined patterns — round-robin sweeps across the frequency spectrum, or random jumps between bands. These approaches treat every band identically, wasting dwell time on empty spectrum while missing opportunities to revisit active emitters at precisely the right moment. SMART-SCAN EW fundamentally changes this paradigm by treating receiver scheduling as a learning problem rather than a coverage problem.

The core insight is that the electromagnetic spectrum is not uniformly occupied. Emitters exhibit structure: a radar pulses every 4 seconds, a frequency hopper follows a 6-band cycle, two communications systems activate together. Simple schedulers cannot exploit this structure. SMART-SCAN EW builds an evolving intelligence picture from raw observations. When the receiver detects a signal at 500 MHz with a 4-second inter-arrival pattern, the temporal memory records this. When the same emitter hops to 600 MHz on its next activation, the transition graph learns the link. When both a primary radar and a secondary comms system activate within the same 0.1-second window, the correlation graph connects them.

This intelligence drives scheduling decisions. Rather than asking "which band should I scan next?" uniformly, the Smart Scheduler asks "given what I have learned, which band offers the highest expected reward right now?" It uses a LinUCB multi-armed bandit formulation — balancing exploitation of known active bands against exploration of under-sampled regions — augmented with graph-based context from the transition and correlation structures it has discovered.

The practical impact is measurable. In the frequency-agile scenario, the adaptive scheduler achieves a 100% intercept rate compared to the sequential scheduler's 16.7%. In the correlated emitters scenario, it achieves 100% intercept with 2.83-second average intercept time, while the random scheduler manages only 16.7% with 22.83-second intercept time. These are not marginal improvements — they represent the difference between reliable electronic support and operational blind spots.

---

## 2. Comparison Table

| Existing/Small Approach | Limitation | SMART-SCAN EW Improvement | Practical Value |
|---|---|---|---|
| Fixed scan order (round-robin) | Wastes dwell time scanning empty bands; never adapts to actual emitter activity | Learns where activity occurs and prioritizes those bands via Frequency Activity Map | 6x faster detection of active emitters in agile scenarios |
| No memory of past observations | Forgets previous hits/misses; treats each scan as independent | Temporal Memory tracks per-band hit/miss history, inter-arrival statistics, and periodicity | Accumulates knowledge over time; scheduling improves as simulation progresses |
| No pattern detection | Cannot predict when periodic emitters will transmit next | Autocorrelation-based periodicity detection estimates period and confidence from inter-arrival times | Anticipates periodic signals — schedules scans to arrive just before predicted activation |
| No frequency transition tracking | Cannot follow frequency-agile emitters that hop between bands | Transition Graph records directed band-to-band transitions with weighted edges and decay | Tracks frequency hops — when emitter leaves band 3, knows band 5 is likely next destination |
| No correlation awareness | Misses related signals that co-occur across different bands | Correlation Graph tracks co-occurrence counts between band pairs with normalized weights | Identifies linked bands — scanning one correlated band triggers prioritization of its partner |
| No behavioral analysis | Treats all detected signals identically regardless of emitter type | Pattern Fingerprint Engine classifies signals into behavior types (static, periodic, agile, burst, correlated) using feature similarity clustering | Classifies emitter behavior — enables type-specific scheduling strategies |
| No prediction capability | Purely reactive: only scans based on what happened, never what will happen | Prediction Layer fuses periodic, transition, pattern, activity, and exploration sources into ranked predictions | Proactive scheduling — arrives at the right band at the right time, not after the fact |
| No exploration/exploitation balance | Gets stuck exploiting known active bands, or explores too broadly and never converges | UCB-based Smart Scheduler with alpha-scaled exploration bonus + random jitter | Balanced learning — converges on active emitters while maintaining discovery of new or changing signals |
| No explainability | Black-box decisions; operator cannot understand why a band was chosen | Decision Trace records step-by-step reasoning with feature values, scores, and confidence for every decision | Transparent reasoning — operator can audit why the scheduler chose band 5 over band 3 at time 12.4s |
| No comparison framework | Cannot objectively measure whether one scheduler outperforms another | 4 schedulers (Sequential, Random, Priority, Adaptive) evaluated across 7 seeded scenarios with 6 metrics | Objective comparison — quantitative evidence that the adaptive approach outperforms baselines |
| Ground truth leakage | Scheduler sees future information or ground truth data, producing unrealistic results | Ground truth strictly separated from receiver observations; scheduler only sees what the receiver actually detects | Honest evaluation — metrics reflect real-world performance, not simulation artifacts |
| No reproducibility | Results change between runs due to unseeded randomness | All randomness uses seedrandom with deterministic seeds per scenario and per emitter | Repeatable experiments — same scenario + scheduler = identical results every time |
| No behavioral fingerprints | Cannot classify or cluster signal types for group-level intelligence | PatternFingerprintEngine extracts frequency behavior, activity pattern, period, bandwidth, power, and transition features | Behavior classification — enables grouping related signals and applying type-specific scheduling rules |
| Single-dimensional scanning decisions | Considers only frequency; ignores timing of scan decisions | Smart Scheduler decides both frequency and timing using prediction confidence, periodic optimization, and dwell/tuning latency modeling | Better coverage — scans are scheduled not just at the right frequency, but at the right moment in time |

---

## 3. Intelligence Module Deep Dive

### 3.1 Frequency Activity Map

**What it does:** Maintains a live priority score for every frequency band based on accumulated observation history.

**How it works:** After each scan, the map updates the target band's metrics: hit count, miss count, time since last hit, and signal strength estimate (exponentially weighted moving average). It computes an activity score as a weighted combination of recency (exponential decay from last hit), hit rate (recent hits / total recent scans), and signal strength (normalized to 0-1). A prediction confidence score grows with observation count and consistency. An exploration score increases when a band becomes stale (not scanned recently) or has high uncertainty. The final priority combines all six sub-scores: `0.3*activity + 0.2*hitRate + 0.15*signalStrength + 0.15*periodicity + 0.1*predictionConfidence + 0.1*threatPriority - 0.1*explorationScore`.

**What it stores:** Per-band `BandMetrics` object: activityScore, hitRate, signalStrengthEstimate, periodicityScore, predictionConfidence, transitionProbability, threatPriority, explorationScore, priority. Plus a sliding window of the last 50 observations per band.

**Why it matters:** Provides the foundational signal that drives all scheduling decisions. Without it, schedulers have no memory of what they have found.

**Example scenario:** In the periodic scenario, a radar at 300 MHz with 4-second period gets scanned and detected. The frequency map records a hit, resets timeSinceLastHit to 0, and raises the activity score. Three seconds later, timeSinceLastHit is 3, recency weight is `exp(-3/10) = 0.74`, and the band remains high-priority. After 15 seconds without a hit, the score decays and the band is deprioritized in favor of other active regions.

---

### 3.2 Temporal Memory

**What it does:** Records the exact timing of every hit and miss per band and computes inter-arrival statistics for periodicity detection.

**How it works:** For each band, it maintains arrays of hit times and miss times (capped at 100 entries). When a new hit is recorded, it computes the time intervals between consecutive hits. The mean inter-arrival time becomes the estimated period. The coefficient of variation (CV = std dev / mean) measures regularity — a low CV indicates consistent spacing. Autocorrelation analysis is applied to the interval sequence to detect hidden periodicities that simple variance might miss. The periodicity score combines regularity (60% weight) and autocorrelation peak (40% weight).

**What it stores:** Per-band `TemporalMemoryEntry`: hit/miss time arrays, hitCount, missCount, avgInterArrival, interArrivalVariance, periodicityScore, estimatedPeriod, periodConfidence.

**Why it matters:** Enables the scheduler to predict *when* an emitter will transmit, not just *where*. This transforms scanning from spatial to spatio-temporal optimization.

**Example scenario:** A periodic beacon at 500 MHz transmits every 2 seconds. After 3 detections (at t=1.0, t=3.0, t=5.0), inter-arrival times are [2.0, 2.0]. CV = 0, regularityScore = 1.0, autocorrelation peak = 0.95. Periodicity score = 0.97. The estimated period is 2.0 seconds with high confidence. The PeriodicOptimizer then recommends scanning this band at t=6.95 (just before the predicted t=7.0 activation).

---

### 3.3 Periodicity Detection

**What it does:** Detects whether a band's emitter transmits at regular intervals using autocorrelation analysis.

**How it works:** Built on top of Temporal Memory, this module applies autocorrelation to the sequence of inter-arrival times. The autocorrelation function (ACF) measures self-similarity at different lags. A strong peak at lag 1 indicates consecutive intervals are similar (highly periodic). The module requires a minimum of 3 period samples before classification. Periodicity is classified as: score > 0.4 = periodic, score > 0.6 = strong periodic. The `PeriodicOptimizer` subclass goes further — it computes predicted activation times, accounts for tuning latency, and generates actionable scan recommendations with time windows.

**What it stores:** Same as Temporal Memory, plus `PeriodicOptimizer` maintains a prediction horizon (10 seconds) and filters recommendations by whether the receiver can physically arrive in time.

**Why it matters:** Transforms periodic emitter detection from reactive to predictive. Instead of hoping to scan a band while it is active, the scheduler arrives precisely when needed.

**Example scenario:** A radar pulses every 4 seconds at 300 MHz. After 5 observations, the autocorrelation function peaks at 0.82. The PeriodicOptimizer calculates that the next activation is at t=21.0s, the receiver needs 0.011s (tuning + dwell) to complete a scan, so it recommends scanning at t=20.9s. The Smart Scheduler accepts this recommendation with 72% confidence.

---

### 3.4 Transition Graph

**What it does:** Learns directed frequency transition probabilities — which band an emitter hops to after leaving another band.

**How it works:** Every time the receiver scans band A and then band B, the graph records a directed edge A→B. Hit transitions receive +0.2 weight, miss transitions +0.05. Edges decay by factor 0.995 each update to prevent stale links from dominating. Edges below weight 0.02 are pruned. Each node is capped at 10 outgoing edges (weakest pruned). The graph computes transition probabilities, identifies strongest paths through the frequency space, and detects communities of frequently-connected bands.

**What it stores:** `LinkGraph`: Set of node IDs (band indices), Map of edge keys (`"3->5"`) to `LinkGraphEdge` objects with weight, count, lastTransition time, and type.

**Why it matters:** Enables the scheduler to follow frequency-hopping emitters. When an emitter leaves band 3, the graph suggests band 5 as the most likely next destination.

**Example scenario:** A frequency hopper cycles through bands 0, 3, 5, 8. After 10 cycles, edges 0→3, 3→5, 5→8, 8→0 all have weight ≈ 0.9. When the receiver detects activity at band 3, `getPredictedNextBands(3)` returns `[{band: 5, prob: 0.9}, ...]`. The Smart Scheduler prioritizes band 5 for the next scan, following the emitter's hop pattern.

---

### 3.5 Correlation Graph

**What it does:** Tracks co-occurrence between bands — detecting when multiple emitters activate simultaneously or in close temporal proximity.

**How it works:** When two different bands are both active within the same time window, the graph records a co-occurrence event. The key is normalized (smaller index first) to treat A-B and B-A identically. Co-occurrence counts grow monotonically. Correlation edges are exported with weight = min(1.0, count/20), meaning 20 co-occurrences produces maximum weight. The graph can answer: "which other bands correlate with band X?" and "what is the correlation matrix for all bands?"

**What it stores:** Map of normalized band-pair keys to `{count, lastTime}`. Exported as `LinkGraphEdge[]` with type `'correlation'`.

**Why it matters:** Reveals hidden relationships between emitters. If two emitters always activate together (e.g., a radar and its associated comms system), scanning one automatically prioritizes the other.

**Example scenario:** A primary radar at 300 MHz and a secondary comms at 500 MHz both transmit with 4-second period, synchronized. After 8 co-detections, the correlation edge 300-500 has weight 0.4. When the receiver detects the radar, the correlation graph triggers immediate prioritization of the 500 MHz band, even though it has not been scanned recently. The adaptive scheduler achieves 100% intercept on both emitters.

---

### 3.6 Pattern Fingerprint Engine

**What it does:** Clusters observations into behavioral fingerprints, classifying emitter types and tracking their characteristics over time.

**How it works:** For each observation, the engine extracts features: frequency behavior (fixed/agile/periodic/burst), activity pattern (continuous/periodic/bursty/sporadic), estimated period, average bandwidth, and average power. It compares these features against existing patterns using weighted similarity (30% frequency behavior, 30% activity pattern, 20% period match, 10% bandwidth, 10% power). If similarity exceeds 0.55, the observation is added to the matching pattern; otherwise a new pattern is created. Confidence grows with observation count: `min(0.95, 0.3 + count * 0.03)`. Patterns are pruned after 30 seconds of inactivity if confidence is below 0.5.

**What it stores:** `PatternFingerprint` objects: id, type, frequencyBehavior, activityPattern, estimatedPeriod, averageBandwidth, averagePower, transitionPattern (band sequence), confidence, supportingObservations, status (learning/confirmed/weak), evidence strings, primaryBandIndex, predictedNextTime.

**Why it matters:** Enables group-level intelligence. Instead of treating each band independently, the engine recognizes that bands 0, 3, 5, 8 belong to the same frequency-hopping emitter and can be managed as a unit.

**Example scenario:** A burst emitter at 650 MHz transmits in short 0.15-second windows with 2-second gaps. After 5 observations, the engine creates pattern P3 with frequencyBehavior='burst', activityPattern='bursty', confidence=0.45 (status='learning'). After 15 observations, confidence reaches 0.75, status upgrades to 'confirmed'. The evidence list reads: "Active at 650.0 MHz | 15 observations over 28.5s | Intermittent bursts (hit rate: 15%) | Pattern confirmed from observed receiver data."

---

### 3.7 Prediction Layer

**What it does:** Fuses predictions from five sources (periodic, transition, pattern, activity, exploration) into a single ranked list of candidate bands for the next scan.

**How it works:** The layer queries each sub-predictor independently:
1. **Periodic:** From PeriodicOptimizer — bands where periodic activation is predicted within the next 10 seconds.
2. **Transition:** From TransitionGraph — bands with >10% probability of being the next hop from the current band.
3. **Pattern:** From PatternFingerprintEngine — bands that high-confidence patterns predict as the next step in their transition sequence.
4. **Activity:** From FrequencyActivityMap — bands with activity score >0.5 and prediction confidence >0.4.
5. **Exploration:** From FrequencyActivityMap — bands with exploration score >0.7 and time since last hit >20 steps.

All predictions are sorted by confidence descending. The Smart Scheduler then applies UCB scoring to select the best candidate.

**What it stores:** Transient prediction results (not persisted). Each prediction includes bandIndex, predictedActivationTime, confidence, source type, and human-readable details string.

**Why it matters:** No single prediction source is universally best. Periodicity works for beacons, transitions work for hoppers, activity works for steady signals. Fusion ensures the scheduler leverages whichever intelligence is most relevant at each moment.

**Example scenario:** At time 15.2s, the receiver is at band 3. The periodic predictor suggests band 1 (periodic radar predicted at t=16.0s, confidence 0.72). The transition predictor suggests band 5 (60% hop probability from band 3). The activity predictor suggests band 3 itself (high activity score). The exploration predictor suggests band 12 (not scanned in 25 steps, exploration score 0.81). The Smart Scheduler weighs these via UCB and selects band 1 (highest combined score).

---

### 3.8 Smart Scheduler

**What it does:** Makes the final scheduling decision by combining prediction scores with UCB-based exploration-exploitation balancing and decision trace recording.

**How it works:** For each candidate band from the Prediction Layer, the scheduler computes: `score = prediction.confidence * 0.7 + explorationBonus * 0.3`. The exploration bonus follows the UCB1 formula: `alpha * sqrt((log(totalVisits + 1) + 1) / (visits[b] + 1)) + rng() * 0.1`. The alpha parameter (1.2) controls exploration aggressiveness. The random jitter prevents deterministic lock-in. Before prediction-based selection, the scheduler checks for high-confidence periodic exploitation (>0.65) and short-circuits to that band if available. Every decision is recorded in the Decision Trace with timestamp, current band, selected band, score, confidence, reasons, and feature values.

**What it stores:** Visit counts per band, total visit count, prediction history (last 1000 entries with predicted/actual band and correctness), emitter activation times, emitter first-detected times, decision trace (last 500 entries).

**Why it matters:** This is the decision-making brain that converts intelligence into action. The UCB formula ensures the scheduler never stops learning — even well-performing bands are occasionally re-explored to detect changes.

**Example scenario:** At time 20.0s, the scheduler has 5 candidates. Band 1 has prediction confidence 0.72 but has been visited 15 times (exploration bonus low). Band 12 has prediction confidence 0.3 but has been visited only 2 times (exploration bonus high: `1.2 * sqrt((log(200)+1)/3) = 0.89`). Final scores: band 1 = 0.72*0.7 + 0.35*0.3 = 0.61, band 12 = 0.3*0.7 + 0.89*0.3 = 0.48. Band 1 wins. The decision trace records: "Time 20.0: Band 3→1, score=0.61, confidence=0.72, reasons=['Periodic prediction at 16.0s (conf: 0.72)', 'Source: periodic'], features={activityScore: 0.8, hitRate: 0.7, ...}."

---

## 4. Architecture Advantage

SMART-SCAN EW is built on a modular architecture with strict separation between the RF environment simulation, receiver modeling, intelligence layer computation, and the React-based visualization dashboard.

**Core Modules Are Framework-Agnostic.** The intelligence modules (`src/scheduler/`, `src/rf-environment/`, `src/receiver/`, `src/evaluation/`) are pure TypeScript with no React dependency. This means they can be tested, benchmarked, and swapped independently. The `PatternFingerprintEngine` does not know or care whether its output is rendered in a Canvas visualization or printed to a terminal. The `SmartScheduler` can be replaced with a different bandit algorithm without touching any UI code.

**Deterministic Evaluation Pipeline.** The `ScenarioRunner` and `MetricsCalculator` classes operate entirely on core module interfaces. Evaluation is a pure function: given a scenario config and a scheduler type, produce metrics. This enables the 7-scenario comparative evaluation (`npm run eval`) to run headlessly, producing reproducible results that validate algorithmic improvements without visual overhead.

**Vite Build System.** TypeScript strict mode catches type errors at build time. The Vite dev server provides instant hot reload during dashboard development. Production builds output optimized bundles. The separate `src/core/types.ts` file serves as the single source of truth for all data structures — changing a type propagates errors across the entire codebase immediately.

**React Dashboard as Visualization Layer.** The `App.tsx` dashboard consumes core module output through a simulation hook. Canvas visualizations (spectrum, activity matrix, link graph) render data without framework overhead. The architecture allows the dashboard to work with any scheduler that implements the `Scheduler` interface — no UI changes required when swapping algorithms.

**Research Prototype Benefit.** For a research project evaluating 4 schedulers across 7 scenarios, this architecture means: (1) algorithm changes are isolated to `src/scheduler/`, (2) new scenarios are added to `src/core/constants.ts` without touching evaluation code, (3) new metrics are added to `MetricsCalculator` without changing the scheduler, and (4) the UI can be entirely replaced (or removed) without affecting core simulation validity. This modularity is what makes the comparative evaluation framework trustworthy — the same core code runs in both the headless evaluation and the live dashboard.
