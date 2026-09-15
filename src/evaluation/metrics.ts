import type { EvaluationMetrics, ScenarioResult, TimelineEvent, SchedulerDecision, GroundTruthEntry, Observation } from '../core/types';
import { FrequencyActivityMap } from '../scheduler/frequency-map';
import { TemporalMemory } from '../scheduler/temporal-memory';

export class MetricsCalculator {
  private truePositives = 0;
  private falsePositives = 0;
  private trueNegatives = 0;
  private falseNegatives = 0;
  private intercepts = 0;
  private totalOpportunities = 0;
  private interceptTimes: number[] = [];
  private interceptTimeErrors: number[] = [];
  private predictions: Array<{ predicted: number; actual: number; correct: boolean }> = [];
  private productiveScans = 0;
  private totalScans = 0;
  private scanTimes: number[] = [];
  private emitterFirstActive: Map<string, number> = new Map();
  private emitterFirstDetected: Map<string, number> = new Map();
  private scannedBands: Set<number> = new Set();
  private scanHistory: Array<{ time: number; bandIndex: number; hit: boolean }> = [];

  recordDetection(observation: Observation, groundTruth: GroundTruthEntry | undefined): void {
    this.totalScans++;
    this.scannedBands.add(observation.bandIndex);
    this.scanHistory.push({
      time: observation.time,
      bandIndex: observation.bandIndex,
      hit: observation.detected,
    });
    
    const detected = observation.detected;
    const actuallyActive = groundTruth?.active ?? false;
    
    if (detected && actuallyActive) {
      this.truePositives++;
      this.productiveScans++;
      
      if (groundTruth) {
        this.recordIntercept(groundTruth, observation.time);
      }
    } else if (detected && !actuallyActive) {
      this.falsePositives++;
    } else if (!detected && actuallyActive) {
      this.falseNegatives++;
    } else {
      this.trueNegatives++;
    }

    if (actuallyActive) {
      this.totalOpportunities++;
      // Track first activation time for this emitter
      const emitterKey = `${groundTruth?.emitterId}-${groundTruth?.frequency}`;
      if (groundTruth && !this.emitterFirstActive.has(emitterKey)) {
        this.emitterFirstActive.set(emitterKey, groundTruth.time);
      }
    }
  }

  private recordIntercept(groundTruth: GroundTruthEntry, detectionTime: number): void {
    const emitterKey = `${groundTruth.emitterId}-${groundTruth.frequency}`;
    const opportunityTime = this.emitterFirstActive.get(emitterKey) ?? groundTruth.time;
    
    if (!this.emitterFirstDetected.has(emitterKey)) {
      this.emitterFirstDetected.set(emitterKey, detectionTime);
      const interceptTime = detectionTime - opportunityTime;
      this.interceptTimes.push(Math.max(0, interceptTime));
      this.intercepts++;
    }
  }

  recordPrediction(predictedBand: number, actualBand: number): void {
    this.predictions.push({
      predicted: predictedBand,
      actual: actualBand,
      correct: predictedBand === actualBand,
    });
  }

  recordScanTime(time: number): void {
    this.scanTimes.push(time);
  }

  getMetrics(): EvaluationMetrics {
    const pd = (this.truePositives + this.falseNegatives) > 0
      ? this.truePositives / (this.truePositives + this.falseNegatives)
      : 0;
    const far = (this.falsePositives + this.trueNegatives) > 0
      ? this.falsePositives / (this.falsePositives + this.trueNegatives)
      : 0;
    const interceptRate = this.totalOpportunities > 0
      ? this.intercepts / this.totalOpportunities
      : 0;
    const avgInterceptTime = this.interceptTimes.length > 0
      ? this.interceptTimes.reduce((a, b) => a + b, 0) / this.interceptTimes.length
      : 0;
    const avgInterceptTimeError = this.interceptTimeErrors.length > 0
      ? this.interceptTimeErrors.reduce((a, b) => a + b, 0) / this.interceptTimeErrors.length
      : 0;
    const predictionAccuracy = this.predictions.length > 0
      ? this.predictions.filter(p => p.correct).length / this.predictions.length
      : 0;
    const scanEfficiency = this.totalScans > 0 ? this.productiveScans / this.totalScans : 0;

    // New metrics
    const uniqueBandsExplored = this.scannedBands.size;
    const receiverUtilisation = this.totalScans > 0
      ? this.scanTimes.filter(t => t > 0).length / this.totalScans
      : 0;

    // Learning curve: detection rate in first half vs second half
    const midpoint = Math.floor(this.scanHistory.length / 2);
    const firstHalf = this.scanHistory.slice(0, midpoint);
    const secondHalf = this.scanHistory.slice(midpoint);
    const firstHalfPd = firstHalf.length > 0
      ? firstHalf.filter(s => s.hit).length / firstHalf.length
      : 0;
    const secondHalfPd = secondHalf.length > 0
      ? secondHalf.filter(s => s.hit).length / secondHalf.length
      : 0;

    return {
      probabilityOfDetection: pd,
      falseAlarmRate: far,
      interceptRate,
      averageInterceptTime: avgInterceptTime,
      averageInterceptTimeError: avgInterceptTimeError,
      predictionAccuracy,
      scanEfficiency,
      totalScans: this.totalScans,
      totalHits: this.truePositives,
      totalMisses: this.falseNegatives,
      totalFalseAlarms: this.falsePositives,
      uniqueBandsExplored,
      receiverUtilisation,
      learningCurve: { firstHalfPd, secondHalfPd, improvement: secondHalfPd - firstHalfPd },
    };
  }

  reset(): void {
    this.truePositives = 0;
    this.falsePositives = 0;
    this.trueNegatives = 0;
    this.falseNegatives = 0;
    this.intercepts = 0;
    this.totalOpportunities = 0;
    this.interceptTimes = [];
    this.interceptTimeErrors = [];
    this.predictions = [];
    this.productiveScans = 0;
    this.totalScans = 0;
    this.scanTimes = [];
    this.emitterFirstActive.clear();
    this.emitterFirstDetected.clear();
    this.scannedBands.clear();
    this.scanHistory = [];
  }
}

export class ScenarioRunner {
  private simulator: any;
  private scheduler: any;
  private metrics: MetricsCalculator;
  private timeline: TimelineEvent[] = [];
  private decisions: SchedulerDecision[] = [];

  constructor(simulator: any, scheduler: any) {
    this.simulator = simulator;
    this.scheduler = scheduler;
    this.metrics = new MetricsCalculator();
  }

  run(scenarioName: string, schedulerName: string, maxSteps: number = 5000, duration: number = 60): ScenarioResult {
    this.metrics.reset();
    this.timeline = [];
    this.decisions = [];

    const bands = this.simulator.getBands();
    
    // Use real FrequencyActivityMap instead of simplified bandMetrics
    const frequencyMap = new FrequencyActivityMap(bands);
    const temporalMemory = new TemporalMemory(bands);

    // Access the internal RF environment simulator for ground truth
    const rfSim = (this.simulator as any).simulator;
    const groundTruthRecorder = rfSim?.getGroundTruth?.();

    let step = 0;
    const dt = 0.011;

    while (step < maxSteps && this.simulator.getCurrentTime() < duration) {
      const receiverState = this.simulator.getReceiverState();
      // Use real metrics from FrequencyActivityMap
      const bandMetrics = frequencyMap.getAllMetrics();
      const decision = this.scheduler.decide(bandMetrics, receiverState, bands);
      this.decisions.push(decision);

      this.simulator.scheduleNextScan(decision.nextBand);

      let observation: any = null;
      for (let i = 0; i < 3; i++) {
        const result = this.simulator.step(dt);
        if (result) {
          observation = result.observation;
          
          // Check actual ground truth for this band at this time
          let actuallyActive = false;
          let gtEntry: GroundTruthEntry | undefined;
          if (groundTruthRecorder) {
            const gtEntries = groundTruthRecorder.getEntriesInBand(
              observation.bandIndex, 
              observation.time - 0.01, 
              observation.time + 0.01
            );
            actuallyActive = gtEntries.length > 0;
            gtEntry = gtEntries[0];
          }
          
          this.metrics.recordDetection(observation, gtEntry);
          
          // Record prediction accuracy: did the scheduler predict the right band?
          if (actuallyActive) {
            this.metrics.recordPrediction(decision.nextBand, observation.bandIndex);
          }
          
          // Update temporal memory and frequency map with observation
          temporalMemory.record(observation, actuallyActive);
          const temporalEntry = temporalMemory.getEntry(observation.bandIndex);
          frequencyMap.update(observation, actuallyActive, temporalEntry);
          
          this.timeline.push({
            time: this.simulator.getCurrentTime(),
            type: result.hit ? 'detection' : 'scan',
            bandIndex: observation.bandIndex,
            frequency: observation.frequency,
            details: result.hit ? `Signal detected at ${observation.frequency / 1e6} MHz` : `Scan at ${observation.frequency / 1e6} MHz - no signal`,
            metadata: { hit: result.hit, snr: observation.snr },
          });
          
          this.scheduler.update(observation, result.hit);
          break;
        }
      }

      if (!observation) {
        this.simulator.step(dt);
        frequencyMap.incrementTimeSinceLastHit();
      }

      this.timeline.push({
        time: this.simulator.getCurrentTime(),
        type: 'scan',
        bandIndex: decision.nextBand,
        frequency: decision.nextFrequency,
        details: `Scheduled next scan: ${decision.nextFrequency / 1e6} MHz (${decision.reasons.join(', ')})`,
        metadata: { priority: decision.priority, confidence: decision.confidence },
      });

      step++;
    }

    const metrics = this.metrics.getMetrics();

    return {
      scenarioName,
      schedulerName,
      metrics,
      timeline: this.timeline,
      decisions: this.decisions,
    };
  }
}

export function compareSchedulers(
  results: ScenarioResult[]
): Map<string, Map<string, EvaluationMetrics>> {
  const comparison = new Map<string, Map<string, EvaluationMetrics>>();
  
  for (const result of results) {
    if (!comparison.has(result.scenarioName)) {
      comparison.set(result.scenarioName, new Map());
    }
    comparison.get(result.scenarioName)!.set(result.schedulerName, result.metrics);
  }
  
  return comparison;
}

export function printComparison(comparison: Map<string, Map<string, EvaluationMetrics>>): void {
  console.log('\n=== COMPARATIVE EVALUATION RESULTS ===\n');
  
  const schedulerNames = new Set<string>();
  const scenarioResults: Array<{ scenario: string; name: string; metrics: EvaluationMetrics }> = [];

  for (const [scenario, schedulers] of comparison) {
    console.log(`\n--- ${scenario} ---`);
    const header = [
      'Scheduler'.padEnd(20),
      'Pd'.padEnd(8),
      'FAR'.padEnd(8),
      'Intercept'.padEnd(10),
      'AvgTime'.padEnd(10),
      'PredAcc'.padEnd(8),
      'Efficiency'.padEnd(10),
      'UniqueBands'.padEnd(12),
      'Learning',
    ].join('');
    console.log(header);
    console.log('-'.repeat(100));
    
    for (const [name, metrics] of schedulers) {
      schedulerNames.add(name);
      const learningStr = `+${(metrics.learningCurve.improvement * 100).toFixed(0)}%`;
      console.log(
        name.padEnd(20) +
        metrics.probabilityOfDetection.toFixed(3).padEnd(8) +
        metrics.falseAlarmRate.toFixed(3).padEnd(8) +
        metrics.interceptRate.toFixed(3).padEnd(10) +
        metrics.averageInterceptTime.toFixed(3).padEnd(10) +
        metrics.predictionAccuracy.toFixed(3).padEnd(8) +
        metrics.scanEfficiency.toFixed(3).padEnd(10) +
        metrics.uniqueBandsExplored.toString().padEnd(12) +
        learningStr
      );
      scenarioResults.push({ scenario, name, metrics });
    }
  }

  // Aggregate summary across all scenarios
  console.log('\n=== AGGREGATE SUMMARY (Mean Across All Scenarios) ===\n');
  const aggregateHeader = [
    'Scheduler'.padEnd(20),
    'Pd'.padEnd(8),
    'FAR'.padEnd(8),
    'Intercept'.padEnd(10),
    'Efficiency'.padEnd(10),
    'PredAcc'.padEnd(8),
    'UniqueBands'.padEnd(12),
    'Scenarios',
  ].join('');
  console.log(aggregateHeader);
  console.log('-'.repeat(90));

  for (const name of schedulerNames) {
    const results = scenarioResults.filter(r => r.name === name);
    if (results.length === 0) continue;
    const n = results.length;
    const avg = (fn: (m: EvaluationMetrics) => number) =>
      results.reduce((sum, r) => sum + fn(r.metrics), 0) / n;
    
    console.log(
      name.padEnd(20) +
      avg(m => m.probabilityOfDetection).toFixed(3).padEnd(8) +
      avg(m => m.falseAlarmRate).toFixed(3).padEnd(8) +
      avg(m => m.interceptRate).toFixed(3).padEnd(10) +
      avg(m => m.scanEfficiency).toFixed(3).padEnd(10) +
      avg(m => m.predictionAccuracy).toFixed(3).padEnd(8) +
      avg(m => m.uniqueBandsExplored).toFixed(0).padEnd(12) +
      n.toString()
    );
  }
  
  console.log('\n');
}