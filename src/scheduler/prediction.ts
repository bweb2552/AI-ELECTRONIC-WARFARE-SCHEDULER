import type { BandMetrics, SchedulerDecision, FrequencyBand, Observation, TemporalMemoryEntry } from '../core/types';
import { FrequencyActivityMap } from './frequency-map';
import { TemporalMemory, PeriodicOptimizer } from './temporal-memory';
import { TransitionGraph } from './link-graph';
import { PatternFingerprintEngine } from './pattern-fingerprint';

export interface PredictionResult {
  bandIndex: number;
  predictedActivationTime: number;
  confidence: number;
  source: 'periodic' | 'transition' | 'pattern' | 'activity' | 'exploration';
  details: string;
}

export class PredictionLayer {
  private frequencyMap: FrequencyActivityMap;
  private periodicOptimizer: PeriodicOptimizer;
  private transitionGraph: TransitionGraph;
  private patternEngine: PatternFingerprintEngine;

  constructor(
    frequencyMap: FrequencyActivityMap,
    temporalMemory: TemporalMemory,
    transitionGraph: TransitionGraph,
    patternEngine: PatternFingerprintEngine,
    _bands: FrequencyBand[]
  ) {
    this.frequencyMap = frequencyMap;
    this.transitionGraph = transitionGraph;
    this.patternEngine = patternEngine;
    this.periodicOptimizer = new PeriodicOptimizer(temporalMemory, _bands);
  }

  predict(currentTime: number, currentBand: number, dwellTime: number, tuningTime: number): PredictionResult[] {
    const predictions: PredictionResult[] = [];

    const periodicPreds = this.predictPeriodic(currentTime, dwellTime, tuningTime);
    predictions.push(...periodicPreds);

    const transitionPreds = this.predictTransitions(currentBand, currentTime);
    predictions.push(...transitionPreds);

    const patternPreds = this.predictFromPatterns(currentBand);
    predictions.push(...patternPreds);

    const activityPreds = this.predictFromActivity(currentTime);
    predictions.push(...activityPreds);

    const explorationPreds = this.predictExploration(currentTime);
    predictions.push(...explorationPreds);

    predictions.sort((a, b) => b.confidence - a.confidence);
    return predictions;
  }

  private predictPeriodic(currentTime: number, dwellTime: number, tuningTime: number): PredictionResult[] {
    const results: PredictionResult[] = [];
    const recommendations = this.periodicOptimizer.getPeriodicRecommendations(currentTime, dwellTime, tuningTime);
    
    for (const rec of recommendations) {
      results.push({
        bandIndex: rec.bandIndex,
        predictedActivationTime: rec.predictedTime,
        confidence: rec.confidence,
        source: 'periodic',
        details: `Periodic emitter predicted at ${rec.predictedTime.toFixed(2)}s (period confidence: ${rec.confidence.toFixed(2)})`,
      });
    }
    return results;
  }

  private predictTransitions(currentBand: number, currentTime: number): PredictionResult[] {
    const results: PredictionResult[] = [];
    const transitions = this.transitionGraph.getPredictedNextBands(currentBand, 5);
    
    for (const t of transitions) {
      if (t.probability > 0.1) {
        results.push({
          bandIndex: t.bandIndex,
          predictedActivationTime: currentTime + 1,
          confidence: t.probability,
          source: 'transition',
          details: `Transition from band ${currentBand} (prob: ${t.probability.toFixed(2)})`,
        });
      }
    }
    return results;
  }

  private predictFromPatterns(currentBand: number): PredictionResult[] {
    const results: PredictionResult[] = [];
    const patterns = this.patternEngine.getHighConfidencePatterns(0.6);
    
    for (const pattern of patterns) {
      if (pattern.transitionPattern.length < 2) continue;
      
      const lastIdx = pattern.transitionPattern.indexOf(currentBand);
      if (lastIdx >= 0 && lastIdx < pattern.transitionPattern.length - 1) {
        const nextBand = pattern.transitionPattern[lastIdx + 1];
        results.push({
          bandIndex: nextBand,
          predictedActivationTime: Date.now() / 1000 + 1,
          confidence: pattern.confidence * 0.7,
          source: 'pattern',
          details: `Pattern ${pattern.id} predicts transition to band ${nextBand}`,
        });
      }
    }
    return results;
  }

  private predictFromActivity(currentTime: number): PredictionResult[] {
    const results: PredictionResult[] = [];
    const metrics = this.frequencyMap.getAllMetrics();
    
    for (const m of metrics) {
      if (m.activityScore > 0.5 && m.predictionConfidence > 0.4) {
        results.push({
          bandIndex: m.bandIndex,
          predictedActivationTime: currentTime + 1,
          confidence: m.activityScore * m.predictionConfidence,
          source: 'activity',
          details: `High activity score (${m.activityScore.toFixed(2)}) with confidence ${m.predictionConfidence.toFixed(2)}`,
        });
      }
    }
    return results;
  }

  private predictExploration(currentTime: number): PredictionResult[] {
    const results: PredictionResult[] = [];
    const metrics = this.frequencyMap.getAllMetrics();
    
    for (const m of metrics) {
      if (m.explorationScore > 0.7 && m.timeSinceLastHit > 20) {
        results.push({
          bandIndex: m.bandIndex,
          predictedActivationTime: currentTime + 1,
          confidence: m.explorationScore * 0.3,
          source: 'exploration',
          details: `Exploration: stale band (${m.timeSinceLastHit} steps since hit)`,
        });
      }
    }
    return results;
  }

  getBestPrediction(currentTime: number, currentBand: number, dwellTime: number, tuningTime: number): PredictionResult | null {
    const predictions = this.predict(currentTime, currentBand, dwellTime, tuningTime);
    return predictions.length > 0 ? predictions[0] : null;
  }

  getPeriodicRecommendations(currentTime: number, dwellTime: number, tuningTime: number) {
    return this.periodicOptimizer.getPeriodicRecommendations(currentTime, dwellTime, tuningTime);
  }

  shouldExploitPeriodic(currentTime: number) {
    return this.periodicOptimizer.shouldExploitPeriodic(currentTime);
  }
}

export class SmartScheduler {
  private predictionLayer: PredictionLayer;
  private frequencyMap: FrequencyActivityMap;
  private bands: FrequencyBand[];
  private visitCounts: number[] = [];
  private totalVisits = 0;
  private alpha = 1.2;
  private rng: () => number;
  private predictionHistory: Array<{ predictedBand: number; predictedTime: number; confidence: number; actualBand?: number; actualTime?: number; correct?: boolean }> = [];
  private emitterActivationTimes: Map<string, number> = new Map();
  private emitterFirstDetected: Map<string, number> = new Map();
  private decisionTrace: Array<{ time: number; currentBand: number; selectedBand: number; score: number; confidence: number; reasons: string[]; features: Record<string, number>; exploration: boolean }> = [];

  constructor(
    frequencyMap: FrequencyActivityMap,
    temporalMemory: TemporalMemory,
    transitionGraph: TransitionGraph,
    patternEngine: PatternFingerprintEngine,
    bands: FrequencyBand[],
    seed: number = 42
  ) {
    this.frequencyMap = frequencyMap;
    this.bands = bands;
    this.predictionLayer = new PredictionLayer(
      frequencyMap, temporalMemory, transitionGraph, patternEngine, bands
    );
    this.rng = this.createSeededRandom(seed);
    this.visitCounts = new Array(bands.length).fill(0);
  }

  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  decide(receiverState: any): SchedulerDecision {
    const currentTime = receiverState.lastObservationTime || 0;
    const currentBand = receiverState.currentBand || 0;
    const dwellTime = 0.01;
    const tuningTime = 0.001;

    const periodicExploit = this.predictionLayer.shouldExploitPeriodic(currentTime);
    if (periodicExploit && periodicExploit.confidence > 0.65) {
      const band = this.bands[periodicExploit.bandIndex];
      this.recordVisit(periodicExploit.bandIndex);
      const decision = {
        nextBand: periodicExploit.bandIndex,
        nextFrequency: band?.centerFrequency || 0,
        priority: periodicExploit.confidence,
        confidence: periodicExploit.confidence,
        reasons: ['Periodic optimization', `High confidence periodic prediction`],
        exploration: false,
        predictedActivationTime: currentTime + 1,
      };
      this.recordPrediction(decision, currentTime);
      this.recordDecisionTrace(currentTime, currentBand, decision, { periodicConfidence: periodicExploit.confidence });
      return decision;
    }

    const predictions = this.predictionLayer.predict(currentTime, currentBand, dwellTime, tuningTime);
    
    let bestBand = 0;
    let bestScore = -Infinity;
    let bestConfidence = 0;
    let bestReasons: string[] = [];
    let bestExploration = false;
    let bestPredictedTime: number | undefined;
    let bestFeatures: Record<string, number> = {};

    for (const pred of predictions) {
      const metrics = this.frequencyMap.getMetrics(pred.bandIndex);
      if (!metrics) continue;

      const explorationBonus = this.alpha * Math.sqrt((Math.log(this.totalVisits + 1) + 1) / (this.visitCounts[pred.bandIndex] + 1)) + this.rng() * 0.1;
      const score = pred.confidence * 0.7 + explorationBonus * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestBand = pred.bandIndex;
        bestConfidence = pred.confidence;
        bestReasons = [pred.details, `Source: ${pred.source}`];
        bestExploration = pred.source === 'exploration';
        bestPredictedTime = pred.predictedActivationTime;
        bestFeatures = {
          activityScore: metrics.activityScore,
          hitRate: metrics.hitRate,
          signalStrength: metrics.signalStrengthEstimate,
          periodicity: metrics.periodicityScore,
          predictionConfidence: metrics.predictionConfidence,
          explorationBonus,
          transitionProb: pred.source === 'transition' ? pred.confidence : 0,
        };
      }
    }

    if (bestScore === -Infinity) {
      bestBand = Math.floor(this.rng() * this.bands.length);
      bestConfidence = 0.2;
      bestReasons = ['Fallback: random selection'];
      bestExploration = true;
      bestFeatures = { random: 1 };
    }

    this.recordVisit(bestBand);

    const decision = {
      nextBand: bestBand,
      nextFrequency: this.bands[bestBand]?.centerFrequency || 0,
      priority: bestScore,
      confidence: bestConfidence,
      reasons: bestReasons,
      exploration: bestExploration,
      predictedActivationTime: bestPredictedTime,
    };
    this.recordPrediction(decision, currentTime);
    this.recordDecisionTrace(currentTime, currentBand, decision, bestFeatures);
    return decision;
  }

  private recordDecisionTrace(time: number, currentBand: number, decision: SchedulerDecision, features: Record<string, number>): void {
    this.decisionTrace.push({
      time,
      currentBand,
      selectedBand: decision.nextBand,
      score: decision.priority,
      confidence: decision.confidence,
      reasons: decision.reasons,
      features,
      exploration: decision.exploration,
    });
    if (this.decisionTrace.length > 500) this.decisionTrace.shift();
  }

  getDecisionTrace(): Array<{ time: number; currentBand: number; selectedBand: number; score: number; confidence: number; reasons: string[]; features: Record<string, number>; exploration: boolean }> {
    return [...this.decisionTrace].reverse();
  }

  private recordPrediction(decision: SchedulerDecision, currentTime: number): void {
    this.predictionHistory.push({
      predictedBand: decision.nextBand,
      predictedTime: decision.predictedActivationTime ?? currentTime + 1,
      confidence: decision.confidence,
    });
    if (this.predictionHistory.length > 1000) this.predictionHistory.shift();
  }

  evaluatePrediction(actualBand: number, actualTime: number): void {
    const pending = this.predictionHistory.find(p => p.actualBand === undefined && Math.abs(p.predictedTime - actualTime) < 5);
    if (pending) {
      pending.actualBand = actualBand;
      pending.actualTime = actualTime;
      pending.correct = pending.predictedBand === actualBand;
    }
  }

  getPredictionAccuracy(): number {
    const evaluated = this.predictionHistory.filter(p => p.correct !== undefined);
    if (evaluated.length === 0) return 0;
    return evaluated.filter(p => p.correct).length / evaluated.length;
  }

  private recordVisit(bandIndex: number): void {
    this.visitCounts[bandIndex] = (this.visitCounts[bandIndex] || 0) + 1;
    this.totalVisits++;
  }

  update(observation: Observation, hit: boolean, _metrics: BandMetrics, temporalMemory: TemporalMemoryEntry): void {
    this.frequencyMap.update(observation, hit, temporalMemory);
    
    if (hit && observation.features) {
      const emitterKey = `${observation.bandIndex}-${observation.features.estimatedCenterFreq.toFixed(0)}`;
      if (!this.emitterFirstDetected.has(emitterKey)) {
        this.emitterFirstDetected.set(emitterKey, observation.time);
      }
    }
  }

  recordEmitterActivation(emitterId: string, frequency: number, activationTime: number): void {
    const key = `${emitterId}-${frequency}`;
    if (!this.emitterActivationTimes.has(key)) {
      this.emitterActivationTimes.set(key, activationTime);
    }
  }

  getAverageInterceptTime(): number {
    let totalInterceptTime = 0;
    let count = 0;
    
    for (const [key, detectedTime] of this.emitterFirstDetected) {
      const activationTime = this.emitterActivationTimes.get(key);
      if (activationTime !== undefined && detectedTime > activationTime) {
        totalInterceptTime += detectedTime - activationTime;
        count++;
      }
    }
    
    return count > 0 ? totalInterceptTime / count : 0;
  }

  getPredictionLayer(): PredictionLayer {
    return this.predictionLayer;
  }

  reset(): void {
    this.visitCounts.fill(0);
    this.totalVisits = 0;
  }
}