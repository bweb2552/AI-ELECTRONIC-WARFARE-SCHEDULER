import type { BandMetrics, FrequencyBand } from '../core/types';

/**
 * CounterfactualComparison - Research-only feature for comparing scan alternatives.
 * 
 * Compares:
 * - The actual selected band
 * - Alternative bands that could have been selected
 * - Immediate detection outcome (simulated)
 * - Scan time consumed
 * - New intelligence gained
 * - Prediction-confidence change
 * 
 * Uses deterministic simulation state to compare under same conditions.
 * Clearly labeled as "Counterfactual simulation" — not actual historical events.
 */

export interface CounterfactualAlternative {
  bandIndex: number;
  frequency: number;
  estimatedScore: number;
  estimatedDetectionProbability: number;
  estimatedIntelligenceGain: number;
  wasActive: boolean;
  actualDetectionOutcome: boolean;
  scanTimeCost: number;
}

export interface CounterfactualComparisonResult {
  actualSelection: {
    bandIndex: number;
    frequency: number;
    score: number;
    detected: boolean;
    wasActive: boolean;
    intelligenceGained: number;
  };
  alternatives: CounterfactualAlternative[];
  wasSelectedBetter: boolean;
  explanation: string;
}

export class CounterfactualComparison {
  constructor(private bands: FrequencyBand[]) {}

  /**
   * Compare the actual selected band against alternatives.
   * Uses current band metrics to estimate outcomes for unselected bands.
   */
  compare(
    selectedBand: number,
    selectedScore: number,
    bandMetrics: BandMetrics[],
    groundTruthActive: Map<number, boolean>, // bandIndex -> was active at scan time
    detected: boolean,
    dwellTime: number,
  ): CounterfactualComparisonResult {
    const selectedMetrics = bandMetrics[selectedBand];
    const selectedWasActive = groundTruthActive.get(selectedBand) || false;

    // Generate alternatives (top 3 bands by metrics score, excluding selected)
    const alternatives: CounterfactualAlternative[] = [];
    const scoredBands = bandMetrics
      .map((m, i) => ({ index: i, score: m.activityScore * 0.4 + m.hitRate * 0.3 + m.predictionConfidence * 0.3 }))
      .filter(b => b.index !== selectedBand)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const alt of scoredBands) {
      const metrics = bandMetrics[alt.index];
      const wasActive = groundTruthActive.get(alt.index) || false;
      
      alternatives.push({
        bandIndex: alt.index,
        frequency: this.bands[alt.index]?.centerFrequency || 0,
        estimatedScore: alt.score,
        estimatedDetectionProbability: wasActive ? 0.8 : 0.1, // simplified estimate
        estimatedIntelligenceGain: metrics.activityScore < 0.3 ? 0.6 : 0.2,
        wasActive,
        actualDetectionOutcome: wasActive, // simplified: would detect if active
        scanTimeCost: dwellTime,
      });
    }

    // Determine if selected was better
    const bestAlternative = alternatives[0];
    const selectedIntelligenceGain = selectedMetrics ? (selectedMetrics.activityScore < 0.3 ? 0.6 : 0.2) : 0;
    const wasSelectedBetter = !bestAlternative ||
      selectedScore >= bestAlternative.estimatedScore ||
      (detected && selectedWasActive);

    const explanation = this.generateExplanation(
      selectedBand, selectedWasActive, detected, selectedIntelligenceGain,
      alternatives, wasSelectedBetter
    );

    return {
      actualSelection: {
        bandIndex: selectedBand,
        frequency: this.bands[selectedBand]?.centerFrequency || 0,
        score: selectedScore,
        detected,
        wasActive: selectedWasActive,
        intelligenceGained: selectedIntelligenceGain,
      },
      alternatives,
      wasSelectedBetter,
      explanation,
    };
  }

  private generateExplanation(
    selectedBand: number,
    selectedWasActive: boolean,
    detected: boolean,
    _intelligenceGain: number,
    alternatives: CounterfactualAlternative[],
    wasSelectedBetter: boolean,
  ): string {
    const lines: string[] = [];
    lines.push(`[Counterfactual simulation] Band ${selectedBand} was selected.`);
    
    if (detected && selectedWasActive) {
      lines.push(`Detection confirmed: signal present at this frequency.`);
    } else if (!selectedWasActive) {
      lines.push(`No signal present: band was inactive during scan.`);
    } else {
      lines.push(`Signal present but not detected (below threshold).`);
    }

    if (alternatives.length > 0) {
      const best = alternatives[0];
      if (best.wasActive) {
        lines.push(`Alternative band ${best.bandIndex} was also active — could have detected there.`);
      } else {
        lines.push(`Top alternative band ${best.bandIndex} was inactive — would not have detected.`);
      }
    }

    if (wasSelectedBetter) {
      lines.push(`Selected band was optimal or equal to alternatives.`);
    } else {
      lines.push(`An alternative band might have yielded better results.`);
    }

    return lines.join(' ');
  }

  reset(): void {
    // No persistent state to reset
  }
}
