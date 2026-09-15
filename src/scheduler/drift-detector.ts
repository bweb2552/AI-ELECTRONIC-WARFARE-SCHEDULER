import type { BandMetrics, FrequencyBand } from '../core/types';

/**
 * ConceptDriftDetector - Monitors when learned intelligence becomes unreliable.
 * 
 * Detects drift via:
 * - Rising prediction error (predicted band doesn't match actual)
 * - Changed activity distribution (hit rates shifting)
 * - Changed transition patterns (edges weakening)
 * - Periodicity breakdown (regular patterns becoming irregular)
 * - Contradictory recent observations
 * 
 * When drift detected, marks affected intelligence as stale/degraded
 * and increases exploration to encourage relearning.
 */

export type DriftState = 'learning' | 'exploiting' | 'exploring' | 'relearning' | 'confidence_degraded' | 'fallback';

export interface DriftIndicator {
  bandIndex: number;
  state: DriftState;
  driftScore: number; // 0-1, higher = more drift
  reasons: string[];
  lastUpdated: number;
}

export interface SystemDriftState {
  overallState: DriftState;
  globalDriftScore: number;
  bandIndicators: DriftIndicator[];
  explorationBoost: number; // multiplier to increase exploration
  confidenceDegradation: number; // penalty to prediction confidence
}

export class ConceptDriftDetector {
  private bands: FrequencyBand[];
  private recentPredictions: Array<{ time: number; predicted: number; actual: number; correct: boolean }> = [];
  private recentHitRates: Map<number, number[]> = new Map(); // band -> last N hit rates
  private maxHistory = 20;
  private driftThreshold = 0.3;
  private recoveryThreshold = 0.7;

  constructor(bands: FrequencyBand[]) {
    this.bands = bands;
  }

  /**
   * Record a prediction outcome for drift monitoring.
   */
  recordPredictionOutcome(time: number, predictedBand: number, actualBand: number): void {
    this.recentPredictions.push({
      time,
      predicted: predictedBand,
      actual: actualBand,
      correct: predictedBand === actualBand,
    });
    if (this.recentPredictions.length > this.maxHistory) {
      this.recentPredictions.shift();
    }
  }

  /**
   * Record current hit rate for a band (for activity distribution drift).
   */
  recordBandHitRate(bandIndex: number, hitRate: number): void {
    const history = this.recentHitRates.get(bandIndex) || [];
    history.push(hitRate);
    if (history.length > this.maxHistory) history.shift();
    this.recentHitRates.set(bandIndex, history);
  }

  /**
   * Calculate current drift state for all bands and overall system.
   */
  calculateDriftState(
    bandMetrics: BandMetrics[],
    currentTime: number,
    predictionConfidences: Map<number, number>,
  ): SystemDriftState {
    const bandIndicators: DriftIndicator[] = [];

    for (let i = 0; i < this.bands.length; i++) {
      const metrics = bandMetrics[i];
      if (!metrics) continue;

      const indicator = this.calculateBandDrift(i, metrics, currentTime, predictionConfidences);
      bandIndicators.push(indicator);
    }

    // Overall system state
    const avgDrift = bandIndicators.length > 0
      ? bandIndicators.reduce((sum, ind) => sum + ind.driftScore, 0) / bandIndicators.length
      : 0;

    const overallState = this.determineOverallState(avgDrift, bandIndicators);
    const explorationBoost = this.calculateExplorationBoost(overallState, avgDrift);
    const confidenceDegradation = this.calculateConfidenceDegradation(overallState, avgDrift);

    return {
      overallState,
      globalDriftScore: avgDrift,
      bandIndicators,
      explorationBoost,
      confidenceDegradation,
    };
  }

  private calculateBandDrift(
    bandIndex: number,
    metrics: BandMetrics,
    currentTime: number,
    _predictionConfidences: Map<number, number>,
  ): DriftIndicator {
    const reasons: string[] = [];
    let driftScore = 0;

    // 1. Prediction error rate
    const recentPreds = this.recentPredictions.filter(p => p.time > currentTime - 20);
    if (recentPreds.length > 3) {
      const errorRate = recentPreds.filter(p => !p.correct).length / recentPreds.length;
      if (errorRate > 0.6) {
        driftScore += 0.3;
        reasons.push(`High prediction error rate: ${(errorRate * 100).toFixed(0)}%`);
      }
    }

    // 2. Activity distribution change (hit rate volatility)
    const hitRateHistory = this.recentHitRates.get(bandIndex) || [];
    if (hitRateHistory.length > 5) {
      const recent = hitRateHistory.slice(-5);
      const earlier = hitRateHistory.slice(0, -5);
      if (earlier.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        const change = Math.abs(recentAvg - earlierAvg);
        if (change > 0.3) {
          driftScore += 0.25;
          reasons.push(`Hit rate shifted by ${(change * 100).toFixed(0)}%`);
        }
      }
    }

    // 3. Contradictory observations (high activity but low hit rate, or vice versa)
    if (metrics.activityScore > 0.5 && metrics.hitRate < 0.2) {
      driftScore += 0.2;
      reasons.push('High activity but low hit rate — contradictory');
    }
    if (metrics.activityScore < 0.2 && metrics.hitRate > 0.7) {
      driftScore += 0.15;
      reasons.push('Low activity but high hit rate — contradictory');
    }

    // 4. Stale intelligence (no observations for a long time)
    if (metrics.timeSinceLastHit > 30) {
      driftScore += 0.1;
      reasons.push(`No observations for ${metrics.timeSinceLastHit.toFixed(0)}s`);
    }

    const state = this.determineBandState(driftScore, metrics);

    return {
      bandIndex,
      state,
      driftScore: Math.min(1, driftScore),
      reasons,
      lastUpdated: currentTime,
    };
  }

  private determineBandState(driftScore: number, metrics: BandMetrics): DriftState {
    if (driftScore > this.driftThreshold) return 'relearning';
    if (metrics.timeSinceLastHit > 30) return 'exploring';
    if (metrics.predictionConfidence > this.recoveryThreshold) return 'exploiting';
    if (metrics.predictionConfidence > 0.3) return 'learning';
    return 'fallback';
  }

  private determineOverallState(avgDrift: number, indicators: DriftIndicator[]): DriftState {
    if (avgDrift > this.driftThreshold) return 'confidence_degraded';
    const relearningCount = indicators.filter(i => i.state === 'relearning').length;
    if (relearningCount > indicators.length * 0.3) return 'relearning';
    const exploitingCount = indicators.filter(i => i.state === 'exploiting').length;
    if (exploitingCount > indicators.length * 0.5) return 'exploiting';
    return 'learning';
  }

  private calculateExplorationBoost(state: DriftState, driftScore: number): number {
    switch (state) {
      case 'confidence_degraded': return 1.0 + driftScore * 2; // up to 3x exploration
      case 'relearning': return 1.5;
      case 'exploring': return 1.2;
      case 'learning': return 1.0;
      case 'exploiting': return 0.8; // reduce exploration when confident
      default: return 1.0;
    }
  }

  private calculateConfidenceDegradation(state: DriftState, driftScore: number): number {
    switch (state) {
      case 'confidence_degraded': return driftScore * 0.5; // up to 50% penalty
      case 'relearning': return driftScore * 0.3;
      default: return 0;
    }
  }

  reset(): void {
    this.recentPredictions = [];
    this.recentHitRates.clear();
  }
}
