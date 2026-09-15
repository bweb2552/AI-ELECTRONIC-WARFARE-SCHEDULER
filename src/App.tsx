import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ReceiverSimulator } from './receiver/receiver';
import { createScheduler } from './scheduler/baseline';
import { FrequencyActivityMap } from './scheduler/frequency-map';
import { TemporalMemory } from './scheduler/temporal-memory';
import { TransitionGraph, CorrelationGraph, type CombinedGraphData } from './scheduler/link-graph';
import { PatternFingerprintEngine } from './scheduler/pattern-fingerprint';
import { SmartScheduler } from './scheduler/prediction';
import { createScenarios } from './evaluation/scenarios';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { useAudio } from './hooks/useAudio';
import { FullLinkGraphView } from './ui/FullLinkGraphView';
import { GlobalRFMapView } from './ui/GlobalRFMapView';

import type { ScenarioConfig, SchedulerDecision, Observation, BandMetrics, TemporalMemoryEntry, PatternFingerprint, FrequencyBand, ReceiverState, GroundTruthEntry } from './core/types';

const SPECTRUM_WIDTH = 900;
const SPECTRUM_HEIGHT = 200;
const MATRIX_WIDTH = 900;
const MATRIX_HEIGHT = 300;

const SCHEDULER_INFO: Record<string, { desc: string; longDesc: string }> = {
  sequential: { 
    desc: 'Fixed frequency order', 
    longDesc: 'Sequential round-robin scan across all frequency bands. Baseline strategy with no intelligence.' 
  },
  random: { 
    desc: 'Random frequency selection', 
    longDesc: 'Randomly selects frequency bands. Baseline strategy for comparison.' 
  },
  priority: { 
    desc: 'Activity-based priority', 
    longDesc: 'Uses observed band activity scores and hit rates to prioritize scans. Includes exploration bonus.' 
  },
  adaptive: { 
    desc: 'LinUCB + Graph-enhanced', 
    longDesc: 'Adaptive scheduler with contextual bandits (LinUCB), transition graph, temporal memory, and pattern fingerprints. Balances exploration/exploitation.' 
  },
};

const SCENARIO_INFO: Record<string, { desc: string; longDesc: string }> = {
  'Static Emitters': { 
    desc: 'Fixed-frequency continuous', 
    longDesc: 'Emitters remain continuously active at fixed frequencies. Easiest scenario for detection.' 
  },
  'Periodic Emitters': { 
    desc: 'Regular interval transmission', 
    longDesc: 'Emitters transmit at regular intervals. Tests periodic detection and prediction.' 
  },
  'Frequency-Agile Emitter': { 
    desc: 'Frequency hopping', 
    longDesc: 'Single emitter hops across frequencies. Tests transition learning and graph-based prediction.' 
  },
  'Burst Emitter': { 
    desc: 'Short transmission windows', 
    longDesc: 'Short bursts with long silent periods. Tests detection of intermittent signals.' 
  },
  'Unknown Emitter': { 
    desc: 'Mid-simulation appearance', 
    longDesc: 'Previously unseen emitter appears mid-simulation. Tests exploration and adaptation.' 
  },
  'Correlated Emitters': { 
    desc: 'Coordinated activity', 
    longDesc: 'Activity of one emitter influences others. Tests correlation graph and transition learning.' 
  },
  'Environment Change': { 
    desc: 'Behavior change mid-simulation', 
    longDesc: 'Emitter changes behavior after scheduler learns pattern. Tests online adaptation.' 
  },
};

function Dashboard() {
  const { user, logout } = useAuth();
  const [scenario, setScenario] = useState<ScenarioConfig | null>(null);
  const [schedulerType, setSchedulerType] = useState<'sequential' | 'random' | 'priority' | 'adaptive'>('adaptive');
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [receiverState, setReceiverState] = useState<ReceiverState | null>(null);
  const [decision, setDecision] = useState<SchedulerDecision | null>(null);
  const [bandMetrics, setBandMetrics] = useState<BandMetrics[]>([]);
  const [_temporalMemoryState, setTemporalMemoryState] = useState<TemporalMemoryEntry[]>([]);
  const [patterns, setPatterns] = useState<PatternFingerprint[]>([]);
  const [graphData, setGraphData] = useState<CombinedGraphData>({ nodes: [], edges: [], communities: [], stats: { nodeCount: 0, edgeCount: 0, transitionCount: 0, correlationCount: 0, avgDegree: 0 } });
  const [fullGraphOpen, setFullGraphOpen] = useState(false);
  const [globalMapOpen, setGlobalMapOpen] = useState(false);
  const [eventLog, setEventLog] = useState<Array<{ time: number; type: string; details: string }>>([]);
  const [metrics, setMetrics] = useState({
    pd: 0, far: 0, interceptRate: 0, avgInterceptTime: 0, predAcc: 0, scanEff: 0, totalScans: 0, totalHits: 0, totalMisses: 0, totalFalseAlarms: 0
  });
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'starting' | 'running' | 'paused' | 'completed'>('idle');

  // Audio system
  const audio = useAudio();

  const simRef = useRef<ReceiverSimulator | null>(null);
  const schedulerRef = useRef<any>(null);
  const freqMapRef = useRef<FrequencyActivityMap | null>(null);
  const temporalMemRef = useRef<TemporalMemory | null>(null);
  const graphRef = useRef<TransitionGraph | null>(null);
  const correlationGraphRef = useRef<CorrelationGraph | null>(null);
  const patternRef = useRef<PatternFingerprintEngine | null>(null);
  const smartSchedulerRef = useRef<SmartScheduler | null>(null);
  const animationRef = useRef<number>(0);
  const lastStepRef = useRef(0);
  const bandsRef = useRef<FrequencyBand[]>([]);
  const groundTruthRef = useRef<GroundTruthEntry[]>([]);
  const scanHistoryRef = useRef<Observation[]>([]);
  const accumulatorRef = useRef(0);

  const initSimulation = useCallback((scenarioConfig: ScenarioConfig) => {
    const receiverSim = new ReceiverSimulator(scenarioConfig.receiver, { emitters: scenarioConfig.emitters }, scenarioConfig.seed);
    const bands = receiverSim.getBands();
    bandsRef.current = bands;

    const freqMap = new FrequencyActivityMap(bands);
    const tempMem = new TemporalMemory(bands);
    const graph = new TransitionGraph(bands);
    const correlationGraph = new CorrelationGraph(bands);
    const patternEngine = new PatternFingerprintEngine();

    freqMapRef.current = freqMap;
    temporalMemRef.current = tempMem;
    graphRef.current = graph;
    correlationGraphRef.current = correlationGraph;
    patternRef.current = patternEngine;

    let scheduler: any;
    if (schedulerType === 'adaptive') {
      const smart = new SmartScheduler(freqMap, tempMem, graph, patternEngine, bands, scenarioConfig.seed);
      scheduler = smart;
      smartSchedulerRef.current = smart;
    } else {
      scheduler = createScheduler(schedulerType, scenarioConfig.seed);
    }
    schedulerRef.current = scheduler;
    simRef.current = receiverSim;
    groundTruthRef.current = [];
    scanHistoryRef.current = [];
    accumulatorRef.current = 0;
    // Initialize previous band tracker
    prevBandRef.current = receiverSim.getReceiverState().currentBand;

    setReceiverState(receiverSim.getReceiverState());
    setBandMetrics(freqMap.getAllMetrics());
    setTemporalMemoryState(tempMem.getAllEntries());
    setPatterns(patternEngine.getAllPatterns());
    setGraphData(graph.getCombinedGraphData([], bands) || { nodes: [], edges: [], communities: [], stats: { nodeCount: 0, edgeCount: 0, transitionCount: 0, correlationCount: 0, avgDegree: 0 } });
    setEventLog([]);
    setMetrics({ pd: 0, far: 0, interceptRate: 0, avgInterceptTime: 0, predAcc: 0, scanEff: 0, totalScans: 0, totalHits: 0, totalMisses: 0, totalFalseAlarms: 0 });
    setCurrentTime(0);
    setDecision(null);
    setSimulationStatus('idle');
  }, [schedulerType]);

  // Track previous band for transition recording
  const prevBandRef = useRef<number | null>(null);

  const step = useCallback(() => {
    if (!simRef.current || !schedulerRef.current) return;

    const receiverState = simRef.current.getReceiverState();
    
    // Record band transition if the band changed
    if (prevBandRef.current !== null && prevBandRef.current !== receiverState.currentBand) {
      graphRef.current?.recordTransition(prevBandRef.current, receiverState.currentBand, simRef.current.getCurrentTime(), false);
    }
    prevBandRef.current = receiverState.currentBand;

    const decision = schedulerRef.current.decide(
      freqMapRef.current?.getAllMetrics() || [], 
      receiverState, 
      bandsRef.current
    );
    setDecision(decision);
    setReceiverState(receiverState);

    simRef.current.scheduleNextScan(decision.nextBand);

    let observation: Observation | null = null;
    let hit = false;

    for (let i = 0; i < 3; i++) {
      const result = simRef.current.step(0.011);
      if (result) {
        observation = result.observation;
        hit = result.hit;
        groundTruthRef.current.push(...simRef.current.getGroundTruth().entries.slice(-10));
        scanHistoryRef.current.push(observation);
        
        const metrics = freqMapRef.current?.getMetrics(observation.bandIndex);
        const tempEntry = temporalMemRef.current?.getEntryForBand(observation.bandIndex);
        
        freqMapRef.current?.update(observation, hit, tempEntry);
        temporalMemRef.current?.record(observation, hit);
        // Record transition from previous band to current band on detection
        graphRef.current?.recordTransition(receiverState.currentBand, observation.bandIndex, observation.time, hit);
        
        // Record co-occurrence for correlation graph (check other bands with recent hits)
        const allMetrics = freqMapRef.current?.getAllMetrics() || [];
        for (const m of allMetrics) {
          if (m.bandIndex !== observation.bandIndex && m.recentHitCount > 0 && m.timeSinceLastHit < 5) {
            correlationGraphRef.current?.recordCoOccurrence(observation.bandIndex, m.bandIndex, observation.time);
          }
        }
        
        patternRef.current?.processObservation(observation, metrics!, tempEntry!);
        
        schedulerRef.current.update(observation, hit, metrics!, tempEntry!);
        
        if (hit && smartSchedulerRef.current) {
          smartSchedulerRef.current.evaluatePrediction(observation.bandIndex, observation.time);
        }
        
        if (smartSchedulerRef.current && observation) {
          const gtEntries = simRef.current.getGroundTruth().entries;
          const obsTime = observation.time;
          gtEntries.forEach(gt => {
            if (gt.active && gt.time <= obsTime + 0.011 && gt.time >= obsTime - 0.011) {
              smartSchedulerRef.current!.recordEmitterActivation(gt.emitterId, gt.frequency, gt.time);
            }
          });
        }
        break;
      }
    }

    if (!observation) {
      simRef.current.step(0.011);
    }

    const newTime = simRef.current.getCurrentTime();
    setCurrentTime(newTime);
    const allMetrics = freqMapRef.current?.getAllMetrics() || [];
    // Update transition probabilities from graph
    if (graphRef.current) {
      for (const m of allMetrics) {
        const outgoing = graphRef.current.getOutgoingTransitions(m.bandIndex);
        let totalWeight = 0;
        for (const e of outgoing) totalWeight += e.weight;
        m.transitionProbability = Math.min(1, totalWeight);
      }
    }
    setBandMetrics(allMetrics);
    setTemporalMemoryState(temporalMemRef.current?.getAllEntries() || []);
    setPatterns(patternRef.current?.getAllPatterns() || []);
    const correlationEdges = correlationGraphRef.current?.getCorrelationEdges(2) || [];
    setGraphData(graphRef.current?.getCombinedGraphData(correlationEdges, bandsRef.current) || { nodes: [], edges: [], communities: [], stats: { nodeCount: 0, edgeCount: 0, transitionCount: 0, correlationCount: 0, avgDegree: 0 } });

    if (observation) {
      setEventLog(prev => [{
        time: observation.time,
        type: hit ? 'detection' : 'scan',
        details: hit ? `Signal detected at ${(observation.frequency/1e6).toFixed(1)} MHz (SNR: ${observation.snr?.toFixed(1) || 'N/A'} dB)` : `Scan at ${(observation.frequency/1e6).toFixed(1)} MHz - no signal`
      }, ...prev.slice(0, 49)]);

      // Play beep for signal detection
      if (hit) {
        audio.beepHit();
      }
    }

    if (decision) {
      setEventLog(prev => [{
        time: newTime,
        type: 'prediction',
        details: `Next scan: ${(decision.nextFrequency/1e6).toFixed(1)} MHz (${decision.reasons.join(', ')})`
      }, ...prev.slice(0, 49)]);
    }

    const history = scanHistoryRef.current;
    const hits = history.filter(o => o.detected).length;
    const total = history.length;
    const misses = history.filter(o => !o.detected).length;
    const falseAlarms = history.filter(o => o.detected && o.snr !== undefined && o.snr < 0).length;
    const pd = total > 0 ? hits / total : 0;
    const far = total > 0 ? falseAlarms / total : 0;
    
    const avgInterceptTime = smartSchedulerRef.current?.getAverageInterceptTime() ?? 0;
    const predAcc = smartSchedulerRef.current?.getPredictionAccuracy() ?? 0;

    setMetrics({
      pd,
      far,
      interceptRate: pd,
      avgInterceptTime,
      predAcc,
      scanEff: total > 0 ? hits / total : 0,
      totalScans: total,
      totalHits: hits,
      totalMisses: misses,
      totalFalseAlarms: falseAlarms
    });
  }, [schedulerType]);

  const loop = useCallback((timestamp: number) => {
    if (!running) return;
    
    if (lastStepRef.current === 0) {
      lastStepRef.current = timestamp;
    }
    
    const deltaTime = timestamp - lastStepRef.current;
    const stepInterval = 100 / speed;
    
    if (deltaTime >= stepInterval) {
      lastStepRef.current = timestamp;
      step();
    }
    
    animationRef.current = requestAnimationFrame(loop);
  }, [running, speed, step]);

  useEffect(() => {
    const scenarios = createScenarios();
    setScenario(scenarios[0]);
  }, []);

  useEffect(() => {
    if (scenario) initSimulation(scenario);
  }, [scenario, initSimulation]);

  useEffect(() => {
    if (running) {
      setSimulationStatus('running');
      lastStepRef.current = 0;
      animationRef.current = requestAnimationFrame(loop);
    } else if (simulationStatus === 'running') {
      setSimulationStatus('paused');
      cancelAnimationFrame(animationRef.current);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [running, loop]);

  const toggleRunning = () => {
    const nextRunning = !running;
    setRunning(nextRunning);
    
    // Initialize audio context on first RUN (user interaction)
    if (nextRunning) {
      audio.initAudioContext();
      // Resume context if suspended (required by browser policy)
      setTimeout(() => audio.resumeAudioContext(), 0);
    }
  };
  const resetSim = () => scenario && initSimulation(scenario);

  const handleLogout = async () => {
    if (running) toggleRunning();
    await logout();
  };

  const tuningTimeRemaining = receiverState?.tuningTimeRemaining ?? 0;
  const dwellTimeRemaining = receiverState?.dwellTimeRemaining ?? 0;
  const isScanning = receiverState?.isScanning ?? false;
  const isTuning = tuningTimeRemaining > 0;
  const scanState = isScanning ? 'SCANNING' : isTuning ? 'TUNING' : 'IDLE';
  const scanStateClass = isScanning ? 'scanning' : isTuning ? 'warning' : 'active';

  if (fullGraphOpen) {
    return (
      <FullLinkGraphView
        graphData={graphData}
        bands={bandsRef.current}
        scenarioName={scenario?.name || 'None'}
        schedulerType={schedulerType}
        simulationStatus={simulationStatus}
        currentTime={currentTime}
        onClose={() => setFullGraphOpen(false)}
      />
    );
  }

  if (globalMapOpen) {
    return (
      <GlobalRFMapView
        observations={scanHistoryRef.current}
        bandMetrics={bandMetrics}
        patterns={patterns}
        graphData={graphData}
        bands={bandsRef.current}
        scenarioName={scenario?.name || 'None'}
        scenarioEmitters={scenario?.emitters || []}
        schedulerType={schedulerType}
        simulationStatus={simulationStatus}
        currentTime={currentTime}
        receiverState={receiverState}
        decision={decision}
        onClose={() => setGlobalMapOpen(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      <header style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)',
        position: 'relative', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: '8px', 
            background: 'linear-gradient(135deg, var(--accent-cyan), #0099cc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--bg-primary)' }}>EW</span>
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>SMART-SCAN EW</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Adaptive Receiver Scheduler</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={scenario?.name || ''} 
              onChange={e => setScenario(createScenarios().find(s => s.name === e.target.value)!)}
              className="input" style={{ width: 'auto', minWidth: 200, padding: '6px 12px' }}
              disabled={running}
              title={scenario ? SCENARIO_INFO[scenario.name]?.longDesc : 'Select a scenario'}
            >
              {createScenarios().map(s => <option key={s.name} value={s.name} title={SCENARIO_INFO[s.name]?.longDesc}>{s.name}</option>)}
            </select>
            {scenario && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px', padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', zIndex: 100 }}>
                {SCENARIO_INFO[scenario.name]?.desc}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <select 
              value={schedulerType} 
              onChange={e => setSchedulerType(e.target.value as any)}
              className="input" style={{ width: 'auto', minWidth: 160, padding: '6px 12px' }}
              disabled={running}
              title={SCHEDULER_INFO[schedulerType]?.longDesc}
            >
              <option value="sequential" title={SCHEDULER_INFO.sequential?.longDesc}>Sequential</option>
              <option value="random" title={SCHEDULER_INFO.random?.longDesc}>Random</option>
              <option value="priority" title={SCHEDULER_INFO.priority?.longDesc}>Priority</option>
              <option value="adaptive" title={SCHEDULER_INFO.adaptive?.longDesc}>Adaptive (AI)</option>
            </select>
            <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px', padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', zIndex: 100 }}>
              {SCHEDULER_INFO[schedulerType]?.desc}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>Speed</span>
            <input type="range" min="0.5" max="10" step="0.5" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} style={{ width: 80 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-cyan)', minWidth: 32 }}>{speed.toFixed(1)}x</span>
          </div>

          <button onClick={toggleRunning} className={`btn ${running ? 'btn-danger' : 'btn-primary'}`} style={{ minWidth: 100 }}>
            {running ? '⏸ PAUSE' : '▶ RUN'}
          </button>
          <button onClick={resetSim} className="btn btn-ghost" style={{ minWidth: 80 }} disabled={!running && simulationStatus === 'idle'}>↻ RESET</button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px', paddingLeft: '16px', borderLeft: '1px solid var(--border-primary)' }}>
            <button 
              onClick={audio.testBeep} 
              className="btn btn-ghost" 
              style={{ padding: '6px 12px', fontSize: 11 }}
              disabled={!audio.hasContext}
              title="Test audio beep"
            >
              🔊 TEST
            </button>
            <button 
              onClick={audio.toggleSound} 
              className={`btn ${audio.isEnabled ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', fontSize: 11 }}
              title={audio.isEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {audio.isEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px', paddingLeft: '16px', borderLeft: '1px solid var(--border-primary)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
              {user?.email || user?.displayName || 'User'}
            </span>
            <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }}>
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <ErrorBoundary panelName="Dashboard Main">
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '16px', gap: '16px' }}>
        <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="panel-header">
              <span className="panel-title">SIMULATION STATUS</span>
              <span className={`badge ${simulationStatus === 'running' ? 'badge-green' : simulationStatus === 'paused' ? 'badge-amber' : 'badge-cyan'}`}>
                {simulationStatus.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <div><span className="metric-label">Scenario:</span> {scenario?.name || 'None'}</div>
              <div><span className="metric-label">Scheduler:</span> {schedulerType.toUpperCase()}</div>
              <div><span className="metric-label">Sim Time:</span> {currentTime.toFixed(2)}s</div>
              <div><span className="metric-label">Speed:</span> {speed.toFixed(1)}x</div>
              <div><span className="metric-label">Scans:</span> {metrics.totalScans}</div>
              <div><span className="metric-label">Hits:</span> {metrics.totalHits}</div>
              <div><span className="metric-label">Misses:</span> {metrics.totalMisses}</div>
              <div><span className="metric-label">Detection Rate:</span> {(metrics.pd * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="panel-header">
              <span className="panel-title">RECEIVER STATUS</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <div>
                <div className="metric-label">CURRENT FREQUENCY</div>
                <div className="metric-value" style={{ fontSize: 24 }}>{receiverState ? (receiverState.currentFrequency/1e6).toFixed(1) : 0} MHz</div>
              </div>
              <div>
                <div className="metric-label">BAND INDEX</div>
                <div className="metric-value" style={{ fontSize: 24 }}>{receiverState?.currentBand || 0} / {bandsRef.current.length - 1}</div>
              </div>
              <div>
                <div className="metric-label">SCAN STATE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`status-dot ${scanStateClass}`}></span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase' }}>{scanState}</span>
                </div>
              </div>
              <div>
                <div className="metric-label">NEXT SCAN IN</div>
                <div className="metric-value" style={{ fontSize: 20, color: 'var(--accent-amber)' }}>
                  {receiverState ? (tuningTimeRemaining + dwellTimeRemaining).toFixed(3) : 0}s
                </div>
              </div>
              <div>
                <div className="metric-label">BANDWIDTH</div>
                <div className="metric-value" style={{ fontSize: 16 }}>{receiverState ? (20).toFixed(0) : 0} MHz</div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="panel-header">
              <span className="panel-title">NEXT BEST SCAN</span>
            </div>
            <div style={{ marginTop: '8px' }}>
              {decision ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div className="metric-value" style={{ fontSize: 28 }}>{(decision.nextFrequency/1e6).toFixed(1)} MHz</div>
                    <div className={`badge ${decision.exploration ? 'badge-amber' : 'badge-green'}`}>
                      {decision.exploration ? 'EXPLORE' : 'EXPLOIT'}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <div className="metric-label">PRIORITY</div>
                      <div className="metric-value" style={{ fontSize: 20 }}>{(decision.priority * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="metric-label">CONFIDENCE</div>
                      <div className="metric-value" style={{ fontSize: 20 }}>{(decision.confidence * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                  <div>
                    <div className="metric-label">REASONS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {decision.reasons.map((r, i) => (
                        <span key={i} className="badge badge-cyan" style={{ fontSize: 10 }}>{r}</span>
                      ))}
                    </div>
                  </div>
                  {decision.predictedActivationTime && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-primary)' }}>
                      <div className="metric-label">PREDICTED ACTIVATION</div>
                      <div className="metric-value" style={{ fontSize: 18, color: 'var(--accent-amber)' }}>
                        {decision.predictedActivationTime.toFixed(2)}s
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  {simulationStatus === 'idle' ? 'WAITING FOR SIMULATION START' : 'WAITING FOR FIRST OBSERVATION'}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', flex: 1, minHeight: 200 }}>
            <div className="panel-header">
              <span className="panel-title">DECISION TRACE</span>
              <span className="panel-subtitle">Scheduler decision reasoning</span>
            </div>
            <div style={{ marginTop: '8px', maxHeight: 300, overflow: 'auto' }}>
              {smartSchedulerRef.current ? (
                smartSchedulerRef.current.getDecisionTrace().slice(0, 10).map((trace, i) => (
                  <div key={i} className="metric-card" style={{ marginBottom: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                      <span className="event-time">[{trace.time.toFixed(2)}s]</span>
                      <span className={`badge ${trace.exploration ? 'badge-amber' : 'badge-green'}`}>
                        {trace.exploration ? 'EXPLORE' : 'EXPLOIT'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      <div><span className="metric-label">Current Band:</span> {trace.currentBand}</div>
                      <div><span className="metric-label">Selected Band:</span> {trace.selectedBand} ({(trace.selectedBand * 20 + 110).toFixed(0)} MHz)</div>
                      <div><span className="metric-label">Score:</span> {trace.score.toFixed(3)}</div>
                      <div><span className="metric-label">Confidence:</span> {(trace.confidence * 100).toFixed(0)}%</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <div>Reasons: {trace.reasons.join(' | ')}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                      Features: {Object.entries(trace.features).map(([k, v]) => `${k}: ${v.toFixed(3)}`).join(', ')}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  {simulationStatus === 'idle' ? 'SIMULATION NOT STARTED' : 'NO DECISIONS YET'}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', flex: 1, minHeight: 200 }}>
            <div className="panel-header">
              <span className="panel-title">EVENT TIMELINE</span>
            </div>
            <div className="event-log" style={{ marginTop: '8px', maxHeight: 300, overflow: 'auto' }}>
              {eventLog.map((e, i) => (
                <div key={i} className="event-log-entry" style={{ borderLeft: `3px solid ${e.type === 'detection' ? 'var(--accent-green)' : e.type === 'prediction' ? 'var(--accent-cyan)' : 'var(--border-primary)'}` }}>
                  <span className="event-time">[{e.time.toFixed(2)}s]</span>
                  <span className={`event-type-${e.type}`}>{' ' + e.type.toUpperCase() + ' '}</span>
                  <span>{e.details}</span>
                </div>
              ))}
              {eventLog.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  {simulationStatus === 'idle' ? 'SIMULATION NOT STARTED\nPress RUN to begin RF scanning.' : 'NO EVENTS YET'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
          <div className="glass-panel" style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <span className="panel-title">LIVE SPECTRUM</span>
              <span className="panel-subtitle">Real-time RF activity across frequency</span>
            </div>
            <div style={{ flex: 1, position: 'relative', padding: '16px' }}>
              <canvas 
                ref={el => { if (el) drawSpectrum(el, bandMetrics, decision, receiverState, groundTruthRef.current); }} 
                width={SPECTRUM_WIDTH} height={SPECTRUM_HEIGHT} 
                className="spectrum-canvas" 
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          <div className="glass-panel" style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <span className="panel-title">360° ACTIVITY MATRIX</span>
              <span className="panel-subtitle">Frequency × Time spatio-temporal view</span>
            </div>
            <div style={{ flex: 1, position: 'relative', padding: '16px' }}>
              <canvas 
                ref={el => { if (el) drawMatrix(el, scanHistoryRef.current, bandsRef.current, currentTime); }} 
                width={MATRIX_WIDTH} height={MATRIX_HEIGHT} 
                className="matrix-canvas" 
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <span className="panel-title">LINK GRAPH</span>
                <button
                  className="btn btn-primary"
                  onClick={() => setFullGraphOpen(true)}
                  style={{ padding: '4px 12px', fontSize: 10 }}
                >
                  OPEN FULL GRAPH
                </button>
              </div>
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {graphData.nodes.length > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      <div className="metric-card" style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--accent-cyan)' }}>{graphData.stats.nodeCount}</div>
                        <div className="metric-label" style={{ marginTop: 4 }}>Nodes</div>
                      </div>
                      <div className="metric-card" style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--accent-cyan)' }}>{graphData.stats.edgeCount}</div>
                        <div className="metric-label" style={{ marginTop: 4 }}>Edges</div>
                      </div>
                      <div className="metric-card" style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--accent-cyan)' }}>{graphData.stats.transitionCount}</div>
                        <div className="metric-label" style={{ marginTop: 4 }}>Transitions</div>
                      </div>
                      <div className="metric-card" style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--accent-cyan)' }}>{graphData.stats.correlationCount}</div>
                        <div className="metric-label" style={{ marginTop: 4 }}>Correlations</div>
                      </div>
                    </div>
                    {(() => {
                      const strongest = graphData.edges.sort((a, b) => b.weight - a.weight)[0];
                      if (!strongest) return null;
                      return (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
                          <div>Strongest: Band {strongest.from} → Band {strongest.to}</div>
                          <div style={{ color: 'var(--accent-cyan)' }}>{(strongest.weight * 100).toFixed(1)}% · {strongest.type} · {strongest.count} obs</div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    {simulationStatus === 'idle' ? (
                      <>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                          NO GRAPH DATA YET
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6 }}>
                          Start the simulation to collect transition and correlation data.
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                          COLLECTING OBSERVATIONS...
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6 }}>
                          Frequency relationships will appear as the receiver scans and detects signals.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <span className="panel-title">BEHAVIORAL PATTERNS</span>
                <span className="panel-subtitle">Discovered emitter fingerprints from observations</span>
              </div>
              <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
                {patterns.length > 0 ? (
                  patterns.map((p, i) => (
                    <div key={i} className="metric-card" style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="badge badge-cyan">{p.id}</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge ${p.confidence > 0.7 ? 'badge-green' : p.confidence > 0.45 ? 'badge-amber' : 'badge-gray'}`}>
                            {(p.confidence * 100).toFixed(0)}%
                          </span>
                          <span className={`badge ${p.status === 'confirmed' ? 'badge-green' : p.status === 'learning' ? 'badge-amber' : 'badge-gray'}`}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '8px' }}>
                        <div><strong>Type:</strong> {p.type} &nbsp;|&nbsp; <strong>Behavior:</strong> {p.frequencyBehavior} / {p.activityPattern}</div>
                        {p.estimatedPeriod && <div><strong>Period:</strong> ~{p.estimatedPeriod.toFixed(1)}s</div>}
                        <div><strong>Primary Band:</strong> Band {p.primaryBandIndex ?? 'N/A'} ({(bandsRef.current[p.primaryBandIndex ?? 0]?.centerFrequency / 1e6 || 0).toFixed(0)} MHz)</div>
                        <div><strong>Observations:</strong> {p.supportingObservations} &nbsp;|&nbsp; <strong>Avg BW:</strong> {(p.averageBandwidth/1e6).toFixed(1)} MHz &nbsp;|&nbsp; <strong>Avg Power:</strong> {p.averagePower.toFixed(0)} dBm</div>
                        {p.transitionPattern.length > 0 && <div><strong>Transitions:</strong> {p.transitionPattern.slice(-8).join(' → ')}</div>}
                        {p.predictedNextTime && <div><strong>Predicted Next:</strong> {p.predictedNextTime.toFixed(1)}s</div>}
                        <div><strong>First Seen:</strong> {p.firstSeen.toFixed(1)}s &nbsp;|&nbsp; <strong>Last Seen:</strong> {p.lastSeen.toFixed(1)}s</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border-primary)', paddingTop: '8px' }}>
                        <strong>Evidence:</strong>
                        <div style={{ marginTop: '4px' }}>
                          {p.evidence.map((e, idx) => (
                            <div key={idx} style={{ paddingLeft: '12px' }}>▸ {e}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    {simulationStatus === 'idle' ? (
                      <>
                        <div style={{ fontSize: 14, marginBottom: '8px' }}>SIMULATION NOT STARTED</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Select a scenario and press RUN to begin pattern discovery.</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, marginBottom: '8px' }}>COLLECTING BEHAVIORAL EVIDENCE...</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
                          Patterns emerge from real receiver observations:<br/>
                          {'• Static: Continuous detection at fixed frequency<br/>'}
                          {'• Periodic: Regular intervals (3+ detections needed)<br/>'}
                          {'• Burst: Intermittent with identifiable timing<br/>'}
                          {'• Agile: Frequency transitions (requires transitionProbability > 25%)<br/>'}
                          {'• Correlated: Co-occurring activity across bands'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                          Try the "Behavioral Pattern Demo" scenario for faster pattern emergence.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="panel-header">
              <span className="panel-title">GLOBAL RF INTELLIGENCE MAP</span>
              <button
                className="btn btn-primary"
                onClick={() => setGlobalMapOpen(true)}
                style={{ padding: '4px 12px', fontSize: 10 }}
              >
                OPEN GLOBAL RF MAP
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginTop: '8px' }}>
              {(() => {
                const activeRegions = new Set<string>();
                const recentObs = scanHistoryRef.current.filter(o => o.time > currentTime - 10 && o.detected);
                for (const obs of recentObs) {
                  const band = bandsRef.current[obs.bandIndex];
                  const emitter = scenario?.emitters.find(e => Math.abs(e.frequency - band.centerFrequency) < 1e6);
                  if (emitter?.region) activeRegions.add(emitter.region);
                }
                const regionNames: Record<string, string> = { north: 'North', atlantic: 'Atlantic', european: 'European', middle: 'Middle', east: 'East', pacific: 'Pacific', southern: 'Southern' };
                return Object.entries(regionNames).map(([id, name]) => (
                  <div key={id} className="metric-card" style={{ padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: activeRegions.has(id) ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: '2px' }}>
                      {activeRegions.has(id) ? 'ACTIVE' : 'No activity'}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="panel-header">
              <span className="panel-title">FREQUENCY ACTIVITY MAP</span>
              <span className="panel-subtitle">Live priority scoring across all bands</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginTop: '8px', maxHeight: 300, overflow: 'auto' }}>
              {bandMetrics.slice(0, 30).map(m => {
                const band = bandsRef.current[m.bandIndex];
                if (!band) return null;
                let fillClass = 'low';
                if (m.activityScore > 0.7) fillClass = 'critical';
                else if (m.activityScore > 0.5) fillClass = 'high';
                else if (m.activityScore > 0.3) fillClass = 'medium';
                return (
                  <div key={m.bandIndex} className={`freq-band ${m.bandIndex === decision?.nextBand ? 'active' : ''}`}>
                    <div className="freq-band-info">
                      <div className="freq-band-label">Band {m.bandIndex} • {(band.centerFrequency/1e6).toFixed(1)} MHz</div>
                      <div className="freq-band-value">Priority: {(m.priority*100).toFixed(0)}% • Hit Rate: {(m.hitRate*100).toFixed(0)}%</div>
                    </div>
                    <div className="freq-band-bar">
                      <div className={`freq-band-fill ${fillClass}`} style={{ width: `${Math.max(5, m.activityScore * 100)}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="panel-header">
              <span className="panel-title">PERFORMANCE METRICS</span>
            </div>
            <div className="grid grid-4" style={{ marginTop: '8px' }}>
              <div className="metric-card">
                <div className="metric-value">{metrics.pd.toFixed(3)}</div>
                <div className="metric-label">Probability of Detection</div>
              </div>
              <div className="metric-card">
                <div className="metric-value" style={{ color: metrics.far > 0.2 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{metrics.far.toFixed(3)}</div>
                <div className="metric-label">False Alarm Rate</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{metrics.interceptRate.toFixed(3)}</div>
                <div className="metric-label">Intercept Rate</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{metrics.avgInterceptTime.toFixed(3)}s</div>
                <div className="metric-label">Avg Intercept Time</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{metrics.predAcc.toFixed(3)}</div>
                <div className="metric-label">Prediction Accuracy</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{(metrics.scanEff*100).toFixed(1)}%</div>
                <div className="metric-label">Scan Efficiency</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{metrics.totalScans}</div>
                <div className="metric-label">Total Scans</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{metrics.totalHits}</div>
                <div className="metric-label">Total Hits</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      </ErrorBoundary>
    </div>
  );
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-ui)'
      }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          borderRadius: '50%', 
          border: '3px solid var(--border-primary)', 
          borderTopColor: 'var(--accent-cyan)', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <p style={{ 
          marginTop: '16px', 
          fontFamily: 'var(--font-mono)', 
          fontSize: 12, 
          color: 'var(--text-muted)' 
        }}>Initializing authentication...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

// Drawing functions
function drawSpectrum(canvas: HTMLCanvasElement, bandMetrics: BandMetrics[], decision: SchedulerDecision | null, receiverState: ReceiverState | null, groundTruth: GroundTruthEntry[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const bands = bandMetrics.length;
  
  ctx.clearRect(0, 0, w, h);
  
  ctx.fillStyle = '#05080c';
  ctx.fillRect(0, 0, w, h);
  
  ctx.strokeStyle = 'rgba(30, 45, 61, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const y = (i / 10) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  
  const barWidth = w / bands;
  
  bandMetrics.forEach((m, i) => {
    const x = i * barWidth;
    const barH = m.activityScore * h * 0.8;
    const y = h - barH;
    
    const gradient = ctx.createLinearGradient(0, h, 0, y);
    if (m.activityScore > 0.7) {
      gradient.addColorStop(0, '#ff4444');
      gradient.addColorStop(1, '#ff444440');
    } else if (m.activityScore > 0.5) {
      gradient.addColorStop(0, '#00ff88');
      gradient.addColorStop(1, '#00ff8840');
    } else if (m.activityScore > 0.3) {
      gradient.addColorStop(0, '#ffb800');
      gradient.addColorStop(1, '#ffb80040');
    } else {
      gradient.addColorStop(0, '#5a6f8a');
      gradient.addColorStop(1, '#5a6f8a20');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x + 1, y, barWidth - 2, barH);
    
    if (m.hitRate > 0) {
      ctx.fillStyle = `rgba(0, 255, 136, ${m.hitRate * 0.5})`;
      ctx.fillRect(x + 1, h - m.hitRate * h * 0.8, barWidth - 2, 2);
    }
  });
  
  if (decision) {
    const x = (decision.nextBand / bands) * w;
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#00d4ff';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('NEXT', x + 4, 14);
  }
  
  if (receiverState) {
    const x = (receiverState.currentBand / bands) * w;
    ctx.strokeStyle = '#ffb800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    
    ctx.fillStyle = '#ffb800';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('CURRENT', x + 4, h - 4);
  }
  
  groundTruth.forEach(gt => {
    if (gt && gt.active) {
      const x = ((gt.frequency - 100e6) / 900e6) * w;
      ctx.fillStyle = 'rgba(255, 68, 68, 0.6)';
      ctx.beginPath();
      ctx.arc(x, h * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  ctx.strokeStyle = 'rgba(30, 45, 61, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, w, h);
}

function drawMatrix(canvas: HTMLCanvasElement, scanHistory: Observation[], bands: FrequencyBand[], currentTime: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const numBands = bands.length;
  
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#05080c';
  ctx.fillRect(0, 0, w, h);
  
  const timeWindow = 60;
  const cellWidth = w / timeWindow;
  const cellHeight = h / numBands;
  
  const bandObservations = new Map<number, Map<number, { detected: boolean; snr?: number }>>();
  
  scanHistory.forEach(obs => {
    if (!bandObservations.has(obs.bandIndex)) {
      bandObservations.set(obs.bandIndex, new Map());
    }
    const timeBin = Math.floor(obs.time);
    if (timeBin >= 0 && timeBin < timeWindow) {
      bandObservations.get(obs.bandIndex)!.set(timeBin, { detected: obs.detected, snr: obs.snr });
    }
  });
  
  for (let i = 0; i < numBands; i++) {
    const y = i * cellHeight;
    const bandObs = bandObservations.get(i);
    
    for (let t = 0; t < timeWindow; t++) {
      const x = t * cellWidth;
      
      if (bandObs && bandObs.has(t)) {
        const obs = bandObs.get(t)!;
        if (obs.detected) {
          const snr = obs.snr ?? 0;
          const intensity = Math.min(1, Math.max(0, (snr + 20) / 40));
          ctx.fillStyle = `rgba(0, 255, 136, ${0.3 + intensity * 0.7})`;
        } else {
          ctx.fillStyle = 'rgba(90, 111, 138, 0.15)';
        }
      } else {
        ctx.fillStyle = 'rgba(30, 45, 61, 0.3)';
      }
      
      ctx.fillRect(x, y, cellWidth, cellHeight);
    }
    
    ctx.fillStyle = 'rgba(154, 176, 200, 0.4)';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.fillText(`${(bands[i]?.centerFrequency/1e6).toFixed(0)} MHz`, w - 4, y + cellHeight * 0.7);
  }
  
  const currentTimeBin = Math.floor(currentTime);
  if (currentTimeBin >= 0 && currentTimeBin < timeWindow) {
    const x = currentTimeBin * cellWidth;
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
  ctx.font = '10px JetBrains Mono';
  ctx.textAlign = 'left';
  ctx.fillText('TIME (s)', 8, 14);
  ctx.textAlign = 'right';
  ctx.fillText(`${timeWindow}s`, w - 8, 14);
  
  ctx.strokeStyle = 'rgba(30, 45, 61, 0.3)';
  ctx.strokeRect(0, 0, w, h);
}

export default App;
