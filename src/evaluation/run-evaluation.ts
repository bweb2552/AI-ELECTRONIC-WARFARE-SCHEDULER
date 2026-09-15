import { ReceiverSimulator } from '../receiver/receiver';
import { createScheduler } from '../scheduler/baseline';
import { FrequencyActivityMap } from '../scheduler/frequency-map';
import { TemporalMemory } from '../scheduler/temporal-memory';
import { TransitionGraph } from '../scheduler/link-graph';
import { PatternFingerprintEngine } from '../scheduler/pattern-fingerprint';
import { SmartScheduler } from '../scheduler/prediction';
import { ScenarioRunner } from './metrics';
import { createScenarios } from './scenarios';
import { compareSchedulers, printComparison } from './metrics';

interface ExperimentConfig {
  description: string;
  version: string;
  schedulers: string[];
  scenarioCount: number;
  timestamp: string;
}

async function runEvaluation() {
  const scenarios = createScenarios();
  const schedulersToTest = ['sequential', 'random', 'priority', 'adaptive'] as const;

  // Print experiment configuration for reproducibility
  const config: ExperimentConfig = {
    description: 'SMART-SCAN EW Adaptive Receiver Scheduler Evaluation',
    version: 'SIH 2026 - SIH26055',
    schedulers: [...schedulersToTest],
    scenarioCount: scenarios.length,
    timestamp: new Date().toISOString(),
  };

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  SMART-SCAN EW: Adaptive Receiver Scheduler Evaluation      ║');
  console.log('║  SIH 2026 - SIH26055                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('=== EXPERIMENT CONFIGURATION ===');
  console.log(`Description: ${config.description}`);
  console.log(`Version: ${config.version}`);
  console.log(`Schedulers: ${config.schedulers.join(', ')}`);
  console.log(`Scenarios: ${config.scenarioCount}`);
  console.log(`Timestamp: ${config.timestamp}`);
  console.log(`Methodology: Deterministic seeded simulation, 45 frequency bands (100-1000 MHz)`);
  console.log(`Metrics: Pd, FAR, Intercept Rate, Avg Intercept Time, Prediction Accuracy, Scan Efficiency`);
  console.log('');

  const allResults: any[] = [];

  for (const scenario of scenarios) {
    console.log(`\n▶ Running scenario: ${scenario.name}`);
    console.log(`  ${scenario.description}`);
    console.log(`  Duration: ${scenario.duration}s | Emitters: ${scenario.emitters.length} | Seed: ${scenario.seed}`);
    console.log(`  Receiver: dwellTime=${scenario.receiver.scanDwellTime}s, tuningTime=${scenario.receiver.tuningTime}s`);

    const scenarioResults: any[] = [];

    for (const schedulerType of schedulersToTest) {
      const receiverSim = new ReceiverSimulator(scenario.receiver, { emitters: scenario.emitters }, scenario.seed);
      const bands = receiverSim.getBands();

      // Create intelligence layers for ALL schedulers (not just adaptive)
      const frequencyMap = new FrequencyActivityMap(bands);
      const temporalMemory = new TemporalMemory(bands);
      const transitionGraph = new TransitionGraph(bands);
      const patternEngine = new PatternFingerprintEngine();

      let scheduler: any;

      if (schedulerType === 'adaptive') {
        const smartScheduler = new SmartScheduler(frequencyMap, temporalMemory, transitionGraph, patternEngine, bands, scenario.seed);
        scheduler = smartScheduler;
      } else {
        scheduler = createScheduler(schedulerType, scenario.seed);
      }

      const runner = new ScenarioRunner(receiverSim, scheduler);
      const result = runner.run(scenario.name, schedulerType, 5000, scenario.duration);
      scenarioResults.push(result);

      const m = result.metrics;
      console.log(`  ✓ ${schedulerType.padEnd(12)} Pd=${m.probabilityOfDetection.toFixed(3)} FAR=${m.falseAlarmRate.toFixed(3)} Intercept=${m.interceptRate.toFixed(3)} Eff=${m.scanEfficiency.toFixed(3)} PredAcc=${m.predictionAccuracy.toFixed(3)} UniqueBands=${m.uniqueBandsExplored}`);
    }

    allResults.push(...scenarioResults);
  }

  const comparison = compareSchedulers(allResults);
  printComparison(comparison);

  console.log('=== METHODOLOGY NOTES ===');
  console.log('1. All scenarios use deterministic seeded randomness (seedrandom)');
  console.log('2. Ground truth is strictly separated from receiver observations');
  console.log('3. Pd = truePositives / (truePositives + falseNegatives)');
  console.log('4. FAR = falsePositives / (falsePositives + trueNegatives)');
  console.log('5. Intercept Rate = unique emitters detected / total emitters active');
  console.log('6. Scan Efficiency = productive scans / total scans');
  console.log('7. Prediction Accuracy = correct band predictions / total predictions');
  console.log('8. Unique Bands Explored = distinct frequency bands scanned');
  console.log('9. Learning Curve = detection rate improvement from first half to second half');
  console.log('10. Adaptive scheduler uses LinUCB + temporal memory + transition graph + pattern engine\n');

  return allResults;
}

runEvaluation().catch(console.error);
