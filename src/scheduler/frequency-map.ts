import type { BandMetrics, FrequencyBand, Observation, TemporalMemoryEntry } from '../core/types';

export class FrequencyActivityMap {
  private bands: FrequencyBand[];
  private metrics: BandMetrics[] = [];
  private historyWindow: number = 50;
  private observationHistory: Map<number, Observation[]> = new Map();

  constructor(bands: FrequencyBand[]) {
    this.bands = bands;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics = this.bands.map((_band, index) => ({
      bandIndex: index,
      activityScore: 0,
      recentHitCount: 0,
      recentMissCount: 0,
      timeSinceLastHit: Infinity,
      hitRate: 0,
      signalStrengthEstimate: -120,
      periodicityScore: 0,
      predictionConfidence: 0,
      transitionProbability: 0,
      threatPriority: 0,
      explorationScore: 1,
      priority: 0,
    }));
  }

  update(observation: Observation, hit: boolean, temporalMemory?: TemporalMemoryEntry): void {
    const bandIndex = observation.bandIndex;
    const metrics = this.metrics[bandIndex];
    if (!metrics) return;

    if (!this.observationHistory.has(bandIndex)) {
      this.observationHistory.set(bandIndex, []);
    }
    const history = this.observationHistory.get(bandIndex)!;
    history.push(observation);
    if (history.length > this.historyWindow) history.shift();

    if (hit) {
      metrics.recentHitCount = Math.min(this.historyWindow, metrics.recentHitCount * 0.9 + 1);
      metrics.timeSinceLastHit = 0;
      metrics.signalStrengthEstimate = observation.power 
        ? (metrics.signalStrengthEstimate * 0.7 + observation.power * 0.3)
        : metrics.signalStrengthEstimate;
    } else {
      metrics.recentMissCount = Math.min(this.historyWindow, metrics.recentMissCount * 0.9 + 1);
      metrics.timeSinceLastHit += 1;
    }

    const total = metrics.recentHitCount + metrics.recentMissCount;
    metrics.hitRate = total > 0 ? metrics.recentHitCount / total : 0;

    metrics.activityScore = this.computeActivityScore(metrics, history);
    metrics.predictionConfidence = this.computeConfidence(metrics, history);
    metrics.explorationScore = this.computeExplorationScore(metrics);
    metrics.threatPriority = this.computeThreatPriority(metrics, observation);
    
    // Compute transition probability from observation pattern:
    // High miss rate with some hits = band transitions (emitter present but not always)
    const totalObs = metrics.recentHitCount + metrics.recentMissCount;
    metrics.transitionProbability = totalObs > 3 
      ? metrics.recentMissCount / totalObs * (metrics.recentHitCount > 0 ? 1 : 0.3)
      : 0;

    if (temporalMemory) {
      metrics.periodicityScore = temporalMemory.periodicityScore;
    }

    metrics.priority = this.computePriority(metrics);
  }

  private computeActivityScore(metrics: BandMetrics, _history: Observation[]): number {
    const recencyWeight = Math.exp(-metrics.timeSinceLastHit / 10);
    const hitRateWeight = metrics.hitRate;
    const signalWeight = Math.max(0, (metrics.signalStrengthEstimate + 120) / 60);
    return (recencyWeight * 0.4 + hitRateWeight * 0.4 + signalWeight * 0.2);
  }

  private computeConfidence(metrics: BandMetrics, history: Observation[]): number {
    const totalObs = history.length;
    if (totalObs < 5) return 0.2;
    const hitRateConfidence = Math.min(1, totalObs / 20);
    const consistency = 1 - Math.abs(metrics.hitRate - 0.5) * 2;
    return (hitRateConfidence * 0.6 + consistency * 0.4);
  }

  private computeExplorationScore(metrics: BandMetrics): number {
    const staleness = Math.min(1, metrics.timeSinceLastHit / 50);
    const uncertainty = 1 - metrics.predictionConfidence;
    return (staleness * 0.6 + uncertainty * 0.4);
  }

  private computeThreatPriority(metrics: BandMetrics, _observation: Observation): number {
    const signalStrength = Math.max(0, (metrics.signalStrengthEstimate + 120) / 60);
    const activity = metrics.activityScore;
    const periodicity = metrics.periodicityScore;
    return (signalStrength * 0.4 + activity * 0.4 + periodicity * 0.2);
  }

  private computePriority(metrics: BandMetrics): number {
    return (
      metrics.activityScore * 0.3 +
      metrics.hitRate * 0.2 +
      metrics.signalStrengthEstimate / 100 * 0.15 +
      metrics.periodicityScore * 0.15 +
      metrics.predictionConfidence * 0.1 +
      metrics.threatPriority * 0.1
    ) - metrics.explorationScore * 0.1;
  }

  incrementTimeSinceLastHit(): void {
    for (const metrics of this.metrics) {
      if (metrics.timeSinceLastHit !== Infinity) {
        metrics.timeSinceLastHit += 1;
      }
    }
  }

  getMetrics(bandIndex: number): BandMetrics | undefined {
    return this.metrics[bandIndex];
  }

  getAllMetrics(): BandMetrics[] {
    return [...this.metrics];
  }

  getTopBands(n: number): BandMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, n);
  }

  getActivityMap(): Array<{ bandIndex: number; frequency: number; activity: number; priority: number; hitRate: number; lastHit: number }> {
    return this.metrics.map(m => ({
      bandIndex: m.bandIndex,
      frequency: this.bands[m.bandIndex]?.centerFrequency || 0,
      activity: m.activityScore,
      priority: m.priority,
      hitRate: m.hitRate,
      lastHit: m.timeSinceLastHit,
    }));
  }

  reset(): void {
    this.initializeMetrics();
    this.observationHistory.clear();
  }
}