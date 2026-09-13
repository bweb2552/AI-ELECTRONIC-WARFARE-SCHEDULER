import seedrandom from 'seedrandom';
import type {
  EmitterConfig,
  EmitterType,
  FrequencyAgility,
  GroundTruthEntry,
  FrequencyBand,
  ReceiverConfig,
  Observation,
  SignalFeatures,
} from '../core/types';
import { generateFrequencyBands } from '../core/constants';

type RNG = () => number;

export class Emitter {
  id: string;
  name: string;
  type: EmitterType;
  baseFrequency: number;
  bandwidth: number;
  startTime: number;
  endTime: number;
  power: number;
  dutyCycle: number;
  period?: number;
  agility?: FrequencyAgility;
  currentFrequency: number;
  lastHopTime: number;
  hopIndex: number;
  phase: number;
  rng: RNG;

  constructor(config: EmitterConfig, seed: number) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.baseFrequency = config.frequency;
    this.bandwidth = config.bandwidth;
    this.startTime = config.startTime;
    this.endTime = config.endTime;
    this.power = config.power;
    this.dutyCycle = config.dutyCycle;
    this.period = config.period;
    this.agility = config.agility;
    this.currentFrequency = config.frequency;
    this.lastHopTime = 0;
    this.hopIndex = 0;
    this.phase = seed * 0.1;
    this.rng = seedrandom(`${config.id}-${seed}`);
  }

  isActiveAt(time: number): boolean {
    if (time < this.startTime || time > this.endTime) return false;
    
    switch (this.type) {
      case 'static':
        // Static emitters with full duty cycle are always active
        if (this.dutyCycle >= 1.0) return true;
        return this.rng() < this.dutyCycle;
      case 'periodic':
        if (!this.period) return false;
        const cyclePos = (time - this.startTime) % this.period;
        return cyclePos < this.period * this.dutyCycle;
      case 'frequency-agile':
        if (this.dutyCycle >= 1.0) return true;
        return this.rng() < this.dutyCycle;
      case 'burst':
        // Burst uses time-based windowing for more predictable behavior
        if (this.dutyCycle >= 1.0) return true;
        // Use a pseudo-periodic burst pattern: active for short windows
        const burstPeriod = 2.0; // seconds between burst opportunities
        const burstWindow = burstPeriod * this.dutyCycle;
        const burstPhase = (time - this.startTime + this.phase) % burstPeriod;
        return burstPhase < burstWindow;
      case 'correlated':
        if (this.dutyCycle >= 1.0) return true;
        return this.rng() < this.dutyCycle;
      case 'adaptive':
        if (this.dutyCycle >= 1.0) return true;
        return this.rng() < this.dutyCycle;
      default:
        return false;
    }
  }

  getFrequencyAt(time: number): number {
    if (!this.agility) return this.baseFrequency;

    switch (this.agility.pattern) {
      case 'hop': {
        if (!this.agility.hopSet || !this.agility.hopRate) return this.baseFrequency;
        const hopsSinceStart = Math.floor((time - this.startTime) * this.agility.hopRate);
        if (hopsSinceStart !== this.hopIndex) {
          this.hopIndex = hopsSinceStart;
          this.currentFrequency = this.agility.hopSet[this.hopIndex % this.agility.hopSet.length];
        }
        return this.currentFrequency;
      }
      case 'sweep': {
        if (!this.agility.sweepRate) return this.baseFrequency;
        const sweepRange = this.agility.hopSet || [this.baseFrequency];
        const sweepPos = ((time - this.startTime) * this.agility.sweepRate) % sweepRange.length;
        return sweepRange[Math.floor(sweepPos)];
      }
      case 'sequence': {
        if (!this.agility.sequence) return this.baseFrequency;
        const seqPos = Math.floor((time - this.startTime) / 2) % this.agility.sequence.length;
        return this.agility.sequence[seqPos];
      }
      case 'random': {
        if (!this.agility.hopSet) return this.baseFrequency;
        if (time - this.lastHopTime > 1 / (this.agility.hopRate || 1)) {
          this.currentFrequency = this.agility.hopSet[Math.floor(this.rng() * this.agility.hopSet.length)];
          this.lastHopTime = time;
        }
        return this.currentFrequency;
      }
      default:
        return this.baseFrequency;
    }
  }

  getPowerAt(_time: number): number {
    const basePower = this.power;
    const variation = (this.rng() - 0.5) * 3;
    return basePower + variation;
  }

  getBandwidthAt(_time: number): number {
    return this.bandwidth * (0.9 + this.rng() * 0.2);
  }

  getSNRAt(time: number, receiverNoiseFloor: number): number {
    const signalPower = this.getPowerAt(time);
    return signalPower - receiverNoiseFloor;
  }
}

export class NoiseModel {
  rng: RNG;
  noiseFloor: number;
  interferenceSources: Array<{ frequency: number; bandwidth: number; power: number; active: boolean }>;

  constructor(noiseFloor: number, seed: number) {
    this.noiseFloor = noiseFloor;
    this.rng = seedrandom(`noise-${seed}`);
    this.interferenceSources = [];
  }

  addInterference(frequency: number, bandwidth: number, power: number): void {
    this.interferenceSources.push({ frequency, bandwidth, power, active: true });
  }

  getNoiseAt(frequency: number, bandwidth: number): number {
    let noise = this.noiseFloor;
    
    for (const source of this.interferenceSources) {
      if (!source.active) continue;
      const overlap = this.calculateOverlap(frequency, bandwidth, source.frequency, source.bandwidth);
      if (overlap > 0) {
        noise = this.addDB(noise, source.power + 10 * Math.log10(overlap));
      }
    }
    
    const variation = (this.rng() - 0.5) * 2;
    return noise + variation;
  }

  private calculateOverlap(f1: number, bw1: number, f2: number, bw2: number): number {
    const start1 = f1 - bw1 / 2;
    const end1 = f1 + bw1 / 2;
    const start2 = f2 - bw2 / 2;
    const end2 = f2 + bw2 / 2;
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    return Math.max(0, overlapEnd - overlapStart);
  }

  private addDB(db1: number, db2: number): number {
    if (db1 === -Infinity) return db2;
    if (db2 === -Infinity) return db1;
    const max = Math.max(db1, db2);
    const min = Math.min(db1, db2);
    return max + 10 * Math.log10(1 + Math.pow(10, (min - max) / 10));
  }
}

export class GroundTruthRecorder {
  entries: GroundTruthEntry[] = [];
  emitters: Emitter[];
  bands: FrequencyBand[];
  noiseModel: NoiseModel;
  receiverConfig: ReceiverConfig;

  constructor(emitters: Emitter[], bands: FrequencyBand[], noiseModel: NoiseModel, receiverConfig: ReceiverConfig) {
    this.emitters = emitters;
    this.bands = bands;
    this.noiseModel = noiseModel;
    this.receiverConfig = receiverConfig;
  }

  record(time: number): void {
    for (const emitter of this.emitters) {
      if (!emitter.isActiveAt(time)) continue;
      
      const freq = emitter.getFrequencyAt(time);
      const bw = emitter.getBandwidthAt(time);
      const power = emitter.getPowerAt(time);
      
      const band = this.bands.find(b => freq >= b.startFrequency && freq < b.endFrequency);
      if (!band) continue;
      
      const noise = this.noiseModel.getNoiseAt(freq, bw);
      const snr = power - noise;
      
      this.entries.push({
        time,
        frequency: freq,
        emitterId: emitter.id,
        active: true,
        power,
        snr,
      });
    }
  }

  getEntriesInBand(bandIndex: number, timeStart: number, timeEnd: number): GroundTruthEntry[] {
    const band = this.bands[bandIndex];
    if (!band) return [];
    
    return this.entries.filter(e => 
      e.frequency >= band.startFrequency && 
      e.frequency < band.endFrequency &&
      e.time >= timeStart && 
      e.time <= timeEnd
    );
  }

  isActiveInBand(bandIndex: number, time: number): boolean {
    const band = this.bands[bandIndex];
    if (!band) return false;
    
    return this.entries.some(e => 
      e.frequency >= band.startFrequency && 
      e.frequency < band.endFrequency &&
      Math.abs(e.time - time) < 0.001
    );
  }

  getActiveEmittersAt(time: number): Emitter[] {
    return this.emitters.filter(e => e.isActiveAt(time));
  }
}

export class RFEnvironmentSimulator {
  emitters: Emitter[];
  bands: FrequencyBand[];
  noiseModel: NoiseModel;
  groundTruth: GroundTruthRecorder;
  receiverConfig: ReceiverConfig;
  currentTime: number = 0;
  seed: number;

  constructor(config: { scenario: { emitters: EmitterConfig[] }; receiver: ReceiverConfig; seed: number }) {
    this.seed = config.seed;
    this.receiverConfig = config.receiver;
    this.bands = generateFrequencyBands(this.receiverConfig.totalFrequencyRange, this.receiverConfig.instantaneousBandwidth);
    this.noiseModel = new NoiseModel(this.receiverConfig.noiseLevel, config.seed);
    
    this.emitters = config.scenario.emitters.map((ec: EmitterConfig) => new Emitter(ec, config.seed));
    this.groundTruth = new GroundTruthRecorder(this.emitters, this.bands, this.noiseModel, this.receiverConfig);
  }

  step(dt: number): void {
    this.currentTime += dt;
    this.groundTruth.record(this.currentTime);
  }

  observe(bandIndex: number, _dwellTime: number): Observation {
    const band = this.bands[bandIndex];
    if (!band) {
      return this.createEmptyObservation(bandIndex);
    }

    const centerFreq = band.centerFrequency;
    const bw = band.bandwidth;
    const noise = this.noiseModel.getNoiseAt(centerFreq, bw);
    const threshold = this.receiverConfig.detectionThreshold;

    let detected = false;
    let signalPower: number | undefined;
    let snr: number | undefined;
    let features: SignalFeatures | undefined;

    const activeEmitters = this.groundTruth.getActiveEmittersAt(this.currentTime);
    for (const emitter of activeEmitters) {
      const emitterFreq = emitter.getFrequencyAt(this.currentTime);
      const emitterBw = emitter.getBandwidthAt(this.currentTime);
      
      if (emitterFreq >= band.startFrequency && emitterFreq < band.endFrequency) {
        const emitterPower = emitter.getPowerAt(this.currentTime);
        const emitterSNR = emitterPower - noise;
        
        if (emitterSNR >= threshold - noise) {
          detected = true;
          signalPower = emitterPower;
          snr = emitterSNR;
          
          features = {
            estimatedCenterFreq: emitterFreq + (this.noiseModel.rng() - 0.5) * bw * 0.1,
            estimatedBandwidth: emitterBw * (0.8 + this.noiseModel.rng() * 0.4),
            estimatedPower: emitterPower + (this.noiseModel.rng() - 0.5) * 2,
            confidence: Math.min(1, Math.max(0, (emitterSNR - (threshold - noise)) / 20)),
          };
          break;
        }
      }
    }

    const falseAlarmProb = Math.exp(-(threshold - noise) / 10);
    if (!detected && this.noiseModel.rng() < falseAlarmProb) {
      detected = true;
      signalPower = noise + threshold + (this.noiseModel.rng() - 0.5) * 3;
      snr = signalPower - noise;
      features = {
        estimatedCenterFreq: centerFreq + (this.noiseModel.rng() - 0.5) * bw * 0.5,
        estimatedBandwidth: bw * (0.5 + this.noiseModel.rng() * 0.5),
        estimatedPower: signalPower,
        confidence: 0.1 + this.noiseModel.rng() * 0.2,
      };
    }

    return {
      time: this.currentTime,
      bandIndex,
      frequency: centerFreq,
      bandwidth: bw,
      detected,
      power: signalPower,
      snr,
      features,
    };
  }

  private createEmptyObservation(bandIndex: number): Observation {
    const band = this.bands[bandIndex];
    return {
      time: this.currentTime,
      bandIndex,
      frequency: band?.centerFrequency || 0,
      bandwidth: band?.bandwidth || this.receiverConfig.instantaneousBandwidth,
      detected: false,
    };
  }

  getBands(): FrequencyBand[] {
    return this.bands;
  }

  getGroundTruth(): GroundTruthRecorder {
    return this.groundTruth;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  reset(): void {
    this.currentTime = 0;
    this.groundTruth.entries = [];
    for (const emitter of this.emitters) {
      emitter.currentFrequency = emitter.baseFrequency;
      emitter.hopIndex = 0;
      emitter.lastHopTime = 0;
    }
  }
}