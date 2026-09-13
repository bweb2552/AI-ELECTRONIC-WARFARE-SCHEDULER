import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GEO_REGIONS, RECEIVER_POSITIONS, lonLatToXY } from '../core/geo-regions';
import type { Observation, BandMetrics, PatternFingerprint, FrequencyBand, ReceiverState, SchedulerDecision } from '../core/types';
import type { CombinedGraphData } from '../scheduler/link-graph';

interface GlobalRFMapViewProps {
  observations: Observation[];
  bandMetrics: BandMetrics[];
  patterns: PatternFingerprint[];
  graphData: CombinedGraphData;
  bands: FrequencyBand[];
  scenarioName: string;
  scenarioEmitters: Array<{ id: string; name: string; type: string; frequency: number; region?: string }>;
  schedulerType: string;
  simulationStatus: string;
  currentTime: number;
  receiverState: ReceiverState | null;
  decision: SchedulerDecision | null;
  onClose: () => void;
}

interface EmitterActivity {
  regionId: string;
  bandIndex: number;
  frequency: number;
  snr: number;
  detected: boolean;
  time: number;
  count: number;
}

interface TransitionArc {
  fromRegion: string;
  toRegion: string;
  weight: number;
  count: number;
  confidence: number;
  fromFreq: number;
  toFreq: number;
}

const EARTH_OUTLINE = [
  [-170, 60], [-160, 65], [-140, 62], [-130, 55], [-125, 50], [-120, 35], [-115, 30], [-105, 25], [-100, 20], [-95, 18], [-90, 15], [-85, 10], [-80, 8], [-75, 5], [-70, 10], [-65, 18], [-60, 25], [-55, 30], [-50, 35], [-45, 40], [-35, 45], [-25, 50], [-15, 55], [-5, 58], [5, 55], [15, 52], [25, 55], [35, 58], [45, 55], [55, 50], [65, 45], [75, 40], [85, 35], [95, 30], [105, 25], [115, 30], [120, 35], [125, 40], [130, 45], [135, 50], [140, 55], [145, 58], [150, 60], [160, 62], [170, 60],
  [-170, -15], [-160, -20], [-150, -18], [-140, -15], [-130, -20], [-120, -25], [-110, -30], [-100, -35], [-90, -40], [-80, -45], [-70, -50], [-65, -55], [-70, -58], [-80, -55], [-90, -50], [-100, -45], [-110, -40], [-120, -35], [-130, -30], [-140, -25], [-150, -20], [-160, -15], [-170, -15],
  [-10, 35], [0, 40], [5, 45], [10, 50], [15, 55], [20, 58], [25, 60], [30, 62], [35, 60], [40, 55], [45, 50], [50, 45], [55, 40], [60, 35], [65, 30], [70, 25], [75, 20], [80, 15], [85, 10], [90, 5], [95, 0], [100, -5], [105, -10], [110, -15], [115, -20], [120, -25], [125, -30], [130, -35], [135, -38], [140, -38], [145, -35], [150, -30], [155, -25], [160, -20], [165, -15], [170, -10],
  [10, 30], [20, 32], [30, 30], [35, 28], [40, 25], [45, 20], [50, 15], [55, 10], [60, 5], [65, 0], [70, -5], [75, -10], [80, -15], [85, -20], [90, -25], [95, -30], [100, -35], [105, -38], [110, -35], [115, -30], [120, -25], [125, -20], [130, -15], [135, -10], [140, -5], [145, 0], [150, 5], [155, 10], [160, 15], [165, 20], [170, 25],
];

const BEHAVIOR_COLORS: Record<string, string> = {
  static: '#3b82f6',
  periodic: '#22c55e',
  'frequency-agile': '#ec4899',
  burst: '#f97316',
  correlated: '#a855f7',
  adaptive: '#06b6d4',
};

type MapType = 'default' | 'satellite' | 'street';

const MAP_STYLES: Record<MapType, { bg: string; grid: string; land: string; landFill: string; label: string }> = {
  default: {
    bg: '#05080c',
    grid: 'rgba(30, 45, 61, 0.4)',
    land: 'rgba(30, 45, 61, 0.6)',
    landFill: 'rgba(15, 25, 40, 0.5)',
    label: 'rgba(154, 176, 200, 0.5)',
  },
  satellite: {
    bg: '#0a0f1a',
    grid: 'rgba(20, 60, 40, 0.3)',
    land: 'rgba(34, 80, 50, 0.7)',
    landFill: 'rgba(15, 40, 25, 0.6)',
    label: 'rgba(100, 200, 140, 0.5)',
  },
  street: {
    bg: '#1a1f2e',
    grid: 'rgba(60, 70, 90, 0.5)',
    land: 'rgba(80, 90, 110, 0.6)',
    landFill: 'rgba(40, 45, 60, 0.5)',
    label: 'rgba(180, 190, 210, 0.5)',
  },
};

export function GlobalRFMapView({
  observations,
  bandMetrics: _bandMetrics,
  patterns,
  graphData,
  bands,
  scenarioName,
  scenarioEmitters,
  schedulerType,
  simulationStatus,
  currentTime,
  receiverState,
  decision: _decision,
  onClose,
}: GlobalRFMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [showReceivers, setShowReceivers] = useState(true);
  const [showEmitters, setShowEmitters] = useState(true);
  const [showArcs, setShowArcs] = useState(true);
  const [minTransitionCount, setMinTransitionCount] = useState(3);
  const [mapType, setMapType] = useState<MapType>('default');
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [pulseTime, setPulseTime] = useState(0);

  const emitterActivity = useMemo(() => {
    const activityMap = new Map<string, EmitterActivity>();
    const recentObs = observations.filter(o => o.time > currentTime - 10);
    for (const obs of recentObs) {
      const band = bands[obs.bandIndex];
      if (!band) continue;
      const region = scenarioEmitters.find(e => e.frequency === band.centerFrequency)?.region;
      if (!region) continue;
      const existing = activityMap.get(region);
      if (existing) {
        existing.count++;
        if (obs.snr && obs.snr > existing.snr) {
          existing.snr = obs.snr;
          existing.frequency = band.centerFrequency;
          existing.bandIndex = obs.bandIndex;
        }
        existing.time = obs.time;
        existing.detected = existing.detected || obs.detected;
      } else {
        activityMap.set(region, {
          regionId: region,
          bandIndex: obs.bandIndex,
          frequency: band.centerFrequency,
          snr: obs.snr ?? -100,
          detected: obs.detected,
          time: obs.time,
          count: 1,
        });
      }
    }
    return activityMap;
  }, [observations, currentTime, bands, scenarioEmitters]);

  const transitionArcs = useMemo(() => {
    const arcs: TransitionArc[] = [];
    const minCount = minTransitionCount;
    for (const edge of graphData.edges) {
      if (edge.count < minCount) continue;
      const fromEmitter = scenarioEmitters.find(e => {
        const band = bands[edge.from];
        return band && Math.abs(e.frequency - band.centerFrequency) < 1e6;
      });
      const toEmitter = scenarioEmitters.find(e => {
        const band = bands[edge.to];
        return band && Math.abs(e.frequency - band.centerFrequency) < 1e6;
      });
      if (fromEmitter?.region && toEmitter?.region && fromEmitter.region !== toEmitter.region) {
        arcs.push({
          fromRegion: fromEmitter.region,
          toRegion: toEmitter.region,
          weight: edge.weight,
          count: edge.count,
          confidence: edge.confidence,
          fromFreq: bands[edge.from]?.centerFrequency ?? 0,
          toFreq: bands[edge.to]?.centerFrequency ?? 0,
        });
      }
    }
    return arcs;
  }, [graphData.edges, scenarioEmitters, bands, minTransitionCount]);

  const getMarkerInfo = useCallback((regionId: string) => {
    const region = GEO_REGIONS.find(r => r.id === regionId);
    if (!region) return null;
    const activity = emitterActivity.get(regionId);
    const regionPatterns = patterns.filter(p => {
      const emitter = scenarioEmitters.find(e => e.region === regionId);
      if (!emitter) return false;
      const band = bands[p.primaryBandIndex ?? -1];
      return band && Math.abs(emitter.frequency - band.centerFrequency) < 1e6;
    });
    return { region, activity, patterns: regionPatterns };
  }, [emitterActivity, patterns, scenarioEmitters, bands]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTime(t => (t + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
      }
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvasSize.w;
    const h = canvasSize.h;
    const style = MAP_STYLES[mapType];
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(transform.x + panOffset.current.x, transform.y + panOffset.current.y);
    ctx.scale(transform.scale, transform.scale);

    // Draw grid
    ctx.strokeStyle = style.grid;
    ctx.lineWidth = 1;
    const gridStep = mapType === 'street' ? 15 : mapType === 'satellite' ? 10 : 30;
    for (let lon = -180; lon <= 180; lon += gridStep) {
      const { x } = lonLatToXY(lon, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += gridStep) {
      const { y } = lonLatToXY(0, lat, w, h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw Earth outline
    ctx.strokeStyle = style.land;
    ctx.lineWidth = mapType === 'street' ? 2 : 1.5;
    ctx.beginPath();
    for (let i = 0; i < EARTH_OUTLINE.length; i++) {
      const [lon, lat] = EARTH_OUTLINE[i];
      const { x, y } = lonLatToXY(lon, lat, w, h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = style.landFill;
    ctx.fill();

    // Street view: draw detailed coordinate labels
    if (mapType === 'street') {
      ctx.fillStyle = 'rgba(150, 160, 180, 0.4)';
      ctx.font = '8px JetBrains Mono';
      ctx.textAlign = 'left';
      for (let lon = -180; lon <= 180; lon += 30) {
        const { x } = lonLatToXY(lon, 0, w, h);
        ctx.fillText(`${lon}°`, x + 2, h / 2 - 5);
      }
      ctx.textAlign = 'right';
      for (let lat = -60; lat <= 60; lat += 30) {
        const { y } = lonLatToXY(0, lat, w, h);
        ctx.fillText(`${lat}°`, w - 5, y - 3);
      }
    }

    // Satellite view: draw terrain texture effect
    if (mapType === 'satellite') {
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() * 3 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(34, 80, 50, 0.5)' : 'rgba(15, 40, 25, 0.3)';
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;
    }
    for (const region of GEO_REGIONS) {
      const { x, y } = lonLatToXY(region.lon, region.lat, w, h);
      const activity = emitterActivity.get(region.id);
      const isSelected = selectedRegion === region.id;
      const isHovered = hoveredRegion === region.id;
      const hasActivity = activity && activity.detected;
      const intensity = activity ? Math.min(1, (activity.snr + 40) / 60) : 0;
      if (hasActivity) {
        const pulseRadius = 20 + Math.sin(pulseTime * 2) * 5;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius);
        gradient.addColorStop(0, `rgba(0, 255, 136, ${0.3 * intensity})`);
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      const radius = isSelected ? 14 : isHovered ? 12 : 10;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      if (hasActivity) {
        const emitter = scenarioEmitters.find(e => e.region === region.id);
        const color = emitter ? (BEHAVIOR_COLORS[emitter.type] || '#00ff88') : '#00ff88';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3 + intensity * 0.7;
      } else {
        ctx.fillStyle = 'rgba(90, 111, 138, 0.3)';
        ctx.globalAlpha = 1;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isSelected ? '#00d4ff' : isHovered ? '#00ff88' : 'rgba(0, 212, 255, 0.5)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
      ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(154, 176, 200, 0.8)';
      ctx.font = `${isSelected ? '11' : '10'}px JetBrains Mono`;
      ctx.textAlign = 'center';
      ctx.fillText(region.label, x, y - radius - 6);
      if (hasActivity && activity) {
        ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.font = '9px JetBrains Mono';
        ctx.fillText(`${activity.count} obs`, x, y + radius + 12);
      }
    }
    if (showReceivers) {
      for (const rx of RECEIVER_POSITIONS) {
        const { x, y } = lonLatToXY(rx.lon, rx.lat, w, h);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = receiverState?.isScanning ? '#00d4ff' : '#00d4ff80';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -5, 10, 10);
        ctx.restore();
        ctx.fillStyle = '#00d4ff';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(rx.label, x, y - 12);
      }
    }
    if (showArcs && transitionArcs.length > 0) {
      for (const arc of transitionArcs) {
        const fromRegion = GEO_REGIONS.find(r => r.id === arc.fromRegion);
        const toRegion = GEO_REGIONS.find(r => r.id === arc.toRegion);
        if (!fromRegion || !toRegion) continue;
        const from = lonLatToXY(fromRegion.lon, fromRegion.lat, w, h);
        const to = lonLatToXY(toRegion.lon, toRegion.lat, w, h);
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 - 30;
        const alpha = Math.min(1, arc.weight * 2);
        ctx.strokeStyle = `rgba(255, 184, 0, ${alpha})`;
        ctx.lineWidth = Math.max(1, arc.weight * 3);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY, to.x, to.y);
        ctx.stroke();
        const headLen = 8;
        const angle = Math.atan2(to.y - midY, to.x - midX);
        ctx.fillStyle = `rgba(255, 184, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(154, 176, 200, 0.5)';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('Geographic positions are simulated and do not represent real emitter locations.', w / 2, h - 8);
  }, [canvasSize, transform, emitterActivity, transitionArcs, showReceivers, showArcs, selectedRegion, hoveredRegion, receiverState, scenarioEmitters, bands, pulseTime, mapType]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.x - panOffset.current.x) / transform.scale;
    const my = (e.clientY - rect.top - transform.y - panOffset.current.y) / transform.scale;
    const w = canvasSize.w;
    const h = canvasSize.h;
    let found: string | null = null;
    for (const region of GEO_REGIONS) {
      const { x, y } = lonLatToXY(region.lon, region.lat, w, h);
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist < 15) {
        found = region.id;
        break;
      }
    }
    setHoveredRegion(found);
    if (isDragging.current) {
      setTransform({ ...transform, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  }, [transform, canvasSize]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform({ ...transform, scale: Math.max(0.3, Math.min(3, transform.scale * delta)) });
  }, [transform]);

  const handleClick = useCallback(() => {
    if (hoveredRegion) {
      setSelectedRegion(selectedRegion === hoveredRegion ? null : hoveredRegion);
    } else {
      setSelectedRegion(null);
    }
  }, [hoveredRegion, selectedRegion]);

  const fitToScreen = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const selectedMarker = selectedRegion ? getMarkerInfo(selectedRegion) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: 12 }}>
            ← BACK TO DASHBOARD
          </button>
          <div style={{ borderLeft: '1px solid var(--border-primary)', paddingLeft: '16px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>GLOBAL RF INTELLIGENCE MAP</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>Simulated Geographic RF Activity Monitoring</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Scenario: {scenarioName}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Scheduler: {schedulerType.toUpperCase()}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Time: {currentTime.toFixed(1)}s</span>
          <span className={`badge ${simulationStatus === 'running' ? 'badge-green' : simulationStatus === 'paused' ? 'badge-amber' : 'badge-cyan'}`}>
            {simulationStatus.toUpperCase()}
          </span>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: 280, flexShrink: 0, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', letterSpacing: '0.05em' }}>CONTROLS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={showReceivers} onChange={e => setShowReceivers(e.target.checked)} />
                Receivers ({RECEIVER_POSITIONS.length})
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={showEmitters} onChange={e => setShowEmitters(e.target.checked)} />
                Emitters ({scenarioEmitters.length})
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={showArcs} onChange={e => setShowArcs(e.target.checked)} />
                Transition Arcs ({transitionArcs.length})
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="metric-label">MAP TYPE</div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {(['default', 'satellite', 'street'] as MapType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setMapType(type)}
                  className={`btn ${mapType === type ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, padding: '6px 4px', fontSize: 9, textTransform: 'uppercase' }}
                >
                  {type === 'default' ? '🗺 DEFAULT' : type === 'satellite' ? '🛰 SATELLITE' : '🛣 STREET'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="metric-label">MIN TRANSITION COUNT</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input type="range" min={1} max={10} value={minTransitionCount} onChange={e => setMinTransitionCount(parseInt(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-cyan)', minWidth: 20 }}>{minTransitionCount}</span>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="metric-label">VIEW</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={fitToScreen} className="btn btn-ghost" style={{ flex: 1, padding: '6px', fontSize: 10 }}>FIT</button>
              <button onClick={() => setTransform({ x: 0, y: 0, scale: transform.scale * 1.2 })} className="btn btn-ghost" style={{ flex: 1, padding: '6px', fontSize: 10 }}>ZOOM+</button>
              <button onClick={() => setTransform({ x: 0, y: 0, scale: transform.scale * 0.8 })} className="btn btn-ghost" style={{ flex: 1, padding: '6px', fontSize: 10 }}>ZOOM-</button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', letterSpacing: '0.05em' }}>LEGEND</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: 2 }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Static</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 2 }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Periodic</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, background: '#ec4899', borderRadius: 2 }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Frequency-Agile</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, background: '#f97316', borderRadius: 2 }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Burst</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, background: '#a855f7', borderRadius: 2 }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Correlated</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, background: '#06b6d4', borderRadius: 2 }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Adaptive</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ width: 10, height: 10, background: 'transparent', border: '1px solid #00d4ff', transform: 'rotate(45deg)' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Receiver</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 16, height: 2, background: '#ffb800' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Transition Arc</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px', letterSpacing: '0.05em' }}>STATISTICS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Active Regions:</span> <span style={{ color: 'var(--accent-cyan)' }}>{Array.from(emitterActivity.values()).filter(a => a.detected).length}</span></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Total Observations:</span> <span style={{ color: 'var(--accent-cyan)' }}>{observations.length}</span></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Transition Arcs:</span> <span style={{ color: 'var(--accent-cyan)' }}>{transitionArcs.length}</span></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Patterns:</span> <span style={{ color: 'var(--accent-cyan)' }}>{patterns.length}</span></div>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onClick={handleClick}
              style={{ width: '100%', height: '100%', cursor: isDragging.current ? 'grabbing' : (hoveredRegion ? 'pointer' : 'grab') }}
            />
          </div>
        </main>

        <aside style={{ width: 300, flexShrink: 0, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', letterSpacing: '0.05em' }}>DETAILS</h3>
          {selectedMarker ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div className="metric-label">REGION</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>{selectedMarker.region.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: '2px' }}>
                  Simulated position: {selectedMarker.region.lon}°, {selectedMarker.region.lat}°
                </div>
              </div>

              {selectedMarker.activity ? (
                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div className="metric-label">OBSERVED ACTIVITY</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Frequency:</span> <span style={{ color: 'var(--accent-green)' }}>{(selectedMarker.activity.frequency / 1e6).toFixed(1)} MHz</span></div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>SNR:</span> <span style={{ color: 'var(--accent-green)' }}>{selectedMarker.activity.snr.toFixed(1)} dB</span></div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Observations:</span> <span style={{ color: 'var(--accent-cyan)' }}>{selectedMarker.activity.count}</span></div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Last Seen:</span> <span style={{ color: 'var(--accent-cyan)' }}>{selectedMarker.activity.time.toFixed(1)}s</span></div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-primary)', paddingTop: '8px' }}>
                    Source: Receiver observation (not ground truth)
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    No receiver observations in this region yet.
                  </div>
                </div>
              )}

              {selectedMarker.patterns.length > 0 && (
                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div className="metric-label">BEHAVIORAL PATTERNS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {selectedMarker.patterns.map((p, i) => (
                      <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--accent-cyan)' }}>{p.id}</span>
                          <span className={`badge ${p.status === 'confirmed' ? 'badge-green' : 'badge-amber'}`}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>Type: {p.type} · Confidence: {(p.confidence * 100).toFixed(0)}%</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Behavior: {p.frequencyBehavior} / {p.activityPattern}</div>
                        {p.estimatedPeriod && <div style={{ color: 'var(--text-secondary)' }}>Period: ~{p.estimatedPeriod.toFixed(1)}s</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div className="metric-label">ASSIGNED EMITTERS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {scenarioEmitters.filter(e => e.region === selectedMarker.region.id).map((e, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 8, height: 8, background: BEHAVIOR_COLORS[e.type] || '#666', borderRadius: 2 }}></div>
                        <span style={{ color: 'var(--accent-cyan)' }}>{e.name}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {(e.frequency / 1e6).toFixed(0)} MHz · {e.type}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                        Scenario metadata (not learned location)
                      </div>
                    </div>
                  ))}
                  {scenarioEmitters.filter(e => e.region === selectedMarker.region.id).length === 0 && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                      No emitters assigned to this region.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: '8px' }}>Click a region on the map to view details</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.6 }}>
                Regions show activity only after receiver observations. No ground truth is displayed.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
