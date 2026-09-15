/**
 * IntelligenceEvidenceLedger - Maintains an auditable chain from observation to outcome.
 * 
 * For each decision, stores:
 * - Simulation timestamp
 * - Band/frequency
 * - Observation source (simulated receiver)
 * - Evidence used for decision
 * - Model or rule used
 * - Confidence
 * - Observed/inferred/predicted classification
 * - Later outcome
 * - Whether prediction was confirmed or contradicted
 * 
 * Used for: debugging, explainability, reproducibility, research reporting, judge demonstrations.
 * Configurable limits to prevent unbounded memory growth.
 */

export interface LedgerEntry {
  id: number;
  timestamp: number;
  bandIndex: number;
  frequency: number;
  
  // Pre-decision evidence
  evidence: {
    activityScore: number;
    hitRate: number;
    signalStrength: number;
    periodicityScore: number;
    predictionConfidence: number;
    transitionProbability: number;
    explorationScore: number;
    informationValue: number;
  };
  
  // Decision
  decision: {
    selectedBand: number;
    confidence: number;
    mode: string;
    reasons: string[];
  };
  
  // Classification of evidence source
  evidenceClassification: 'observed' | 'inferred' | 'predicted' | 'simulated_ground_truth';
  
  // Outcome (filled after scan)
  outcome: {
    detected: boolean;
    actuallyActive: boolean;
    snr: number;
    wasPredictionCorrect: boolean;
    intelligenceGained: number; // 0-1, how much new info was gained
  } | null;
  
  // Metadata
  receiverConfig: {
    dwellTime: number;
    tuningTime: number;
  };
}

export class IntelligenceEvidenceLedger {
  private entries: LedgerEntry[] = [];
  private nextId = 1;
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Record a new decision with its evidence.
   */
  recordDecision(
    timestamp: number,
    bandIndex: number,
    frequency: number,
    evidence: LedgerEntry['evidence'],
    decision: LedgerEntry['decision'],
    evidenceClassification: LedgerEntry['evidenceClassification'],
    receiverConfig: LedgerEntry['receiverConfig'],
  ): number {
    const id = this.nextId++;
    
    const entry: LedgerEntry = {
      id,
      timestamp,
      bandIndex,
      frequency,
      evidence,
      decision,
      evidenceClassification,
      outcome: null,
      receiverConfig,
    };

    this.entries.push(entry);
    
    // Trim old entries if over limit
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    return id;
  }

  /**
   * Update the outcome for a decision.
   */
  recordOutcome(
    entryId: number,
    detected: boolean,
    actuallyActive: boolean,
    snr: number,
    wasPredictionCorrect: boolean,
    intelligenceGained: number,
  ): void {
    const entry = this.entries.find(e => e.id === entryId);
    if (entry) {
      entry.outcome = {
        detected,
        actuallyActive,
        snr,
        wasPredictionCorrect,
        intelligenceGained,
      };
    }
  }

  /**
   * Get recent entries for display.
   */
  getRecentEntries(count: number = 10): LedgerEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Get entries for a specific band.
   */
  getEntriesForBand(bandIndex: number): LedgerEntry[] {
    return this.entries.filter(e => e.bandIndex === bandIndex);
  }

  /**
   * Get statistics about prediction accuracy.
   */
  getPredictionStats(): {
    total: number;
    correct: number;
    accuracy: number;
    confirmedPredictions: number;
    contradictedPredictions: number;
  } {
    const withOutcome = this.entries.filter(e => e.outcome !== null);
    const correct = withOutcome.filter(e => e.outcome!.wasPredictionCorrect).length;
    const confirmed = withOutcome.filter(e => e.outcome!.detected && e.outcome!.actuallyActive).length;
    const contradicted = withOutcome.filter(e => !e.outcome!.wasPredictionCorrect).length;
    
    return {
      total: withOutcome.length,
      correct,
      accuracy: withOutcome.length > 0 ? correct / withOutcome.length : 0,
      confirmedPredictions: confirmed,
      contradictedPredictions: contradicted,
    };
  }

  /**
   * Get evidence chain for a specific decision (for explainability).
   */
  getDecisionExplanation(entryId: number): string {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return 'Entry not found';

    const lines: string[] = [];
    lines.push(`Decision #${entry.id} at ${entry.timestamp.toFixed(2)}s`);
    lines.push(`  Band: ${entry.bandIndex} (${(entry.frequency / 1e6).toFixed(1)} MHz)`);
    lines.push(`  Evidence Classification: ${entry.evidenceClassification}`);
    lines.push(`  Activity: ${(entry.evidence.activityScore * 100).toFixed(0)}% | Hit Rate: ${(entry.evidence.hitRate * 100).toFixed(0)}%`);
    lines.push(`  Prediction Confidence: ${(entry.evidence.predictionConfidence * 100).toFixed(0)}%`);
    lines.push(`  Information Value: ${(entry.evidence.informationValue * 100).toFixed(0)}%`);
    lines.push(`  Decision Mode: ${entry.decision.mode}`);
    lines.push(`  Confidence: ${(entry.decision.confidence * 100).toFixed(0)}%`);
    lines.push(`  Reasons: ${entry.decision.reasons.join(', ')}`);
    
    if (entry.outcome) {
      lines.push(`  Outcome: ${entry.outcome.detected ? 'DETECTED' : 'NOT DETECTED'}`);
      lines.push(`  Actually Active: ${entry.outcome.actuallyActive ? 'YES' : 'NO'}`);
      lines.push(`  Prediction ${entry.outcome.wasPredictionCorrect ? 'CONFIRMED' : 'CONTRADICTED'}`);
      lines.push(`  Intelligence Gained: ${(entry.outcome.intelligenceGained * 100).toFixed(0)}%`);
    } else {
      lines.push(`  Outcome: PENDING`);
    }

    return lines.join('\n');
  }

  /**
   * Export entries for research reporting.
   */
  exportEntries(): LedgerEntry[] {
    return [...this.entries];
  }

  reset(): void {
    this.entries = [];
    this.nextId = 1;
  }
}
