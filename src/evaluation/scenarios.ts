import type { ScenarioConfig } from '../core/types';
import { SCENARIO_TEMPLATES, DEFAULT_RECEIVER_CONFIG } from '../core/constants';

export function createScenarios(): ScenarioConfig[] {
  const scenarios: ScenarioConfig[] = [];
  let seed = 42;

  for (const [_key, template] of Object.entries(SCENARIO_TEMPLATES)) {
    scenarios.push({
      name: template.name,
      description: template.description,
      duration: template.duration,
      emitters: template.emitters.map(e => ({ ...e })),
      receiver: { ...DEFAULT_RECEIVER_CONFIG },
      seed: seed++,
    });
  }

  return scenarios;
}

export function createCustomScenario(config: Partial<ScenarioConfig> & { emitters: any[] }): ScenarioConfig {
  return {
    name: config.name || 'Custom Scenario',
    description: config.description || 'User-defined scenario',
    duration: config.duration || 60,
    emitters: config.emitters,
    receiver: config.receiver || { ...DEFAULT_RECEIVER_CONFIG },
    seed: config.seed || Math.floor(Math.random() * 10000),
  };
}

export const SCENARIO_GROUPS = {
  basic: ['static', 'periodic', 'burst'],
  advanced: ['agile', 'correlated', 'adaptive'],
  stress: ['unknown', 'agile', 'correlated'],
  all: ['static', 'periodic', 'agile', 'burst', 'unknown', 'correlated', 'adaptive'],
};