# PROJECT DEVELOPMENT INSTRUCTIONS

This file is the persistent development context and progress tracker for this project.

You MUST read this file before making changes to the project.

This file must remain up to date throughout development.

---

# 1. PROJECT RULE

This is an ongoing project.

DO NOT assume the project is empty.

Before implementing anything:

1. Inspect the existing project.
2. Understand the current architecture.
3. Check what has already been implemented.
4. Check what is incomplete.
5. Check for bugs and TODOs.
6. Continue from the current state.

DO NOT unnecessarily rewrite working code.

DO NOT restart the project from scratch unless explicitly instructed.

---

# 2. PROGRESS TRACKER

This section is the source of truth for the project's development status.

Update this section whenever meaningful progress is made.

## STATUS LEGEND

* `[ ]` Not started
* `[~]` In progress
* `[x]` Completed
* `[!]` Blocked
* `[?]` Needs investigation

---

# 3. CURRENT PROJECT STATUS

## Core Setup

* [x] Project structure finalized (React 18 + TypeScript + Vite)
* [x] Dependencies configured
* [x] Development server working
* [x] Production build working
* [x] Environment/configuration verified

## Main Features - SIH 2026 Smart Scan EW

### Phase 1: RF Environment Simulator
* [x] Emitter models (static, periodic, frequency-agile, burst, correlated, adaptive)
* [x] Noise model with interference sources
* [x] Ground truth recorder (separate from receiver observations)
* [x] RF environment simulator with deterministic seeded randomness

### Phase 2: Receiver + Detection Model
* [x] Virtual receiver with configurable parameters (bandwidth, dwell time, tuning time, detection threshold)
* [x] Detection engine with SNR-based detection and false alarm modeling
* [x] Proper band tuning with target band tracking

### Phase 3: Baseline Schedulers
* [x] Sequential scheduler (round-robin)
* [x] Random scheduler (seeded)
* [x] Priority scheduler (activity-based with exploration bonus)
* [x] Adaptive scheduler (LinUCB + graph-enhanced)

### Phase 4: Metrics + Evaluation Framework
* [x] Evaluation metrics (Pd, FAR, Intercept Rate, Avg Intercept Time, Prediction Accuracy, Scan Efficiency)
* [x] 7 reproducible scenarios (Static, Periodic, Agile, Burst, Unknown, Correlated, Environment Change)
* [x] Comparative evaluation runner
* [x] Timeline event logging

### Phase 5-9: Intelligence Layers
* [x] Frequency Activity Map (live priority scoring across all bands)
* [x] Temporal Memory (per-band hit/miss history, inter-arrival statistics)
* [x] Periodicity Detection (autocorrelation-based)
* [x] Periodic Optimizer (predictive scheduling for periodic emitters)
* [x] Transition Graph (learned frequency transition probabilities)
* [x] Correlation Graph (co-occurrence tracking)
* [x] Pattern Fingerprint Engine (behavioral clustering)
* [x] Prediction Layer (multi-source prediction fusion)
* [x] Smart Scheduler (exploration-exploitation with UCB)

### Phase 12: Integrated Dashboard
* [x] Live Spectrum visualization (Canvas-based)
* [x] 360° Activity Matrix (Frequency × Time) - REAL DATA
* [x] Link Graph visualization (force-directed)
* [x] Behavioral Patterns panel
* [x] Frequency Activity Map (tabular)
* [x] Performance Metrics panel
* [x] Event Timeline
* [x] Receiver Status panel
* [x] Next Best Scan panel with reasoning
* [x] Decision Trace panel (explainable AI)
* [x] Simulation Status bar
* [x] Scheduler/Scenario explanations (tooltips)

### Phase 13: Authentication System
* [x] Firebase Authentication integration (Google OAuth + Email/Password)
* [x] Login page with SMART-SCAN EW branding
* [x] Google OAuth for arbitrary Gmail accounts
* [x] Email/Password signup and login
* [x] Configurable Demo Access
* [x] Protected routes (dashboard requires authentication)
* [x] Logout button in dashboard header
* [x] Session persistence (localStorage)
* [x] Environment variable configuration (.env.example)
* [x] Hosting-agnostic deployment ready

### Phase 14: Behavioral Patterns Fixes
* [x] Fixed exploration bonus to ensure diverse band exploration
* [x] Lowered similarity threshold for pattern matching (0.7 → 0.55)
* [x] Lowered periodicity classification thresholds (0.6 → 0.4)
* [x] Reduced minimum period samples (4 → 3)
* [x] Added random jitter to exploration bonus for diverse band exploration
* [x] Patterns now emerge from real observations during simulation

### Phase 15: Dedicated Link Graph Analysis View
* [x] Full-screen Link Graph workspace (full-screen takeover)
* [x] d3-force physics simulation for proper node layout
* [x] Canvas-based rendering with force-directed positioning
* [x] Left controls panel: filters (All/Transitions/Correlations/Strong), min-strength slider, zoom/pan/fit/reset
* [x] Right details panel: selected node info, connected edges, strength, confidence, counts
* [x] Legend with transition/correlation edge styles, node colors, interaction hints
* [x] Click-to-select nodes with connected edge highlighting and unrelated node dimming
* [x] Hover tooltips for nodes and edges
* [x] Zoom, pan, and fit-to-screen controls
* [x] Compact dashboard preview card with graph stats and "Open Full Graph" button
* [x] Removed congested in-dashboard Link Graph canvas
* [x] Removed duplicate NEXT BEST SCAN panel

### Phase 16: Global RF Intelligence Map
* [x] Simulated geographic regions (7 regions with fictional coordinates)
* [x] Region assignment for all emitters in scenario templates
* [x] Canvas-based world map with Earth outline (simplified continent paths)
* [x] Region markers with activity indicators (pulsing when active)
* [x] Receiver positions (3 receivers at different regions)
* [x] Emitter markers colored by behavior type
* [x] Transition arcs between regions (weighted by transition count)
* [x] Left controls panel: layer toggles (receivers, emitters, arcs), min-transition slider, zoom/fit
* [x] Right details panel: region info, observed activity, behavioral patterns, assigned emitters
* [x] Legend with behavior type colors and marker shapes
* [x] Statistics panel: active regions, total observations, transition arcs, patterns
* [x] Compact dashboard preview card with region status and "Open Global RF Map" button
* [x] Full-screen takeover view with header, canvas, and side panels
* [x] Pan and zoom controls for map navigation
* [x] Data integrity: activity only shown after receiver observations (no ground truth)
* [x] Clear disclaimer: "Geographic positions are simulated and do not represent real emitter locations"
* [x] Region assignment treated as scenario metadata (not learned location intelligence)
* [x] Transition arcs only shown with sufficient observation count
* [x] Behavioral patterns only displayed when confirmed by pattern engine
* [x] Map type selector: Default, Satellite, Street views
* [x] Satellite view: dark green theme with terrain texture effect
* [x] Street view: lighter theme with detailed coordinate labels and denser grid

---

# 4. TODO

## HIGH PRIORITY
* [ ] Add more terminal commands for CLI interaction
* [ ] Add WebGL-based visualizations for better performance
* [ ] Add scenario configuration UI
* [ ] Add export/import for simulation results
* [ ] Add unit tests for core modules

## MEDIUM PRIORITY
* [ ] Add accessibility improvements (ARIA labels, focus management)
* [ ] Add sound effects for detection events
* [ ] Add more emitter behavior types
* [ ] Add multi-receiver coordination simulation

## LOW PRIORITY
* [ ] Improve Priority scheduler exploration tuning
* [ ] Add more detailed prediction accuracy metrics

---

# 5. CURRENTLY IN PROGRESS

* [~] No task currently in progress

---

# 6. COMPLETED

* [x] Project initialized with React 18 + TypeScript + Vite
* [x] Technical assessment document created
* [x] RF Environment Simulator with 6 emitter types
* [x] Virtual Receiver with proper band tuning
* [x] Detection Engine with SNR-based detection and false alarms
* [x] 4 Baseline schedulers (Sequential, Random, Priority, Adaptive)
* [x] Frequency Activity Map with live priority scoring
* [x] Temporal Memory with periodicity detection
* [x] Transition Graph with learned transition probabilities
* [x] Pattern Fingerprint Engine with behavioral clustering
* [x] Smart Scheduler with LinUCB + graph-enhanced exploration
* [x] 7 Reproducible evaluation scenarios
* [x] Comparative evaluation with metrics
* [x] Integrated React dashboard with Canvas visualizations
* [x] Production build passing TypeScript strict mode
* [x] **CRITICAL FIX**: Intelligence layers now work for ALL schedulers (not just adaptive)
* [x] **CRITICAL FIX**: Simulation loop timing fixed (proper speed control)
* [x] **CRITICAL FIX**: 360° Activity Matrix now uses REAL observation data (not random)
* [x] **CRITICAL FIX**: Metrics calculation uses real data (not hardcoded)
* [x] **CRITICAL FIX**: Ground truth tracked for all schedulers
* [x] **CRITICAL FIX**: Empty states show meaningful messages
* [x] **CRITICAL FIX**: Receiver status shows proper scan state
* [x] **CRITICAL FIX**: Prediction accuracy tracking for adaptive scheduler
* [x] **CRITICAL FIX**: Priority scheduler now uses band metrics + exploration bonus
* [x] **CRITICAL FIX**: AvgInterceptTime fixed for static/periodic emitters (tracks activation time)
* [x] **NEW**: Decision Trace panel for explainable AI
* [x] **NEW**: Scheduler/Scenario explanations with tooltips
* [x] **NEW**: Simulation Status bar with real-time info
* [x] **NEW**: Firebase Authentication (Google OAuth + Email/Password + Demo)
* [x] **NEW**: Protected dashboard routes with login page
* [x] **NEW**: Behavioral Patterns pipeline fixes (patterns now emerge from observations)

---

# 7. BUGS

## Critical
* None

## Normal
* [ ] Priority scheduler exploration bonus could be tuned further
* [ ] Evaluation runner Priority scheduler still shows 0 (uses simplified bandMetrics)

## Minor
* [ ] No unit tests yet
* [ ] Dashboard could use WebGL for better performance with many bands

---

# 8. ARCHITECTURE NOTES

* **Framework**: React 18 with Vite
* **Language**: TypeScript (strict mode)
* **State Management**: React hooks + refs for simulation
* **Visualization**: HTML5 Canvas (spectrum, matrix, graph)
* **Randomness**: seedrandom for deterministic reproducibility
* **Math/Stats**: simple-statistics + custom autocorrelation
* **Authentication**: Firebase Authentication (Google OAuth + Email/Password)
* **Math/Stats**: simple-statistics + custom autocorrelation
* **Architecture**: Modular with clear separation:
  - `src/rf-environment/` - RF simulation (ground truth)
  - `src/receiver/` - Virtual receiver + detection
  - `src/scheduler/` - Baseline + adaptive schedulers + intelligence layers
  - `src/evaluation/` - Metrics, scenarios, runner
  - `src/ui/` - React components (App.tsx main dashboard)
  - `src/firebase/` - Firebase configuration
  - `src/context/` - React context providers (AuthContext)
  - `src/components/` - Reusable UI components (LoginPage, ProtectedRoute)
* **Key Design Principle**: Ground truth strictly separated from receiver observations

---

# 9. IMPLEMENTATION RULES

Before changing code:

### Inspect first
Understand existing code before modifying it.

### Reuse existing code
If a working component/function already exists, reuse it.

### Avoid duplication
Do not create another implementation of something that already exists.

### Keep architecture clean
Place code in the appropriate component/module.

### Test changes
After meaningful changes:
1. Run the relevant tests (npm run eval)
2. Run the application/build if appropriate (npm run build)
3. Check for errors
4. Fix issues before moving on

### Do not leave broken code
Never knowingly leave broken imports, undefined variables, dead buttons, or unfinished functions.

---

# 9. FIREBASE AUTHENTICATION SETUP

## Required Environment Variables (.env.local)

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Demo Account Configuration
VITE_DEMO_EMAIL=demo@smart-scan-ew.local
VITE_DEMO_PASSWORD=demo123456
```

## Firebase Console Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication > Sign-in method > Google (enable)
3. Enable Authentication > Sign-in method > Email/Password (enable)
4. Add authorized domains: localhost, your-production-domain
5. Copy config values to .env.local

## Demo Account Setup

1. In Firebase Console > Authentication > Users, click "Add user"
2. Enter the demo email/password from VITE_DEMO_EMAIL / VITE_DEMO_PASSWORD
3. Or let the app create the user on first demo login (if email/password auth is enabled)

## Deployment Notes

- Update Firebase Authorized Domains in Authentication settings when deploying
- Ensure HTTPS is enabled on production domain
- Environment variables must be set in hosting platform (Vercel, Netlify, Firebase Hosting)
- Never commit .env.local or real Firebase credentials to git

---

# 10. BEHAVIORAL PATTERNS PIPELINE FIXES

## Root Cause of Missing Patterns

1. **Exploration bonus was zero initially** - Fixed: Added `+1` to log term and random jitter
2. **Similarity threshold too high** - Fixed: 0.7 → 0.55
3. **Periodicity threshold too high** - Fixed: 0.6 → 0.4
3. **Minimum period samples too high** - Fixed: 4 → 3
4. **No randomness in exploration** - Fixed: Added `rng() * 0.1` jitter

## Key Changes Made

### SmartScheduler (prediction.ts)
- Exploration bonus: `alpha * sqrt((log(total+1)+1)/(visits+1)) + rng()*0.1`

### PatternFingerprintEngine (pattern-fingerprint.ts)
- similarityThreshold: 0.7 → 0.55
- Periodicity classification threshold: 0.6 → 0.4
- Transition probability threshold: 0.3 → 0.25

### TemporalMemory (temporal-memory.ts)
- minPeriodSamples: 4 → 3

### FrequencyActivityMap (frequency-map.ts)
- Initial explorationScore: 1 (unchanged, now properly used)

## Verification

Patterns now emerge during normal demo:
1. Periodic emitters → Periodic pattern (confidence builds with observations)
2. Frequency-agile emitters → Agile pattern with transition tracking
3. Burst emitters → Bursty pattern detection
4. Static emitters → Fixed pattern with high hit rate

---

# 10. IMPLEMENTATION RULES

Before changing code:

### Inspect first
Understand existing code before modifying it.

### Reuse existing code
If a working component/function already exists, reuse it.

### Avoid duplication
Do not create another implementation of something that already exists.

### Keep architecture clean
Place code in the appropriate component/module.

### Test changes
After meaningful changes:
1. Run the relevant tests (npm run eval)
2. Run the application/build if appropriate (npm run build)
3. Check for errors
4. Fix issues before moving on

### Do not leave broken code
Never knowingly leave broken imports, undefined variables, dead buttons, or unfinished functions.

---

# 11. WHEN STARTING A NEW SESSION

At the beginning of every development session:

1. Read this file.
2. Inspect the current project state.
3. Compare the actual code against this TODO.
4. Identify discrepancies.
5. Determine the highest-priority unfinished task.
6. Continue from there.

Do not blindly follow an outdated TODO.

If the code shows that something is already completed, update this file.

If something exists in the TODO but does not exist in the code, treat it as unfinished.

The actual code is the final source of truth.

---

# 11. WHEN MAKING PROGRESS

After completing a meaningful piece of work:

1. Update the progress tracker.
2. Move the task from `[~]` to `[x]`.
3. Add newly discovered TODOs.
4. Record newly discovered bugs.
5. Update architecture notes if necessary.

Do NOT wait until the entire project is finished to update this file.

---

# 12. BEFORE STOPPING

If you are stopping because:
* the user asked you to stop
* the task is complete
* context is getting large
* a blocker was encountered
* the session is ending

you MUST update this file first.

Leave the project in a state where another coding session can immediately understand:
* what was completed
* what is currently being worked on
* what remains
* what is broken
* what should be done next

---

# 12. SESSION HANDOFF

## LAST SESSION

### Completed
* **Full SIH 2026 Smart Scan EW implementation with all critical fixes**
* All 7 evaluation scenarios working with comparative metrics
* Adaptive scheduler outperforms baselines in correlated/environment-change scenarios
* Integrated dashboard with 10 visualization panels (including NEW Decision Trace)
* All intelligence layers now work for ALL schedulers (not just adaptive)
* 360° Activity Matrix redesigned with real data, proper axes, legend
* Live Spectrum shows current scan, detected signals, ground truth
* Decision Trace panel shows step-by-step scheduler reasoning
* Scheduler/Scenario tooltips with explanations
* Simulation Status bar with real-time metrics
* Proper AvgInterceptTime calculation (tracks emitter activation time)
* Prediction accuracy tracking for adaptive scheduler
* Production build passing TypeScript strict mode
* **Firebase Authentication** (Google OAuth + Email/Password + Demo Access)
* **Protected Dashboard Routes** with LoginPage and ProtectedRoute
* **Behavioral Patterns Pipeline Fixes** - Patterns now emerge from real observations
* **Dedicated Link Graph Analysis View** - Full-screen takeover with d3-force layout, controls, legend, details panel, and compact dashboard preview
* **Global RF Intelligence Map** - Canvas-based world map with simulated regions, receiver/emitter markers, transition arcs, activity indicators, controls, details panel, and disclaimer
* **Map Type Selector** - Default, Satellite, and Street views for the Global RF Intelligence Map

### Currently Working On
* No task currently in progress

### Next Recommended Task
**MEDIUM PRIORITY**: Add WebGL-based visualizations for better performance

### Known Issues
* Priority scheduler in evaluation runner still shows 0 (uses simplified bandMetrics not FrequencyActivityMap)
* Evaluation runner doesn't use full intelligence layers for non-adaptive schedulers

### Important Context
* The adaptive scheduler (LinUCB + graph) outperforms baselines in correlated and environment change scenarios (100% intercept rate vs 0-17%)
* Ground truth is strictly separated from receiver observations
* All randomness is seeded for reproducibility
* The dashboard runs at http://localhost:3000 with `npm run dev`
* All visualizations use REAL simulation data - no fake/random data
* Firebase Authentication enables real Google login for any visitor
* Demo account configurable via environment variables
- Behavioral patterns genuinely emerge from observations
- Global RF Map shows activity only after receiver observations (no ground truth)
- Geographic coordinates are simulated and clearly labeled as such
- Region assignment is scenario metadata, not learned location intelligence
- Global RF Map supports Default, Satellite, and Street views with different themes

---

# SUMMARY OF CRITICAL FIXES APPLIED

## Root Cause of Zero-Data/Empty Dashboard
1. **Intelligence layers only created for adaptive scheduler** - Fixed: Now created for all schedulers
2. **Updates only ran for adaptive scheduler** - Fixed: All schedulers update frequency map, temporal memory, graph, patterns
3. **Simulation loop too slow** - Fixed: Proper timing with configurable speed (0.5x-10x)
4. **Matrix used random data** - Fixed: Now uses real observation history with proper heatmap
5. **Metrics were hardcoded** - Fixed: Real calculations from scan history
6. **Ground truth not tracked for non-adaptive** - Fixed: Tracked for all schedulers

## New Features Added
1. **Decision Trace Panel** - Shows step-by-step scheduler reasoning with feature breakdown
2. **Scheduler/Scenario Tooltips** - Hover explanations for each option
3. **Simulation Status Bar** - Real-time scenario, scheduler, time, scans, hits, detection rate
4. **Proper Intercept Time** - Tracks emitter activation time vs first detection
5. **Prediction Accuracy** - Tracks predicted vs actual band/time for adaptive scheduler
6. **Meaningful Empty States** - Explain what's happening before/after simulation
7. **Matrix Legend & Axes** - Clear time axis (0-60s), frequency axis with labels, current time indicator
8. **Priority Scheduler Exploration** - UCB-style exploration bonus prevents band lock-in
9. **Firebase Authentication** - Google OAuth, Email/Password, Demo Access
10. **Protected Routes** - Login page, protected dashboard, logout
11. **Behavioral Patterns Pipeline Fixes** - Patterns emerge from real observations
12. **Dedicated Link Graph Analysis View** - Full-screen takeover with d3-force layout, canvas rendering, controls (filters, min-strength, zoom/pan/fit/reset), legend, details panel (selected node info, connected edges, strength, confidence, counts, evidence), compact dashboard preview with "Open Full Graph" button
13. **Global RF Intelligence Map** - Canvas-based world map with simulated regions (7 regions), receiver/emitter markers colored by behavior type, transition arcs between regions, activity indicators (pulsing when active), left controls panel (layer toggles, min-transition slider, zoom/fit), right details panel (region info, observed activity, behavioral patterns, assigned emitters), legend, statistics, compact dashboard preview with "Open Global RF Map" button, full-screen takeover view, disclaimer about simulated positions
14. **Map Type Selector** - Default, Satellite, and Street views for the Global RF Intelligence Map with different color themes and grid densities

---

## VERIFICATION COMMANDS

```bash
# Run evaluation (all 7 scenarios, 4 schedulers)
npm run eval

# Build for production
npm run build

# Start development server
npm run dev
```

## DEDICATED LINK GRAPH VIEW - ROOT CAUSE OF PREVIOUS CONGESTION

The original Link Graph was rendered in a 400×400 Canvas within a `grid-template-columns: 1fr 1fr` layout (half the dashboard width). Node radii scaled as `8 + degree * 2 + centrality * 20`, causing oversized nodes. The force-directed layout ran 50 iterations on every render with no caching. The result was a cramped, unreadable graph with overlapping labels and edges.

## DEDICATED LINK GRAPH VIEW - READABILITY IMPROVEMENTS

1. **Full-screen takeover**: Graph now has access to the full viewport instead of a half-width 400×400 card
2. **d3-force physics**: Proper force simulation with alpha decay, collision detection, and centering forces produces better node spacing
3. **Fixed node radius**: Nodes capped at 16-24px (was unbounded)
4. **Edge differentiation**: Transitions = solid cyan, Correlations = dashed amber (was both solid with subtle color difference)
5. **Dimming**: Unrelated nodes/edges dim to 8% opacity when a node is selected
6. **Click-to-select**: Proper node selection with connected edge highlighting
7. **Separate controls**: Dedicated left panel with filters, min-strength slider, zoom controls
8. **Details panel**: Right panel shows selected node/edge info, connected edges, strength, confidence, counts, evidence

## DEPLOYMENT CHECKLIST

- [ ] Firebase project created and configured
- [ ] Google OAuth enabled in Firebase Console
- [ ] Email/Password auth enabled in Firebase Console
- [ ] Authorized domains configured (localhost + production domain)
- [ ] Environment variables set in hosting platform
- [ ] Demo account created in Firebase Auth
- [ ] Production build passes: `npm run build`
- [ ] Evaluation passes: `npm run eval`
- [ ] Manual test: Google login, email/password signup, demo login, logout
- [ ] Manual test: Dashboard loads, simulation runs, patterns emerge
- [ ] Manual test: Global RF Map opens, shows empty state before observations, shows activity after observations, RESET clears activity
- [ ] Manual test: Global RF Map - switch between Default, Satellite, Street views