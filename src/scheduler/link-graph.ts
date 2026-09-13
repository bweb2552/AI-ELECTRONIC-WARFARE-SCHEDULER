import type { LinkGraph, LinkGraphEdge, FrequencyBand } from '../core/types';

export interface CombinedGraphData {
  nodes: Array<{
    id: number;
    frequency: number;
    label: string;
    centrality: number;
    degree: number;
  }>;
  edges: Array<{
    from: number;
    to: number;
    weight: number;
    count: number;
    type: 'transition' | 'correlation';
    confidence: number;
    lastTime: number;
  }>;
  communities: number[][];
  stats: {
    nodeCount: number;
    edgeCount: number;
    transitionCount: number;
    correlationCount: number;
    avgDegree: number;
  };
}

export class TransitionGraph {
  private nodes: Set<number> = new Set();
  private edges: Map<string, LinkGraphEdge> = new Map();
  private decayFactor = 0.995;
  private minEdgeWeight = 0.02;
  private maxEdgesPerNode = 10;

  constructor(_bands: FrequencyBand[]) {}

  recordTransition(fromBand: number, toBand: number, time: number, hit: boolean): void {
    if (fromBand < 0 || fromBand === toBand) return;

    this.nodes.add(fromBand);
    this.nodes.add(toBand);

    const key = `${fromBand}->${toBand}`;
    const existing = this.edges.get(key);

    if (existing) {
      existing.count++;
      existing.lastTransition = time;
      // Additive weight growth — no inline decay here
      existing.weight = Math.min(1.0, existing.weight + (hit ? 0.2 : 0.05));
    } else {
      this.edges.set(key, {
        from: fromBand,
        to: toBand,
        weight: hit ? 0.2 : 0.05,
        count: 1,
        lastTransition: time,
        type: 'transition',
      });
    }

    this.pruneEdges();
    this.applyDecay();
  }

  private applyDecay(): void {
    for (const [key, edge] of this.edges) {
      edge.weight *= this.decayFactor;
      if (edge.weight < this.minEdgeWeight) {
        this.edges.delete(key);
      }
    }
  }

  private pruneEdges(): void {
    const fromMap = new Map<number, LinkGraphEdge[]>();
    
    for (const edge of this.edges.values()) {
      if (!fromMap.has(edge.from)) {
        fromMap.set(edge.from, []);
      }
      fromMap.get(edge.from)!.push(edge);
    }

    for (const [_from, edges] of fromMap) {
      if (edges.length > this.maxEdgesPerNode) {
        edges.sort((a, b) => b.weight - a.weight);
        const toRemove = edges.slice(this.maxEdgesPerNode);
        for (const edge of toRemove) {
          this.edges.delete(`${edge.from}->${edge.to}`);
        }
      }
    }
  }

  getTransitionProbability(fromBand: number, toBand: number): number {
    const key = `${fromBand}->${toBand}`;
    return this.edges.get(key)?.weight || 0;
  }

  getOutgoingTransitions(fromBand: number): LinkGraphEdge[] {
    const outgoing: LinkGraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.from === fromBand) {
        outgoing.push(edge);
      }
    }
    return outgoing.sort((a, b) => b.weight - a.weight);
  }

  getIncomingTransitions(toBand: number): LinkGraphEdge[] {
    const incoming: LinkGraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.to === toBand) {
        incoming.push(edge);
      }
    }
    return incoming.sort((a, b) => b.weight - a.weight);
  }

  getTopTransitions(n: number = 10): LinkGraphEdge[] {
    return Array.from(this.edges.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, n);
  }

  getPredictedNextBands(currentBand: number, n: number = 3): Array<{ bandIndex: number; probability: number }> {
    const outgoing = this.getOutgoingTransitions(currentBand);
    return outgoing.slice(0, n).map(e => ({ bandIndex: e.to, probability: e.weight }));
  }

  getGraphData(): { nodes: number[]; edges: LinkGraphEdge[] } {
    // Only include nodes that participate in at least one visible edge
    const activeNodes = new Set<number>();
    const visibleEdges = Array.from(this.edges.values()).filter(e => e.weight >= this.minEdgeWeight);
    for (const edge of visibleEdges) {
      activeNodes.add(edge.from);
      activeNodes.add(edge.to);
    }
    return {
      nodes: Array.from(activeNodes),
      edges: visibleEdges,
    };
  }

  getEdgeWeight(fromBand: number, toBand: number): number {
    return this.getTransitionProbability(fromBand, toBand);
  }

  getStrongestPath(startBand: number, maxLength: number = 3): number[] {
    const path = [startBand];
    let current = startBand;
    const visited = new Set([startBand]);

    for (let i = 0; i < maxLength - 1; i++) {
      const outgoing = this.getOutgoingTransitions(current);
      const next = outgoing.find(e => !visited.has(e.to) && e.weight > 0.1);
      if (!next) break;
      path.push(next.to);
      visited.add(next.to);
      current = next.to;
    }

    return path;
  }

  computeCentrality(): Map<number, number> {
    const centrality = new Map<number, number>();
    
    for (const node of this.nodes) {
      let score = 0;
      const outgoing = this.getOutgoingTransitions(node);
      const incoming = this.getIncomingTransitions(node);
      
      for (const e of outgoing) score += e.weight;
      for (const e of incoming) score += e.weight;
      
      centrality.set(node, score);
    }

    return centrality;
  }

  getCommunities(): number[][] {
    const communities: number[][] = [];
    const visited = new Set<number>();

    for (const node of this.nodes) {
      if (visited.has(node)) continue;
      
      const community = this.findCommunity(node, visited);
      if (community.length > 1) {
        communities.push(community);
      }
    }

    return communities;
  }

  private findCommunity(startNode: number, visited: Set<number>): number[] {
    const community = [startNode];
    visited.add(startNode);
    const queue = [startNode];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = this.getOutgoingTransitions(current);
      const incoming = this.getIncomingTransitions(current);

      for (const edge of [...outgoing, ...incoming]) {
        const neighbor = edge.from === current ? edge.to : edge.from;
        if (!visited.has(neighbor) && edge.weight > 0.1) {
          visited.add(neighbor);
          community.push(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return community;
  }

  reset(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  exportGraph(): LinkGraph {
    return {
      nodes: new Set(this.nodes),
      edges: new Map(this.edges),
    };
  }

  getCombinedGraphData(correlationEdges: LinkGraphEdge[] = [], bands: FrequencyBand[] = []): CombinedGraphData {
    const visibleEdges = Array.from(this.edges.values()).filter(e => e.weight >= this.minEdgeWeight);
    const activeNodes = new Set<number>();
    for (const edge of visibleEdges) {
      activeNodes.add(edge.from);
      activeNodes.add(edge.to);
    }
    for (const edge of correlationEdges) {
      if (edge.weight >= this.minEdgeWeight) {
        activeNodes.add(edge.from);
        activeNodes.add(edge.to);
      }
    }

    const centrality = this.computeCentrality();
    const communities = this.getCommunities();

    const nodes = Array.from(activeNodes).map(nodeId => {
      const band = bands.find(b => b.index === nodeId);
      const outgoing = this.getOutgoingTransitions(nodeId);
      const incoming = this.getIncomingTransitions(nodeId);
      const degree = outgoing.length + incoming.length;
      return {
        id: nodeId,
        frequency: band?.centerFrequency || nodeId * 20e6 + 110e6,
        label: band ? `${(band.centerFrequency / 1e6).toFixed(0)} MHz` : `Band ${nodeId}`,
        centrality: centrality.get(nodeId) || 0,
        degree,
      };
    });

    const allEdges: CombinedGraphData['edges'] = [];
    for (const edge of visibleEdges) {
      allEdges.push({
        from: edge.from,
        to: edge.to,
        weight: edge.weight,
        count: edge.count,
        type: 'transition',
        confidence: edge.weight,
        lastTime: edge.lastTransition,
      });
    }
    for (const edge of correlationEdges) {
      if (edge.weight >= this.minEdgeWeight) {
        allEdges.push({
          from: edge.from,
          to: edge.to,
          weight: edge.weight,
          count: edge.count,
          type: 'correlation',
          confidence: edge.weight,
          lastTime: edge.lastTransition,
        });
      }
    }

    return {
      nodes,
      edges: allEdges,
      communities,
      stats: {
        nodeCount: nodes.length,
        edgeCount: allEdges.length,
        transitionCount: visibleEdges.length,
        correlationCount: correlationEdges.filter(e => e.weight >= this.minEdgeWeight).length,
        avgDegree: nodes.length > 0 ? allEdges.length * 2 / nodes.length : 0,
      },
    };
  }
}

export class CorrelationGraph {
  private coOccurrence: Map<string, { count: number; lastTime: number }> = new Map();
  private bands: FrequencyBand[];

  constructor(bands: FrequencyBand[]) {
    this.bands = bands;
  }

  recordCoOccurrence(band1: number, band2: number, time: number): void {
    if (band1 === band2) return;
    const key = band1 < band2 ? `${band1}-${band2}` : `${band2}-${band1}`;
    const existing = this.coOccurrence.get(key);
    if (existing) {
      existing.count++;
      existing.lastTime = time;
    } else {
      this.coOccurrence.set(key, { count: 1, lastTime: time });
    }
  }

  getCorrelation(band1: number, band2: number): number {
    if (band1 === band2) return 1;
    const key = band1 < band2 ? `${band1}-${band2}` : `${band2}-${band1}`;
    return this.coOccurrence.get(key)?.count || 0;
  }

  getCorrelatedBands(bandIndex: number, threshold: number = 2): number[] {
    const correlated: number[] = [];
    for (const [key, data] of this.coOccurrence) {
      const [b1, b2] = key.split('-').map(Number);
      if (b1 === bandIndex && data.count >= threshold) correlated.push(b2);
      if (b2 === bandIndex && data.count >= threshold) correlated.push(b1);
    }
    return correlated;
  }

  getCorrelationEdges(minCount: number = 3): LinkGraphEdge[] {
    const edges: LinkGraphEdge[] = [];
    for (const [key, data] of this.coOccurrence) {
      if (data.count < minCount) continue;
      const [b1, b2] = key.split('-').map(Number);
      // Normalize weight: more co-occurrences = stronger edge
      const weight = Math.min(1.0, data.count / 20);
      edges.push({
        from: b1,
        to: b2,
        weight,
        count: data.count,
        lastTransition: data.lastTime,
        type: 'correlation',
      });
    }
    return edges;
  }

  getCorrelationMatrix(): number[][] {
    const n = this.bands.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
      for (let j = i + 1; j < n; j++) {
        const corr = this.getCorrelation(i, j);
        matrix[i][j] = corr;
        matrix[j][i] = corr;
      }
    }
    return matrix;
  }

  reset(): void {
    this.coOccurrence.clear();
  }
}