export const PHYSICAL_CONSTANTS = {
  SPEED_OF_LIGHT: 299792458,
  BOLTZMANN_CONSTANT: 1.380649e-23,
  REFERENCE_TEMPERATURE: 290,
  THERMAL_NOISE_DENSITY: -174,
} as const;

export const DEFAULT_RECEIVER_CONFIG = {
  totalFrequencyRange: [100e6, 1000e6] as [number, number],
  instantaneousBandwidth: 20e6,
  scanDwellTime: 0.01,
  tuningTime: 0.001,
  detectionThreshold: -90,
  noiseLevel: -110,
  observationInterval: 0.011,
  sensingUncertainty: 0.1,
};

export const FREQUENCY_BANDS = 45;
export const BAND_BANDWIDTH = 20e6;

export function generateFrequencyBands(
  range: [number, number] = DEFAULT_RECEIVER_CONFIG.totalFrequencyRange,
  bandwidth: number = BAND_BANDWIDTH
): Array<{ index: number; centerFrequency: number; bandwidth: number; startFrequency: number; endFrequency: number }> {
  const bands = [];
  const [start, end] = range;
  const numBands = Math.floor((end - start) / bandwidth);
  
  for (let i = 0; i < numBands; i++) {
    const bandStart = start + i * bandwidth;
    const bandEnd = bandStart + bandwidth;
    bands.push({
      index: i,
      centerFrequency: (bandStart + bandEnd) / 2,
      bandwidth,
      startFrequency: bandStart,
      endFrequency: bandEnd,
    });
  }
  return bands;
}

export const SCENARIO_TEMPLATES = {
  static: {
    name: 'Static Emitters',
    description: 'Fixed-frequency emitters that remain continuously active',
    duration: 60,
    emitters: [
      { id: 'E1', name: 'Static Radar 1', type: 'static' as const, frequency: 300e6, bandwidth: 5e6, startTime: 0, endTime: 60, power: -50, dutyCycle: 1.0, region: 'north' },
      { id: 'E2', name: 'Static Comms 1', type: 'static' as const, frequency: 500e6, bandwidth: 2e6, startTime: 0, endTime: 60, power: -60, dutyCycle: 1.0, region: 'european' },
      { id: 'E3', name: 'Static Radar 2', type: 'static' as const, frequency: 700e6, bandwidth: 10e6, startTime: 0, endTime: 60, power: -55, dutyCycle: 1.0, region: 'east' },
    ],
  },
  periodic: {
    name: 'Periodic Emitters',
    description: 'Emitters that transmit at regular intervals',
    duration: 60,
    emitters: [
      { id: 'E1', name: 'Periodic Radar', type: 'periodic' as const, frequency: 300e6, bandwidth: 5e6, startTime: 0, endTime: 60, power: -50, dutyCycle: 0.2, period: 4.0, region: 'atlantic' },
      { id: 'E2', name: 'Periodic Beacon', type: 'periodic' as const, frequency: 500e6, bandwidth: 1e6, startTime: 0, endTime: 60, power: -65, dutyCycle: 0.1, period: 2.0, region: 'middle' },
      { id: 'E3', name: 'Periodic Comms', type: 'periodic' as const, frequency: 700e6, bandwidth: 3e6, startTime: 0, endTime: 60, power: -55, dutyCycle: 0.3, period: 5.0, region: 'pacific' },
    ],
  },
  agile: {
    name: 'Frequency-Agile Emitter',
    description: 'Single emitter that hops across frequencies',
    duration: 60,
    emitters: [
      { 
        id: 'E1', 
        name: 'Frequency Hopper', 
        type: 'frequency-agile' as const, 
        frequency: 300e6, 
        bandwidth: 2e6, 
        startTime: 0, 
        endTime: 60, 
        power: -55, 
        dutyCycle: 0.5,
        region: 'east',
        agility: { 
          pattern: 'hop' as const, 
          hopSet: [300e6, 400e6, 500e6, 600e6, 700e6, 800e6], 
          hopRate: 2.0 
        } 
      },
    ],
  },
  burst: {
    name: 'Burst Emitter',
    description: 'Short transmission windows with long silent periods',
    duration: 60,
    emitters: [
      { id: 'E1', name: 'Burst Radar', type: 'burst' as const, frequency: 350e6, bandwidth: 8e6, startTime: 0, endTime: 60, power: -45, dutyCycle: 0.05, region: 'southern' },
      { id: 'E2', name: 'Burst Comms', type: 'burst' as const, frequency: 650e6, bandwidth: 2e6, startTime: 0, endTime: 60, power: -60, dutyCycle: 0.02, region: 'north' },
    ],
  },
  unknown: {
    name: 'Unknown Emitter',
    description: 'Previously unseen emitter appears mid-simulation',
    duration: 60,
    emitters: [
      { id: 'E1', name: 'Known Radar', type: 'static' as const, frequency: 300e6, bandwidth: 5e6, startTime: 0, endTime: 60, power: -50, dutyCycle: 1.0, region: 'european' },
      { id: 'E2', name: 'Unknown Emitter', type: 'static' as const, frequency: 800e6, bandwidth: 3e6, startTime: 30, endTime: 60, power: -55, dutyCycle: 1.0, region: 'middle' },
    ],
  },
  correlated: {
    name: 'Correlated Emitters',
    description: 'Activity of one emitter influences another',
    duration: 60,
    emitters: [
      { id: 'E1', name: 'Primary Radar', type: 'periodic' as const, frequency: 300e6, bandwidth: 5e6, startTime: 0, endTime: 60, power: -50, dutyCycle: 0.3, period: 4.0, region: 'north' },
      { id: 'E2', name: 'Secondary Comms', type: 'correlated' as const, frequency: 500e6, bandwidth: 2e6, startTime: 0, endTime: 60, power: -60, dutyCycle: 0.2, period: 4.0, region: 'atlantic' },
      { id: 'E3', name: 'Tertiary Sensor', type: 'correlated' as const, frequency: 700e6, bandwidth: 3e6, startTime: 0, endTime: 60, power: -65, dutyCycle: 0.1, period: 4.0, region: 'european' },
    ],
  },
  adaptive: {
    name: 'Environment Change',
    description: 'Emitter changes behavior after scheduler learns pattern',
    duration: 60,
    emitters: [
      { 
        id: 'E1', 
        name: 'Adaptive Radar', 
        type: 'adaptive' as const, 
        frequency: 300e6, 
        bandwidth: 5e6, 
        startTime: 0, 
        endTime: 60, 
        power: -50, 
        dutyCycle: 0.3,
        region: 'east',
        agility: { 
          pattern: 'sequence' as const, 
          sequence: [300e6, 350e6, 400e6, 450e6],
        }
      },
    ],
  },
  patternDemo: {
    name: 'Behavioral Pattern Demo',
    description: 'Optimized scenario for clear pattern discovery: static, periodic, burst, agile, and correlated emitters with strong, detectable signals',
    duration: 120,
    emitters: [
      { id: 'E1', name: 'Static Radar', type: 'static' as const, frequency: 200e6, bandwidth: 5e6, startTime: 0, endTime: 120, power: -40, dutyCycle: 1.0, region: 'north' },
      { id: 'E2', name: 'Periodic Beacon 1', type: 'periodic' as const, frequency: 350e6, bandwidth: 2e6, startTime: 0, endTime: 120, power: -45, dutyCycle: 0.3, period: 3.0, region: 'atlantic' },
      { id: 'E3', name: 'Periodic Beacon 2', type: 'periodic' as const, frequency: 500e6, bandwidth: 2e6, startTime: 0, endTime: 120, power: -45, dutyCycle: 0.25, period: 5.0, region: 'european' },
      { id: 'E4', name: 'Burst Emitter', type: 'burst' as const, frequency: 650e6, bandwidth: 4e6, startTime: 0, endTime: 120, power: -40, dutyCycle: 0.15, region: 'middle' },
      { id: 'E5', name: 'Frequency Hopper', type: 'frequency-agile' as const, frequency: 200e6, bandwidth: 3e6, startTime: 0, endTime: 120, power: -50, dutyCycle: 0.6, region: 'east', agility: { pattern: 'hop' as const, hopSet: [200e6, 400e6, 600e6, 800e6], hopRate: 1.5 } },
      { id: 'E6', name: 'Correlated Primary', type: 'periodic' as const, frequency: 750e6, bandwidth: 3e6, startTime: 0, endTime: 120, power: -50, dutyCycle: 0.3, period: 4.0, region: 'pacific' },
      { id: 'E7', name: 'Correlated Secondary', type: 'correlated' as const, frequency: 850e6, bandwidth: 2e6, startTime: 0, endTime: 120, power: -55, dutyCycle: 0.2, period: 4.0, region: 'southern' },
    ],
  },
};