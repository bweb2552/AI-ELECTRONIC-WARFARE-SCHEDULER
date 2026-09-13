import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import type { CombinedGraphData } from '../scheduler/link-graph';
import type { FrequencyBand } from '../core/types';

interface FullLinkGraphViewProps {
  graphData: CombinedGraphData;
  bands: FrequencyBand[];
  scenarioName: string;
  schedulerType: string;
  simulationStatus: string;
  currentTime: number;
  onClose: () => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: number;
  frequency: number;
  label: string;
  centrality: number;
  degree: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  from: number;
  to: number;
  weight: number;
  count: number;
  type: 'transition' | 'correlation';
  confidence: number;
  lastTime: number;
}

const NODE_BASE_RADIUS = 16;
const NODE_MAX_RADIUS = 24;

export function FullLinkGraphView({
  graphData,
  bands: _bands,
  scenarioName,
  schedulerType,
  simulationStatus,
  currentTime,
  onClose,
}: FullLinkGraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const positionsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });

  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<CombinedGraphData['edges'][0] | null>(null);
  const [filter, setFilter] = useState<'all' | 'transitions' | 'correlations' | 'strong'>('all');
  const [minStrength, setMinStrength] = useState(0);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  const filteredEdges = useMemo(() => {
    let edges = graphData.edges;
    if (filter === 'transitions') edges = edges.filter(e => e.type === 'transition');
    else if (filter === 'correlations') edges = edges.filter(e => e.type === 'correlation');
    else if (filter === 'strong') edges = edges.filter(e => e.weight > 0.3);
    if (minStrength > 0) edges = edges.filter(e => e.weight >= minStrength / 100);
    return edges;
  }, [graphData.edges, filter, minStrength]);

  const filteredNodes = useMemo(() => {
    const edgeNodeIds = new Set<number>();
    for (const e of filteredEdges) {
      edgeNodeIds.add(e.from);
      edgeNodeIds.add(e.to);
    }
    return graphData.nodes.filter(n => edgeNodeIds.has(n.id));
  }, [graphData.nodes, filteredEdges]);

  // Compute d3-force layout
  const computeLayout = useCallback(() => {
    if (filteredNodes.length === 0) return;

    const w = canvasSize.w;
    const h = canvasSize.h;

    const nodes: GraphNode[] = filteredNodes.map(n => {
      const existing = positionsRef.current.get(n.id);
      return {
        id: n.id,
        frequency: n.frequency,
        label: n.label,
        centrality: n.centrality,
        degree: n.degree,
        x: existing?.x ?? w / 2 + (Math.random() - 0.5) * 200,
        y: existing?.y ?? h / 2 + (Math.random() - 0.5) * 200,
      };
    });

    const links: GraphLink[] = filteredEdges.map(e => ({ ...e, source: 0, target: 0 }));

    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(120)
        .strength(d => ((d as unknown as { weight: number })).weight * 0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide(NODE_MAX_RADIUS + 10))
      .force('x', d3.forceX(w / 2).strength(0.05))
      .force('y', d3.forceY(h / 2).strength(0.05))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    sim.stop();
    for (let i = 0; i < 300; i++) sim.tick();
    sim.stop();

    nodesRef.current = nodes;
    positionsRef.current.clear();
    for (const n of nodes) {
      positionsRef.current.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
    }
    simRef.current = sim;
  }, [filteredNodes, filteredEdges, canvasSize]);

  useEffect(() => {
    computeLayout();
  }, [computeLayout]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Canvas drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#05080c';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(30, 45, 61, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 50 * transform.scale;
    const offsetX = transform.x % gridSize;
    const offsetY = transform.y % gridSize;
    for (let x = offsetX; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (filteredNodes.length === 0) {
      ctx.fillStyle = 'rgba(154, 176, 200, 0.4)';
      ctx.font = '16px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('INSUFFICIENT OBSERVATIONS TO ESTABLISH RELATIONSHIPS', w / 2, h / 2 - 12);
      ctx.font = '12px JetBrains Mono';
      ctx.fillText('Run the simulation to collect transition and correlation data.', w / 2, h / 2 + 12);
      return;
    }

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Determine connected node IDs when a node is selected
    const connectedIds = new Set<number>();
    if (selectedNode !== null) {
      connectedIds.add(selectedNode);
      for (const e of filteredEdges) {
        if (e.from === selectedNode) connectedIds.add(e.to);
        if (e.to === selectedNode) connectedIds.add(e.from);
      }
    }

    // Draw edges
    for (const edge of filteredEdges) {
      const fromPos = positionsRef.current.get(edge.from);
      const toPos = positionsRef.current.get(edge.to);
      if (!fromPos || !toPos) continue;

      const isHovered = hoveredEdge === edge;
      const isRelated = selectedNode === null || connectedIds.has(edge.from) && connectedIds.has(edge.to);
      const dimmed = selectedNode !== null && !isRelated;

      const alpha = dimmed ? 0.08 : isHovered ? 1.0 : Math.min(0.85, edge.weight * 1.5 + 0.15);
      const lineWidth = Math.max(1, edge.weight * 5) * (isHovered ? 1.5 : 1);

      let edgeColor = edge.type === 'transition' ? '#00d4ff' : '#ffb800';
      if (isHovered) edgeColor = '#ffffff';

      ctx.strokeStyle = hexToRgba(edgeColor, alpha);
      ctx.lineWidth = lineWidth;

      if (edge.type === 'correlation') {
        ctx.setLineDash([6, 4]);
      } else {
        ctx.setLineDash([]);
      }

      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const curveOffset = Math.min(30, dist * 0.12);
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;
      const ctrlX = midX - (dy / dist) * curveOffset;
      const ctrlY = midY + (dx / dist) * curveOffset;

      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.quadraticCurveTo(ctrlX, ctrlY, toPos.x, toPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      if (!dimmed) {
        const angle = Math.atan2(toPos.y - ctrlY, toPos.x - ctrlX);
        const arrowSize = 7 * (isHovered ? 1.5 : 1);
        ctx.fillStyle = hexToRgba(edgeColor, alpha);
        ctx.beginPath();
        ctx.moveTo(toPos.x, toPos.y);
        ctx.lineTo(toPos.x - arrowSize * Math.cos(angle - Math.PI / 6), toPos.y - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toPos.x - arrowSize * Math.cos(angle + Math.PI / 6), toPos.y - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }

      // Edge weight label
      if ((isHovered || edge.weight > 0.4) && !dimmed) {
        ctx.fillStyle = hexToRgba('#e8f0f8', alpha * 0.9);
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(`${(edge.weight * 100).toFixed(0)}%`, ctrlX, ctrlY - 6);
      }
    }

    // Draw nodes
    for (const node of filteredNodes) {
      const pos = positionsRef.current.get(node.id);
      if (!pos) continue;

      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;
      const dimmed = selectedNode !== null && !connectedIds.has(node.id);

      const baseR = Math.min(NODE_MAX_RADIUS, NODE_BASE_RADIUS + node.degree * 1.5);
      const r = baseR * (isSelected ? 1.25 : isHovered ? 1.15 : 1);
      const alpha = dimmed ? 0.15 : 1;

      let nodeColor = '#00d4ff';
      if (isSelected) nodeColor = '#ffb800';
      else if (isHovered) nodeColor = '#00ff88';

      // Glow for selected/hovered
      if ((isSelected || isHovered) && !dimmed) {
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 2.5);
        gradient.addColorStop(0, hexToRgba(nodeColor, 0.35));
        gradient.addColorStop(1, hexToRgba(nodeColor, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node circle
      ctx.fillStyle = hexToRgba(nodeColor, alpha);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = hexToRgba(isSelected ? '#ffffff' : isHovered ? '#00ff88' : '#0a0e14', alpha);
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = hexToRgba('#e8f0f8', alpha);
      ctx.font = `bold ${isSelected ? 12 : 11}px JetBrains Mono`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, pos.x, pos.y);

      // Degree badge below
      if (!dimmed && node.degree > 0) {
        ctx.fillStyle = hexToRgba(nodeColor, alpha * 0.7);
        ctx.font = '9px JetBrains Mono';
        ctx.fillText(`deg:${node.degree}`, pos.x, pos.y + r + 12);
      }
    }

    ctx.restore();
  }, [filteredNodes, filteredEdges, selectedNode, hoveredNode, hoveredEdge, transform]);

  // Redraw when data or state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Hit testing
  const hitTest = useCallback((clientX: number, clientY: number): { type: 'node' | 'edge'; node?: GraphNode; edge?: CombinedGraphData['edges'][0] } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = (clientX - rect.left - transform.x) / transform.scale;
    const my = (clientY - rect.top - transform.y) / transform.scale;

    // Check nodes first
    for (const node of filteredNodes) {
      const pos = positionsRef.current.get(node.id);
      if (!pos) continue;
      const r = Math.min(NODE_MAX_RADIUS, NODE_BASE_RADIUS + node.degree * 1.5);
      const dx = mx - pos.x;
      const dy = my - pos.y;
      if (dx * dx + dy * dy <= r * r) {
        return { type: 'node', node };
      }
    }

    // Check edges (proximity to curve)
    for (const edge of filteredEdges) {
      const fromPos = positionsRef.current.get(edge.from);
      const toPos = positionsRef.current.get(edge.to);
      if (!fromPos || !toPos) continue;

      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const curveOffset = Math.min(30, dist * 0.12);
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;
      const ctrlX = midX - (dy / dist) * curveOffset;
      const ctrlY = midY + (dx / dist) * curveOffset;

      // Check distance to quadratic curve (approximate)
      for (let t = 0; t <= 1; t += 0.05) {
        const px = (1 - t) * (1 - t) * fromPos.x + 2 * (1 - t) * t * ctrlX + t * t * toPos.x;
        const pdx = mx - px;
        const py = (1 - t) * (1 - t) * fromPos.y + 2 * (1 - t) * t * ctrlY + t * t * toPos.y;
        const pdy = my - py;
        if (pdx * pdx + pdy * pdy < 64) {
          return { type: 'edge', edge };
        }
      }
    }

    return null;
  }, [filteredNodes, filteredEdges, transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setTransform(prev => ({
        ...prev,
        x: panOffset.current.x + dx,
        y: panOffset.current.y + dy,
      }));
      return;
    }

    const hit = hitTest(e.clientX, e.clientY);
    if (hit?.type === 'node') {
      setHoveredNode(hit.node!.id);
      setHoveredEdge(null);
      if (canvasRef.current) canvasRef.current.style.cursor = 'pointer';
    } else if (hit?.type === 'edge') {
      setHoveredNode(null);
      setHoveredEdge(hit.edge!);
      if (canvasRef.current) canvasRef.current.style.cursor = 'pointer';
    } else {
      setHoveredNode(null);
      setHoveredEdge(null);
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    }
  }, [hitTest]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panOffset.current = { x: transform.x, y: transform.y };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
  }, [transform]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit?.type === 'node') {
      setSelectedNode(prev => prev === hit.node!.id ? null : hit.node!.id);
    } else {
      setSelectedNode(null);
    }
  }, [hitTest]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    setTransform(prev => ({
      x: mouseX - (mouseX - prev.x) * zoomFactor,
      y: mouseY - (mouseY - prev.y) * zoomFactor,
      scale: Math.max(0.2, Math.min(5, prev.scale * zoomFactor)),
    }));
  }, []);

  const handleZoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(5, prev.scale * 1.2) }));
  const handleZoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale * 0.8) }));
  const handleFitToScreen = () => setTransform({ x: 0, y: 0, scale: 1 });
  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
    setSelectedNode(null);
  };

  const selectedNodeData = selectedNode !== null ? graphData.nodes.find(n => n.id === selectedNode) : null;
  const selectedNodeEdges = selectedNode !== null ? filteredEdges.filter(e => e.from === selectedNode || e.to === selectedNode) : [];
  const selectedEdgeData = hoveredEdge;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }}>
            ← BACK TO DASHBOARD
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>
              FREQUENCY RELATIONSHIP ANALYSIS
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Learned frequency transitions and co-occurrence correlations from receiver observations
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span><span className="metric-label">Scenario:</span> {scenarioName}</span>
          <span><span className="metric-label">Scheduler:</span> {schedulerType.toUpperCase()}</span>
          <span><span className="metric-label">Status:</span> {simulationStatus.toUpperCase()}</span>
          <span><span className="metric-label">Time:</span> {currentTime.toFixed(1)}s</span>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Controls */}
        <aside style={{
          width: 240, flexShrink: 0, background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-primary)', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto',
        }}>
          <div>
            <div className="panel-title" style={{ marginBottom: '8px' }}>FILTERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(['all', 'transitions', 'correlations', 'strong'] as const).map(f => (
                <button
                  key={f}
                  className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilter(f)}
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11, textTransform: 'capitalize' }}
                >
                  {f === 'all' ? 'All Relationships' : f === 'strong' ? 'Strong Only (>30%)' : f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="panel-title" style={{ marginBottom: '8px' }}>MIN STRENGTH</div>
            <input
              type="range" min="0" max="100" step="5" value={minStrength}
              onChange={e => setMinStrength(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
              {minStrength}%
            </div>
          </div>

          <div>
            <div className="panel-title" style={{ marginBottom: '8px' }}>VIEW CONTROLS</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn btn-ghost" onClick={handleZoomIn} style={{ flex: 1, padding: '6px', fontSize: 11 }}>Zoom +</button>
              <button className="btn btn-ghost" onClick={handleZoomOut} style={{ flex: 1, padding: '6px', fontSize: 11 }}>Zoom -</button>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <button className="btn btn-ghost" onClick={handleFitToScreen} style={{ flex: 1, padding: '6px', fontSize: 11 }}>Fit Screen</button>
              <button className="btn btn-ghost" onClick={handleResetView} style={{ flex: 1, padding: '6px', fontSize: 11 }}>Reset View</button>
            </div>
          </div>

          <div>
            <div className="panel-title" style={{ marginBottom: '8px' }}>LEGEND</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 20, height: 3, background: '#00d4ff', display: 'inline-block', borderRadius: 2 }} />
                <span style={{ color: 'var(--text-secondary)' }}>Transition edge (solid)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 20, height: 3, background: '#ffb800', display: 'inline-block', borderRadius: 2, borderBottom: '2px dashed #ffb800' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Correlation edge (dashed)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#00d4ff', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Default node</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffb800', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Selected node</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#00ff88', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Hovered node</span>
              </div>
              <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                Edge width and opacity = relationship strength
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Click node to select · Click background to deselect
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Scroll to zoom · Drag to pan
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-primary)' }}>
            <div className="panel-title" style={{ marginBottom: '8px' }}>GRAPH STATS</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <div>Nodes: <span style={{ color: 'var(--accent-cyan)' }}>{graphData.stats.nodeCount}</span></div>
              <div>Edges: <span style={{ color: 'var(--accent-cyan)' }}>{graphData.stats.edgeCount}</span></div>
              <div>Transitions: <span style={{ color: 'var(--accent-cyan)' }}>{graphData.stats.transitionCount}</span></div>
              <div>Correlations: <span style={{ color: 'var(--accent-cyan)' }}>{graphData.stats.correlationCount}</span></div>
              <div>Avg Degree: <span style={{ color: 'var(--accent-cyan)' }}>{graphData.stats.avgDegree.toFixed(1)}</span></div>
            </div>
          </div>
        </aside>

        {/* Center Canvas */}
        <main
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        >
          <canvas
            ref={el => {
              if (el) {
                canvasRef.current = el;
                el.width = canvasSize.w;
                el.height = canvasSize.h;
              }
            }}
            width={canvasSize.w}
            height={canvasSize.h}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); setHoveredNode(null); setHoveredEdge(null); }}
            onClick={handleClick}
            onWheel={handleWheel}
            style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
          />
          {/* Floating tooltip */}
          {hoveredNode !== null && (() => {
            const node = filteredNodes.find(n => n.id === hoveredNode);
            if (!node) return null;
            return (
              <div style={{
                position: 'absolute', bottom: 16, left: 16,
                padding: '10px 14px', background: 'rgba(5,8,12,0.95)',
                border: '1px solid var(--accent-cyan)', borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
                pointerEvents: 'none', zIndex: 10,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Band {node.id} · {node.label}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Centrality: {node.centrality.toFixed(3)} · Degree: {node.degree}</div>
              </div>
            );
          })()}
          {hoveredEdge && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16,
              padding: '10px 14px', background: 'rgba(5,8,12,0.95)',
              border: `1px solid ${hoveredEdge.type === 'transition' ? 'var(--accent-cyan)' : 'var(--accent-amber)'}`,
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
              pointerEvents: 'none', zIndex: 10,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {hoveredEdge.type === 'transition' ? 'Transition' : 'Correlation'}: Band {hoveredEdge.from} → Band {hoveredEdge.to}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Strength: {(hoveredEdge.weight * 100).toFixed(1)}% · Observations: {hoveredEdge.count}
              </div>
            </div>
          )}
        </main>

        {/* Right Details Panel */}
        <aside style={{
          width: 300, flexShrink: 0, background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-primary)', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto',
        }}>
          {selectedNodeData ? (
            <>
              <div>
                <div className="panel-title" style={{ marginBottom: '8px' }}>SELECTED NODE</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 4 }}>
                  {selectedNodeData.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  Band Index: {selectedNodeData.id}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="metric-card" style={{ padding: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent-cyan)' }}>{selectedNodeData.degree}</div>
                  <div className="metric-label" style={{ marginTop: 4 }}>Connections</div>
                </div>
                <div className="metric-card" style={{ padding: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent-cyan)' }}>{selectedNodeData.centrality.toFixed(3)}</div>
                  <div className="metric-label" style={{ marginTop: 4 }}>Centrality</div>
                </div>
              </div>
              <div>
                <div className="panel-title" style={{ marginBottom: '8px' }}>CONNECTED EDGES</div>
                {selectedNodeEdges.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedNodeEdges.sort((a, b) => b.weight - a.weight).map((edge, i) => (
                      <div key={i} className="metric-card" style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                            Band {edge.from === selectedNode ? edge.to : edge.from}
                          </span>
                          <span className={`badge ${edge.type === 'transition' ? 'badge-cyan' : 'badge-amber'}`}>
                            {edge.type}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <div>Strength: {(edge.weight * 100).toFixed(1)}%</div>
                          <div>Confidence: {(edge.confidence * 100).toFixed(0)}%</div>
                          <div>Observations: {edge.count}</div>
                          <div>Last seen: {edge.lastTime.toFixed(1)}s</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                    No connected edges
                  </div>
                )}
              </div>
            </>
          ) : selectedEdgeData ? (
            <>
              <div>
                <div className="panel-title" style={{ marginBottom: '8px' }}>SELECTED RELATIONSHIP</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: selectedEdgeData.type === 'transition' ? 'var(--accent-cyan)' : 'var(--accent-amber)', marginBottom: 4 }}>
                  Band {selectedEdgeData.from} → Band {selectedEdgeData.to}
                </div>
                <span className={`badge ${selectedEdgeData.type === 'transition' ? 'badge-cyan' : 'badge-amber'}`}>
                  {selectedEdgeData.type}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="metric-card" style={{ padding: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent-cyan)' }}>{(selectedEdgeData.weight * 100).toFixed(1)}%</div>
                  <div className="metric-label" style={{ marginTop: 4 }}>Strength</div>
                </div>
                <div className="metric-card" style={{ padding: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent-cyan)' }}>{(selectedEdgeData.confidence * 100).toFixed(0)}%</div>
                  <div className="metric-label" style={{ marginTop: 4 }}>Confidence</div>
                </div>
              </div>
              <div className="metric-card" style={{ padding: '12px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <div>Observations: <span style={{ color: 'var(--accent-cyan)' }}>{selectedEdgeData.count}</span></div>
                  <div>Last transition: <span style={{ color: 'var(--accent-cyan)' }}>{selectedEdgeData.lastTime.toFixed(1)}s</span></div>
                  <div>Direction: <span style={{ color: 'var(--accent-cyan)' }}>Band {selectedEdgeData.from} → Band {selectedEdgeData.to}</span></div>
                </div>
              </div>
              <div>
                <div className="panel-title" style={{ marginBottom: '8px' }}>EVIDENCE</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div>This {selectedEdgeData.type} relationship was observed {selectedEdgeData.count} time{selectedEdgeData.count !== 1 ? 's' : ''}.</div>
                  <div style={{ marginTop: 4 }}>
                    {selectedEdgeData.type === 'transition'
                      ? 'The receiver transitioned from this frequency to the target frequency during scanning.'
                      : 'Both frequencies showed activity within a short time window, indicating correlated emission.'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                NO SELECTION
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6 }}>
                Click a node to view its details and connected relationships.
                <br /><br />
                Click an edge to view relationship strength and evidence.
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer style={{
        padding: '8px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Nodes: {filteredNodes.length}/{graphData.stats.nodeCount}</span>
          <span>Edges: {filteredEdges.length}/{graphData.stats.edgeCount}</span>
          <span>Transitions: {filteredEdges.filter(e => e.type === 'transition').length}</span>
          <span>Correlations: {filteredEdges.filter(e => e.type === 'correlation').length}</span>
        </div>
        <div>Zoom: {(transform.scale * 100).toFixed(0)}%</div>
      </footer>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
