export type Frequency = number;
export type Time = number;
export type Power = number;
export type Probability = number;
export type BandIndex = number;
export type EmitterId = string;
export type PatternId = string;

export interface FrequencyBand {
  index: BandIndex;
  centerFrequency: Frequency;
  bandwidth: Frequency;
  startFrequency: Frequency;
  endFrequency: Frequency;
}

export interface EmitterConfig {
  id: EmitterId;
  name: string;
  type: EmitterType;
  frequency: Frequency;
  bandwidth: Frequency;
  startTime: Time;
  endTime: Time;
  power: Power;
  dutyCycle: number;
  period?: Time;
  agility?: FrequencyAgility;
  spatial?: SpatialBehavior;
  noiseFloor?: Power;
  region?: string;
}

export type EmitterType =
  | 'static'
  | 'periodic'
  | 'frequency-agile'
  | 'burst'
  | 'correlated'
  | 'adaptive';

export interface FrequencyAgility {
  pattern: 'hop' | 'sweep' | 'random' | 'sequence';
  hopSet?: Frequency[];
  hopRate?: number;
  sequence?: Frequency[];
  sweepRate?: number;
}

export interface SpatialBehavior {
  type: 'omnidirectional' | 'directional' | 'scanning';
  beamwidth?: number;
  scanRate?: number;
  azimuth?: number;
  elevation?: number;
}

export interface GroundTruthEntry {
  time: Time;
  frequency: Frequency;
  emitterId: EmitterId;
  active: boolean;
  power: Power;
  snr: number;
}

export interface ReceiverConfig {
  totalFrequencyRange: [Frequency, Frequency];
  instantaneousBandwidth: Frequency;
  scanDwellTime: Time;
  tuningTime: Time;
  detectionThreshold: Power;
  noiseLevel: Power;
  observationInterval: Time;
  sensingUncertainty: number;
}

export interface ReceiverState {
  currentBand: BandIndex;
  currentFrequency: Frequency;
  isScanning: boolean;
  dwellTimeRemaining: Time;
  tuningTimeRemaining: Time;
  targetBand: BandIndex | null;
  lastObservationTime: Time;
}

export interface Observation {
  time: Time;
  bandIndex: BandIndex;
  frequency: Frequency;
  bandwidth: Frequency;
  detected: boolean;
  power?: Power;
  snr?: number;
  features?: SignalFeatures;
}

export interface SignalFeatures {
  estimatedCenterFreq: Frequency;
  estimatedBandwidth: Frequency;
  estimatedPower: Power;
  modulationType?: string;
  pulseWidth?: Time;
  pri?: Time;
  confidence: number;
}

export interface DetectionResult {
  hit: boolean;
  observation: Observation;
  groundTruth?: GroundTruthEntry;
}

export interface BandMetrics {
  bandIndex: BandIndex;
  activityScore: number;
  recentHitCount: number;
  recentMissCount: number;
  timeSinceLastHit: Time;
  hitRate: number;
  signalStrengthEstimate: Power;
  periodicityScore: number;
  predictionConfidence: number;
  transitionProbability: number;
  threatPriority: number;
  explorationScore: number;
  priority: number;
}

export interface SchedulerDecision {
  nextBand: BandIndex;
  nextFrequency: Frequency;
  priority: number;
  confidence: number;
  reasons: string[];
  exploration: boolean;
  predictedActivationTime?: Time;
}

export interface TemporalMemoryEntry {
  bandIndex: BandIndex;
  hits: Time[];
  misses: Time[];
  lastSeen: Time;
  hitCount: number;
  missCount: number;
  avgInterArrival: Time;
  interArrivalVariance: number;
  periodicityScore: number;
  estimatedPeriod?: Time;
  periodConfidence: number;
}

export interface LinkGraphEdge {
  from: BandIndex;
  to: BandIndex;
  weight: number;
  count: number;
  lastTransition: Time;
  type?: 'transition' | 'correlation' | 'co-occurrence';
}

export interface LinkGraph {
  nodes: Set<BandIndex>;
  edges: Map<string, LinkGraphEdge>;
}

export interface PatternFingerprint {
  id: PatternId;
  type: EmitterType;
  frequencyBehavior: 'fixed' | 'agile' | 'periodic' | 'burst';
  activityPattern: 'continuous' | 'periodic' | 'bursty' | 'sporadic';
  estimatedPeriod?: Time;
  averageBandwidth: Frequency;
  averagePower: Power;
  transitionPattern: BandIndex[];
  confidence: number;
  supportingObservations: number;
  firstSeen: Time;
  lastSeen: Time;
  status: 'learning' | 'confirmed' | 'weak';
  evidence: string[];
  primaryBandIndex?: BandIndex;
  predictedNextTime?: Time;
}

export interface ScenarioConfig {
  name: string;
  description: string;
  duration: Time;
  emitters: EmitterConfig[];
  receiver: ReceiverConfig;
  seed: number;
}

export interface EvaluationMetrics {
  probabilityOfDetection: number;
  falseAlarmRate: number;
  interceptRate: number;
  averageInterceptTime: Time;
  averageInterceptTimeError: Time;
  predictionAccuracy: number;
  scanEfficiency: number;
  totalScans: number;
  totalHits: number;
  totalMisses: number;
  totalFalseAlarms: number;
}

export interface ScenarioResult {
  scenarioName: string;
  schedulerName: string;
  metrics: EvaluationMetrics;
  timeline: TimelineEvent[];
  decisions: SchedulerDecision[];
}

export interface TimelineEvent {
  time: Time;
  type: 'detection' | 'prediction' | 'scan' | 'model_update' | 'emitter_change';
  bandIndex: BandIndex;
  frequency: Frequency;
  details: string;
  metadata?: Record<string, unknown>;
}

export interface SimulationState {
  currentTime: Time;
  groundTruth: GroundTruthEntry[];
  observations: Observation[];
  bandMetrics: BandMetrics[];
  temporalMemory: TemporalMemoryEntry[];
  linkGraph: LinkGraph;
  patterns: PatternFingerprint[];
  schedulerDecision: SchedulerDecision;
  receiverState: ReceiverState;
}