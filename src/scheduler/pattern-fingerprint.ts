import type { PatternFingerprint, PatternId, EmitterType, Observation, BandMetrics, TemporalMemoryEntry } from '../core/types';

export class PatternFingerprintEngine {
  private patterns: Map<PatternId, PatternFingerprint> = new Map();
  private observationClusters: Map<PatternId, Observation[]> = new Map();
  private nextPatternId = 0;
  private similarityThreshold = 0.55;
  private maxPatterns = 50;
  private currentSimTime = 0;

  constructor() {}

  processObservation(observation: Observation, metrics: BandMetrics, temporalMemory: TemporalMemoryEntry): void {
    this.currentSimTime = observation.time;
    const features = this.extractFeatures(observation, metrics, temporalMemory);
    const matchedPattern = this.findMatchingPattern(features);

    if (matchedPattern) {
      this.updatePattern(matchedPattern, observation, features, temporalMemory);
    } else {
      this.createNewPattern(observation, features);
    }

    this.prunePatterns();
  }

  private extractFeatures(observation: Observation, metrics: BandMetrics, temporalMemory: TemporalMemoryEntry): PatternFeatures {
    return {
      frequencyBehavior: this.classifyFrequencyBehavior(metrics, temporalMemory),
      activityPattern: this.classifyActivityPattern(metrics, temporalMemory),
      estimatedPeriod: temporalMemory.estimatedPeriod,
      averageBandwidth: observation.features?.estimatedBandwidth || metrics.signalStrengthEstimate,
      averagePower: observation.features?.estimatedPower || metrics.signalStrengthEstimate,
      transitionPattern: [],
      bandwidthVariance: 0,
      powerVariance: 0,
      dutyCycleEstimate: metrics.hitRate,
    };
  }

  private classifyFrequencyBehavior(metrics: BandMetrics, temporalMemory: TemporalMemoryEntry): 'fixed' | 'agile' | 'periodic' | 'burst' {
    if (temporalMemory.periodicityScore > 0.4) return 'periodic';
    if (metrics.transitionProbability > 0.25) return 'agile';
    if (metrics.hitRate < 0.2 && metrics.activityScore > 0.3) return 'burst';
    return 'fixed';
  }

  private classifyActivityPattern(metrics: BandMetrics, temporalMemory: TemporalMemoryEntry): 'continuous' | 'periodic' | 'bursty' | 'sporadic' {
    if (temporalMemory.periodicityScore > 0.4) return 'periodic';
    if (metrics.hitRate > 0.7) return 'continuous';
    if (metrics.hitRate < 0.2 && metrics.activityScore > 0.3) return 'bursty';
    return 'sporadic';
  }

  private findMatchingPattern(features: PatternFeatures): PatternId | null {
    let bestMatch: PatternId | null = null;
    let bestSimilarity = 0;

    for (const [id, pattern] of this.patterns) {
      const similarity = this.computeSimilarity(pattern, features);
      if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = id;
      }
    }

    return bestMatch;
  }

  private computeSimilarity(pattern: PatternFingerprint, features: PatternFeatures): number {
    let score = 0;
    let weights = 0;

    if (pattern.frequencyBehavior === features.frequencyBehavior) { score += 0.3; weights += 0.3; }
    if (pattern.activityPattern === features.activityPattern) { score += 0.3; weights += 0.3; }
    
    if (pattern.estimatedPeriod && features.estimatedPeriod) {
      const periodDiff = Math.abs(pattern.estimatedPeriod - features.estimatedPeriod) / Math.max(pattern.estimatedPeriod, features.estimatedPeriod);
      score += (1 - periodDiff) * 0.2;
      weights += 0.2;
    }

    const bwDiff = Math.abs(pattern.averageBandwidth - features.averageBandwidth) / Math.max(pattern.averageBandwidth, features.averageBandwidth, 1);
    score += (1 - bwDiff) * 0.1;
    weights += 0.1;

    const powerDiff = Math.abs(pattern.averagePower - features.averagePower) / Math.max(Math.abs(pattern.averagePower), Math.abs(features.averagePower), 1);
    score += (1 - powerDiff) * 0.1;
    weights += 0.1;

    return weights > 0 ? score / weights : 0;
  }

  private createNewPattern(observation: Observation, features: PatternFeatures): void {
    if (this.patterns.size >= this.maxPatterns) return;

    const id = `P${this.nextPatternId++}` as PatternId;
    const pattern: PatternFingerprint = {
      id,
      type: this.inferEmitterType(features),
      frequencyBehavior: features.frequencyBehavior,
      activityPattern: features.activityPattern,
      estimatedPeriod: features.estimatedPeriod,
      averageBandwidth: features.averageBandwidth,
      averagePower: features.averagePower,
      transitionPattern: [],
      confidence: 0.3,
      supportingObservations: 1,
      firstSeen: observation.time,
      lastSeen: observation.time,
      status: 'learning',
      evidence: [`First observed at ${(observation.frequency / 1e6).toFixed(1)} MHz`],
      primaryBandIndex: observation.bandIndex,
    };

    this.patterns.set(id, pattern);
    this.observationClusters.set(id, [observation]);
  }

  private inferEmitterType(features: PatternFeatures): EmitterType {
    switch (features.frequencyBehavior) {
      case 'fixed': return 'static';
      case 'periodic': return 'periodic';
      case 'agile': return 'frequency-agile';
      case 'burst': return 'burst';
      default: return 'static';
    }
  }

  private updatePattern(patternId: PatternId, observation: Observation, features: PatternFeatures, temporalMemory: TemporalMemoryEntry): void {
    const pattern = this.patterns.get(patternId);
    const cluster = this.observationClusters.get(patternId);
    if (!pattern || !cluster) return;

    cluster.push(observation);
    if (cluster.length > 100) cluster.shift();

    pattern.supportingObservations = cluster.length;
    pattern.lastSeen = observation.time;
    pattern.primaryBandIndex = observation.bandIndex;
    
    pattern.averageBandwidth = pattern.averageBandwidth * 0.9 + features.averageBandwidth * 0.1;
    pattern.averagePower = pattern.averagePower * 0.9 + features.averagePower * 0.1;

    if (features.estimatedPeriod && pattern.estimatedPeriod) {
      pattern.estimatedPeriod = pattern.estimatedPeriod * 0.9 + features.estimatedPeriod * 0.1;
    } else if (features.estimatedPeriod) {
      pattern.estimatedPeriod = features.estimatedPeriod;
    }

    // Faster confidence growth: reach 0.5 after ~7 observations, confirmed after ~24
    pattern.confidence = Math.min(0.95, 0.3 + cluster.length * 0.03);
    
    // Update status based on confidence
    if (pattern.confidence >= 0.7) {
      pattern.status = 'confirmed';
    } else if (pattern.confidence >= 0.45) {
      pattern.status = 'learning';
    } else {
      pattern.status = 'weak';
    }

    // Build evidence list
    pattern.evidence = this.buildEvidence(pattern, cluster, features, temporalMemory);

    // Track frequency transitions for agile/periodic patterns
    if (pattern.frequencyBehavior === 'agile' || pattern.frequencyBehavior === 'periodic') {
      const lastBand = cluster[cluster.length - 2]?.bandIndex;
      const currentBand = observation.bandIndex;
      if (lastBand !== undefined && lastBand !== currentBand) {
        pattern.transitionPattern.push(currentBand);
        if (pattern.transitionPattern.length > 20) pattern.transitionPattern.shift();
      }
    }

    // Predict next activity if periodic
    if (temporalMemory.estimatedPeriod && temporalMemory.periodConfidence > 0.4) {
      const timeSinceLast = observation.time - (cluster[cluster.length - 2]?.time ?? observation.time);
      if (timeSinceLast > 0) {
        pattern.predictedNextTime = observation.time + temporalMemory.estimatedPeriod;
      }
    }
  }

  private buildEvidence(pattern: PatternFingerprint, cluster: Observation[], features: PatternFeatures, temporalMemory: TemporalMemoryEntry): string[] {
    const evidence: string[] = [];
    const freq = cluster[cluster.length - 1]?.frequency;
    
    if (freq) {
      evidence.push(`Active at ${(freq / 1e6).toFixed(1)} MHz`);
    }

    evidence.push(`${cluster.length} observations over ${(pattern.lastSeen - pattern.firstSeen).toFixed(1)}s`);
    
    if (features.activityPattern === 'continuous') {
      evidence.push('Continuous transmission detected');
    } else if (features.activityPattern === 'periodic' && pattern.estimatedPeriod) {
      evidence.push(`Period ~${pattern.estimatedPeriod.toFixed(1)}s (score: ${(temporalMemory.periodicityScore * 100).toFixed(0)}%)`);
    } else if (features.activityPattern === 'bursty') {
      evidence.push(`Intermittent bursts (hit rate: ${(features.dutyCycleEstimate * 100).toFixed(0)}%)`);
    }

    if (pattern.transitionPattern.length >= 2) {
      evidence.push(`Freq transitions: ${pattern.transitionPattern.slice(-5).join(' → ')}`);
    }

    if (pattern.status === 'confirmed') {
      evidence.push('Pattern confirmed from observed receiver data');
    }

    return evidence;
  }

  private prunePatterns(): void {
    // Use simulation time, NOT wall-clock time
    const simTime = this.currentSimTime;
    for (const [id, pattern] of this.patterns) {
      // Prune patterns not seen for 30+ simulation seconds with low confidence
      if (simTime - pattern.lastSeen > 30 && pattern.confidence < 0.5) {
        this.patterns.delete(id);
        this.observationClusters.delete(id);
      }
    }
  }

  getPattern(id: PatternId): PatternFingerprint | undefined {
    return this.patterns.get(id);
  }

  getAllPatterns(): PatternFingerprint[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  getPatternsByType(type: EmitterType): PatternFingerprint[] {
    return this.getAllPatterns().filter(p => p.type === type);
  }

  getHighConfidencePatterns(threshold: number = 0.7): PatternFingerprint[] {
    return this.getAllPatterns().filter(p => p.confidence >= threshold);
  }

  predictNextBands(currentBand: number): Array<{ bandIndex: number; probability: number }> {
    const predictions: Array<{ bandIndex: number; probability: number }> = [];
    
    for (const pattern of this.patterns.values()) {
      if (pattern.confidence < 0.5) continue;
      if (pattern.transitionPattern.length < 2) continue;

      const lastIdx = pattern.transitionPattern.indexOf(currentBand);
      if (lastIdx >= 0 && lastIdx < pattern.transitionPattern.length - 1) {
        const nextBand = pattern.transitionPattern[lastIdx + 1];
        predictions.push({ bandIndex: nextBand, probability: pattern.confidence * 0.8 });
      }
    }

    predictions.sort((a, b) => b.probability - a.probability);
    return predictions.slice(0, 5);
  }

  getPatternSummary(): string {
    const patterns = this.getAllPatterns();
    return patterns.map(p => 
      `${p.id}: ${p.type} | ${p.frequencyBehavior}/${p.activityPattern} | conf=${p.confidence.toFixed(2)} | obs=${p.supportingObservations}`
    ).join('\n');
  }

  reset(): void {
    this.patterns.clear();
    this.observationClusters.clear();
    this.nextPatternId = 0;
    this.currentSimTime = 0;
  }
}

interface PatternFeatures {
  frequencyBehavior: 'fixed' | 'agile' | 'periodic' | 'burst';
  activityPattern: 'continuous' | 'periodic' | 'bursty' | 'sporadic';
  estimatedPeriod?: number;
  averageBandwidth: number;
  averagePower: number;
  transitionPattern: number[];
  bandwidthVariance: number;
  powerVariance: number;
  dutyCycleEstimate: number;
}