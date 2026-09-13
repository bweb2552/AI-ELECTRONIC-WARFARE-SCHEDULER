import type { TemporalMemoryEntry, Observation, FrequencyBand } from '../core/types';
import { mean, standardDeviation } from 'simple-statistics';

function autocorrelation(data: number[]): number[] {
  const n = data.length;
  if (n === 0) return [];
  
  const m = mean(data);
  const c0 = data.reduce((sum, x) => sum + (x - m) ** 2, 0) / n;
  if (c0 === 0) return new Array(n).fill(0);
  
  const result: number[] = [];
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < n - k; i++) {
      sum += (data[i] - m) * (data[i + k] - m);
    }
    result.push(sum / (n * c0));
  }
  return result;
}

export class TemporalMemory {
  private entries: Map<number, TemporalMemoryEntry> = new Map();
  private maxHistoryLength = 100;
  private minPeriodSamples = 3;
  private bands: FrequencyBand[];

  constructor(bands: FrequencyBand[]) {
    this.bands = bands;
    this.initializeEntries();
  }

  private initializeEntries(): void {
    for (const band of this.bands) {
      this.entries.set(band.index, this.createEmptyEntry(band.index));
    }
  }

  private createEmptyEntry(bandIndex: number): TemporalMemoryEntry {
    return {
      bandIndex,
      hits: [],
      misses: [],
      lastSeen: -Infinity,
      hitCount: 0,
      missCount: 0,
      avgInterArrival: 0,
      interArrivalVariance: 0,
      periodicityScore: 0,
      estimatedPeriod: undefined,
      periodConfidence: 0,
    };
  }

  record(observation: Observation, hit: boolean): void {
    const entry = this.entries.get(observation.bandIndex);
    if (!entry) return;

    entry.lastSeen = observation.time;

    if (hit) {
      entry.hits.push(observation.time);
      entry.hitCount++;
      if (entry.hits.length > this.maxHistoryLength) entry.hits.shift();
    } else {
      entry.misses.push(observation.time);
      entry.missCount++;
      if (entry.misses.length > this.maxHistoryLength) entry.misses.shift();
    }

    this.updateStatistics(entry);
    this.detectPeriodicity(entry);
  }

  private updateStatistics(entry: TemporalMemoryEntry): void {
    if (entry.hits.length < 2) {
      entry.avgInterArrival = 0;
      entry.interArrivalVariance = 0;
      return;
    }

    const intervals: number[] = [];
    for (let i = 1; i < entry.hits.length; i++) {
      intervals.push(entry.hits[i] - entry.hits[i - 1]);
    }

    entry.avgInterArrival = mean(intervals);
    entry.interArrivalVariance = standardDeviation(intervals) ** 2;
  }

  private detectPeriodicity(entry: TemporalMemoryEntry): void {
    if (entry.hits.length < this.minPeriodSamples) {
      entry.periodicityScore = 0;
      entry.periodConfidence = 0;
      entry.estimatedPeriod = undefined;
      return;
    }

    const intervals: number[] = [];
    for (let i = 1; i < entry.hits.length; i++) {
      intervals.push(entry.hits[i] - entry.hits[i - 1]);
    }

    if (intervals.length < 3) {
      entry.periodicityScore = 0;
      return;
    }

    const cv = Math.sqrt(entry.interArrivalVariance) / (entry.avgInterArrival || 1);
    
    const acf = autocorrelation(intervals);
    const maxAcf = Math.max(...acf.slice(1, Math.min(5, acf.length)));
    
    const regularityScore = Math.max(0, 1 - cv * 2);
    const acfScore = Math.max(0, maxAcf);
    
    entry.periodicityScore = (regularityScore * 0.6 + acfScore * 0.4);
    
    if (entry.periodicityScore > 0.5) {
      entry.estimatedPeriod = entry.avgInterArrival;
      entry.periodConfidence = Math.min(1, entry.periodicityScore * 1.2);
    } else {
      entry.estimatedPeriod = undefined;
      entry.periodConfidence = 0;
    }
  }

  predictNextActivation(bandIndex: number, currentTime: number): { time: number; confidence: number } | null {
    const entry = this.entries.get(bandIndex);
    if (!entry || !entry.estimatedPeriod || entry.periodConfidence < 0.5) return null;

    const timeSinceLastHit = currentTime - entry.lastSeen;
    const period = entry.estimatedPeriod;
    const cyclesSinceLastHit = Math.floor(timeSinceLastHit / period);
    const nextActivation = entry.lastSeen + (cyclesSinceLastHit + 1) * period;
    
    const phaseUncertainty = Math.sqrt(entry.interArrivalVariance) * (cyclesSinceLastHit + 1);
    const confidence = entry.periodConfidence * Math.exp(-phaseUncertainty / period);

    if (nextActivation <= currentTime) return null;

    return { time: nextActivation, confidence };
  }

  getEntry(bandIndex: number): TemporalMemoryEntry | undefined {
    return this.entries.get(bandIndex);
  }

  getAllEntries(): TemporalMemoryEntry[] {
    return Array.from(this.entries.values());
  }

  getPeriodicBands(threshold: number = 0.5): TemporalMemoryEntry[] {
    return Array.from(this.entries.values()).filter(e => e.periodicityScore >= threshold && e.estimatedPeriod);
  }

  getEntryForBand(bandIndex: number): TemporalMemoryEntry {
    return this.entries.get(bandIndex) || this.createEmptyEntry(bandIndex);
  }

  reset(): void {
    this.entries.clear();
    this.initializeEntries();
  }
}

export class PeriodicOptimizer {
  private temporalMemory: TemporalMemory;
  private bands: FrequencyBand[];
  private predictionHorizon: number = 10;

  constructor(temporalMemory: TemporalMemory, bands: FrequencyBand[]) {
    this.temporalMemory = temporalMemory;
    this.bands = bands;
  }

  getPeriodicRecommendations(currentTime: number, dwellTime: number, tuningTime: number): Array<{
    bandIndex: number;
    frequency: number;
    predictedTime: number;
    confidence: number;
    windowStart: number;
    windowEnd: number;
  }> {
    const recommendations: Array<{
      bandIndex: number;
      frequency: number;
      predictedTime: number;
      confidence: number;
      windowStart: number;
      windowEnd: number;
    }> = [];

    const periodicEntries = this.temporalMemory.getPeriodicBands(0.4);
    
    for (const entry of periodicEntries) {
      const prediction = this.temporalMemory.predictNextActivation(entry.bandIndex, currentTime);
      if (!prediction) continue;

      const timeToPrediction = prediction.time - currentTime;
      const totalLatency = tuningTime + dwellTime;
      
      if (timeToPrediction < totalLatency) continue;
      if (timeToPrediction > this.predictionHorizon) continue;

      const band = this.bands[entry.bandIndex];
      if (!band) continue;

      const windowStart = prediction.time - dwellTime / 2;
      const windowEnd = prediction.time + dwellTime / 2;

      recommendations.push({
        bandIndex: entry.bandIndex,
        frequency: band.centerFrequency,
        predictedTime: prediction.time,
        confidence: prediction.confidence,
        windowStart,
        windowEnd,
      });
    }

    recommendations.sort((a, b) => b.confidence - a.confidence);
    return recommendations;
  }

  shouldExploitPeriodic(currentTime: number): { bandIndex: number; confidence: number } | null {
    const recommendations = this.getPeriodicRecommendations(currentTime, 0.01, 0.001);
    if (recommendations.length === 0) return null;
    
    const best = recommendations[0];
    if (best.confidence > 0.6) {
      return { bandIndex: best.bandIndex, confidence: best.confidence };
    }
    return null;
  }
}