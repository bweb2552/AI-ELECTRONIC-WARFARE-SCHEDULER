import type { BandMetrics, SchedulerDecision, FrequencyBand, Observation, ReceiverState } from '../core/types';

export interface Scheduler {
  name: string;
  decide(bandMetrics: BandMetrics[], receiverState: ReceiverState, bands: FrequencyBand[]): SchedulerDecision;
  update(observation: Observation, hit: boolean): void;
  reset(): void;
}

export class SequentialScheduler implements Scheduler {
  name = 'Sequential';
  private currentIndex = 0;

  decide(_bandMetrics: BandMetrics[], _receiverState: ReceiverState, bands: FrequencyBand[]): SchedulerDecision {
    const nextBand = this.currentIndex % bands.length;
    this.currentIndex++;
    
    return {
      nextBand,
      nextFrequency: bands[nextBand]?.centerFrequency || 0,
      priority: 1.0,
      confidence: 0.5,
      reasons: ['Sequential round-robin scan'],
      exploration: false,
    };
  }

  update(): void {}
  reset(): void { this.currentIndex = 0; }
}

export class RandomScheduler implements Scheduler {
  name = 'Random';
  private rng: () => number;

  constructor(seed: number = Date.now()) {
    this.rng = this.createSeededRandom(seed);
  }

  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  decide(_bandMetrics: BandMetrics[], _receiverState: ReceiverState, bands: FrequencyBand[]): SchedulerDecision {
    const nextBand = Math.floor(this.rng() * bands.length);
    
    return {
      nextBand,
      nextFrequency: bands[nextBand]?.centerFrequency || 0,
      priority: this.rng(),
      confidence: 0.3,
      reasons: ['Random selection'],
      exploration: true,
    };
  }

  update(): void {}
  reset(): void {}
}

export class PriorityScheduler implements Scheduler {
  name = 'Priority';
  private visitCounts: number[] = [];
  private totalVisits = 0;

  decide(bandMetrics: BandMetrics[], _receiverState: ReceiverState, bands: FrequencyBand[]): SchedulerDecision {
    while (this.visitCounts.length < bands.length) {
      this.visitCounts.push(0);
    }

    let bestBand = 0;
    let bestScore = -1;
    let bestConfidence = 0;

    for (let i = 0; i < bands.length; i++) {
      const metrics = bandMetrics[i];
      if (!metrics) continue;
      
      const explorationBonus = Math.sqrt(Math.log(this.totalVisits + 1) / (this.visitCounts[i] + 1)) * 0.3;
      const score = metrics.activityScore * 0.5 + metrics.hitRate * 0.3 + (metrics.signalStrengthEstimate + 120) / 60 * 0.2 + explorationBonus;
      const confidence = Math.min(1, metrics.hitRate + 0.2);
      
      if (score > bestScore) {
        bestScore = score;
        bestBand = i;
        bestConfidence = confidence;
      }
    }

    return {
      nextBand: bestBand,
      nextFrequency: bands[bestBand]?.centerFrequency || 0,
      priority: bestScore,
      confidence: bestConfidence,
      reasons: ['Activity score', 'Hit rate', 'Signal strength', 'Exploration'],
      exploration: false,
    };
  }

  update(): void {}
  reset(): void {
    this.visitCounts = [];
    this.totalVisits = 0;
  }
}

export class AdaptiveScheduler implements Scheduler {
  name = 'Adaptive (LinUCB + Graph)';
  private theta: number[] = [];
  private A: number[][] = [];
  private b: number[] = [];
  private alpha = 1.0;
  private featureDim = 8;
  private transitionGraph: Map<string, number> = new Map();
  private visitCounts: number[] = [];
  private totalVisits = 0;
  private lastBand = -1;

  constructor(_seed: number = 42) {
    this.initializeMatrices();
  }

  private initializeMatrices(): void {
    this.theta = new Array(this.featureDim).fill(0);
    this.A = Array(this.featureDim).fill(0).map(() => Array(this.featureDim).fill(0));
    for (let i = 0; i < this.featureDim; i++) this.A[i][i] = 1.0;
    this.b = new Array(this.featureDim).fill(0);
    this.visitCounts = [];
  }

  private extractFeatures(metrics: BandMetrics, bandIndex: number, _receiverState: ReceiverState): number[] {
    const graphProb = this.getTransitionProb(this.lastBand, bandIndex);
    const explorationBonus = Math.sqrt(Math.log(this.totalVisits + 1) / (this.visitCounts[bandIndex] + 1));
    
    return [
      metrics.activityScore,
      metrics.hitRate,
      metrics.signalStrengthEstimate / 100,
      metrics.periodicityScore,
      metrics.predictionConfidence,
      graphProb,
      metrics.timeSinceLastHit > 0 ? 1 / metrics.timeSinceLastHit : 0,
      explorationBonus,
    ];
  }

  private getTransitionProb(from: number, to: number): number {
    if (from < 0) return 0;
    const key = `${from}->${to}`;
    return this.transitionGraph.get(key) || 0;
  }

  private updateTransitionGraph(from: number, to: number): void {
    if (from < 0) return;
    const key = `${from}->${to}`;
    const current = this.transitionGraph.get(key) || 0;
    this.transitionGraph.set(key, current * 0.9 + 0.1);
  }

  private invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const aug = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
    
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(aug[j][i]) > Math.abs(aug[pivot][i])) pivot = j;
      }
      [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
      
      const div = aug[i][i];
      if (div === 0) continue;
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= div;
      
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const factor = aug[j][i];
        for (let k = 0; k < 2 * n; k++) aug[j][k] -= factor * aug[i][k];
      }
    }
    
    return aug.map(row => row.slice(n));
  }

  private multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => row.reduce((sum, val, i) => sum + val * vector[i], 0));
  }

  decide(bandMetrics: BandMetrics[], receiverState: ReceiverState, bands: FrequencyBand[]): SchedulerDecision {
    while (this.visitCounts.length < bands.length) {
      this.visitCounts.push(0);
    }

    let bestBand = 0;
    let bestUCB = -Infinity;
    let bestConfidence = 0;
    let bestFeatures: number[] = [];

    for (let i = 0; i < bands.length; i++) {
      const metrics = bandMetrics[i];
      if (!metrics) continue;

      const features = this.extractFeatures(metrics, i, receiverState);
      
      if (this.A[0].length !== this.featureDim) {
        this.initializeMatrices();
      }

      const Ainv = this.invertMatrix(this.A);
      this.theta = this.multiplyMatrixVector(Ainv, this.b);

      const predictedReward = this.theta.reduce((sum, t, j) => sum + t * features[j], 0);
      const uncertainty = Math.sqrt(features.reduce((sum, f, j) => {
        const AinvRow = Ainv[j];
        return sum + f * AinvRow.reduce((s, v, k) => s + v * features[k], 0);
      }, 0));
      
      const ucb = predictedReward + this.alpha * uncertainty;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestBand = i;
        bestConfidence = Math.min(1, Math.max(0, predictedReward));
        bestFeatures = features;
      }
    }

    const reasons = [];
    if (bestFeatures[0] > 0.5) reasons.push('High activity score');
    if (bestFeatures[1] > 0.5) reasons.push('High hit rate');
    if (bestFeatures[5] > 0.3) reasons.push('Strong transition probability');
    if (bestFeatures[7] > 0.5) reasons.push('Exploration bonus');
    if (reasons.length === 0) reasons.push('Default selection');

    return {
      nextBand: bestBand,
      nextFrequency: bands[bestBand]?.centerFrequency || 0,
      priority: bestUCB,
      confidence: bestConfidence,
      reasons,
      exploration: bestFeatures[7] > 0.5,
    };
  }

  update(observation: Observation, hit: boolean): void {
    const band = observation.bandIndex;
    const metrics = this.getBandMetrics(band);
    const features = this.extractFeatures(metrics, band, { 
      currentBand: band, 
      currentFrequency: observation.frequency, 
      isScanning: false, 
      dwellTimeRemaining: 0, 
      tuningTimeRemaining: 0, 
      targetBand: null,
      lastObservationTime: observation.time 
    });

    const reward = hit ? 1.0 : -0.1;

    for (let i = 0; i < this.featureDim; i++) {
      for (let j = 0; j < this.featureDim; j++) {
        this.A[i][j] += features[i] * features[j];
      }
      this.b[i] += reward * features[i];
    }

    this.visitCounts[band] = (this.visitCounts[band] || 0) + 1;
    this.totalVisits++;
    
    this.updateTransitionGraph(this.lastBand, band);
    this.lastBand = band;
  }

  private getBandMetrics(bandIndex: number): BandMetrics {
    return {
      bandIndex,
      activityScore: 0.5,
      recentHitCount: 0,
      recentMissCount: 0,
      timeSinceLastHit: 10,
      hitRate: 0.5,
      signalStrengthEstimate: -70,
      periodicityScore: 0,
      predictionConfidence: 0.5,
      transitionProbability: 0,
      threatPriority: 0.5,
      explorationScore: 0.5,
      priority: 0.5,
    };
  }

  reset(): void {
    this.initializeMatrices();
    this.transitionGraph.clear();
    this.visitCounts = [];
    this.totalVisits = 0;
    this.lastBand = -1;
  }
}

export function createScheduler(type: 'sequential' | 'random' | 'priority' | 'adaptive', seed?: number): Scheduler {
  switch (type) {
    case 'sequential': return new SequentialScheduler();
    case 'random': return new RandomScheduler(seed);
    case 'priority': return new PriorityScheduler();
    case 'adaptive': return new AdaptiveScheduler(seed);
    default: return new SequentialScheduler();
  }
}