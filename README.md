# SMART-SCAN EW

## Adaptive Frequency Scan Strategy for Electronic Warfare

SMART-SCAN EW is an interactive software prototype that simulates an intelligent radio-frequency scanning system for Electronic Warfare applications.

The project addresses the challenge of detecting intermittent, burst-based, periodic, and frequency-agile emitters when the receiver has limited instantaneous bandwidth and cannot monitor the entire spectrum simultaneously.

Instead of scanning every frequency band sequentially, the system learns from previous observations and dynamically selects the most valuable frequency band to scan next.

> This project is a simulation and educational prototype. It does not connect to real RF hardware or operational military systems.

---

## Problem Statement

A receiver cannot observe the entire radio-frequency spectrum at once because of limitations such as:

- Limited instantaneous bandwidth
- Receiver tuning time
- Finite dwell time
- Intermittent signal activity
- Frequency-hopping or agile emitters
- Noise and false alarms
- Unknown emitter behavior

A traditional sequential scan may waste time on inactive bands and miss short-duration signals.

SMART-SCAN EW attempts to improve this process through adaptive, data-driven scan scheduling.

---

## Key Features

### RF Environment Simulation

The simulator supports different emitter behaviors:

- Static emitters
- Periodic emitters
- Burst emitters
- Frequency-agile emitters
- Correlated emitters
- Adaptive emitters
- Noise and interference

The simulation uses seeded randomness for reproducible experiments.

### Virtual Receiver

The virtual receiver models:

- Receiver bandwidth
- Tuning time
- Dwell time
- Detection threshold
- Signal-to-noise ratio
- Signal detection
- False alarms
- Target-band tracking

### Intelligent Scan Schedulers

The project includes multiple scan strategies:

- Sequential Scheduler
- Random Scheduler
- Priority Scheduler
- Adaptive Scheduler
- Graph-enhanced Scheduler
- LinUCB-based decision-making

These schedulers can be compared under identical simulated conditions.

### Frequency Activity Map

The Frequency Activity Map provides intelligence about each frequency band, including:

- Estimated activity
- Band priority
- Hit rate
- Last observed activity
- Prediction confidence
- Scan history
- Detection statistics

### 360° Frequency × Time Activity Matrix

The activity matrix visualizes how signal activity changes across:

- Frequency bands
- Simulation time
- Observed signals
- Predicted activity
- Unobserved regions

The visualization distinguishes between:

- Signal detected
- No signal detected
- Not yet observed
- Predicted activity

### Temporal Memory

The system stores previous observations to identify:

- Repeated activity
- Periodic behavior
- Recent signal appearances
- Recurring frequency patterns
- Time-dependent activity

### Transition and Correlation Graphs

The graph intelligence layer models relationships between frequency bands.

It can identify:

- Frequently connected bands
- Frequency transitions
- Correlated activity
- Possible next-band candidates
- Relationships between observed signal patterns

### Behavioral Fingerprints

The system analyzes emitter behavior and creates simulated behavioral fingerprints based on features such as:

- Frequency stability
- Burst duration
- Repetition interval
- Frequency transitions
- Activity consistency
- Temporal behavior

### Prediction Layer

The prediction engine estimates which frequency bands may become active next.

Prediction confidence is tracked separately from actual signal detection performance.

### Explainable Next-Best-Scan

The scheduler explains why a particular band was selected.

Possible reasons include:

- High estimated activity
- Recent detection
- Strong transition probability
- Periodic activity window
- High uncertainty
- Exploration requirement
- Correlation with another active band

---

## System Architecture

```text
RF Environment Simulator
          |
          v
     Virtual Receiver
          |
          v
     Signal Detection
          |
          v
   Observation Extraction
          |
          v
   Temporal Memory Layer
          |
          v
 Frequency Activity Map
          |
          v
 Transition and Correlation Graphs
          |
          v
 Behavioral Fingerprint Engine
          |
          v
     Prediction Layer
          |
          v
 Intelligent Scan Scheduler
          |
          v
      Next Scan Decision
          |
          v
      Metrics and UI
