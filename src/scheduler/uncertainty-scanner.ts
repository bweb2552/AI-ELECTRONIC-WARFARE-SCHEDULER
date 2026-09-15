import type { BandMetrics, FrequencyBand } from '../core/types';

/**
 * UncertaintyAwareScanner - Calculates an explainable scan value for each candidate band.
 * 
 * For each band, computes:
 * - Detection likelihood (from activity score and hit rate)
 * - Information gain (uncertainty reduction potential)
 * - Exploration value (for under-explored bands)
 * - Prediction confidence (from learned patterns)
 * - Transition/correlation evidence
 * - Recency weight (time since last observation)
 * - Scan cost (penalize frequently scanned bands)
 * 
 * The final score is a transparent weighted combination of these factors.
 * Labels are accurate: "Estimated Information Value" not "mutual information".
 */

export interface ScanValueResult {
  bandIndex: number;
  totalScore: number;
  components: {
    detectionLikelihood: number;
    informationGain: number;
    explorationValue: number;
    predictionConfidence: number;
    transitionEvidence: number;
    recencyWeight: number;
    scanCostPenalty: number;
  };
  mode: 'exploit' | 'explore' | 'hybrid';
  reason: string;
}

export class UncertaintyAwareScanner {
  private visitCounts: number[] = [];
  private totalVisits = 0;
  private lastObservations: Map<number, number> = new Map(); // band -> last observation time

  constructor(private bands: FrequencyBand[]) {
    this.visitCounts = new Array(bands.length).fill(0);
  }

  /**
   * Calculate scan value for all bands given current intelligence.
   * Returns sorted by totalScore (highest first).
   */
  calculateScanValues(
    bandMetrics: BandMetrics[],
    currentTime: number,
    predictionConfidences: Map<number, number> = new Map(),
    transitionProbs: Map<number, number> = new Map(),
  ): ScanValueResult[] {
    const results: ScanValueResult[] = [];

    for (let i = 0; i < this.bands.length; i++) {
      const metrics = bandMetrics[i];
      if (!metrics) continue;

      const components = this.calculateComponents(
        metrics, i, currentTime, predictionConfidences, transitionProbs
      );

      const totalScore = this.combineScore(components);
      const { mode, reason } = this.classifyDecision(components);

      results.push({
        bandIndex: i,
        totalScore,
        components,
        mode,
        reason,
      });
    }

    results.sort((a, b) => b.totalScore - a.totalScore);
    return results;
  }

  private calculateComponents(
    metrics: BandMetrics,
    bandIndex: number,
    currentTime: number,
    predictionConfidences: Map<number, number>,
    transitionProbs: Map<number, number>,
  ): ScanValueResult['components'] {
    // Detection likelihood: higher activity + hit rate = more likely to detect
    const detectionLikelihood = (metrics.activityScore * 0.5 + metrics.hitRate * 0.3 + Math.max(0, (metrics.signalStrengthEstimate + 120) / 60) * 0.2);

    // Information gain: reduce uncertainty about band behavior
    // High when: low confidence + some activity (could be interesting but uncertain)
    const uncertainty = 1 - metrics.predictionConfidence;
    const informationGain = uncertainty * (metrics.activityScore > 0.1 ? 0.7 : 0.3);

    // Exploration value: for under-explored bands
    const visits = this.visitCounts[bandIndex] || 0;
    const expectedVisits = this.totalVisits / Math.max(1, this.bands.length);
    const explorationValue = Math.max(0, (expectedVisits - visits) / Math.max(1, expectedVisits));

    // Prediction confidence: from learned patterns
    const predictionConfidence = predictionConfidences.get(bandIndex) || 0;

    // Transition evidence: from transition graph
    const transitionEvidence = transitionProbs.get(bandIndex) || 0;

    // Recency weight: more time since last scan = more valuable to re-scan
    const lastObs = this.lastObservations.get(bandIndex) || 0;
    const timeSinceLast = currentTime - lastObs;
    const recencyWeight = Math.min(1, timeSinceLast / 20); // saturates at 20s

    // Scan cost penalty: penalize frequently scanned bands
    const scanCostPenalty = Math.min(0.5, visits / Math.max(1, this.totalVisits) * 2);

    return {
      detectionLikelihood,
      informationGain,
      explorationValue,
      predictionConfidence,
      transitionEvidence,
      recencyWeight,
      scanCostPenalty,
    };
  }

  private combineScore(components: ScanValueResult['components']): number {
    return (
      components.detectionLikelihood * 0.30 +
      components.informationGain * 0.20 +
      components.explorationValue * 0.15 +
      components.predictionConfidence * 0.15 +
      components.transitionEvidence * 0.10 +
      components.recencyWeight * 0.10 -
      components.scanCostPenalty * 0.10
    );
  }

  private classifyDecision(components: ScanValueResult['components']): { mode: ScanValueResult['mode']; reason: string } {
    const exploitScore = components.detectionLikelihood * 0.4 + components.predictionConfidence * 0.4 + components.transitionEvidence * 0.2;
    const exploreScore = components.explorationValue * 0.5 + components.informationGain * 0.3 + components.recencyWeight * 0.2;

    if (exploitScore > 0.5 && exploitScore > exploreScore) {
      return { mode: 'exploit', reason: `High detection likelihood (${(components.detectionLikelihood * 100).toFixed(0)}%) + prediction confidence (${(components.predictionConfidence * 100).toFixed(0)}%)` };
    }
    if (exploreScore > 0.3 && exploreScore > exploitScore) {
      return { mode: 'explore', reason: `High exploration value (${(components.explorationValue * 100).toFixed(0)}%) + information gain (${(components.informationGain * 100).toFixed(0)}%)` };
    }
    return { mode: 'hybrid', reason: `Balanced: detection ${(components.detectionLikelihood * 100).toFixed(0)}%, exploration ${(components.explorationValue * 100).toFixed(0)}%` };
  }

  /** Record that a band was scanned */
  recordScan(bandIndex: number, time: number): void {
    this.visitCounts[bandIndex] = (this.visitCounts[bandIndex] || 0) + 1;
    this.totalVisits++;
    this.lastObservations.set(bandIndex, time);
  }

  reset(): void {
    this.visitCounts.fill(0);
    this.totalVisits = 0;
    this.lastObservations.clear();
  }
}
