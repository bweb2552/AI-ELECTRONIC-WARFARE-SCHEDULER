import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GEO_REGIONS, RECEIVER_POSITIONS } from '../core/geo-regions';
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
}

const BEHAVIOR_COLORS: Record<string, string> = {
  static: '#3b82f6',
  periodic: '#22c55e',
  'frequency-agile': '#ec4899',
  burst: '#f97316',
  correlated: '#a855f7',
  adaptive: '#06b6d4',
};

// Dark military-style tile layers
const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    name: 'Dark',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    name: 'Satellite',
  },
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    name: 'Tactical',
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
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const arcsLayerRef = useRef<L.LayerGroup | null>(null);
  const receiverLayerRef = useRef<L.LayerGroup | null>(null);
  const emitterLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showReceivers, setShowReceivers] = useState(true);
  const [showEmitters, setShowEmitters] = useState(true);
  const [showArcs, setShowArcs] = useState(true);
  const [showCountries, setShowCountries] = useState(true);
  const [minTransitionCount, setMinTransitionCount] = useState(3);
  const [mapStyle, setMapStyle] = useState<keyof typeof TILE_LAYERS>('dark');

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
    for (const edge of graphData.edges) {
      if (edge.count < minTransitionCount) continue;
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

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [20, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: false,
      worldCopyJump: true,
      maxBoundsViscosity: 0.8,
    });

    // Add dark CartoDB tiles as default
    L.tileLayer(TILE_LAYERS.dark.url, {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    arcsLayerRef.current = L.layerGroup().addTo(map);
    receiverLayerRef.current = L.layerGroup().addTo(map);
    emitterLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update receiver markers
  useEffect(() => {
    const layer = receiverLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showReceivers) return;

    for (const rx of RECEIVER_POSITIONS) {
      const isActive = receiverState?.isScanning;
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 16px; height: 16px; position: relative;
          transform: rotate(45deg); margin: -8px 0 0 -8px;
        ">
          <div style="
            width: 16px; height: 16px; position: absolute;
            background: ${isActive ? '#00d4ff' : 'rgba(0,212,255,0.5)'};
            border: 2px solid #00d4ff;
            ${isActive ? 'box-shadow: 0 0 12px rgba(0,212,255,0.6);' : ''}
          "></div>
        </div>`,
        iconSize: [0, 0],
      });

      const marker = L.marker([rx.lat, rx.lon], { icon })
        .bindTooltip(`${rx.label}\nReceiver\nSimulated: ${rx.lon}°, ${rx.lat}°`, {
          direction: 'top',
          offset: [0, -10],
          className: '',
        })
        .addTo(layer);
      (marker as any)._rxId = rx.id;
    }
  }, [showReceivers, receiverState]);

  // Update emitter markers
  useEffect(() => {
    const layer = emitterLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showEmitters) return;

    for (const emitter of scenarioEmitters) {
      const region = GEO_REGIONS.find(r => r.id === emitter.region);
      if (!region) continue;
      const color = BEHAVIOR_COLORS[emitter.type] || '#666';
      const activity = emitter.region ? emitterActivity.get(emitter.region) : undefined;
      const hasActivity = activity && activity.detected;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 10px; height: 10px; border-radius: 50%;
          background: ${color};
          border: 1.5px solid ${color};
          ${hasActivity ? `box-shadow: 0 0 8px ${color}; opacity: 1;` : 'opacity: 0.6;'}
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      L.marker([region.lat, region.lon], { icon })
        .bindTooltip(`${emitter.name}\n${emitter.type} · ${(emitter.frequency / 1e6).toFixed(0)} MHz\nSimulated position`, {
          direction: 'top',
          offset: [0, -8],
          className: '',
        })
        .addTo(layer);
    }
  }, [showEmitters, emitterActivity, scenarioEmitters]);

  // Update region markers (activity indicators)
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const region of GEO_REGIONS) {
      const activity = emitterActivity.get(region.id);
      const hasActivity = activity && activity.detected;
      const isSelected = selectedRegion === region.id;
      const intensity = activity ? Math.min(1, (activity.snr + 40) / 60) : 0;

      const markerSize = isSelected ? 20 : 14;
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position: relative; width: ${markerSize}px; height: ${markerSize}px; margin: -${markerSize/2}px 0 0 -${markerSize/2}px;">
            ${hasActivity ? `
              <div style="
                position: absolute; inset: -6px; border-radius: 50%;
                background: radial-gradient(circle, rgba(0,212,255,${0.3 * intensity}) 0%, transparent 70%);
                animation: pulse 2s ease-in-out infinite;
              "></div>
            ` : ''}
            <div style="
              width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%;
              background: ${hasActivity ? `rgba(0,212,255,${0.4 + intensity * 0.6})` : 'rgba(40,60,80,0.5)'};
              border: ${isSelected ? '2px solid #00d4ff' : '1.5px solid rgba(0,212,255,0.4)'};
              display: flex; align-items: center; justify-content: center;
              font-family: 'JetBrains Mono', monospace;
              font-size: 7px; font-weight: 700; color: ${isSelected ? '#ffffff' : 'rgba(180,200,220,0.8)'};
              letter-spacing: 0.05em;
              ${hasActivity ? `box-shadow: 0 0 8px rgba(0,212,255,${0.3 * intensity});` : ''}
            ">${region.label}</div>
          </div>
          ${hasActivity && activity ? `
            <div style="
              position: absolute; top: ${markerSize + 2}px; left: 50%; transform: translateX(-50%);
              font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #00ff88;
              white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            ">${activity.count} obs</div>
          ` : ''}
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([region.lat, region.lon], { icon })
        .bindTooltip(() => {
          const info = getMarkerInfo(region.id);
          let text = `${region.name}\nSimulated: ${region.lon}°, ${region.lat}°`;
          if (info?.activity && info.activity.detected) {
            text += `\n${info.activity.count} obs · ${(info.activity.frequency / 1e6).toFixed(1)} MHz`;
          }
          return text;
        }, {
          direction: 'top',
          offset: [0, -12],
          className: '',
        })
        .on('click', () => {
          setSelectedRegion(prev => prev === region.id ? null : region.id);
        })
        .addTo(layer);
      (marker as any)._regionId = region.id;
    }
  }, [emitterActivity, selectedRegion, getMarkerInfo]);

  // Update transition arcs
  useEffect(() => {
    const layer = arcsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showArcs || transitionArcs.length === 0) return;

    for (const arc of transitionArcs) {
      const fromRegion = GEO_REGIONS.find(r => r.id === arc.fromRegion);
      const toRegion = GEO_REGIONS.find(r => r.id === arc.toRegion);
      if (!fromRegion || !toRegion) continue;

      const alpha = Math.min(0.8, arc.weight * 1.5 + 0.2);
      const weight = Math.max(1, arc.weight * 2);

      // Create curved arc using polyline with intermediate points
      const midLat = (fromRegion.lat + toRegion.lat) / 2;
      const midLon = (fromRegion.lon + toRegion.lon) / 2;
      // Add curvature
      const dLon = toRegion.lon - fromRegion.lon;
      const dLat = toRegion.lat - fromRegion.lat;
      const curveLat = midLat + dLon * 0.15;
      const curveLon = midLon - dLat * 0.15;

      const points: L.LatLngExpression[] = [
        [fromRegion.lat, fromRegion.lon],
        [curveLat, curveLon],
        [toRegion.lat, toRegion.lon],
      ];

      const polyline = L.polyline(points, {
        color: '#ffb800',
        weight: weight,
        opacity: alpha,
        dashArray: '8, 6',
        className: 'transition-arc',
      }).addTo(layer);

      polyline.bindTooltip(
        `Transition: ${arc.fromRegion} → ${arc.toRegion}\nCount: ${arc.count} · Weight: ${arc.weight.toFixed(2)}\nConfidence: ${(arc.confidence * 100).toFixed(0)}%`,
        { className: '' }
      );
    }
  }, [showArcs, transitionArcs]);

  // Handle map style changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    const tileConfig = TILE_LAYERS[mapStyle];
    L.tileLayer(tileConfig.url, {
      subdomains: mapStyle === 'satellite' ? [] : 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }, [mapStyle]);

  const fitToScreen = useCallback(() => {
    mapInstanceRef.current?.setView([20, 10], 2);
  }, []);

  const zoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);

  const zoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  const selectedMarker = selectedRegion ? getMarkerInfo(selectedRegion) : null;
  const activeRegionCount = Array.from(emitterActivity.values()).filter(a => a.detected).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#080e1a', display: 'flex', flexDirection: 'column', fontFamily: '"JetBrains Mono", monospace' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        .leaflet-container { background: #080e1a !important; }
        .transition-arc { filter: drop-shadow(0 0 4px rgba(255,184,0,0.3)); }
      `}</style>

      {/* Top status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', background: '#0c1424', borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
        flexShrink: 0, gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.25)',
              borderRadius: '4px', padding: '5px 14px', color: '#00d4ff', cursor: 'pointer',
              fontSize: 11, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.03em',
            }}
          >
            ← DASHBOARD
          </button>
          <div style={{ borderLeft: '1px solid rgba(0, 212, 255, 0.15)', paddingLeft: '16px' }}>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: '#00d4ff', letterSpacing: '0.08em', margin: 0 }}>
              GLOBAL RF INTELLIGENCE MAP
            </h1>
            <p style={{ fontSize: 9, color: 'rgba(120, 150, 180, 0.6)', margin: 0, letterSpacing: '0.05em' }}>
              SIMULATED RF ACTIVITY MONITORING
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 10 }}>
          <span style={{ color: 'rgba(150, 170, 190, 0.7)' }}>SCENARIO: <span style={{ color: '#00d4ff' }}>{scenarioName}</span></span>
          <span style={{ color: 'rgba(150, 170, 190, 0.7)' }}>SCHEDULER: <span style={{ color: '#00d4ff' }}>{schedulerType.toUpperCase()}</span></span>
          <span style={{ color: 'rgba(150, 170, 190, 0.7)' }}>TIME: <span style={{ color: '#00d4ff' }}>{currentTime.toFixed(1)}s</span></span>
          <span style={{
            padding: '3px 10px', borderRadius: '3px', fontSize: 9, fontWeight: 600,
            background: simulationStatus === 'running' ? 'rgba(0, 255, 136, 0.12)' :
              simulationStatus === 'paused' ? 'rgba(255, 184, 0, 0.12)' : 'rgba(0, 212, 255, 0.08)',
            color: simulationStatus === 'running' ? '#00ff88' :
              simulationStatus === 'paused' ? '#ffb800' : '#00d4ff',
            border: `1px solid ${simulationStatus === 'running' ? 'rgba(0, 255, 136, 0.3)' :
              simulationStatus === 'paused' ? 'rgba(255, 184, 0, 0.3)' : 'rgba(0, 212, 255, 0.2)'}`,
          }}>
            {simulationStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left control panel */}
        <aside style={{
          width: 240, flexShrink: 0, background: '#0c1424',
          borderRight: '1px solid rgba(0, 212, 255, 0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '12px',
        }}>
          {/* Layer toggles */}
          <div style={{ marginBottom: '14px' }}>
            <SectionTitle>LAYERS</SectionTitle>
            <ToggleRow checked={showReceivers} onChange={setShowReceivers} label={`Receivers (${RECEIVER_POSITIONS.length})`} color="#00d4ff" />
            <ToggleRow checked={showEmitters} onChange={setShowEmitters} label={`Emitters (${scenarioEmitters.length})`} color="#00ff88" />
            <ToggleRow checked={showArcs} onChange={setShowArcs} label={`Transitions (${transitionArcs.length})`} color="#ffb800" />
            <ToggleRow checked={showCountries} onChange={setShowCountries} label="Country Boundaries" color="rgba(120,150,180,0.5)" />
          </div>

          {/* Map style */}
          <div style={{ marginBottom: '14px' }}>
            <SectionTitle>MAP STYLE</SectionTitle>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map(key => (
                <ControlButton key={key} onClick={() => setMapStyle(key)} active={mapStyle === key}>
                  {TILE_LAYERS[key].name}
                </ControlButton>
              ))}
            </div>
          </div>

          {/* Map controls */}
          <div style={{ marginBottom: '14px' }}>
            <SectionTitle>MAP CONTROLS</SectionTitle>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              <ControlButton onClick={fitToScreen} active>FIT</ControlButton>
              <ControlButton onClick={zoomIn}>+</ControlButton>
              <ControlButton onClick={zoomOut}>−</ControlButton>
            </div>
          </div>

          {/* Transition filter */}
          <div style={{ marginBottom: '14px' }}>
            <SectionTitle>MIN TRANSITION COUNT</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <input
                type="range" min={1} max={10} value={minTransitionCount}
                onChange={e => setMinTransitionCount(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: '#00d4ff' }}
              />
              <span style={{ fontSize: 11, color: '#00d4ff', minWidth: 16, textAlign: 'right' }}>{minTransitionCount}</span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ marginBottom: '14px' }}>
            <SectionTitle>LEGEND</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              {Object.entries(BEHAVIOR_COLORS).map(([type, color]) => (
                <LegendItem key={type} color={color} label={type.charAt(0).toUpperCase() + type.slice(1).replace('-', '-')} />
              ))}
              <LegendItem color="#00d4ff" label="Receiver" shape="diamond" />
              <LegendItem color="#ffb800" label="Transition Arc" shape="line" />
            </div>
          </div>

          {/* Statistics */}
          <div style={{ flex: 1 }}>
            <SectionTitle>STATISTICS</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', fontSize: 10 }}>
              <StatRow label="Active Regions" value={activeRegionCount.toString()} />
              <StatRow label="Observations" value={observations.length.toString()} />
              <StatRow label="Detected Emitters" value={activeRegionCount.toString()} />
              <StatRow label="Transition Arcs" value={transitionArcs.length.toString()} />
              <StatRow label="Patterns" value={patterns.length.toString()} />
              <StatRow label="Last Update" value={currentTime.toFixed(1) + 's'} />
            </div>
          </div>
        </aside>

        {/* Map container */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {/* Disclaimer */}
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(12, 20, 36, 0.85)', padding: '4px 12px', borderRadius: '3px',
            border: '1px solid rgba(0, 212, 255, 0.1)',
            fontSize: 9, color: 'rgba(120, 140, 160, 0.6)',
            fontFamily: '"JetBrains Mono", monospace',
            pointerEvents: 'none', zIndex: 1000,
          }}>
            Geographic positions are simulated and do not represent real emitter locations.
          </div>
        </main>

        {/* Right details panel */}
        <aside style={{
          width: 280, flexShrink: 0, background: '#0c1424',
          borderLeft: '1px solid rgba(0, 212, 255, 0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '12px',
        }}>
          <SectionTitle>INTELLIGENCE DETAILS</SectionTitle>
          {selectedMarker ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <DetailCard>
                <DetailLabel>REGION</DetailLabel>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#00d4ff', marginTop: '4px' }}>
                  {selectedMarker.region.name}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(120, 150, 180, 0.6)', marginTop: '2px' }}>
                  Simulated: {selectedMarker.region.lon}°, {selectedMarker.region.lat}°
                </div>
              </DetailCard>

              {selectedMarker.activity ? (
                <DetailCard>
                  <DetailLabel>OBSERVED ACTIVITY</DetailLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', fontSize: 10 }}>
                    <DetailField label="Frequency" value={`${(selectedMarker.activity.frequency / 1e6).toFixed(1)} MHz`} />
                    <DetailField label="SNR" value={`${selectedMarker.activity.snr.toFixed(1)} dB`} />
                    <DetailField label="Observations" value={selectedMarker.activity.count.toString()} />
                    <DetailField label="Last Seen" value={`${selectedMarker.activity.time.toFixed(1)}s`} />
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(100, 130, 160, 0.5)', marginTop: '6px', borderTop: '1px solid rgba(0, 212, 255, 0.08)', paddingTop: '6px' }}>
                    Source: Receiver observation (not ground truth)
                  </div>
                </DetailCard>
              ) : (
                <DetailCard>
                  <div style={{ textAlign: 'center', color: 'rgba(120, 150, 180, 0.4)', padding: '12px', fontSize: 10 }}>
                    No observations in this region yet
                  </div>
                </DetailCard>
              )}

              {selectedMarker.patterns.length > 0 && (
                <DetailCard>
                  <DetailLabel>BEHAVIORAL PATTERNS</DetailLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {selectedMarker.patterns.map((p, i) => (
                      <div key={i} style={{
                        padding: '6px 8px', background: 'rgba(0, 212, 255, 0.04)',
                        borderRadius: '3px', border: '1px solid rgba(0, 212, 255, 0.08)', fontSize: 9,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ color: '#00d4ff' }}>{p.id}</span>
                          <span style={{
                            padding: '1px 6px', borderRadius: '2px', fontSize: 8,
                            background: p.status === 'confirmed' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 184, 0, 0.1)',
                            color: p.status === 'confirmed' ? '#00ff88' : '#ffb800',
                            border: `1px solid ${p.status === 'confirmed' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 184, 0, 0.2)'}`,
                          }}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ color: 'rgba(150, 170, 190, 0.7)' }}>
                          {p.type} · {(p.confidence * 100).toFixed(0)}% · {p.frequencyBehavior}/{p.activityPattern}
                        </div>
                      </div>
                    ))}
                  </div>
                </DetailCard>
              )}

              <DetailCard>
                <DetailLabel>ASSIGNED EMITTERS</DetailLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {scenarioEmitters.filter(e => e.region === selectedMarker.region.id).map((e, i) => (
                    <div key={i} style={{
                      padding: '6px 8px', background: 'rgba(0, 212, 255, 0.04)',
                      borderRadius: '3px', border: '1px solid rgba(0, 212, 255, 0.08)', fontSize: 9,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 6, height: 6, background: BEHAVIOR_COLORS[e.type] || '#666', borderRadius: 1 }}></div>
                        <span style={{ color: '#00d4ff' }}>{e.name}</span>
                      </div>
                      <div style={{ color: 'rgba(150, 170, 190, 0.6)', marginTop: '2px' }}>
                        {(e.frequency / 1e6).toFixed(0)} MHz · {e.type}
                      </div>
                      <div style={{ color: 'rgba(100, 130, 160, 0.4)', marginTop: '2px', fontStyle: 'italic', fontSize: 8 }}>
                        Scenario metadata (not learned location)
                      </div>
                    </div>
                  ))}
                  {scenarioEmitters.filter(e => e.region === selectedMarker.region.id).length === 0 && (
                    <div style={{ color: 'rgba(120, 150, 180, 0.3)', textAlign: 'center', padding: '8px', fontSize: 9 }}>
                      No emitters assigned
                    </div>
                  )}
                </div>
              </DetailCard>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(120, 150, 180, 0.4)', padding: '40px 16px', marginTop: '8px' }}>
              <div style={{ fontSize: 11, marginBottom: '8px' }}>Select a simulated activity marker or region to view intelligence details.</div>
              <div style={{ fontSize: 9, lineHeight: 1.6 }}>
                Regions show activity only after receiver observations. No ground truth is displayed.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// --- Sub-components ---

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, color: 'rgba(0, 212, 255, 0.6)',
      letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px',
    }}>
      {children}
    </div>
  );
}

function ToggleRow({ checked, onChange, label, color }: { checked: boolean; onChange: (v: boolean) => void; label: string; color: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px', fontSize: 10,
      color: 'rgba(180, 200, 220, 0.7)', cursor: 'pointer', padding: '3px 0',
    }}>
      <input
        type="checkbox" checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: color, width: 12, height: 12 }}
      />
      {label}
    </label>
  );
}

function ControlButton({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '5px 4px', fontSize: 9, fontWeight: 600,
        background: active ? 'rgba(0, 212, 255, 0.12)' : 'rgba(0, 212, 255, 0.04)',
        border: `1px solid ${active ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 212, 255, 0.12)'}`,
        borderRadius: '3px', color: active ? '#00d4ff' : 'rgba(180, 200, 220, 0.6)',
        cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {children}
    </button>
  );
}

function LegendItem({ color, label, shape }: { color: string; label: string; shape?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 9, color: 'rgba(180, 200, 220, 0.6)' }}>
      {shape === 'diamond' ? (
        <div style={{ width: 8, height: 8, background: color, transform: 'rotate(45deg)', borderRadius: 1 }}></div>
      ) : shape === 'line' ? (
        <div style={{ width: 14, height: 2, background: color }}></div>
      ) : (
        <div style={{ width: 8, height: 8, background: color, borderRadius: '50%' }}></div>
      )}
      {label}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'rgba(150, 170, 190, 0.5)' }}>{label}</span>
      <span style={{ color: '#00d4ff' }}>{value}</span>
    </div>
  );
}

function DetailCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(0, 212, 255, 0.03)', borderRadius: '4px',
      border: '1px solid rgba(0, 212, 255, 0.08)', padding: '10px',
    }}>
      {children}
    </div>
  );
}

function DetailLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(0, 212, 255, 0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: 'rgba(150, 170, 190, 0.4)', marginBottom: '1px' }}>{label}</div>
      <div style={{ fontSize: 10, color: '#00ff88' }}>{value}</div>
    </div>
  );
}
