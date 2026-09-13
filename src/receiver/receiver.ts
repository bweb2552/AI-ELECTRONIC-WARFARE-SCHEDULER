import type { ReceiverConfig, ReceiverState, Observation, FrequencyBand, DetectionResult } from '../core/types';
import { RFEnvironmentSimulator } from '../rf-environment/simulator';
import seedrandom from 'seedrandom';

type RNG = () => number;

export class VirtualReceiver {
  config: ReceiverConfig;
  state: ReceiverState;
  bands: FrequencyBand[];
  simulator: RFEnvironmentSimulator;
  rng: RNG;
  scanHistory: Observation[] = [];

  constructor(config: ReceiverConfig, simulator: RFEnvironmentSimulator, bands: FrequencyBand[], seed: number) {
    this.config = config;
    this.simulator = simulator;
    this.bands = bands;
    this.rng = seedrandom(`receiver-${seed}`);
    this.state = {
      currentBand: 0,
      currentFrequency: bands[0]?.centerFrequency || config.totalFrequencyRange[0],
      isScanning: false,
      dwellTimeRemaining: 0,
      tuningTimeRemaining: 0,
      targetBand: null,
      lastObservationTime: 0,
    };
  }

  tuneToBand(bandIndex: number): boolean {
    if (bandIndex < 0 || bandIndex >= this.bands.length) return false;
    if (this.state.currentBand === bandIndex) return true;

    this.state.targetBand = bandIndex;
    this.state.tuningTimeRemaining = this.config.tuningTime;
    this.state.isScanning = false;
    return true;
  }

  step(dt: number): Observation | null {
    if (this.state.tuningTimeRemaining > 0) {
      this.state.tuningTimeRemaining = Math.max(0, this.state.tuningTimeRemaining - dt);
      if (this.state.tuningTimeRemaining === 0) {
        if (this.state.targetBand !== null) {
          this.state.currentBand = this.state.targetBand;
          this.state.targetBand = null;
        }
        this.state.currentFrequency = this.bands[this.state.currentBand]?.centerFrequency || 0;
        this.state.dwellTimeRemaining = this.config.scanDwellTime;
        this.state.isScanning = true;
      }
      return null;
    }

    if (this.state.isScanning && this.state.dwellTimeRemaining > 0) {
      this.state.dwellTimeRemaining = Math.max(0, this.state.dwellTimeRemaining - dt);
      
      if (this.state.dwellTimeRemaining === 0) {
        const observation = this.simulator.observe(this.state.currentBand, this.config.scanDwellTime);
        this.scanHistory.push(observation);
        this.state.lastObservationTime = this.simulator.getCurrentTime();
        this.state.isScanning = false;
        return observation;
      }
    }

    return null;
  }

  setTargetBand(bandIndex: number): void {
    if (bandIndex >= 0 && bandIndex < this.bands.length) {
      this.state.targetBand = bandIndex;
      this.state.tuningTimeRemaining = this.config.tuningTime;
      this.state.isScanning = false;
    }
  }

  getState(): ReceiverState {
    return { ...this.state };
  }

  getCurrentBand(): number {
    return this.state.currentBand;
  }

  getCurrentFrequency(): number {
    return this.state.currentFrequency;
  }

  getScanHistory(): Observation[] {
    return [...this.scanHistory];
  }

  clearHistory(): void {
    this.scanHistory = [];
  }

  isReadyForNextScan(): boolean {
    return !this.state.isScanning && this.state.tuningTimeRemaining === 0;
  }

  getTimeToNextObservation(): number {
    return this.state.tuningTimeRemaining + (this.state.isScanning ? this.state.dwellTimeRemaining : 0);
  }
}

export class DetectionEngine {
  config: ReceiverConfig;
  rng: RNG;

  constructor(config: ReceiverConfig, seed: number) {
    this.config = config;
    this.rng = seedrandom(`detection-${seed}`);
  }

  processObservation(observation: Observation): DetectionResult {
    const hit = observation.detected;
    
    const groundTruthMatch = this.findGroundTruthMatch(observation);
    
    return {
      hit,
      observation,
      groundTruth: groundTruthMatch,
    };
  }

  private findGroundTruthMatch(_observation: Observation): any {
    return undefined;
  }

  estimateSNR(observation: Observation): number {
    if (!observation.power || !observation.snr) return -Infinity;
    return observation.snr;
  }

  extractFeatures(observation: Observation): any {
    return observation.features;
  }
}

export class ReceiverSimulator {
  receiver: VirtualReceiver;
  detectionEngine: DetectionEngine;
  config: ReceiverConfig;
  simulator: RFEnvironmentSimulator;

  constructor(config: ReceiverConfig, scenario: any, seed: number) {
    this.config = config;
    this.simulator = new RFEnvironmentSimulator({ scenario, receiver: config, seed });
    const bands = this.simulator.getBands();
    this.receiver = new VirtualReceiver(config, this.simulator, bands, seed);
    this.detectionEngine = new DetectionEngine(config, seed);
  }

  step(dt: number): DetectionResult | null {
    this.simulator.step(dt);
    const observation = this.receiver.step(dt);
    
    if (observation) {
      return this.detectionEngine.processObservation(observation);
    }
    return null;
  }

  scheduleNextScan(bandIndex: number): void {
    this.receiver.tuneToBand(bandIndex);
  }

  getReceiverState(): ReceiverState {
    return this.receiver.getState();
  }

  getBands(): FrequencyBand[] {
    return this.simulator.getBands();
  }

  getGroundTruth() {
    return this.simulator.getGroundTruth();
  }

  getCurrentTime(): number {
    return this.simulator.getCurrentTime();
  }

  getScanHistory() {
    return this.receiver.getScanHistory();
  }

  reset(): void {
    this.simulator.reset();
    this.receiver.clearHistory();
  }
}